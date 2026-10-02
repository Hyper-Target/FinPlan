"""Banco de la República: API de Suameca (JSON, sin login).

GET .../consultaInformacionSerie?idSerie={ID}  ->  [ {nombre, unidad, ..., data: [[timestamp_ms, valor], ...]} ]
El timestamp es medianoche de Colombia (UTC-5, sin horario de verano) expresada en milisegundos UTC.
"""
from __future__ import annotations

from datetime import date, datetime

import pandas as pd

from _http import FuenteError, get

BASE = ("https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/"
        "estadisticaEconomicaRestService/consultaInformacionSerie")

# IDs verificados el 29-sep-2026
SERIES = {
    "TRM": 1, "COLCAP": 6, "TPM": 59, "DTF90": 65, "TIB": 89,
    "CDT90": 238, "CDT180": 239, "CDT360": 240,
    "IBR_ON": 242, "IBR3M": 243, "UVR": 850, "META_INFLACION": 853,
}

_cache: dict[int, tuple[pd.DataFrame, dict]] = {}


def url_serie(id_serie: int) -> str:
    return f"{BASE}?idSerie={id_serie}"


def serie(id_serie: int, hoy: date | None = None) -> tuple[pd.DataFrame, dict]:
    """Serie completa como DataFrame [fecha, valor], sin fechas futuras, más metadatos.

    Lanza FuenteError si la serie viene vacía.
    """
    hoy = hoy or date.today()
    clave = id_serie
    if clave in _cache:
        df, meta = _cache[clave]
    else:
        r = get(BASE, params={"idSerie": id_serie}, nombre_fuente=f"BanRep Suameca serie {id_serie}",
                permitir_ssl_inseguro=True)
        js = r.json()
        if not js or not js[0].get("data"):
            raise FuenteError(f"La serie {id_serie} del BanRep vino vacía. Repórtelo al usuario; no invente el dato.")
        s = js[0]
        df = pd.DataFrame(s["data"], columns=["ms", "valor"])
        df["fecha"] = (pd.to_datetime(df["ms"], unit="ms") - pd.Timedelta(hours=5)).dt.normalize()
        df = df[["fecha", "valor"]].sort_values("fecha").reset_index(drop=True)
        meta = {"id": id_serie, "nombre": s.get("nombre", ""), "unidad": s.get("unidad", ""),
                "periodicidad": s.get("descripcionPeriodicidad", ""), "url": url_serie(id_serie)}
        _cache[clave] = (df, meta)
    df = df[df["fecha"] <= pd.Timestamp(hoy)]  # la UVR y la TRM se publican por adelantado
    if df.empty:
        raise FuenteError(f"La serie {id_serie} no tiene datos con fecha <= {hoy}.")
    return df.reset_index(drop=True), meta


def ultimo(id_serie: int, hoy: date | None = None) -> dict:
    """Último dato con fecha <= hoy: {fecha, valor, nombre, unidad, url, id}."""
    df, meta = serie(id_serie, hoy)
    fila = df.iloc[-1]
    return {**meta, "fecha": fila["fecha"].date(), "valor": float(fila["valor"])}


def cdt_sistema_por_plazo(plazo_dias: int, hoy: date | None = None) -> dict:
    """Promedio del sistema (BanRep) más cercano al plazo: 90, 180 o 360 días. Valor en % EA."""
    if plazo_dias <= 135:
        id_s = SERIES["CDT90"]
    elif plazo_dias <= 270:
        id_s = SERIES["CDT180"]
    else:
        id_s = SERIES["CDT360"]
    return ultimo(id_s, hoy)
