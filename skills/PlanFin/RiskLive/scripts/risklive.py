#!/usr/bin/env python
"""RiskLive: Monte Carlo de un portafolio personal (CDT, COLCAP, dólares) calibrado con datos oficiales en vivo.

Uso (ver SKILL.md):
  python risklive.py --aporte 1000000 --meta 80000000 --horizonte 5 --pesos 60,25,15
  python risklive.py --rellenar RUTA.md --supuestos "..." --distribucion "..." --sensibilidad "..." --objetivo "..."

Entrega SIEMPRE un Excel (modelo con fórmulas vivas, calibración, simulación y resultados) y un Markdown que lo interpreta.
"""
from __future__ import annotations

import argparse
import copy
import json
import subprocess
import sys
import tempfile
from datetime import date, datetime
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
PLANFIN = SKILL_DIR.parent
sys.path.insert(0, str(PLANFIN / "_shared" / "scripts"))
sys.path.insert(0, str(SCRIPT_DIR))

import calibracion as cb  # noqa: E402
import excel_risklive as xr  # noqa: E402
import fuentes_banrep as br  # noqa: E402
import simulacion as sm  # noqa: E402
import tasas as tx  # noqa: E402
from _http import ADVERTENCIAS, FuenteError  # noqa: E402
from informe import f_cop, f_fecha, f_pct, rellenar, tabla_md  # noqa: E402

RAIZ = PLANFIN.parent.parent
SALIDA_DEFECTO = RAIZ / "salidas" / "RiskLive"
ADVERTENCIA = "Educación financiera, no asesoría de inversión."
NOMBRES_EXCEL = "FinalNominal,FinalReal,LastBalance,SumXfd,PerRate,TotalAportado,PMeta,ModeloOK"


# ----------------------------------------------------------------------------------------------------------------
# Entradas
# ----------------------------------------------------------------------------------------------------------------
def parsear_pesos(txt: str) -> tuple[float, float, float]:
    partes = [x.strip() for x in txt.replace(";", ",").split(",")]
    if len(partes) != 3:
        raise ValueError("--pesos necesita tres números separados por coma: CDT,COLCAP,USD (por ejemplo 60,25,15).")
    v = [float(x) for x in partes]
    if any(x < 0 for x in v):
        raise ValueError("Los pesos no pueden ser negativos.")
    if abs(sum(v) - 100) > 0.01:
        raise ValueError(f"Los pesos deben sumar 100 y suman {sum(v):g}.")
    return (v[0] / 100, v[1] / 100, v[2] / 100)


def texto_pesos(p) -> str:
    return f"{p[0] * 100:.0f} % CDT, {p[1] * 100:.0f} % COLCAP y {p[2] * 100:.0f} % dólares"


# ----------------------------------------------------------------------------------------------------------------
# Cálculo completo
# ----------------------------------------------------------------------------------------------------------------
def correr_modelo(par: dict, cal: dict) -> dict:
    meses = par["meses"]
    z = sm.generar_shocks(par["seed"], par["n_sim"], meses, cal["corr"]["cholesky"], par["dist"], cal["df_t"])
    macro = sm.macro_estocastico(cal, z, par["retencion"])
    unit = sm.corridas_unitarias(macro, par["pesos"], par["con_ipc"], par["rebalanceo"])
    res = sm.combinar(unit, par["ahorro0"], par["aporte"])
    st = sm.estadisticas(res, par["meta"])

    sens_aporte = []
    for c in (-0.3, -0.2, -0.1, 0.0, 0.1, 0.2, 0.3):
        a = par["aporte"] * (1 + c)
        r = sm.combinar(unit, par["ahorro0"], a)
        s = sm.estadisticas(r, par["meta"])
        sens_aporte.append({"cambio": c, "aporte": a, "p_meta": s["p_meta"], "mediana": s["percentiles"][50]})
    sens_col = []
    for g in (0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6):
        pg = sm.pesos_con_colcap(par["pesos"], g)
        ug = sm.corridas_unitarias(macro, pg, par["con_ipc"], par["rebalanceo"])
        s = sm.estadisticas(sm.combinar(ug, par["ahorro0"], par["aporte"]), par["meta"])
        sens_col.append({"w_col": g, "pesos": pg, "p_meta": s["p_meta"], "mediana": s["percentiles"][50],
                         "p5": s["percentiles"][5]})
    aporte_80 = sm.aporte_para_probabilidad(unit, par["ahorro0"], par["meta"], 0.80)
    det = sm.ledger_deterministico(cal, par["pesos"], par["ahorro0"], par["aporte"], meses, par["con_ipc"],
                                   par["rebalanceo"], par["retencion"])
    m = min(xr.MUESTRA, par["n_sim"])
    return {
        "res": res, "unit": unit, "stats": st, "sens_aporte": sens_aporte, "sens_col": sens_col, "aporte_80": aporte_80,
        "pct_mes": sm.percentiles_por_mes(res), "hist": sm.histograma(res["final_real"]), "det": det,
        "muestra": {"final_nominal": res["final_nominal"][:m], "final_real": res["final_real"][:m],
                    "aportes_reales": res["aportes_reales"][:m], "drawdown": res["drawdown"][:m]},
    }


def flujo_neto_det(par: dict, det: dict) -> list[float]:
    """NetCF del libro de caja esperado: -aportes y la liquidación al final."""
    T = par["meses"]
    cum = det["cum"]
    out = [par["ahorro0"]] + [par["aporte"] * (cum[t - 1] if par["con_ipc"] else 1.0) for t in range(1, T + 1)]
    net = [-o for o in out]
    net[-1] += det["final_nominal"]
    return net


def chequeo_volatilidad_cero(par: dict, cal: dict) -> tuple[bool, float]:
    """La simulación con todas las volatilidades en cero debe coincidir con el escenario esperado (tolerancia $1)."""
    c0 = copy.deepcopy(cal)
    for k in ("COLCAP", "TRM", "CDT", "IPC"):
        c0[k]["sigma"] = 0.0
    z = sm.generar_shocks(par["seed"], 20, par["meses"], c0["corr"]["cholesky"])
    macro = sm.macro_estocastico(c0, z, par["retencion"])
    r = sm.correr(macro, par["pesos"], par["ahorro0"], par["aporte"], par["con_ipc"], par["rebalanceo"])
    det = sm.ledger_deterministico(c0, par["pesos"], par["ahorro0"], par["aporte"], par["meses"], par["con_ipc"],
                                   par["rebalanceo"], par["retencion"])
    dif = float(np.abs(r["nominal"][:, -1] - det["final_nominal"]).max())
    return dif < 1.0, dif


# ----------------------------------------------------------------------------------------------------------------
# Tablas de contexto (supuestos, fuentes, notas)
# ----------------------------------------------------------------------------------------------------------------
def construir_supuestos(cal: dict, hoy: date) -> tuple[list[dict], list[dict]]:
    tpm, ibr = br.ultimo(br.SERIES["TPM"], hoy), br.ultimo(br.SERIES["IBR3M"], hoy)
    cdt, ipc, meta = cal["CDT"], cal["IPC"], None
    f_col = next(f for f in cal["fuentes"] if f["nombre"] == "COLCAP")
    f_trm = next(f for f in cal["fuentes"] if f["nombre"] == "TRM")
    f_cdt = next(f for f in cal["fuentes"] if f["nombre"].startswith("CDT 360"))
    f_meta = next(f for f in cal["fuentes"] if f["nombre"].startswith("Meta"))
    f_ipc = next(f for f in cal["fuentes"] if f["nombre"].startswith("IPC"))
    f_mej = next((f for f in cal["fuentes"] if f["nombre"].startswith("Mejor CDT")), None)
    pct, num = "0.00%", "#,##0.00"
    sup = [
        {"Variable": "Mejor tasa de CDT a 360 días hoy", "Valor": cdt["y0"], "Unidad": "% EA", "Formato": pct,
         "Fuente": cdt["origen"], "IDSerie": "axk9-g2nh",
         "FechaDato": f_mej["ultimo"] if f_mej else f_cdt["ultimo"]},
        {"Variable": "Tasa de CDT a 360 días del sistema", "Valor": cdt["x0"], "Unidad": "% EA", "Formato": pct,
         "Fuente": "BanRep Suameca", "IDSerie": br.SERIES["CDT360"], "FechaDato": f_cdt["ultimo"]},
        {"Variable": "Tasa de política monetaria", "Valor": tpm["valor"] / 100, "Unidad": "% EA", "Formato": pct,
         "Fuente": "BanRep Suameca", "IDSerie": br.SERIES["TPM"], "FechaDato": tpm["fecha"]},
        {"Variable": "IBR a 3 meses", "Valor": ibr["valor"] / 100, "Unidad": "% nominal", "Formato": pct,
         "Fuente": "BanRep Suameca", "IDSerie": br.SERIES["IBR3M"], "FechaDato": ibr["fecha"]},
        {"Variable": "Meta de inflación", "Valor": ipc["meta_anual"], "Unidad": "% anual", "Formato": pct,
         "Fuente": "BanRep Suameca", "IDSerie": br.SERIES["META_INFLACION"], "FechaDato": f_meta["ultimo"]},
        {"Variable": "Inflación a 12 meses (IPC)", "Valor": ipc["ipc12m"], "Unidad": "% anual", "Formato": pct,
         "Fuente": "DANE, archivo de índices del IPC", "IDSerie": "", "FechaDato": f_ipc["ultimo"]},
        {"Variable": "Último COLCAP", "Valor": cal["COLCAP"]["ultimo"], "Unidad": "puntos", "Formato": num,
         "Fuente": "BanRep Suameca", "IDSerie": br.SERIES["COLCAP"], "FechaDato": f_col["ultimo"]},
        {"Variable": "Última TRM", "Valor": cal["TRM"]["ultimo"], "Unidad": "COP/USD", "Formato": num,
         "Fuente": "BanRep Suameca", "IDSerie": br.SERIES["TRM"], "FechaDato": f_trm["ultimo"]},
    ]
    ahora = datetime.now().strftime("%Y-%m-%d %H:%M")
    fuentes = []
    for f in cal["fuentes"]:
        fuentes.append({"Fuente": f["nombre"], "URL": f["url"], "FechaHoraConsulta": ahora,
                        "Observaciones": f["n_meses"] or None,
                        "Detalle": f"Último dato {f['ultimo']}" + (f", {f['n_meses']} meses en la ventana" if f["n_meses"] else "")})
    for u in (tpm, ibr):
        fuentes.append({"Fuente": f"BanRep Suameca serie {u['id']}", "URL": u["url"], "FechaHoraConsulta": ahora,
                        "Observaciones": None, "Detalle": u["nombre"]})
    return sup, fuentes


def notas_metodologicas(par: dict, cal: dict) -> list[str]:
    return [
        "Activos: CDT (tasa EA simulada, retención sobre el rendimiento), COLCAP (retorno logarítmico normal o t de Student) "
        "y dólares (variación de la TRM; efectivo en USD sin rendimiento propio).",
        "Renta fija: el saldo rota; cada mes rinde a la tasa vigente simulada. Es una aproximación a una escalera de CDT, "
        "no el rendimiento de un CDT único con tasa fija.",
        f"Escenario esperado (hoja Modelo_Base): sin shocks; COLCAP y USD con el retorno aritmético esperado exp(mu + sigma²/2) − 1; "
        "inflación y tasa de CDT siguen su reversión a la media sin ruido.",
        "Calendario: periodo 0 = depósito inicial; los aportes entran al final de cada mes; el saldo rinde durante el mes. "
        "El aporte crece con la inflación acumulada si se eligió 'Con IPC'.",
        "VaR y CVaR: se calculan sobre la ganancia real (valor real final menos aportes reales). Valor negativo significa que "
        "en el peor 5 % de los casos todavía hay ganancia real.",
        "Aporte para 80 %: como el valor final es lineal en el aporte, se resuelve exactamente con el cuantil 80 % del aporte "
        "exigido en cada corrida; se verifica contra una búsqueda binaria en los tests.",
        "El dataset de la Superfinanciera de rentabilidad de fondos de pensiones (gfy9-fpbr) no expone columnas por la API y "
        "no se usó.",
    ]


def limitaciones_md(par: dict, cal: dict) -> str:
    col, trm = cal["COLCAP"], cal["TRM"]
    def n(x: float, d: int) -> str:
        return f"{x:.{d}f}".replace(".", ",")

    def jb(m, nombre):
        est = "se rechaza la normalidad" if m["normal_rechazada"] else "no se rechaza la normalidad"
        return (f"{nombre}: Jarque-Bera {n(m['jb'], 1)} (valor p {n(m['jb_p'], 3)}), asimetría {n(m['asimetria'], 2)}, "
                f"curtosis en exceso {n(m['curtosis_exceso'], 2)}; {est}.")
    lineas = [
        f"- Normalidad de los retornos mensuales: {jb(col, 'COLCAP')} {jb(trm, 'TRM')} "
        + ("La simulación base usa retornos logarítmicos normales; con `--dist t` se usan colas más pesadas."
           if par["dist"] == "normal" else "Esta corrida usó una t de Student para los shocks."),
        f"- Ventana histórica de {par['ventana']} años ({cal['n_obs_min']} observaciones mensuales como mínimo): el pasado no garantiza el futuro, "
        "y la media histórica del COLCAP puede sobrestimar o subestimar el rendimiento esperado.".replace("Valor", "Valor"),
        "- Las correlaciones se estiman con todo el periodo; en crisis las correlaciones entre activos suelen subir.",
        "- La tasa de CDT es el promedio ponderado de lo que las entidades pagaron (Superfinanciera), no la tasa de cartelera; "
        "la renta fija se modela como una escalera que rota mensualmente.",
        "- No se modelan impuestos distintos de la retención sobre el rendimiento del CDT (ni ganancia ocasional, ni renta, ni GMF), "
        "ni costos de comisión, ni el rendimiento de tener dólares en efectivo.",
        "- Los aportes y el rebalanceo se hacen sin fricciones y a fin de mes.",
    ]
    if cal["CDT"]["modo"] != "vasicek":
        lineas.append("- La reversión a la media de la tasa de CDT resultó inestable y se usó un camino aleatorio acotado.")
    for a in cal["avisos"]:
        lineas.append(f"- Aviso de calibración: {a}")
    for a in ADVERTENCIAS:
        lineas.append(f"- {a}")
    return "\n".join(lineas)


# ----------------------------------------------------------------------------------------------------------------
# Markdown
# ----------------------------------------------------------------------------------------------------------------
def generar_md(par: dict, cal: dict, r: dict, ctx: dict, ruta_md: Path, ruta_xlsx: Path) -> None:
    st = r["stats"]
    pc = st["percentiles"]
    plantilla = (SCRIPT_DIR / "plantilla_md.md").read_text(encoding="utf-8")
    tabla_sup = tabla_md(["Variable", "Valor", "Fuente", "Fecha del dato"],
                         [[s["Variable"],
                           (f_pct(s["Valor"]) if s["Formato"] == "0.00%" else f"{s['Valor']:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")),
                           s["Fuente"], f_fecha(s["FechaDato"])] for s in ctx["supuestos"]])
    tabla_perc = tabla_md(["Indicador", "Valor real final (pesos de hoy)"],
                          [["Percentil 5 (peor caso razonable)", f_cop(pc[5])], ["Percentil 25", f_cop(pc[25])],
                           ["Mediana", f_cop(pc[50])], ["Percentil 75", f_cop(pc[75])], ["Percentil 95", f_cop(pc[95])],
                           ["Media", f_cop(st["media"])], ["Aportes reales medios (ahorro inicial más aportes)", f_cop(st["aportes_reales_medio"])]])
    var_txt = ("Aun en el peor 5 % de los casos hay ganancia real" if st["var95"] < 0 else "En el peor 5 % de los casos hay pérdida real")
    bloque_dist = "\n".join([
        f"- Probabilidad de llegar a la meta: {f_pct(st['p_meta'], 1)}.",
        f"- Valor en riesgo al 95 % de la ganancia real: {f_cop(st['var95'])}; CVaR al 95 %: {f_cop(st['cvar95'])}. {var_txt}.",
        f"- Probabilidad de terminar con menos poder adquisitivo del aportado: {f_pct(st['p_perdida_real'], 1)}.",
        f"- Caída máxima del saldo real desde su máximo previo: mediana {f_pct(st['dd_mediana'], 1)}, percentil 95 {f_pct(st['dd_p95'], 1)}.",
    ])
    tabla_sa = tabla_md(["Cambio del aporte", "Aporte mensual", "P(meta)", "Mediana del valor real"],
                        [[f"{x['cambio'] * 100:+.0f} %".replace("+0 %", "0 %"), f_cop(x["aporte"]), f_pct(x["p_meta"], 1), f_cop(x["mediana"])]
                         for x in r["sens_aporte"]])
    tabla_sc = tabla_md(["Peso en COLCAP", "Peso en CDT", "Peso en dólares", "P(meta)", "Mediana", "Percentil 5"],
                        [[f"{x['w_col'] * 100:.0f} %", f_pct(x["pesos"][0], 0), f_pct(x["pesos"][2], 0), f_pct(x["p_meta"], 1),
                          f_cop(x["mediana"]), f_cop(x["p5"])] for x in r["sens_col"]])
    a80 = r["aporte_80"]
    dif = a80 - par["aporte"]
    if a80 <= 0:
        bloque_obj = "Con el ahorro inicial ya se alcanza el 80 % de probabilidad sin aportes adicionales."
    else:
        bloque_obj = (f"- Aporte mensual necesario para 80 % de probabilidad de llegar a {f_cop(par['meta'])}: {f_cop(a80)}.\n"
                      f"- Aporte actual: {f_cop(par['aporte'])}; diferencia: {f_cop(dif)} al mes ({'más' if dif > 0 else 'menos'} que el actual).")
    resultado = (f"Con {f_cop(par['aporte'])} al mes durante {par['horizonte']} años, hay {f_pct(st['p_meta'], 1)} de probabilidad de llegar a "
                 f"{f_cop(par['meta'])} (pesos de hoy); la mediana es {f_cop(pc[50])}.")
    fuentes_md = "\n".join(f"- {f['Fuente']}: {f['URL']} (consulta {f['FechaHoraConsulta']})" for f in ctx["fuentes"])
    valores = {
        "APORTE": f_cop(par["aporte"]), "ANIOS": str(par["horizonte"]), "FECHA_DATOS": f_fecha(cal["fecha_datos"]),
        "FECHA_CONSULTA": ctx["ahora"].strftime("%Y-%m-%d %H:%M"), "NSIM": f"{par['n_sim']:,}".replace(",", "."),
        "SEED": str(par["seed"]), "EXCEL": ruta_xlsx.name, "RESULTADO_UNA_LINEA": resultado,
        "PORTAFOLIO": texto_pesos(par["pesos"]), "REBALANCEO": par["rebalanceo"],
        "CRECIMIENTO": "crece con la inflación" if par["con_ipc"] else "es fijo en pesos corrientes",
        "TABLA_SUPUESTOS": tabla_sup, "META": f_cop(par["meta"]), "TABLA_PERCENTILES": tabla_perc,
        "BLOQUE_DISTRIBUCION": bloque_dist, "TABLA_SENS_APORTE": tabla_sa, "TABLA_SENS_COLCAP": tabla_sc,
        "BLOQUE_OBJETIVO": bloque_obj, "LIMITACIONES": limitaciones_md(par, cal), "ADVERTENCIA": ADVERTENCIA,
        "FUENTES": fuentes_md,
    }
    for k, v in valores.items():
        plantilla = plantilla.replace("{{" + k + "}}", v)
    ruta_md.write_text(plantilla, encoding="utf-8")


# ----------------------------------------------------------------------------------------------------------------
# Validación con Excel (opcional, Windows)
# ----------------------------------------------------------------------------------------------------------------
def validar_con_excel(ruta: Path, par: dict, cal: dict, r: dict, guardar: bool) -> dict:
    ps1 = PLANFIN / "_shared" / "scripts" / "excel_com.ps1"
    if sys.platform != "win32" or not ps1.exists():
        return {"disponible": False, "motivo": "Solo Windows con Excel instalado"}
    with tempfile.TemporaryDirectory() as tmp:
        salida = Path(tmp) / "val.json"
        cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps1), "-Ruta", str(ruta),
               "-Salida", str(salida), "-Nombres", NOMBRES_EXCEL, "-Ajuste", f"AporteMensual={par['aporte'] * 2:.6f}"]
        if guardar:
            cmd.append("-Guardar")
        try:
            subprocess.run(cmd, capture_output=True, text=True, timeout=240)
            x = json.loads(salida.read_text(encoding="utf-8-sig"))
        except Exception as e:  # noqa: BLE001
            return {"disponible": False, "motivo": f"No se pudo validar con Excel: {e}"}
    if not x.get("disponible"):
        return x
    b, aj = x["base"], x["ajuste"]
    det = r["det"]
    par2 = dict(par, aporte=par["aporte"] * 2)
    det2 = sm.ledger_deterministico(cal, par["pesos"], par["ahorro0"], par2["aporte"], par["meses"], par["con_ipc"],
                                    par["rebalanceo"], par["retencion"])
    fallos = []
    for nombre, excel, py in (("FinalNominal", b["FinalNominal"], det["final_nominal"]), ("FinalReal", b["FinalReal"], det["final_real"]),
                              ("FinalNominal con aporte x2", aj["FinalNominal"], det2["final_nominal"]),
                              ("FinalReal con aporte x2", aj["FinalReal"], det2["final_real"])):
        if abs(excel - py) > 1.0:
            fallos.append(f"{nombre}: Excel {excel:,.2f} vs Python {py:,.2f}")
    tir_py = tx.tir(flujo_neto_det(par, det))
    if abs(b["PerRate"] - tir_py) > 1e-9:
        fallos.append(f"PerRate: Excel {b['PerRate']:.10f} vs Python {tir_py:.10f}")
    if abs(b["LastBalance"]) >= 1 or abs(b["SumXfd"]) >= 1:
        fallos.append(f"LastBalance {b['LastBalance']:.6f} o SumXfd {b['SumXfd']:.6f} no son cero")
    if x["Errores"] != 0:
        fallos.append(f"{x['Errores']} celdas con error de fórmula")
    x["fallos"] = fallos
    x["det"] = det
    return x


# ----------------------------------------------------------------------------------------------------------------
# Programa principal
# ----------------------------------------------------------------------------------------------------------------
def ejecutar(a: argparse.Namespace) -> int:
    if a.aporte is None or a.meta is None:
        print("ERROR: faltan datos obligatorios. Pregunte al usuario (una sola vez) el aporte mensual (--aporte) y la meta en "
              "pesos de hoy (--meta).")
        return 2
    try:
        pesos = parsear_pesos(a.pesos)
    except ValueError as e:
        print("ERROR:", e)
        return 2
    if not 1 <= a.horizonte <= 30:
        print("ERROR: el horizonte debe estar entre 1 y 30 años.")
        return 2
    if a.aporte < 0 or a.ahorro_inicial < 0 or a.meta <= 0 or (a.aporte == 0 and a.ahorro_inicial == 0):
        print("ERROR: el aporte y el ahorro inicial no pueden ser negativos ni ambos cero, y la meta debe ser positiva.")
        return 2
    par = {"ahorro0": float(a.ahorro_inicial), "aporte": float(a.aporte), "horizonte": a.horizonte, "meses": a.horizonte * 12,
           "meta": float(a.meta), "pesos": pesos, "n_sim": a.n_sim, "seed": a.seed, "con_ipc": a.crecimiento_aporte == "ipc",
           "rebalanceo": a.rebalanceo, "dist": a.dist, "retencion": a.retencion, "ventana": a.ventana_anios,
           "fecha_inicio": date.today()}
    ahora = datetime.now()
    try:
        cal = cb.calibrar(date.today(), a.ventana_anios)
        r = correr_modelo(par, cal)
        supuestos, fuentes = construir_supuestos(cal, date.today())
    except FuenteError as e:
        print("ERROR_FUENTE:", e)
        return 3
    st = r["stats"]
    ok_vol0, dif_vol0 = chequeo_volatilidad_cero(par, cal)
    antig = (date.today() - cal["fecha_datos"]).days
    checks = [
        {"Validacion": "Los pesos suman 100 %", "Resultado": "OK" if abs(sum(pesos) - 1) < 1e-9 else "ERROR", "Detalle": f"Suma = {sum(pesos) * 100:g} %"},
        {"Validacion": "Matriz de correlación definida positiva", "Resultado": "OK" if cal["corr"]["psd_ok"] else "ADVERTENCIA",
         "Detalle": f"Autovalor mínimo {cal['corr']['min_autovalor']:.4f}" + ("" if cal["corr"]["psd_ok"] else "; corregida a la PSD más cercana")},
        {"Validacion": "Al menos 60 observaciones mensuales por serie", "Resultado": "OK" if cal["n_obs_min"] >= 60 else "ERROR",
         "Detalle": f"Mínimo {cal['n_obs_min']} meses"},
        {"Validacion": "P(meta) entre 0 y 1", "Resultado": "OK" if 0 <= st["p_meta"] <= 1 else "ERROR", "Detalle": f"P(meta) = {st['p_meta']:.4f}"},
        {"Validacion": "Con volatilidad cero la simulación coincide con el escenario esperado (tolerancia $1)",
         "Resultado": "OK" if ok_vol0 else "ERROR", "Detalle": f"Diferencia máxima ${dif_vol0:.6f}"},
        {"Validacion": "Fecha de los datos con menos de 7 días", "Resultado": "OK" if antig < 7 else "ADVERTENCIA",
         "Detalle": f"Dato más antiguo {cal['fecha_datos']} ({antig} días)"},
        {"Validacion": "Aporte para 80 % coincide con la búsqueda binaria", "Resultado": "OK",
         "Detalle": ""},
    ]
    bis = sm.aporte_por_biseccion(r["unit"], par["ahorro0"], par["meta"], 0.80)
    ok_bis = abs(bis - r["aporte_80"]) <= max(50.0, 1e-4 * r["aporte_80"]) if r["aporte_80"] > 0 else True
    checks[-1].update(Resultado="OK" if ok_bis else "ERROR", Detalle=f"Cuantil {r['aporte_80']:,.0f} vs bisección {bis:,.0f}")

    salida = Path(a.salida) if a.salida else SALIDA_DEFECTO
    salida.mkdir(parents=True, exist_ok=True)
    base = f"RiskLive_{int(par['meta'])}_{par['horizonte']}a_{date.today().isoformat()}"
    ruta_xlsx, aviso_archivo = xr.xp.ruta_libre(salida / f"{base}.xlsx")
    ruta_md = ruta_xlsx.with_suffix(".md")
    if aviso_archivo:
        ADVERTENCIAS.append(aviso_archivo)
    ctx = {"params": par, "cal": cal, "stats": st, "pct_mes": r["pct_mes"], "hist": r["hist"], "sens_aporte": r["sens_aporte"],
           "sens_col": r["sens_col"], "aporte_80": r["aporte_80"], "muestra": r["muestra"], "supuestos": supuestos,
           "fuentes": fuentes, "checks": checks, "ahora": ahora, "notas_metodologicas": notas_metodologicas(par, cal),
           "estado_conciliacion": "OMITIDA"}
    xr.construir_excel(ctx, ruta_xlsx)
    val = {"disponible": False, "motivo": "omitida (--sin-validar-excel)"}
    if not a.sin_validar_excel:
        val = validar_con_excel(ruta_xlsx, par, cal, r, guardar=False)
    if val.get("disponible"):
        estado = "OK" if not val["fallos"] else "ERROR: " + "; ".join(val["fallos"])[:220]
        checks.append({"Validacion": "Excel recalculado coincide con Python; al duplicar el aporte todo se recalcula",
                       "Resultado": "OK" if not val["fallos"] else "ERROR",
                       "Detalle": "; ".join(val["fallos"]) or f"0 errores de fórmula; saldo final nominal ${val['det']['final_nominal']:,.0f}"})
        ctx["estado_conciliacion"] = estado
    else:
        checks.append({"Validacion": "Excel recalculado coincide con Python", "Resultado": "OMITIDA", "Detalle": val.get("motivo", "")})
        ctx["estado_conciliacion"] = "OMITIDA: " + val.get("motivo", "")
    xr.construir_excel(ctx, ruta_xlsx)
    if val.get("disponible"):
        validar_con_excel(ruta_xlsx, par, cal, r, guardar=True)  # deja los valores calculados guardados en el archivo
    generar_md(par, cal, r, ctx, ruta_md, ruta_xlsx)

    pc = st["percentiles"]
    print("RESUMEN_OK")
    print(f"excel={ruta_xlsx}")
    print(f"md={ruta_md}")
    print(f"fecha_datos={cal['fecha_datos']}; semilla={par['seed']}; simulaciones={par['n_sim']}")
    print(f"resultado=Aporte {f_cop(par['aporte'])}/mes x {par['horizonte']} anos: P(meta {f_cop(par['meta'])}) = {f_pct(st['p_meta'], 1)}; "
          f"mediana real {f_cop(pc[50])}; P5 {f_cop(pc[5])}; P95 {f_cop(pc[95])}")
    print(f"aporte_para_80={f_cop(r['aporte_80'])}; var95={f_cop(st['var95'])}; cvar95={f_cop(st['cvar95'])}")
    print(f"calibracion: COLCAP mu={cal['COLCAP']['mu']:.4f} sigma={cal['COLCAP']['sigma']:.4f}; CDT modo={cal['CDT']['modo']}; "
          f"tasa_partida={f_pct(cal['CDT']['y0'])}; ipc12m={f_pct(cal['IPC']['ipc12m'])}")
    for c in checks:
        print(f"VALIDACION [{c['Resultado']}] {c['Validacion']}: {c['Detalle']}")
    for av in cal["avisos"]:
        print("AVISO_CALIBRACION:", av)
    if aviso_archivo:
        print("AVISO_ARCHIVO:", aviso_archivo)
    print("SIGUIENTE_PASO: escriba las 4 interpretaciones y ejecute --rellenar (ver SKILL.md, paso 4)")
    return 0 if all(c["Resultado"] in ("OK", "OMITIDA", "ADVERTENCIA") for c in checks) else 4


def main() -> int:
    p = argparse.ArgumentParser(description="RiskLive: Monte Carlo de un portafolio personal con datos oficiales de Colombia")
    p.add_argument("--aporte", type=float, help="Aporte mensual en COP (obligatorio)")
    p.add_argument("--meta", type=float, help="Meta en COP de hoy (obligatorio)")
    p.add_argument("--ahorro-inicial", type=float, default=0.0, help="Depósito inicial en COP (defecto 0)")
    p.add_argument("--horizonte", type=int, default=5, help="Años (1 a 30; defecto 5)")
    p.add_argument("--pesos", default="70,20,10", help="CDT,COLCAP,USD en porcentaje; suman 100 (defecto 70,20,10)")
    p.add_argument("--n-sim", type=int, default=10000)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--crecimiento-aporte", choices=["ipc", "fijo"], default="ipc")
    p.add_argument("--rebalanceo", choices=["mensual", "anual", "ninguno"], default="mensual")
    p.add_argument("--dist", choices=["normal", "t"], default="normal")
    p.add_argument("--ventana-anios", type=int, default=10)
    p.add_argument("--retencion", type=float, default=0.04)
    p.add_argument("--salida", help="Carpeta de salida (defecto: Planeación Financiera/salidas/RiskLive)")
    p.add_argument("--sin-validar-excel", action="store_true")
    p.add_argument("--rellenar", metavar="RUTA_MD")
    for k in ("supuestos", "distribucion", "sensibilidad", "objetivo"):
        p.add_argument(f"--{k}", help=f"Interpretación de la sección {k} (máx. 3 frases, solo cifras del informe)")
    a = p.parse_args()
    if a.rellenar:
        textos = {k.upper(): getattr(a, k) for k in ("supuestos", "distribucion", "sensibilidad", "objetivo") if getattr(a, k) is not None}
        if not textos:
            print("ERROR: indique al menos una de --supuestos --distribucion --sensibilidad --objetivo")
            return 2
        return rellenar(Path(a.rellenar), textos)
    return ejecutar(a)


if __name__ == "__main__":
    sys.exit(main())
