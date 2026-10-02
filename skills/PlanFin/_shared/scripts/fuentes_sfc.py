"""Superfinanciera de Colombia vía datos.gov.co (API Socrata, sin login).

Dataset axk9-g2nh: "Tasas de interés de captación y operaciones del mercado monetario".
  uca=1  emisiones de CDT             (tasa = % EA promedio ponderado pagado ese día; monto en MILES de pesos)
  uca=7  saldos de depósitos de ahorro (subcuenta 10 = ahorro activo de persona natural)
La tasa NO es la tasa de cartelera: es lo que la entidad efectivamente pagó, ponderado por monto.
"""
from __future__ import annotations

from datetime import date, datetime

import pandas as pd

from _http import FuenteError, get

URL_CAPTACION = "https://www.datos.gov.co/resource/axk9-g2nh.json"
LIMITE = 50000  # el valor por defecto de Socrata es 1000 y cortaría filas

# subcuenta (uca 1) -> texto oficial. La 40 se repite con la etiqueta "A 30 DIAS" y NO se usa
# (ver convenciones.md): se filtra siempre por subcuenta, nunca por descripción.
DESC_SUBCUENTA = {
    10: "A 30 días", 20: "Entre 31 y 44 días", 30: "A 45 días", 50: "A 60 días",
    60: "Entre 61 y 89 días", 70: "A 90 días", 80: "Entre 91 y 119 días", 90: "A 120 días",
    100: "Entre 121 y 179 días", 110: "A 180 días", 120: "Entre 181 y 359 días",
    130: "A 360 días", 140: "Más de 360 días",
}
_EXACTOS = {30: 10, 45: 30, 60: 50, 90: 70, 120: 90, 180: 110, 360: 130}


def plazo_a_subcuenta(dias: int) -> int:
    """Traduce un plazo en días a la subcuenta de la Superfinanciera (uca 1)."""
    d = int(dias)
    if d in _EXACTOS:
        return _EXACTOS[d]
    if d < 30:
        return 10
    if 31 <= d <= 44:
        return 20
    if 46 <= d <= 59:
        return 30  # no existe el rango; se aproxima al de 45 días
    if 61 <= d <= 89:
        return 60
    if 91 <= d <= 119:
        return 80
    if 121 <= d <= 179:
        return 100
    if 181 <= d <= 359:
        return 120
    return 140  # más de 360


def plazo_es_aproximado(dias: int) -> bool:
    """True si el plazo pedido no coincide con un plazo exacto ni con un rango publicado."""
    d = int(dias)
    return d < 30 or 46 <= d <= 59


def _consultar(params: dict) -> list[dict]:
    r = get(URL_CAPTACION, params=params, nombre_fuente="datos.gov.co (Superfinanciera)")
    if r.status_code != 200:
        raise FuenteError(f"datos.gov.co devolvió HTTP {r.status_code}: {r.text[:200]}")
    return r.json()


def cortes_recientes(n: int = 6) -> list[date]:
    """Los últimos n cortes (días hábiles) del dataset, del más reciente al más antiguo."""
    filas = _consultar({
        "$select": "fechacorte", "$group": "fechacorte",
        "$order": "fechacorte DESC", "$limit": n,
    })
    cortes = [datetime.fromisoformat(f["fechacorte"]).date() for f in filas]
    if not cortes:
        raise FuenteError("datos.gov.co no devolvió ningún corte de fecha.")
    return cortes


def descargar_captacion(n_cortes: int = 6, ucas: tuple[str, ...] = ("1", "7")) -> tuple[pd.DataFrame, list[date], str]:
    """Descarga los últimos n cortes de las ucas pedidas.

    Devuelve (DataFrame, lista de cortes, URL efectiva de la consulta).
    Columnas: tipoentidad, codigoentidad (int), nombreentidad, fecha (datetime), uca, subcuenta (int),
    descripcion, tasa (% EA, float), monto_miles (float).
    """
    cortes = cortes_recientes(n_cortes)
    desde = min(cortes).strftime("%Y-%m-%dT00:00:00.000")
    lista_uca = ",".join(f"'{u}'" for u in ucas)
    params = {
        "$where": f"fechacorte>='{desde}' AND uca in({lista_uca})",
        "$limit": LIMITE,
        "$select": "tipoentidad,codigoentidad,nombreentidad,fechacorte,uca,subcuenta,descripcion,tasa,monto",
    }
    filas = _consultar(params)
    if len(filas) >= LIMITE:
        raise FuenteError("La consulta alcanzó el límite de 50.000 filas; reduzca n_cortes.")
    df = pd.DataFrame(filas)
    if df.empty:
        raise FuenteError("datos.gov.co devolvió 0 filas para las ucas pedidas.")
    df["tipoentidad"] = df["tipoentidad"].astype(int)
    df["codigoentidad"] = df["codigoentidad"].astype(int)
    df["uca"] = df["uca"].astype(int)
    df["subcuenta"] = df["subcuenta"].astype(int)
    df["fecha"] = pd.to_datetime(df["fechacorte"])
    df["tasa"] = pd.to_numeric(df["tasa"], errors="coerce")
    df["monto_miles"] = pd.to_numeric(df["monto"], errors="coerce")
    df = df.drop(columns=["fechacorte", "monto"])
    url = f"{URL_CAPTACION}?$where={params['$where']}&$limit={LIMITE}"
    return df, cortes, url


def entidades_faltantes(df: pd.DataFrame, entidades: pd.DataFrame) -> list[str]:
    """Nombres cortos de entidades de entidades.csv cuya pareja (tipo, código) no aparece en el dataset."""
    presentes = set(zip(df["tipoentidad"], df["codigoentidad"]))
    return [r.nombre_corto for r in entidades.itertuples()
            if (int(r.tipoentidad), int(r.codigoentidad)) not in presentes]


def seleccionar(df: pd.DataFrame, entidades: pd.DataFrame, uca: int, subcuenta: int,
                cortes: list[date], max_rezago: int = 5) -> pd.DataFrame:
    """Una fila por entidad de entidades.csv con la tasa más reciente válida para (uca, subcuenta).

    Reglas de calidad:
      * tasa <= 0 o > 25  -> se descarta la fila (dato atípico) y se sigue buscando hacia atrás;
      * si no hay dato válido en los últimos `max_rezago`+1 cortes -> estado "Sin dato" o "Dato atípico";
        NUNCA se inventa una tasa;
      * monto < 50.000 (miles de pesos = $50 millones) -> alerta "Baja representatividad".
    RezagoCortes = cuántos cortes atrás está el dato usado respecto del corte más reciente.
    """
    cortes_ord = sorted(cortes, reverse=True)[: max_rezago + 1]
    fecha_a_rezago = {pd.Timestamp(c): i for i, c in enumerate(cortes_ord)}
    sub = df[(df["uca"] == uca) & (df["subcuenta"] == subcuenta) & (df["fecha"].isin(fecha_a_rezago))]
    filas = []
    for e in entidades.itertuples():
        d = sub[(sub["tipoentidad"] == int(e.tipoentidad)) & (sub["codigoentidad"] == int(e.codigoentidad))]
        d = d.sort_values("fecha", ascending=False)
        base = {
            "Categoria": e.categoria, "Entidad": e.nombre_corto, "MarcaComercial": e.marca_comercial or "",
            "TipoEntidad": int(e.tipoentidad), "CodigoEntidad": int(e.codigoentidad),
            "Subcuenta": subcuenta, "PlazoDescripcion": DESC_SUBCUENTA.get(subcuenta, f"subcuenta {subcuenta}") if uca == 1
            else "Ahorro activo persona natural",
        }
        validas = d[(d["tasa"] > 0) & (d["tasa"] <= 25)]
        if not validas.empty:
            r = validas.iloc[0]
            alerta = "Baja representatividad" if r["monto_miles"] < 50000 else ""
            base.update(TasaEA=float(r["tasa"]) / 100.0, MontoCaptadoMiles=float(r["monto_miles"]),
                        FechaCorte=r["fecha"].date(), RezagoCortes=int(fecha_a_rezago[r["fecha"]]),
                        Estado="OK", Alerta=alerta)
        else:
            estado = "Dato atípico" if not d.empty else "Sin dato"
            base.update(TasaEA=None, MontoCaptadoMiles=None, FechaCorte=None, RezagoCortes=None,
                        Estado=estado, Alerta="")
        filas.append(base)
    return pd.DataFrame(filas)


def mejor_cdt(entidades_csv, plazo: int = 360, n_cortes: int = 6) -> dict:
    """Mejor tasa de CDT hoy entre las entidades de entidades.csv que emiten CDT (uca 1).

    Se excluyen las filas con alerta de baja representatividad (menos de $50 millones captados) para que un
    dato marginal no fije la tasa de partida. Devuelve {entidad, tasa (fracción), fecha_corte, subcuenta, url, n}.
    """
    ent = pd.read_csv(entidades_csv, encoding="utf-8", dtype={"marca_comercial": str}).fillna("")
    ent = ent[ent["ofrece_cdt"] == "si"]
    df, cortes, url = descargar_captacion(n_cortes, ucas=("1",))
    sub = plazo_a_subcuenta(plazo)
    sel = seleccionar(df, ent, 1, sub, cortes)
    ok = sel[(sel["Estado"] == "OK") & (sel["Alerta"] == "")]
    if ok.empty:
        raise FuenteError("Ninguna entidad tiene dato representativo de CDT en la Superfinanciera para ese plazo.")
    mejor = ok.sort_values("TasaEA", ascending=False).iloc[0]
    return {"entidad": mejor["Entidad"], "tasa": float(mejor["TasaEA"]), "fecha_corte": mejor["FechaCorte"],
            "subcuenta": sub, "url": url, "n_entidades": int(len(ok)), "rezago": int(mejor["RezagoCortes"])}
