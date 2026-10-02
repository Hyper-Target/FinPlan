"""Calibración de RiskLive con datos oficiales en vivo (BanRep, Superfinanciera, DANE).

Produce un diccionario `cal` con todo lo que necesita la simulación y la hoja `Calibracion` del Excel.
Todas las tasas van como fracciones (0,12 = 12 %). Los pasos son mensuales.

Modelos:
  COLCAP y TRM  retorno logarítmico mensual  r = ln(P_t / P_{t-1}) ~ N(mu, sigma²)   (o t de Student con --dist t)
  Renta fija    tasa de CDT a 360 días del sistema (serie BanRep 240) con reversión a la media (Vasicek discreto):
                x_{t+1} - x_t = a (b - x_t) + sigma * eps   (a, b, sigma por MCO)
                y_t = x_t + spread   con   spread = mejor tasa de hoy (Superfinanciera) - tasa del sistema hoy
  Inflación     pi_{t+1} - pi_t = a (b - pi_t) + sigma * eps, con b = meta de inflación del BanRep en base mensual
  Correlación   matriz de los shocks estandarizados [COLCAP, TRM, CDT, IPC]; Cholesky (con corrección PSD si hace falta)
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "_shared" / "scripts"))

import fuentes_banrep as br  # noqa: E402
import fuentes_dane as dn  # noqa: E402
import fuentes_sfc as sfc  # noqa: E402
from _http import FuenteError  # noqa: E402

NOMBRES_SHOCK = ["COLCAP", "TRM", "CDT", "IPC"]
MIN_OBS = 60  # mínimo de observaciones mensuales por serie
CDT_MIN, CDT_MAX = 0.005, 0.30
INF_MIN, INF_MAX = -0.01, 0.03  # inflación mensual acotada en la simulación


def mensual(df: pd.DataFrame, columna: str = "valor") -> pd.Series:
    """Último dato de cada mes, indexado por periodo mensual."""
    s = df.set_index("fecha")[columna].sort_index()
    m = s.resample("ME").last().dropna()
    m.index = m.index.to_period("M")
    return m


def recortar_ventana(s: pd.Series, hoy: date, ventana_anios: int) -> pd.Series:
    """Deja los últimos `ventana_anios` años (más 1 mes para poder diferenciar)."""
    fin = pd.Period(hoy, "M")
    ini = fin - (12 * ventana_anios)
    return s[(s.index >= ini) & (s.index <= fin)]


def momentos_log(precios: pd.Series) -> dict:
    """mu, sigma, asimetría, curtosis en exceso y Jarque-Bera del retorno logarítmico mensual."""
    r = np.log(precios).diff().dropna()
    n = len(r)
    mu, sigma = float(r.mean()), float(r.std(ddof=1))
    jb, p = stats.jarque_bera(r)
    return {"mu": mu, "sigma": sigma, "asimetria": float(stats.skew(r)), "curtosis_exceso": float(stats.kurtosis(r)),
            "jb": float(jb), "jb_p": float(p), "normal_rechazada": bool(p < 0.05), "n_obs": n, "serie": r}


def ols_reversion(y: pd.Series) -> dict:
    """Vasicek discreto por MCO: dy_t = alfa + beta * y_{t-1} + e   ->   a = -beta, b = alfa / a, sigma = std(e)."""
    y = y.dropna()
    dy = y.diff().dropna()
    x = y.shift(1).loc[dy.index]
    X = np.column_stack([np.ones(len(x)), x.values])
    coef, *_ = np.linalg.lstsq(X, dy.values, rcond=None)
    alfa, beta = float(coef[0]), float(coef[1])
    resid = dy.values - X @ coef
    a = -beta
    b = alfa / a if a != 0 else float("nan")
    sigma = float(resid.std(ddof=2))
    ss_tot = float(((dy.values - dy.values.mean()) ** 2).sum())
    r2 = 1 - float((resid ** 2).sum()) / ss_tot if ss_tot > 0 else float("nan")
    return {"a": a, "b": b, "sigma": sigma, "r2": r2, "n_obs": len(dy), "residuos": pd.Series(resid, index=dy.index),
            "alfa": alfa, "beta": beta}


def psd_mas_cercana(c: np.ndarray, eps: float = 1e-6) -> np.ndarray:
    """Corrige una matriz de correlación no definida positiva: recorta autovalores y reescala la diagonal a 1."""
    w, v = np.linalg.eigh((c + c.T) / 2)
    w = np.clip(w, eps, None)
    m = v @ np.diag(w) @ v.T
    d = np.sqrt(np.diag(m))
    m = m / np.outer(d, d)
    np.fill_diagonal(m, 1.0)
    return m


def matriz_correlacion(residuos: pd.DataFrame) -> dict:
    """Correlación de los shocks estandarizados y verificación de que sea definida positiva."""
    c = residuos.corr().values
    w = np.linalg.eigvalsh(c)
    min_eig = float(w.min())
    corregida = False
    if min_eig <= 1e-8:
        c = psd_mas_cercana(c)
        corregida = True
    chol = np.linalg.cholesky(c)
    return {"matriz": c, "cholesky": chol, "min_autovalor": min_eig, "psd_ok": not corregida, "corregida": corregida,
            "n_obs": len(residuos)}


def calibrar(hoy: date | None = None, ventana_anios: int = 10, entidades_csv: str | Path | None = None,
             plazo_cdt: int = 360) -> dict:
    """Descarga y calibra todo. Lanza FuenteError si falta una fuente o hay menos de 60 observaciones."""
    hoy = hoy or date.today()
    avisos: list[str] = []
    fuentes: list[dict] = []

    def cargar(id_serie: int, nombre: str) -> pd.Series:
        df, meta = br.serie(id_serie, hoy)
        s = recortar_ventana(mensual(df), hoy, ventana_anios)
        if len(s) < MIN_OBS + 1:
            raise FuenteError(f"La serie {nombre} (BanRep {id_serie}) tiene {len(s)} meses en la ventana; "
                              f"se necesitan al menos {MIN_OBS + 1}. Amplíe --ventana-anios o informe al usuario.")
        fuentes.append({"nombre": nombre, "id": id_serie, "url": meta["url"], "ultimo": df.iloc[-1]["fecha"].date(),
                        "valor_ultimo": float(df.iloc[-1]["valor"]), "n_meses": len(s)})
        return s

    colcap = cargar(br.SERIES["COLCAP"], "COLCAP")
    trm = cargar(br.SERIES["TRM"], "TRM")
    cdt_sis = cargar(br.SERIES["CDT360"], "CDT 360 días (sistema)") / 100.0
    m_col, m_trm = momentos_log(colcap), momentos_log(trm)

    # --- renta fija ---
    rev = ols_reversion(cdt_sis)
    x0 = float(br.ultimo(br.SERIES["CDT360"], hoy)["valor"]) / 100.0
    modo = "vasicek"
    a, b, sig = rev["a"], rev["b"], rev["sigma"]
    if not (0 < a <= 1) or not (0.01 <= b <= 0.30):
        modo = "paseo_aleatorio"
        avisos.append(f"Reversión a la media inestable en la tasa de CDT (a={a:.4f}, b={b:.4f}); se usa un camino "
                      "aleatorio acotado sin reversión (la tasa esperada queda constante).")
        d = cdt_sis.diff().dropna()
        a, b, sig = 0.0, x0, float(d.std(ddof=1))
    try:
        mejor = sfc.mejor_cdt(entidades_csv or (Path(__file__).resolve().parents[2] / "CDTLive" / "entidades.csv"), plazo_cdt)
        y0, spread = mejor["tasa"], mejor["tasa"] - x0
        fuentes.append({"nombre": f"Mejor CDT {plazo_cdt} días (Superfinanciera)", "id": "axk9-g2nh", "url": mejor["url"],
                        "ultimo": mejor["fecha_corte"], "valor_ultimo": mejor["tasa"], "n_meses": 0})
        cdt_origen = f"{mejor['entidad']} (Superfinanciera, corte {mejor['fecha_corte']})"
    except FuenteError as e:
        y0, spread, mejor = x0, 0.0, None
        avisos.append(f"Superfinanciera no disponible; la renta fija parte de la tasa del sistema ({x0:.4f}). Detalle: {e}")
        cdt_origen = "Promedio del sistema (BanRep serie 240); la Superfinanciera no respondió"

    # --- inflación ---
    idx, url_ipc = dn.descargar_indices(hoy)
    infl_m = dn.inflacion_mensual(idx)
    infl_m.index = infl_m["fecha"].dt.to_period("M")
    pi = recortar_ventana(infl_m["inflacion_mensual"], hoy, ventana_anios)
    if len(pi) < MIN_OBS + 1:
        raise FuenteError(f"El IPC del DANE tiene {len(pi)} meses en la ventana; se necesitan al menos {MIN_OBS + 1}.")
    ipc12 = dn.inflacion_12m(idx)
    meta_u = br.ultimo(br.SERIES["META_INFLACION"], hoy)
    meta_anual = meta_u["valor"] / 100.0
    b_inf = (1 + meta_anual) ** (1 / 12) - 1
    pi0 = (1 + ipc12["valor"]) ** (1 / 12) - 1
    dpi = pi.diff().dropna()
    xr = (b_inf - pi.shift(1)).loc[dpi.index]
    a_inf = float((xr * dpi).sum() / (xr ** 2).sum())
    if not (0 < a_inf <= 1):
        avisos.append(f"Velocidad de reversión de la inflación fuera de rango (a={a_inf:.4f}); se fija en 0,10.")
        a_inf = 0.10
    resid_inf = dpi - a_inf * xr
    sig_inf = float(resid_inf.std(ddof=1))
    fuentes.append({"nombre": "IPC total nacional (DANE)", "id": "", "url": url_ipc, "ultimo": ipc12["fecha"],
                    "valor_ultimo": ipc12["valor"], "n_meses": len(pi)})
    fuentes.append({"nombre": "Meta de inflación (BanRep)", "id": br.SERIES["META_INFLACION"], "url": meta_u["url"],
                    "ultimo": meta_u["fecha"], "valor_ultimo": meta_anual, "n_meses": 0})

    # --- correlaciones (shocks estandarizados sobre los meses comunes) ---
    panel = pd.concat({
        "COLCAP": (m_col["serie"] - m_col["mu"]) / m_col["sigma"],
        "TRM": (m_trm["serie"] - m_trm["mu"]) / m_trm["sigma"],
        "CDT": rev["residuos"] / rev["sigma"],
        "IPC": resid_inf / sig_inf,
    }, axis=1).dropna()
    if len(panel) < MIN_OBS:
        raise FuenteError(f"Solo {len(panel)} meses comunes entre las series; se necesitan al menos {MIN_OBS}.")
    corr = matriz_correlacion(panel[NOMBRES_SHOCK])
    if corr["corregida"]:
        avisos.append(f"La matriz de correlación no era definida positiva (autovalor mínimo {corr['min_autovalor']:.2e}); "
                      "se aplicó la corrección a la matriz PSD más cercana.")

    # grados de libertad de la t de Student (retornos estandarizados de COLCAP) para --dist t
    z = panel["COLCAP"].values
    try:
        df_t = float(np.clip(stats.t.fit(z)[0], 3.0, 30.0))
    except Exception:  # noqa: BLE001
        df_t = 5.0

    def limpio(m: dict) -> dict:
        return {k: v for k, v in m.items() if k != "serie"}

    cal = {
        "hoy": hoy, "ventana_anios": ventana_anios,
        "COLCAP": {**limpio(m_col), "ultimo": fuentes[0]["valor_ultimo"]},
        "TRM": {**limpio(m_trm), "ultimo": fuentes[1]["valor_ultimo"]},
        "CDT": {"modo": modo, "a": a, "b": b, "sigma": sig, "x0": x0, "spread": spread, "y0": y0, "r2": rev["r2"],
                "n_obs": rev["n_obs"], "origen": cdt_origen, "mejor": mejor, "min": CDT_MIN, "max": CDT_MAX},
        "IPC": {"a": a_inf, "b": b_inf, "sigma": sig_inf, "pi0": pi0, "meta_anual": meta_anual, "ipc12m": ipc12["valor"],
                "fecha_ipc": ipc12["fecha"], "n_obs": len(dpi), "min": INF_MIN, "max": INF_MAX},
        "corr": corr, "df_t": df_t, "avisos": avisos, "fuentes": fuentes,
        # frescura: solo series diarias (el IPC y la meta de inflación son mensuales/anuales)
        "fecha_datos": min(f["ultimo"] for f in fuentes if not f["nombre"].startswith(("IPC", "Meta"))),
        "n_obs_min": min(m_col["n_obs"], m_trm["n_obs"], rev["n_obs"], len(dpi), len(panel)),
    }
    return cal


def calibracion_sintetica(**kw) -> dict:
    """Calibración fija para tests (sin red). Los valores son razonables para Colombia."""
    c = np.array([[1, 0.10, 0.0, -0.05], [0.10, 1, 0.15, 0.10], [0.0, 0.15, 1, 0.2], [-0.05, 0.10, 0.2, 1]])
    cal = {
        "hoy": date(2026, 9, 29), "ventana_anios": 10,
        "COLCAP": {"mu": 0.004, "sigma": 0.055, "asimetria": -0.3, "curtosis_exceso": 1.0, "jb": 5.0, "jb_p": 0.08,
                   "normal_rechazada": False, "n_obs": 120, "ultimo": 2558.92},
        "TRM": {"mu": 0.004, "sigma": 0.03, "asimetria": 0.2, "curtosis_exceso": 0.5, "jb": 2.0, "jb_p": 0.4,
                "normal_rechazada": False, "n_obs": 120, "ultimo": 3349.63},
        "CDT": {"modo": "vasicek", "a": 0.05, "b": 0.08, "sigma": 0.004, "x0": 0.12, "spread": 0.014, "y0": 0.134,
                "r2": 0.03, "n_obs": 120, "origen": "sintética", "mejor": None, "min": CDT_MIN, "max": CDT_MAX},
        "IPC": {"a": 0.3, "b": (1.03) ** (1 / 12) - 1, "sigma": 0.003, "pi0": (1.0625) ** (1 / 12) - 1,
                "meta_anual": 0.03, "ipc12m": 0.0625, "fecha_ipc": date(2026, 8, 31), "n_obs": 120, "min": INF_MIN,
                "max": INF_MAX},
        "corr": {"matriz": c, "cholesky": np.linalg.cholesky(c), "min_autovalor": float(np.linalg.eigvalsh(c).min()),
                 "psd_ok": True, "corregida": False, "n_obs": 120},
        "df_t": 5.0, "avisos": [], "fuentes": [], "fecha_datos": date(2026, 9, 25), "n_obs_min": 120,
    }
    for k, v in kw.items():
        cal[k] = v
    return cal
