"""Simulación Monte Carlo de RiskLive (numpy vectorizado, semilla fija).

Calendario de un mes t = 1..T (convención del libro de caja del profe: periodo 0 = depósito inicial,
aportes al final de cada periodo):
  1. el saldo de cada activo rinde durante el mes: saldo_i * (1 + r_i,t);
     (antes de rendir, si toca rebalancear, el saldo total se reparte según los pesos);
  2. al final del mes entra el aporte C_t, repartido según los pesos;
  C_t = A * inflación_acumulada_{t-1}  si el aporte crece con el IPC, o  A  si es fijo.

Activos:  CDT (tasa EA simulada, convertida a mensual, menos retención sobre el rendimiento),
          COLCAP (retorno lognormal), USD (variación de la TRM, efectivo en dólares sin rendimiento propio).

Linealidad: el valor final = ahorro_inicial * f0 + aporte * f1 con f0 y f1 dependientes solo de los shocks.
Por eso se simulan una vez dos corridas unitarias y cualquier combinación (ahorro, aporte) se obtiene sin volver a simular.
"""
from __future__ import annotations

import numpy as np

ACTIVOS = ["CDT", "COLCAP", "USD"]


# ------------------------------------------------------------------ shocks
def generar_shocks(seed: int, n_sim: int, meses: int, cholesky: np.ndarray, dist: str = "normal",
                   df_t: float = 5.0) -> np.ndarray:
    """Shocks correlacionados de varianza 1, forma (n_sim, meses, 4) en el orden [COLCAP, TRM, CDT, IPC]."""
    rng = np.random.default_rng(seed)
    z = rng.standard_normal((n_sim, meses, cholesky.shape[0]))
    if dist == "t":
        w = rng.chisquare(df_t, size=(n_sim, meses, 1)) / df_t
        z = z / np.sqrt(w) * np.sqrt((df_t - 2) / df_t)  # t de Student con varianza 1
    return z @ cholesky.T


# ------------------------------------------------------------------ macro
def _cdt_mensual_neto(y_ea: np.ndarray, retencion: float) -> np.ndarray:
    return ((1.0 + y_ea) ** (1.0 / 12.0) - 1.0) * (1.0 - retencion)


def macro_estocastico(cal: dict, z: np.ndarray, retencion: float) -> dict:
    """Trayectorias simuladas de inflación, tasa de CDT y retornos. Todas con forma (n_sim, meses)."""
    n, T, _ = z.shape
    ipc, cdt = cal["IPC"], cal["CDT"]
    pi = np.empty((n, T))
    x = np.empty((n, T))
    p_prev = np.full(n, ipc["pi0"])
    x_prev = np.full(n, cdt["x0"])
    for t in range(T):
        p_prev = np.clip(p_prev + ipc["a"] * (ipc["b"] - p_prev) + ipc["sigma"] * z[:, t, 3], ipc["min"], ipc["max"])
        x_prev = np.clip(x_prev + cdt["a"] * (cdt["b"] - x_prev) + cdt["sigma"] * z[:, t, 2], cdt["min"], cdt["max"])
        pi[:, t], x[:, t] = p_prev, x_prev
    y = np.clip(x + cdt["spread"], cdt["min"], cdt["max"])
    cum = np.concatenate([np.ones((n, 1)), np.cumprod(1.0 + pi, axis=1)], axis=1)  # (n, T+1), cum[:,0] = 1
    return {
        "pi": pi, "cum": cum, "y": y,
        "r_cdt": _cdt_mensual_neto(y, retencion),
        "r_col": np.exp(cal["COLCAP"]["mu"] + cal["COLCAP"]["sigma"] * z[:, :, 0]) - 1.0,
        "r_usd": np.exp(cal["TRM"]["mu"] + cal["TRM"]["sigma"] * z[:, :, 1]) - 1.0,
    }


def macro_deterministico(cal: dict, meses: int, retencion: float) -> dict:
    """Escenario esperado (sin shocks). Forma (1, meses) para reutilizar el mismo motor.

    Inflación y CDT siguen su reversión a la media sin ruido; COLCAP y USD usan el retorno aritmético esperado
    exp(mu + sigma²/2) - 1 de un retorno logarítmico normal. Son las mismas fórmulas de la hoja Modelo_Base.
    """
    t = np.arange(1, meses + 1)
    ipc, cdt = cal["IPC"], cal["CDT"]
    pi = ipc["b"] + (ipc["pi0"] - ipc["b"]) * (1 - ipc["a"]) ** t
    x = cdt["b"] + (cdt["x0"] - cdt["b"]) * (1 - cdt["a"]) ** t
    y = x + cdt["spread"]
    cum = np.concatenate([[1.0], np.cumprod(1.0 + pi)])
    col, trm = cal["COLCAP"], cal["TRM"]
    return {
        "pi": pi[None, :], "cum": cum[None, :], "y": y[None, :],
        "r_cdt": _cdt_mensual_neto(y, retencion)[None, :],
        "r_col": np.full((1, meses), np.exp(col["mu"] + col["sigma"] ** 2 / 2) - 1.0),
        "r_usd": np.full((1, meses), np.exp(trm["mu"] + trm["sigma"] ** 2 / 2) - 1.0),
    }


# ------------------------------------------------------------------ motor de la cartera
def correr(macro: dict, pesos: tuple[float, float, float], ahorro0: float, aporte: float, con_ipc: bool,
           rebalanceo: str = "mensual") -> dict:
    """Corre la cartera para todas las simulaciones a la vez.

    Devuelve las trayectorias del saldo total nominal y real (n, T+1), la aportación real total (n,) y los saldos
    por activo del último periodo. Los pesos van en el orden [CDT, COLCAP, USD].
    """
    w = np.asarray(pesos, dtype=float)
    n, T = macro["r_cdt"].shape
    cum = macro["cum"]
    bal = np.tile(w * ahorro0, (n, 1))
    nominal = np.empty((n, T + 1))
    nominal[:, 0] = ahorro0
    aportes_reales = np.full(n, float(ahorro0))
    rets = np.stack([macro["r_cdt"], macro["r_col"], macro["r_usd"]], axis=2)  # (n, T, 3)
    for t in range(1, T + 1):
        if rebalanceo == "mensual" or (rebalanceo == "anual" and (t - 1) % 12 == 0):
            base = bal.sum(axis=1, keepdims=True) * w
        else:
            base = bal
        bal = base * (1.0 + rets[:, t - 1, :])
        c = aporte * (cum[:, t - 1] if con_ipc else np.ones(n))
        bal = bal + w * c[:, None]
        nominal[:, t] = bal.sum(axis=1)
        aportes_reales += c / cum[:, t]
    real = nominal / cum
    return {"nominal": nominal, "real": real, "aportes_reales": aportes_reales, "saldos_finales": bal}


def maximo_drawdown(real: np.ndarray) -> np.ndarray:
    """Mayor caída porcentual del saldo real desde su máximo previo, por simulación (valor positivo)."""
    pico = np.maximum.accumulate(real, axis=1)
    with np.errstate(divide="ignore", invalid="ignore"):
        dd = np.where(pico > 0, 1.0 - real / pico, 0.0)
    return dd.max(axis=1)


def corridas_unitarias(macro: dict, pesos, con_ipc: bool, rebalanceo: str) -> dict:
    """Dos corridas: (ahorro inicial 1, aporte 0) y (ahorro inicial 0, aporte 1). Base de la linealidad."""
    u0 = correr(macro, pesos, 1.0, 0.0, con_ipc, rebalanceo)
    u1 = correr(macro, pesos, 0.0, 1.0, con_ipc, rebalanceo)
    return {"u0": u0, "u1": u1}


def combinar(unit: dict, ahorro0: float, aporte: float) -> dict:
    """Resultado para cualquier (ahorro inicial, aporte) sin volver a simular."""
    u0, u1 = unit["u0"], unit["u1"]
    nominal = ahorro0 * u0["nominal"] + aporte * u1["nominal"]
    real = ahorro0 * u0["real"] + aporte * u1["real"]
    aportes = ahorro0 * u0["aportes_reales"] + aporte * u1["aportes_reales"]
    return {"nominal": nominal, "real": real, "aportes_reales": aportes,
            "final_nominal": nominal[:, -1], "final_real": real[:, -1], "drawdown": maximo_drawdown(real)}


# ------------------------------------------------------------------ resultados agregados
PERCENTILES = (5, 25, 50, 75, 95)


def estadisticas(res: dict, meta: float) -> dict:
    fr = res["final_real"]
    ganancia = fr - res["aportes_reales"]
    p5_g = float(np.percentile(ganancia, 5))
    cola = ganancia[ganancia <= p5_g]
    return {
        "p_meta": float((fr >= meta).mean()),
        "percentiles": {p: float(np.percentile(fr, p)) for p in PERCENTILES},
        "media": float(fr.mean()), "desv": float(fr.std(ddof=1)),
        "final_nominal_mediana": float(np.median(res["final_nominal"])),
        "aportes_reales_medio": float(res["aportes_reales"].mean()),
        "ganancia_real_mediana": float(np.median(ganancia)),
        "var95": -p5_g,  # pérdida real en el percentil 95 (negativa = todavía hay ganancia en el peor 5 %)
        "cvar95": -float(cola.mean()),
        "p_perdida_real": float((ganancia < 0).mean()),
        "dd_mediana": float(np.median(res["drawdown"])), "dd_p95": float(np.percentile(res["drawdown"], 95)),
    }


def percentiles_por_mes(res: dict) -> np.ndarray:
    """(T+1, 5): percentiles 5, 25, 50, 75, 95 del saldo real en cada mes."""
    return np.percentile(res["real"], PERCENTILES, axis=0).T


def histograma(final_real: np.ndarray, bins: int = 30) -> tuple[np.ndarray, np.ndarray]:
    lo, hi = np.percentile(final_real, [0.5, 99.5])
    cuentas, bordes = np.histogram(np.clip(final_real, lo, hi), bins=bins, range=(lo, hi))
    return cuentas, bordes


def aporte_para_probabilidad(unit: dict, ahorro0: float, meta: float, objetivo: float = 0.80) -> float:
    """Aporte mensual mínimo con el que P(valor real >= meta) >= objetivo, misma semilla.

    Como final = ahorro0*f0 + A*f1 y f1 > 0, el aporte exigido en cada simulación es (meta - ahorro0*f0)/f1 y la
    solución es su cuantil `objetivo`. Es la solución exacta de la búsqueda binaria sobre A. Mínimo 0.
    """
    f0, f1 = unit["u0"]["real"][:, -1], unit["u1"]["real"][:, -1]
    umbral = (meta - ahorro0 * f0) / f1
    return max(0.0, float(np.quantile(umbral, objetivo)))


def aporte_por_biseccion(unit: dict, ahorro0: float, meta: float, objetivo: float = 0.80, tol: float = 1.0) -> float:
    """Verificación independiente de aporte_para_probabilidad por búsqueda binaria (se usa en los tests)."""
    def p(a: float) -> float:
        return float((ahorro0 * unit["u0"]["real"][:, -1] + a * unit["u1"]["real"][:, -1] >= meta).mean())

    lo, hi = 0.0, max(meta, 1.0)
    while p(hi) < objetivo and hi < 1e13:
        hi *= 2
    if p(lo) >= objetivo:
        return 0.0
    while hi - lo > tol:
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if p(mid) < objetivo else (lo, mid)
    return hi


def pesos_con_colcap(pesos: tuple[float, float, float], w_col: float) -> tuple[float, float, float]:
    """Cambia el peso en COLCAP y reparte el resto entre CDT y USD en su proporción original (todo a CDT si ambos son 0)."""
    cdt, _, usd = pesos
    resto = 1.0 - w_col
    if cdt + usd <= 0:
        return (resto, w_col, 0.0)
    return (resto * cdt / (cdt + usd), w_col, resto * usd / (cdt + usd))


def ledger_deterministico(cal: dict, pesos, ahorro0: float, aporte: float, meses: int, con_ipc: bool, rebalanceo: str,
                          retencion: float) -> dict:
    """Corre el escenario esperado y devuelve final nominal/real más las trayectorias (para conciliar con Excel)."""
    macro = macro_deterministico(cal, meses, retencion)
    r = correr(macro, pesos, ahorro0, aporte, con_ipc, rebalanceo)
    return {"final_nominal": float(r["nominal"][0, -1]), "final_real": float(r["real"][0, -1]),
            "nominal": r["nominal"][0], "real": r["real"][0], "cum": macro["cum"][0], "macro": macro,
            "aportes_reales": float(r["aportes_reales"][0]), "saldos_finales": r["saldos_finales"][0]}
