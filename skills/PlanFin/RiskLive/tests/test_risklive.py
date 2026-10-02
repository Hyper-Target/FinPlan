"""Tests de RiskLive. No usan internet: trabajan con una calibración sintética.

Ejecutar:  python -m pytest skills/PlanFin/RiskLive/tests -q
"""
import copy
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

AQUI = Path(__file__).resolve().parent
PLANFIN = AQUI.parent.parent
sys.path.insert(0, str(PLANFIN / "_shared" / "scripts"))
sys.path.insert(0, str(PLANFIN / "RiskLive" / "scripts"))

import calibracion as cb  # noqa: E402
import risklive as rl  # noqa: E402
import simulacion as sm  # noqa: E402
import tasas as tx  # noqa: E402

CAL = cb.calibracion_sintetica()
PESOS = (0.6, 0.25, 0.15)


def _cal_sin_vol():
    c = copy.deepcopy(CAL)
    for k in ("COLCAP", "TRM", "CDT", "IPC"):
        c[k]["sigma"] = 0.0
    return c


def _macro(cal, n=200, T=36, seed=7, ret=0.04, dist="normal"):
    z = sm.generar_shocks(seed, n, T, cal["corr"]["cholesky"], dist, cal["df_t"])
    return sm.macro_estocastico(cal, z, ret), z


# ------------------------------------------------------------------ determinismo y volatilidad cero
@pytest.mark.parametrize("modo", ["mensual", "anual", "ninguno"])
@pytest.mark.parametrize("con_ipc", [True, False])
def test_volatilidad_cero_coincide_con_escenario_esperado(modo, con_ipc):
    c0 = _cal_sin_vol()
    macro, _ = _macro(c0, n=10, T=48)
    r = sm.correr(macro, PESOS, 5e6, 1e6, con_ipc, modo)
    det = sm.ledger_deterministico(c0, PESOS, 5e6, 1e6, 48, con_ipc, modo, 0.04)
    assert np.abs(r["nominal"][:, -1] - det["final_nominal"]).max() < 1e-6
    assert np.abs(r["real"][:, -1] - det["final_real"]).max() < 1e-6


def test_misma_semilla_mismo_resultado_y_distinta_semilla_distinto():
    a, _ = _macro(CAL, seed=42)
    b, _ = _macro(CAL, seed=42)
    c, _ = _macro(CAL, seed=43)
    ra = sm.correr(a, PESOS, 1e6, 1e5, True)["real"][:, -1]
    rb = sm.correr(b, PESOS, 1e6, 1e5, True)["real"][:, -1]
    rc = sm.correr(c, PESOS, 1e6, 1e5, True)["real"][:, -1]
    assert np.array_equal(ra, rb)
    assert not np.array_equal(ra, rc)


def test_sin_rendimientos_ni_inflacion_es_suma_de_aportes():
    c = _cal_sin_vol()
    c["COLCAP"].update(mu=0.0)
    c["TRM"].update(mu=0.0)
    c["IPC"].update(pi0=0.0, b=0.0)
    det = sm.ledger_deterministico(c, (0.0, 0.0, 1.0), 2e6, 3e5, 24, True, "mensual", 0.04)
    assert det["final_nominal"] == pytest.approx(2e6 + 3e5 * 24)
    assert det["final_real"] == pytest.approx(2e6 + 3e5 * 24)


# ------------------------------------------------------------------ linealidad y aporte necesario
def test_combinar_equivale_a_correr_directo():
    macro, _ = _macro(CAL)
    unit = sm.corridas_unitarias(macro, PESOS, True, "anual")
    comb = sm.combinar(unit, 3e6, 7e5)
    directo = sm.correr(macro, PESOS, 3e6, 7e5, True, "anual")
    assert np.allclose(comb["nominal"], directo["nominal"], rtol=1e-10)
    assert np.allclose(comb["aportes_reales"], directo["aportes_reales"], rtol=1e-10)


def test_aporte_necesario_sube_con_la_meta_y_logra_el_objetivo():
    macro, _ = _macro(CAL, n=2000, T=60)
    unit = sm.corridas_unitarias(macro, PESOS, True, "mensual")
    a1 = sm.aporte_para_probabilidad(unit, 0.0, 50e6)
    a2 = sm.aporte_para_probabilidad(unit, 0.0, 80e6)
    assert a2 > a1 > 0
    p = sm.estadisticas(sm.combinar(unit, 0.0, a2 * 1.0000001), 80e6)["p_meta"]
    assert p >= 0.80 - 1e-3


def test_aporte_por_cuantil_coincide_con_biseccion():
    macro, _ = _macro(CAL, n=3000, T=60)
    unit = sm.corridas_unitarias(macro, PESOS, True, "mensual")
    q = sm.aporte_para_probabilidad(unit, 5e6, 80e6)
    b = sm.aporte_por_biseccion(unit, 5e6, 80e6)
    assert q == pytest.approx(b, rel=1e-4, abs=50)


def test_aporte_necesario_es_cero_si_el_ahorro_inicial_basta():
    macro, _ = _macro(CAL, n=500, T=24)
    unit = sm.corridas_unitarias(macro, PESOS, True, "mensual")
    assert sm.aporte_para_probabilidad(unit, 1e9, 10e6) == 0.0


# ------------------------------------------------------------------ shocks, Cholesky y correlación
def test_cholesky_de_matriz_conocida():
    c = np.array([[1.0, 0.5], [0.5, 1.0]])
    ll = np.linalg.cholesky(c)
    assert np.allclose(ll, [[1.0, 0.0], [0.5, np.sqrt(0.75)]])
    assert np.allclose(ll @ ll.T, c)


def test_shocks_reproducen_la_correlacion_objetivo():
    z = sm.generar_shocks(1, 20000, 5, CAL["corr"]["cholesky"])
    emp = np.corrcoef(z.reshape(-1, 4).T)
    assert np.abs(emp - CAL["corr"]["matriz"]).max() < 0.02
    assert np.abs(z.reshape(-1, 4).std(axis=0) - 1).max() < 0.02


def test_shocks_t_tienen_varianza_uno_y_colas_pesadas():
    zn = sm.generar_shocks(3, 40000, 3, CAL["corr"]["cholesky"], "normal")[:, :, 0].ravel()
    zt = sm.generar_shocks(3, 40000, 3, CAL["corr"]["cholesky"], "t", 4.0)[:, :, 0].ravel()
    assert zt.std() == pytest.approx(1.0, abs=0.06)
    assert np.percentile(np.abs(zt), 99.9) > np.percentile(np.abs(zn), 99.9)


def test_correccion_psd():
    mala = np.array([[1, 0.9, -0.9], [0.9, 1, 0.9], [-0.9, 0.9, 1]])
    assert np.linalg.eigvalsh(mala).min() < 0
    ok = cb.psd_mas_cercana(mala)
    assert np.linalg.eigvalsh(ok).min() > 0
    assert np.allclose(np.diag(ok), 1.0)
    np.linalg.cholesky(ok)  # no debe fallar


# ------------------------------------------------------------------ calibración estadística
def test_momentos_log_recuperan_parametros():
    rng = np.random.default_rng(5)
    r = rng.normal(0.006, 0.05, 4000)
    precios = pd.Series(100 * np.exp(np.cumsum(r)), index=pd.period_range("2000-01", periods=4000, freq="M"))
    m = cb.momentos_log(precios)
    assert m["mu"] == pytest.approx(0.006, abs=0.003)
    assert m["sigma"] == pytest.approx(0.05, abs=0.003)
    assert not m["normal_rechazada"]


def test_jarque_bera_rechaza_colas_pesadas():
    rng = np.random.default_rng(6)
    r = rng.standard_t(3, 3000) * 0.03
    precios = pd.Series(100 * np.exp(np.cumsum(r)), index=pd.period_range("2000-01", periods=3000, freq="M"))
    assert cb.momentos_log(precios)["normal_rechazada"]


def test_ols_reversion_recupera_a_y_b():
    rng = np.random.default_rng(7)
    a, b, s = 0.10, 0.08, 0.002
    y = [0.05]
    for _ in range(6000):
        y.append(y[-1] + a * (b - y[-1]) + s * rng.standard_normal())
    r = cb.ols_reversion(pd.Series(y))
    assert r["a"] == pytest.approx(a, abs=0.02)
    assert r["b"] == pytest.approx(b, abs=0.005)
    assert r["sigma"] == pytest.approx(s, rel=0.05)


# ------------------------------------------------------------------ estadísticas y utilidades
def test_percentiles_ordenados_y_probabilidad_en_rango():
    macro, _ = _macro(CAL, n=3000, T=60)
    res = sm.combinar(sm.corridas_unitarias(macro, PESOS, True, "mensual"), 5e6, 1e6)
    st = sm.estadisticas(res, 80e6)
    p = st["percentiles"]
    assert p[5] <= p[25] <= p[50] <= p[75] <= p[95]
    assert 0 <= st["p_meta"] <= 1
    assert st["dd_mediana"] >= 0
    pm = sm.percentiles_por_mes(res)
    assert pm.shape == (61, 5) and np.all(np.diff(pm, axis=1) >= -1e-9)


def test_var_negativo_cuando_no_hay_perdida_real():
    res = {"final_real": np.array([120.0, 130.0, 140.0, 150.0] * 25), "aportes_reales": np.full(100, 100.0),
           "final_nominal": np.full(100, 200.0), "drawdown": np.zeros(100)}
    st = sm.estadisticas(res, 125.0)
    assert st["var95"] < 0 and st["p_perdida_real"] == 0.0


def test_pesos_con_colcap_suman_uno_y_mantienen_proporcion():
    for g in (0.0, 0.3, 0.6):
        p = sm.pesos_con_colcap((0.6, 0.25, 0.15), g)
        assert sum(p) == pytest.approx(1.0) and p[1] == pytest.approx(g)
        assert p[0] / p[2] == pytest.approx(0.6 / 0.15)
    assert sm.pesos_con_colcap((0.0, 1.0, 0.0), 0.4) == (0.6, 0.4, 0.0)


def test_histograma_suma_n():
    x = np.random.default_rng(1).normal(100, 10, 5000)
    cuentas, bordes = sm.histograma(x)
    assert cuentas.sum() == 5000 and len(bordes) == 31


def test_cdt_mensual_usa_la_misma_conversion_de_tasas_que_shared():
    y = np.array([0.08, 0.135])
    esperado = tx.ea_a_periodica(y, 365 / 12, 365) * 0.96
    assert np.allclose(sm._cdt_mensual_neto(y, 0.04), esperado)


def test_tir_robusta_en_flujos_mensuales_largos():
    flujos = [-5e6] + [-1e6] * 59 + [93e6]
    r = tx.tir(flujos)
    assert 0.0 < r < 0.05
    assert sum(f / (1 + r) ** t for t, f in enumerate(flujos)) == pytest.approx(0, abs=1e-3)


def test_flujo_neto_del_escenario_esperado_tiene_tir_positiva():
    par = {"ahorro0": 5e6, "aporte": 1e6, "meses": 60, "con_ipc": True, "pesos": PESOS, "rebalanceo": "mensual", "retencion": 0.04}
    det = sm.ledger_deterministico(CAL, PESOS, 5e6, 1e6, 60, True, "mensual", 0.04)
    net = rl.flujo_neto_det(par, det)
    assert len(net) == 61 and net[0] == -5e6
    assert tx.tir(net) > 0


# ------------------------------------------------------------------ entradas
def test_parsear_pesos():
    assert rl.parsear_pesos("60,25,15") == (0.6, 0.25, 0.15)
    with pytest.raises(ValueError):
        rl.parsear_pesos("60,25")
    with pytest.raises(ValueError):
        rl.parsear_pesos("60,25,20")
    with pytest.raises(ValueError):
        rl.parsear_pesos("120,-10,-10")


def test_chequeo_volatilidad_cero_del_script():
    par = {"seed": 42, "meses": 36, "pesos": PESOS, "ahorro0": 2e6, "aporte": 5e5, "con_ipc": True, "rebalanceo": "mensual", "retencion": 0.04}
    ok, dif = rl.chequeo_volatilidad_cero(par, CAL)
    assert ok and dif < 1e-6
