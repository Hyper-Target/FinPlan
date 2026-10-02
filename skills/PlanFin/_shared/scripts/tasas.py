"""Conversión de tasas con la nomenclatura colombiana del profesor (tabla TPERIODOS).

Todas las tasas entran y salen como fracciones (0.12 = 12 %), no como porcentajes.
Convención: EA = efectiva anual; NAMV = nominal anual mes vencido; NAMA = mes anticipado; etc.
"""
from __future__ import annotations

# Tabla TPERIODOS del profesor: (frecuencia, factor m, tasa periódica, nominal vencida, nominal anticipada)
TPERIODOS = {
    "Mes": (12, "EM", "NAMV", "NAMA"),
    "Bimestre": (6, "EB", "NABV", "NABA"),
    "Trimestre": (4, "ET", "NATV", "NATA"),
    "Semestre": (2, "ES", "NASV", "NASA"),
    "Año": (1, "EA", "NA", "NAA"),
    "Quincena": (24, "EQ", "NAQV", "NAQA"),
    "Semana": (52, "EW", "NAWV", "NAWA"),
    "Día": (365, "ED", "NADV", "NADA"),
}

# Nombre de la nomenclatura -> (m, es_anticipada)
NOMENCLATURA = {}
for _frec, (_m, _tp, _nv, _na) in TPERIODOS.items():
    NOMENCLATURA[_nv] = (_m, False)
    NOMENCLATURA[_na] = (_m, True)
NOMENCLATURA["NA"] = (1, False)


def factor_nomenclatura(nombre: str) -> tuple[int, bool]:
    """('NAMV') -> (12, False). Lanza ValueError si el nombre no está en TPERIODOS."""
    try:
        return NOMENCLATURA[nombre.upper()]
    except KeyError:
        raise ValueError(f"Nomenclatura desconocida: {nombre!r}. Opciones: {sorted(NOMENCLATURA)}")


def ea_a_periodica(ea: float, dias_periodo: float, base: int = 365) -> float:
    """Tasa efectiva del periodo a partir de la EA: (1+EA)^(dias/base) - 1."""
    return (1.0 + ea) ** (dias_periodo / base) - 1.0


def periodica_a_ea(i: float, dias_periodo: float, base: int = 365) -> float:
    """Inverso de ea_a_periodica: (1+i)^(base/dias) - 1."""
    return (1.0 + i) ** (base / dias_periodo) - 1.0


def ea_a_nominal(ea: float, m: int) -> float:
    """Nominal anual vencida capitalizable m veces al año: ((1+EA)^(1/m) - 1) * m."""
    return ((1.0 + ea) ** (1.0 / m) - 1.0) * m


def nominal_a_ea(nominal: float, m: int) -> float:
    """EA a partir de una nominal vencida con m capitalizaciones: (1 + J/m)^m - 1."""
    return (1.0 + nominal / m) ** m - 1.0


def vencida_a_anticipada(i_vencida: float) -> float:
    """Tasa periódica vencida -> periódica anticipada: ia = i / (1+i)."""
    return i_vencida / (1.0 + i_vencida)


def anticipada_a_vencida(i_anticipada: float) -> float:
    """Tasa periódica anticipada -> periódica vencida: i = ia / (1-ia)."""
    return i_anticipada / (1.0 - i_anticipada)


def nomenclatura_a_ea(valor: float, nombre: str) -> float:
    """Convierte una tasa dada con nomenclatura ('NAMV', 'NATA'…) a EA."""
    m, anticipada = factor_nomenclatura(nombre)
    i = valor / m
    if anticipada:
        i = anticipada_a_vencida(i)
    return (1.0 + i) ** m - 1.0


def ea_a_nomenclatura(ea: float, nombre: str) -> float:
    """Convierte una EA a la nomenclatura pedida ('NAMV', 'NATA'…)."""
    m, anticipada = factor_nomenclatura(nombre)
    i = (1.0 + ea) ** (1.0 / m) - 1.0
    if anticipada:
        i = vencida_a_anticipada(i)
    return i * m


def tasa_real(tasa_nominal_ea: float, inflacion: float) -> float:
    """Tasa real por Fisher: (1+r)/(1+π) - 1."""
    return (1.0 + tasa_nominal_ea) / (1.0 + inflacion) - 1.0


def tir(flujos: list[float], tol: float = 1e-13, max_iter: int = 400) -> float:
    """TIR periódica de una serie de flujos. Busca el primer cambio de signo en una cuadrícula y afina por bisección.

    La cuadrícula (de -90 % a 1.000 % por periodo, más fina cerca de cero) evita los desbordamientos de las series
    largas cuando la tasa se acerca a -100 %. Lanza ValueError si no hay cambio de signo.
    """
    import numpy as np

    f = np.asarray([float(x) for x in flujos])
    t = np.arange(len(f))

    def vpn(r: float) -> float:
        with np.errstate(all="ignore"):
            return float(np.sum(f / (1.0 + r) ** t))

    rejilla = np.concatenate([np.linspace(-0.9, -0.011, 60), np.linspace(-0.01, 0.5, 1021), np.linspace(0.51, 10.0, 200)])
    previo_r, previo_v = None, None
    for r in rejilla:
        v = vpn(float(r))
        if not np.isfinite(v):
            continue
        if v == 0.0:
            return float(r)
        if previo_v is not None and previo_v * v < 0:
            lo, hi, f_lo = previo_r, float(r), previo_v
            for _ in range(max_iter):
                mid = (lo + hi) / 2.0
                f_mid = vpn(mid)
                if abs(f_mid) < tol or (hi - lo) < tol:
                    return mid
                if f_lo * f_mid < 0:
                    hi = mid
                else:
                    lo, f_lo = mid, f_mid
            return (lo + hi) / 2.0
        previo_r, previo_v = float(r), v
    raise ValueError("La serie de flujos no tiene TIR (no cambia de signo).")
