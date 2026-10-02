"""Utilidades compartidas para los informes Markdown de PlanFin.

* Formato de cifras en español (1.234.567 y 11,50 %).
* Tablas Markdown.
* Relleno seguro de las interpretaciones que escribe el modelo: máximo 3 frases y solo cifras que ya estén en el
  informe (`rellenar`). Así un modelo pequeño no puede introducir números inventados.
"""
from __future__ import annotations

import re
from pathlib import Path


def f_cop(x: float) -> str:
    signo = "-" if round(x) < 0 else ""
    return signo + "$" + f"{abs(x):,.0f}".replace(",", ".")


def f_pct(x: float, d: int = 2) -> str:
    return f"{x * 100:.{d}f}".replace(".", ",") + " %"


def f_pp(x: float) -> str:
    return f"{x * 100:+.2f}".replace(".", ",") + " p.p."


def f_fecha(d) -> str:
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def tabla_md(cabecera: list[str], filas: list[list[str]]) -> str:
    out = ["| " + " | ".join(cabecera) + " |", "|" + "|".join("---" for _ in cabecera) + "|"]
    out += ["| " + " | ".join(str(c) for c in f) + " |" for f in filas]
    return "\n".join(out)


_NUM = re.compile(r"\d+(?:[.,]\d+)*")


def normalizar_numero(tok: str) -> str:
    tok = tok.strip(".,")
    if "," in tok:
        return tok.replace(".", "").replace(",", ".")
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", tok):
        return tok.replace(".", "")
    return tok


def numeros_de(texto: str) -> set[str]:
    return {normalizar_numero(t) for t in _NUM.findall(texto)}


def validar_interpretacion(texto: str, permitidos: set[str]) -> list[str]:
    errores = []
    if not texto or not texto.strip():
        return ["está vacío"]
    frases = [f for f in re.split(r"(?<=[.!?])\s+", texto.strip()) if f]
    if len(frases) > 3:
        errores.append(f"tiene {len(frases)} frases (máximo 3)")
    ajenos = sorted(n for n in numeros_de(texto) if n not in permitidos and not (n.isdigit() and int(n) <= 20))
    if ajenos:
        errores.append("usa cifras que no están en las tablas del informe: " + ", ".join(ajenos)
                       + " (copie las cifras tal cual aparecen en el informe)")
    return errores


def rellenar(ruta_md: Path, textos: dict[str, str]) -> int:
    md = ruta_md.read_text(encoding="utf-8")
    permitidos = numeros_de(re.sub(r"\{\{INTERPRETACION_[A-Z]+\}\}", "", md))
    problemas = []
    for clave, texto in textos.items():
        marcador = "{{INTERPRETACION_" + clave + "}}"
        if marcador not in md:
            problemas.append(f"{clave}: el marcador {marcador} no está en el archivo (¿ya se rellenó?)")
            continue
        for e in validar_interpretacion(texto, permitidos):
            problemas.append(f"{clave}: {e}")
    if problemas:
        print("ERROR_RELLENAR")
        for p in problemas:
            print("  -", p)
        print("Corrija el texto y vuelva a ejecutar el mismo comando. No se modificó el archivo.")
        return 2
    for clave, texto in textos.items():
        md = md.replace("{{INTERPRETACION_" + clave + "}}", texto.strip())
    restantes = re.findall(r"\{\{INTERPRETACION_[A-Z]+\}\}", md)
    ruta_md.write_text(md, encoding="utf-8")
    if restantes:
        print("FALTAN_MARCADORES:", ", ".join(restantes))
        return 3
    print("MD_FINAL_OK", ruta_md)
    return 0
