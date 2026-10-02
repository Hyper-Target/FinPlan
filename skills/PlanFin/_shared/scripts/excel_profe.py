"""Utilidades para escribir Excel con estándar institucional (banca de inversión / trazabilidad tipo Palantir).

Base: la disciplina del curso (tablas con referencias estructuradas, nombres definidos, validación ΣXfd = 0),
elevada a prácticas de modelos financieros profesionales:
  * separación entradas / cálculos / salidas / controles, con color de pestaña por rol;
  * fuente azul = entrada editable, negro = fórmula; sin celdas con números escritos a mano dentro de fórmulas;
  * hoja de Controles con estado global del modelo (ModeloOK) y conciliación contra un cálculo independiente;
  * linaje del dato: cada cifra externa lleva fuente, identificador del dataset y fecha-hora de extracción;
  * unidades explícitas en encabezados, formatos consistentes y hojas listas para imprimir.
Los cálculos son fórmulas vivas; Python solo calcula aparte para validar.
"""
from __future__ import annotations

import re
from datetime import date, datetime

import pandas as pd
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import CellIsRule, DataBarRule, FormulaRule
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.table import Table, TableStyleInfo

AZUL_OSCURO = "111827"  # "tinta": color principal de texto y títulos
GRIS_TENUE = "6B7280"
LINEA = "E5E7EB"
ACENTO = "0F766E"
GRIS_CLARO = "F9FAFB"
AZUL_ENTRADA = "EFF6FF"  # celdas editables: relleno azul muy tenue y fuente azul

FMT_PCT = "0.00%"
FMT_COP = "#,##0"
FMT_FECHA = "yyyy-mm-dd"
FMT_NUM = "#,##0.00"

_BORDE = Border(bottom=Side(style="hair", color="9CA3AF"))


def titulo(ws, celda: str, texto: str, tam: int = 14) -> None:
    ws[celda] = texto
    ws[celda].font = Font(bold=True, size=tam, color=AZUL_OSCURO)


def encabezado(celda) -> None:
    """Encabezado minimalista: texto pequeño gris, sin relleno, línea fina inferior."""
    celda.font = Font(bold=True, size=8, color=GRIS_TENUE)
    celda.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    celda.border = Border(bottom=Side(style="thin", color=AZUL_OSCURO))


def definir_nombre(wb, nombre: str, referencia: str) -> None:
    """Nombre definido a nivel de libro. referencia: p. ej. "Parametros!$C$5"."""
    wb.defined_names[nombre] = DefinedName(nombre, attr_text=referencia)


def _valor_celda(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, pd.Timestamp):
        return v.to_pydatetime()
    return v


def escribir_tabla(ws, nombre: str, columnas: list[str], filas: list[list], fila_ini: int = 1, col_ini: int = 1,
                   formatos: dict[str, str] | None = None, estilo: str = "TableStyleMedium2") -> str:
    """Escribe una tabla de Excel (ListObject) y devuelve su rango (p. ej. 'B3:H20').

    - columnas: encabezados únicos y sin caracteres especiales (se usan en referencias estructuradas).
    - filas: valores o fórmulas (str que empieza por '=').
    - formatos: {columna: formato numérico de Excel}.
    """
    formatos = formatos or {}
    for j, c in enumerate(columnas):
        celda = ws.cell(row=fila_ini, column=col_ini + j, value=c)
        encabezado(celda)
        if c in formatos and formatos[c] not in ("yyyy-mm-dd",):
            celda.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
    for i, fila in enumerate(filas, start=1):
        for j, v in enumerate(fila):
            celda = ws.cell(row=fila_ini + i, column=col_ini + j, value=_valor_celda(v))
            fmt = formatos.get(columnas[j])
            if fmt:
                celda.number_format = fmt
            celda.border = _BORDE
    ultima_fila = fila_ini + max(len(filas), 1)
    ref = f"{get_column_letter(col_ini)}{fila_ini}:{get_column_letter(col_ini + len(columnas) - 1)}{ultima_fila}"
    t = Table(displayName=nombre, ref=ref)
    t.tableStyleInfo = None  # sin estilo de Excel: el formato lo controlamos nosotros
    ws.add_table(t)
    ws.row_dimensions[fila_ini].height = 22
    for i in range(1, len(filas) + 1):
        ws.row_dimensions[fila_ini + i].height = 17
    return ref


def ajustar_anchos(ws, minimo: int = 10, maximo: int = 60) -> None:
    anchos: dict[int, int] = {}
    for fila in ws.iter_rows():
        for c in fila:
            if c.value is None:
                continue
            txt = str(c.value)
            if txt.startswith("="):
                largo = 14
            else:
                largo = max(len(x) for x in txt.split("\n")) + 2
            anchos[c.column] = max(anchos.get(c.column, 0), largo)
    for col, a in anchos.items():
        ws.column_dimensions[get_column_letter(col)].width = max(minimo, min(a, maximo))


def fila_parametro(ws, fila: int, variable: str, valor, unidad: str = "", observacion: str = "",
                   nombre: str | None = None, wb=None, formato: str | None = None, entrada: bool = False) -> None:
    """Fila 'Variable | Valor | Unidad | Observación' (como la hoja Simulador del profe) y su nombre definido."""
    ws.cell(row=fila, column=2, value=variable).font = Font(bold=True)
    c = ws.cell(row=fila, column=3, value=_valor_celda(valor))
    if formato:
        c.number_format = formato
    if entrada:
        c.fill = PatternFill("solid", fgColor=AZUL_ENTRADA)
    c.border = _BORDE
    ws.cell(row=fila, column=4, value=unidad)
    ws.cell(row=fila, column=5, value=observacion)
    if nombre and wb is not None:
        definir_nombre(wb, nombre, f"'{ws.title}'!$C${fila}")


def tarjeta_kpi(ws, celda: str, etiqueta: str, valor, formato: str | None = None, ancho_cols: int = 2) -> None:
    """Indicador: etiqueta pequeña gris, cifra grande, filete superior de acento (sin cajas ni rellenos)."""
    fila, col = ws[celda].row, ws[celda].column
    ws.merge_cells(start_row=fila, start_column=col, end_row=fila, end_column=col + ancho_cols - 1)
    ws.merge_cells(start_row=fila + 1, start_column=col, end_row=fila + 1, end_column=col + ancho_cols - 1)
    e = ws.cell(row=fila, column=col, value=etiqueta)
    e.font = Font(size=8, color=GRIS_TENUE, bold=True)
    e.alignment = Alignment(horizontal="left", vertical="bottom")
    v = ws.cell(row=fila + 1, column=col, value=valor)
    v.font = Font(size=20, bold=True, color=AZUL_OSCURO)
    v.alignment = Alignment(horizontal="left", vertical="center")
    if formato:
        v.number_format = formato
    for c in range(col, col + ancho_cols):
        ws.cell(row=fila, column=c).border = Border(top=Side(style="medium", color=ACENTO))
    ws.row_dimensions[fila].height = 20
    ws.row_dimensions[fila + 1].height = 34


def nota(ws, celda: str, texto: str, ancho_merge: int = 8, alto: int = 45) -> None:
    fila, col = ws[celda].row, ws[celda].column
    ws.merge_cells(start_row=fila, start_column=col, end_row=fila, end_column=col + ancho_merge - 1)
    c = ws.cell(row=fila, column=col, value=texto)
    c.alignment = Alignment(wrap_text=True, vertical="top")
    c.font = Font(italic=True, size=8, color=GRIS_TENUE)
    ws.row_dimensions[fila].height = alto


def slug_nombre_archivo(txt: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", txt)


def hoy_iso() -> str:
    return date.today().isoformat()


def ahora_iso() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


# ----------------------------------------------------------------------------------------------------------------
# Estándar institucional
# ----------------------------------------------------------------------------------------------------------------
FUENTE = "Segoe UI"
COLOR_TAB = {"salida": "0F766E", "entrada": "3B82F6", "calculo": "9CA3AF", "dato": "D1D5DB", "control": "DC2626"}
VERDE_OK = "D1FAE5"
ROJO_ERROR = "FEE2E2"
AMARILLO_AVISO = "FEF3C7"


def formato_hoja(ws, rol: str) -> None:
    """Pestaña con color por rol, sin cuadrícula, orientación horizontal y ajuste a una página de ancho."""
    ws.sheet_properties.tabColor = COLOR_TAB[rol]
    ws.sheet_view.showGridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True


def estandarizar_fuentes(wb) -> None:
    """Arial 10 en todo el libro; entradas editables (relleno azul claro) con fuente azul."""
    from copy import copy
    for ws in wb.worksheets:
        for fila in ws.iter_rows():
            for c in fila:
                if c.value is None:
                    continue
                f = copy(c.font)
                f.name = FUENTE
                if f.sz is None or f.sz == 11:
                    f.sz = 10
                if c.fill is not None and c.fill.fgColor is not None and c.fill.fgColor.rgb in ("00" + AZUL_ENTRADA, "FF" + AZUL_ENTRADA):
                    f.color = "0000FF"
                c.font = f


def semaforo(ws, rango: str) -> None:
    """Formato condicional: OK verde, ADVERTENCIA amarillo, ERROR/REVISAR rojo."""
    ws.conditional_formatting.add(rango, CellIsRule(operator="equal", formula=['"OK"'], fill=PatternFill("solid", bgColor=VERDE_OK)))
    ws.conditional_formatting.add(rango, FormulaRule(formula=[f'LEFT({rango.split(":")[0]},2)="OK"'], fill=PatternFill("solid", bgColor=VERDE_OK)))
    ws.conditional_formatting.add(rango, FormulaRule(formula=[f'LEFT({rango.split(":")[0]},11)="ADVERTENCIA"'], fill=PatternFill("solid", bgColor=AMARILLO_AVISO)))
    ws.conditional_formatting.add(rango, FormulaRule(formula=[f'OR(LEFT({rango.split(":")[0]},5)="ERROR",LEFT({rango.split(":")[0]},7)="REVISAR")'], fill=PatternFill("solid", bgColor=ROJO_ERROR)))


def barras_datos(ws, rango: str, color: str = "99E0D6") -> None:
    ws.conditional_formatting.add(rango, DataBarRule(start_type="num", start_value=0, end_type="max", color=color, showValue=True))


def cabecera_modelo(ws, titulo_txt: str, subtitulo: str, version: str = "v1.0") -> None:
    """Cabecera limpia: título grande, subtítulo tenue y una línea fina."""
    ws["B2"] = titulo_txt
    ws["B2"].font = Font(name=FUENTE, bold=True, size=22, color=AZUL_OSCURO)
    ws.row_dimensions[2].height = 34
    ws["B3"] = subtitulo
    ws["B3"].font = Font(name=FUENTE, size=10, color=GRIS_TENUE)
    ws["B4"] = f"PlanFin {version}  ·  datos oficiales de Colombia  ·  linaje de cada cifra en la hoja Fuentes"
    ws["B4"].font = Font(name=FUENTE, size=8, color="9CA3AF")
    for col in range(2, 14):
        ws.cell(row=4, column=col).border = Border(bottom=Side(style="thin", color=LINEA))


def ruta_libre(ruta) -> tuple:
    """Devuelve (ruta, aviso). Si el archivo está abierto en Excel (Windows lo bloquea), usa un nombre con hora.

    Evita un Traceback cuando el usuario dejó abierto el Excel de la corrida anterior.
    """
    from pathlib import Path
    ruta = Path(ruta)
    if not ruta.exists():
        return ruta, ""
    try:
        with open(ruta, "ab"):
            pass
        return ruta, ""
    except PermissionError:
        alterna = ruta.with_name(f"{ruta.stem}_{datetime.now().strftime('%H%M%S')}{ruta.suffix}")
        return alterna, (f"El archivo {ruta.name} está abierto en Excel; se guardó como {alterna.name}. "
                         "Cierre el archivo anterior para reutilizar el nombre.")
