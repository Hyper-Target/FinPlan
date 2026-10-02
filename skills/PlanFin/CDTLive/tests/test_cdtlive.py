"""Tests de CDTLive y de las utilidades compartidas. No usan internet.

Ejecutar:  python -m pytest skills/PlanFin/CDTLive/tests -q
"""
import io
import sys
from datetime import date
from pathlib import Path

import openpyxl
import pandas as pd
import pytest

AQUI = Path(__file__).resolve().parent
PLANFIN = AQUI.parent.parent
sys.path.insert(0, str(PLANFIN / "_shared" / "scripts"))
sys.path.insert(0, str(PLANFIN / "CDTLive" / "scripts"))

import cdtlive as cl  # noqa: E402
import fuentes_dane as dn  # noqa: E402
import fuentes_sfc as sfc  # noqa: E402
import tasas as tx  # noqa: E402


# ------------------------------------------------------------------ tasas
def test_ea_a_periodica_360_dias():
    assert tx.ea_a_periodica(0.12, 360) == pytest.approx(1.12 ** (360 / 365) - 1)


def test_namv_12_es_ea_12_6825():
    assert tx.nomenclatura_a_ea(0.12, "NAMV") == pytest.approx(0.126825030131969, rel=1e-12)


def test_ea_a_nomenclatura_ida_y_vuelta():
    for nombre in ("NAMV", "NAMA", "NATV", "NATA", "NASV", "NASA"):
        ea = 0.1346
        assert tx.nomenclatura_a_ea(tx.ea_a_nomenclatura(ea, nombre), nombre) == pytest.approx(ea, rel=1e-12)


def test_anticipada_es_menor_que_vencida():
    assert tx.ea_a_nomenclatura(0.12, "NAMA") < tx.ea_a_nomenclatura(0.12, "NAMV")


def test_tasa_real_fisher():
    assert tx.tasa_real(0.1346, 0.0625) == pytest.approx(1.1346 / 1.0625 - 1)


def test_tir_sin_cambio_de_signo_falla():
    with pytest.raises(ValueError):
        tx.tir([100.0, 10.0, 10.0])


def test_tir_simple():
    assert tx.tir([-100.0, 110.0]) == pytest.approx(0.10)


def test_nomenclatura_desconocida():
    with pytest.raises(ValueError):
        tx.factor_nomenclatura("XYZ")


# ------------------------------------------------------------------ subcuentas
@pytest.mark.parametrize("dias,esperada", [
    (30, 10), (45, 30), (60, 50), (90, 70), (120, 90), (180, 110), (360, 130),
    (35, 20), (75, 60), (100, 80), (150, 100), (270, 120), (400, 140), (720, 140),
])
def test_plazo_a_subcuenta(dias, esperada):
    assert sfc.plazo_a_subcuenta(dias) == esperada


def test_subcuenta_40_nunca_se_usa():
    assert all(sfc.plazo_a_subcuenta(d) != 40 for d in range(1, 800))


def test_plazo_aproximado():
    assert sfc.plazo_es_aproximado(50) and sfc.plazo_es_aproximado(20)
    assert not sfc.plazo_es_aproximado(360) and not sfc.plazo_es_aproximado(100)


# ------------------------------------------------------------------ cálculo del CDT
def test_cdt_360_al_vencimiento_a_mano():
    r = cl.calcular_cdt(0.12, 10_000_000, 360, 360, retencion=0.04, ipc12m=0.06)
    ip = 1.12 ** (360 / 365) - 1
    bruto = 10_000_000 * ip
    assert r["InteresBrutoTotal"] == pytest.approx(bruto)
    assert r["RetencionCOP"] == pytest.approx(bruto * 0.04)
    assert r["InteresNeto"] == pytest.approx(bruto * 0.96)
    assert r["ValorFinal"] == pytest.approx(10_000_000 + bruto * 0.96)
    assert r["RentNetaEA"] == pytest.approx((1 + ip * 0.96) ** (365 / 360) - 1)
    assert r["RentRealEA"] == pytest.approx((1 + r["RentNetaEA"]) / 1.06 - 1)


def test_cdt_mensual_12_periodos():
    r = cl.calcular_cdt(0.12, 10_000_000, 360, 30)
    ip = 1.12 ** (30 / 365) - 1
    assert r["NumPeriodos"] == 12
    assert r["InteresBrutoPeriodo"] == pytest.approx(10_000_000 * ip)
    assert r["InteresBrutoTotal"] == pytest.approx(10_000_000 * ip * 12)


def test_plazo_no_multiplo_falla():
    with pytest.raises(ValueError):
        cl.calcular_cdt(0.12, 10_000_000, 100, 30)


@pytest.mark.parametrize("plazo,dp", [(360, 360), (360, 30), (180, 90), (720, 180)])
def test_tir_anualizada_igual_rent_neta(plazo, dp):
    ea, monto, ret = 0.1346, 25_000_000, 0.04
    fl = cl.flujo_neto(monto, plazo, dp, ea, ret)
    tir_p = tx.tir(fl)
    r = cl.calcular_cdt(ea, monto, plazo, dp, ret)
    assert tx.periodica_a_ea(tir_p, dp) == pytest.approx(r["RentNetaEA"], rel=1e-9)
    assert sum(f / (1 + tir_p) ** t for t, f in enumerate(fl)) == pytest.approx(0, abs=1e-4)


def test_alerta_fogafin():
    assert cl.calcular_cdt(0.12, 60_000_000, 360, 360)["AlertaFogafin"] != ""
    assert cl.calcular_cdt(0.12, 10_000_000, 360, 360)["AlertaFogafin"] == ""


def test_ahorro():
    a = cl.calcular_ahorro(0.0883, 10_000_000, 360, 0.04)
    assert a["InteresBrutoAhorro"] == pytest.approx(10_000_000 * (1.0883 ** (360 / 365) - 1))
    assert a["InteresNetoAhorro"] == pytest.approx(a["InteresBrutoAhorro"] * 0.96)


# ------------------------------------------------------------------ regla de rezago y calidad
def _df_falso():
    f = lambda d: pd.Timestamp(d)  # noqa: E731
    filas = [
        # Ent A (1,1): dato en el corte más reciente
        (1, 1, "A", f("2026-09-25"), 1, 130, 11.0, 90000.0),
        # Ent B (1,2): solo en el corte anterior -> rezago 1
        (1, 2, "B", f("2026-09-24"), 1, 130, 12.0, 90000.0),
        # Ent C (1,3): tasa 0 en el último corte y válida hace 2 cortes -> se descarta la atípica y se usa la válida
        (1, 3, "C", f("2026-09-25"), 1, 130, 0.0, 90000.0),
        (1, 3, "C", f("2026-09-23"), 1, 130, 10.0, 90000.0),
        # Ent D (1,4): solo tasa atípica (30 %)
        (1, 4, "D", f("2026-09-25"), 1, 130, 30.0, 90000.0),
        # Ent E (1,5): monto bajo
        (1, 5, "E", f("2026-09-25"), 1, 130, 9.0, 1000.0),
        # Ent F (1,6): dato demasiado viejo (fuera de los 6 cortes)
        (1, 6, "F", f("2026-09-10"), 1, 130, 9.0, 90000.0),
        # Ent A también en otra subcuenta (no debe mezclarse)
        (1, 1, "A", f("2026-09-25"), 1, 70, 5.0, 90000.0),
    ]
    df = pd.DataFrame(filas, columns=["tipoentidad", "codigoentidad", "nombreentidad", "fecha", "uca", "subcuenta",
                                      "tasa", "monto_miles"])
    ent = pd.DataFrame({"tipoentidad": [1] * 7, "codigoentidad": [1, 2, 3, 4, 5, 6, 7],
                        "nombre_corto": list("ABCDEFG"), "categoria": ["Banco tradicional"] * 7,
                        "marca_comercial": [""] * 7})
    cortes = [date(2026, 9, 25), date(2026, 9, 24), date(2026, 9, 23), date(2026, 9, 22), date(2026, 9, 21), date(2026, 9, 18)]
    return df, ent, cortes


def test_seleccion_reglas_de_calidad():
    df, ent, cortes = _df_falso()
    r = sfc.seleccionar(df, ent, 1, 130, cortes).set_index("Entidad")
    assert r.loc["A", "TasaEA"] == pytest.approx(0.11) and r.loc["A", "RezagoCortes"] == 0
    assert r.loc["B", "TasaEA"] == pytest.approx(0.12) and r.loc["B", "RezagoCortes"] == 1
    assert r.loc["C", "TasaEA"] == pytest.approx(0.10) and r.loc["C", "RezagoCortes"] == 2
    assert r.loc["D", "Estado"] == "Dato atípico" and pd.isna(r.loc["D", "TasaEA"])
    assert r.loc["E", "Alerta"] == "Baja representatividad"
    assert r.loc["F", "Estado"] == "Sin dato" and pd.isna(r.loc["F", "TasaEA"])
    assert r.loc["G", "Estado"] == "Sin dato"


def test_entidades_faltantes():
    df, ent, _ = _df_falso()
    assert sfc.entidades_faltantes(df, ent) == ["G"]


# ------------------------------------------------------------------ DANE
def _xlsx_ipc():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "IndicesIPC"
    ws.append([])
    ws.append(["Total, Índice de Precios al Consumidor"])
    ws.append([])
    ws.append([])
    ws.append(["Índices"])
    ws.append([])
    ws.append([])
    ws.append([])
    anios = [2024, 2025, 2026]
    ws.append(["Mes"] + anios)
    valores = {2024: 100.0, 2025: 106.0, 2026: 112.36}
    meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre",
             "Noviembre", "Diciembre"]
    for i, m in enumerate(meses):
        fila = [m]
        for a in anios:
            fila.append(round(valores[a] + i * 0.1, 4) if not (a == 2026 and i > 7) else None)
        ws.append(fila)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_dane_parsea_y_calcula_inflacion():
    df = dn.parsear_indices(_xlsx_ipc())
    assert df.iloc[-1]["fecha"] == pd.Timestamp("2026-08-31")
    inf = dn.inflacion_12m(df)
    assert inf["valor"] == pytest.approx((112.36 + 0.7) / (106.0 + 0.7) - 1, rel=1e-9)


def test_dane_url():
    assert dn.url_indices(2026, 8).endswith("/ago2026/anex-IPC-Indices-ago2026.xlsx")


# ------------------------------------------------------------------ interpretaciones del modelo
def test_normalizar_numero():
    assert cl.normalizar_numero("11,50") == "11.50"
    assert cl.normalizar_numero("1.273.334") == "1273334"
    assert cl.normalizar_numero("13.5") == "13.5"


def test_validar_interpretacion_max_3_frases():
    perm = cl.numeros_de("11,50 % 12,08 %")
    assert cl.validar_interpretacion("Uno. Dos. Tres.", perm) == []
    assert any("frases" in e for e in cl.validar_interpretacion("Uno. Dos. Tres. Cuatro.", perm))


def test_validar_interpretacion_rechaza_cifras_ajenas():
    perm = cl.numeros_de("11,50 % 12,08 %")
    assert cl.validar_interpretacion("La tasa es 11,50 % frente a 12,08 %.", perm) == []
    errores = cl.validar_interpretacion("La tasa es 11,50 % y sube a 14,99 %.", perm)
    assert any("14.99" in e for e in errores)


def test_validar_interpretacion_vacio():
    assert cl.validar_interpretacion("   ", set()) == ["está vacío"]


def test_rellenar_no_modifica_si_hay_error():
    import tempfile
    md = Path(tempfile.mkdtemp()) / "x.md"
    md.write_text("Tabla 11,50 %\n\n{{INTERPRETACION_GRUPOS}}\n", encoding="utf-8")
    assert cl.rellenar(md, {"GRUPOS": "Cifra inventada 99,99 %."}) == 2
    assert "{{INTERPRETACION_GRUPOS}}" in md.read_text(encoding="utf-8")
    assert cl.rellenar(md, {"GRUPOS": "La tasa fue 11,50 %."}) == 0
    assert "La tasa fue 11,50 %." in md.read_text(encoding="utf-8")


# ------------------------------------------------------------------ formato
def test_formatos_es():
    assert cl.f_cop(1273334.4) == "$1.273.334"
    assert cl.f_pct(0.1346) == "13,46 %"
    assert cl.f_pp(0.0138) == "+1,38 p.p."
    assert cl.f_cop(-434920.4) == "-$434.920"


def test_nombre_visible_no_repite_marca():
    assert cl.nombre_visible({"Entidad": "Tuya", "MarcaComercial": "Tuya"}) == "Tuya"
    assert cl.nombre_visible({"Entidad": "KOA CF", "MarcaComercial": "KOA"}) == "KOA CF"
    assert cl.nombre_visible({"Entidad": "Banco Pichincha", "MarcaComercial": "Pibank"}) == "Banco Pichincha (Pibank)"


def test_ruta_libre_sin_conflicto():
    import tempfile
    import excel_profe as xp
    d = Path(tempfile.mkdtemp())
    inexistente = d / "a.xlsx"
    assert xp.ruta_libre(inexistente) == (inexistente, "")
    existente = d / "b.xlsx"
    existente.write_bytes(b"x")
    assert xp.ruta_libre(existente) == (existente, "")
