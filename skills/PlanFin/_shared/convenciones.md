# Convenciones de los modelos PlanFin

Las skills parten de la disciplina del curso (Planeación Financiera, MFi Uninorte, prof. Félix Gutiérrez) y la llevan a un estándar de modelos financieros profesionales. Este documento resume las dos cosas.

## 1. Lo que hace el profesor (extraído de `Herramientas/01 Calculadora Financiera v9.xlsx` y `Sistemas de Amortización.xlsx`)

### Tasas: tabla `TPERIODOS` (hoja Dataset)

| Frecuencia | Factor m | Tasa periódica | Nominal vencida | Nominal anticipada |
|---|---|---|---|---|
| Mes | 12 | EM | NAMV | NAMA |
| Bimestre | 6 | EB | NABV | NABA |
| Trimestre | 4 | ET | NATV | NATA |
| Semestre | 2 | ES | NASV | NASA |
| Año | 1 | EA | NA | NAA |
| Quincena | 24 | EQ | NAQV | NAQA |
| Semana | 52 | EW | NAWV | NAWA |
| Día | 365 | ED | NADV | NADA |

Equivalencias: EA = (1 + J/m)^m − 1; J = ((1 + EA)^(1/m) − 1) · m. El profesor trunca la EA a 12 decimales (`TRUNC(C4,12)`) antes de derivar la nominal. Implementado en `tasas.py` (`nomenclatura_a_ea`, `ea_a_nomenclatura`).

### Estructura de los modelos

- Tablas de Excel con referencias estructuradas: `SISTEMA1[[#This Row],[Saldo Inicial]]`.
- Nombres con ámbito de hoja para las variables del problema: `Principal`, `nCuotas`, `TasaPer`, `TasaEA`, `TasaNOM`, `Plazo`, `Cuota`, `Desembolso`, `frecuencia`, `mPeriodos`, `Spread`, `PrincipalCOP`, `PrincipalUSD`.
- Columnas de flujo: `Periodo`, `Ingreso`, `Egreso`, `FCN`, `Signo`, `Saldo Inicial`, `Intereses`, `Saldo Final`, `Ab. Capital` (amortización); en la calculadora, variables `P, F, A, n, i` y `NOM, EFF, m`.
- Celdas de entrada en azul; fórmulas `PMT/PV/FV/NPER/RATE` con `IFERROR(...,"---")`.
- Validación de flujos: la suma de flujos descontados a la TIR es cero (ΣXfd = 0).

## 2. Estándar PlanFin (lo que se agrega)

| Práctica | Cómo se aplica |
|---|---|
| Separación entradas / cálculos / salidas / controles | Pestañas: `Resumen` (salida), `Controles`, `Parametros` (entradas), `Tasas` (datos), `Simulacion`, `Flujo_Mejor`, `Ahorro` (cálculo), `Referencias`, `Fuentes`. Color de pestaña por rol |
| Entradas identificables | Relleno azul muy tenue y fuente azul; todo lo demás es fórmula. Cambiar el `Monto` recalcula todo el libro |
| Nombres definidos | Todos los parámetros y resultados clave (`Monto`, `PlazoDias`, `Retencion`, `MejorEntidad`, `TIREA`, `ModeloOK`…). Ninguna fórmula lleva números escritos a mano |
| Tablas con referencias estructuradas | `TTasas`, `TSimulacion`, `TFlujo`, `TAhorro`, `TReferencias`, `TFuentes`, `TControles` |
| Controles de integridad | Hoja `Controles` con 10 chequeos en vivo y un estado global (`ModeloOK`: OK / OK CON ADVERTENCIAS / REVISAR) que aparece en el `Resumen` |
| Conciliación independiente | Python recalcula todo por su lado y se compara contra el Excel recalculado por Excel (control C10) |
| Linaje del dato | Cada cifra externa lleva fuente, dataset y fecha-hora de extracción (hojas `Tasas`, `Referencias`, `Fuentes`) |
| Unidades explícitas | Encabezados con unidad; pesos con separador de miles y sin decimales; tasas con 2 decimales |
| Diseño | Sin cuadrículas, fuente Segoe UI, encabezados pequeños en gris, líneas finas, un solo color de acento, cifras grandes en los indicadores |

## 3. Nombres y formatos

- Tasas dentro de fórmulas: siempre como fracción (0,1346), con formato `0.00%`.
- Nombres de tabla con prefijo `T`; nombres definidos en CamelCase sin espacios.
- Fechas ISO (`yyyy-mm-dd`). En fórmulas de texto no se usa `TEXT()` con formatos (depende del idioma de Excel); se usan `FIXED`, `YEAR`, `MONTH`, `DAY` y `ROUND`.
- Archivos de salida: `salidas/<Skill>/<Skill>_<parametros>_<AAAA-MM-DD>.xlsx` y `.md`.

## 4. Constantes

Ver la sección 5 de `fuentes.md` (cobertura de Fogafín, retención, GMF).

## 5. Retención sobre los intereses

`RentNetaEA` es la TIR anualizada del flujo neto: −Monto en t=0, interés menos retención en cada periodo y el capital al final. Con intereses constantes y capital a la par, la TIR periódica es exactamente `TasaPeriodica × (1 − Retencion)`, así que la fórmula cerrada coincide con la TIR (control C02). Supone que los intereses que se pagan antes del vencimiento se reinvierten a la misma tasa.
