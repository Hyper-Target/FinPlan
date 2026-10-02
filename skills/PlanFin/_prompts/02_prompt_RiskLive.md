# Prompt para construir la skill RiskLive

> Ejecútalo DESPUÉS de CDTLive, porque reutiliza `skills/PlanFin/_shared/`. Copia todo lo que está debajo de la línea y pégalo en una sesión nueva de Claude Code (Sonnet 5.5), abierta en la carpeta `Planeación Financiera`.

---

## Rol y objetivo

Vas a construir una **skill de Claude Code** llamada `RiskLive`. Toma el modelo de riesgo del profesor (`Model Risk.xlsx`) y lo convierte en una versión para **finanzas personales**, con **supuestos calibrados con datos oficiales en vivo** en lugar de supuestos fijos. Corre una simulación Monte Carlo y responde preguntas como:

- "Si ahorro $X al mes durante N años repartido entre CDT, COLCAP y dólares, ¿con qué probabilidad llego a $Meta?"
- "¿Cuál es el peor escenario razonable (percentil 5) de mi portafolio en 5 años?"

**Toda ejecución entrega siempre dos archivos:**
1. un **Excel** con la estructura del modelo del profe, los supuestos en vivo, la simulación y los resultados;
2. un **Markdown** que interpreta ese Excel.

**Requisito central:** la skill debe quedar tan detallada que Claude Haiku 4.5 o un Sonnet con esfuerzo medio la ejecuten sin errores.
- Toda la estadística, la simulación y la descarga van en **scripts de Python probados**, con semilla fija.
- El modelo que ejecuta la skill solo recoge las entradas, corre comandos, verifica la salida y llena los párrafos de interpretación.
- Pasos numerados con comando exacto, salida esperada y acción ante fallas.

No construyas ninguna app ni interfaz web.

## Estructura

```
Planeación Financiera/skills/PlanFin/
├── _shared/                 # YA EXISTE (lo creó CDTLive): reutilízalo y extiéndelo, no lo dupliques
└── RiskLive/
    ├── SKILL.md
    ├── referencia_model_risk.md   # documentación del modelo del profe (la escribes en el Paso 0)
    ├── scripts/
    │   ├── risklive.py            # punto de entrada único
    │   ├── calibracion.py
    │   ├── simulacion.py
    │   ├── excel_risklive.py
    │   └── plantilla_md.md
    ├── tests/test_risklive.py
    └── ejemplos/
        ├── ejemplo_entrada.json
        ├── RiskLive_ejemplo.xlsx
        └── RiskLive_ejemplo.md
```

## Paso 0: entender el modelo del profe (obligatorio, antes de escribir código)

1. Abre con openpyxl, sin `data_only` y luego con `data_only=True`, estos dos archivos:
   - `OneDrive_1_25-9-2026/Profe/260925 Model Risk.xlsx`, la versión trabajada en clase del 25-sep-2026;
   - `OneDrive_1_25-9-2026/Herramientas/Model Risk.xlsx`, la plantilla.
2. Documenta en `RiskLive/referencia_model_risk.md`:
   - cada hoja con su propósito;
   - las tablas de Excel y sus columnas;
   - los nombres definidos y su ámbito;
   - las variables de entrada, cuáles son aleatorias y con qué distribución (normal, triangular, uniforme…) y con qué parámetros;
   - cómo genera las corridas (fórmulas `RAND()`/`NORM.INV`, tabla de datos u otro método);
   - las salidas (VPN, TIR, probabilidad de VPN < 0, percentiles…);
   - las gráficas.

   Copia literalmente las fórmulas clave.
3. Lee también `_shared/convenciones.md` (ya contiene la convención del profe) y `Clase 19 Septiembre 26.xlsx` si incluye ejercicios de riesgo.
4. Con base en eso, decide el **mapeo** del modelo empresarial del profe al caso personal y escríbelo como tabla en `referencia_model_risk.md`, por ejemplo:

   | En el modelo del profe | En RiskLive |
   |---|---|
   | Inversión inicial | Ahorro inicial |
   | Flujos del proyecto | Aportes mensuales |
   | Variables de riesgo del proyecto | Rendimiento del CDT, del COLCAP, variación de la TRM e inflación |
   | VPN | Valor final real |
   | P(VPN < 0) | P(no cumplir la meta) |

   Si el modelo del profe usa otra lógica, respétala y adapta el mapeo. El objetivo es que el profe reconozca su modelo.

## Entradas de la skill

| Entrada | Ejemplo | Valor por defecto |
|---|---|---|
| `ahorro_inicial` (COP) | 5.000.000 | 0 |
| `aporte_mensual` (COP) | 1.000.000 | obligatorio |
| `horizonte_anios` | 5 | 5 |
| `meta` (COP, en pesos de hoy) | 80.000.000 | obligatorio |
| `pesos` del portafolio | CDT 60 %, COLCAP 25 %, USD 15 % | 70 / 20 / 10 |
| `n_sim` | 10.000 | 10.000 |
| `seed` | 42 | 42 |
| `crecimiento_aporte` | "con IPC" o 0 | con IPC |

Si falta algo obligatorio, pregunta UNA sola vez con opciones. Valida que los pesos sumen 100 %.

## Fuentes de datos (verificadas el 29-sep-2026)

Usa las funciones de `_shared/scripts/` que ya existen. Si falta alguna, agrégala ahí.

### BanRep, API Suameca (JSON sin login)

- `GET https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie={ID}`
- Respuesta: `[0].data = [[timestamp_ms, valor], ...]`. Zona horaria `America/Bogota`. Descarta las fechas futuras.

| ID | Serie | Uso en RiskLive |
|---|---|---|
| 6 | Índice COLCAP (diaria) | Retornos logarítmicos mensuales → media y volatilidad de la renta variable |
| 1 | TRM (diaria) | Variación mensual → media y volatilidad del componente en dólares |
| 240 | Tasa de CDT a 360 días (diaria) | Nivel actual y volatilidad de la tasa de renta fija |
| 238 | Tasa de CDT a 90 días | Alternativa si el horizonte es corto |
| 243 | IBR a 3 meses | Contexto y correlación con la tasa de CDT |
| 59 | Tasa de política monetaria | Contexto (va al MD) |
| 853 | Meta de inflación | Ancla de largo plazo de la inflación |

### Superfinanciera (datos.gov.co)

- `https://www.datos.gov.co/resource/axk9-g2nh.json`: la tasa de CDT de hoy por entidad (ver la skill CDTLive). RiskLive toma **la mejor tasa a 360 días entre las entidades de `CDTLive/entidades.csv`** como punto de partida de la renta fija. Reutiliza la función de CDTLive; no la reescribas.
- `https://www.datos.gov.co/resource/gfy9-fpbr.json`: rentabilidad diaria de los fondos de pensiones (retiro programado). **Es opcional.** Inspecciona primero sus columnas con `?$limit=5`, documéntalas y úsalas solo como línea de comparación en el MD ("un fondo de pensiones en retiro programado ha rentado X"). Si la estructura no es clara, omítela y dilo.

### DANE, IPC

- `https://www.dane.gov.co/files/operaciones/IPC/{mes}{AAAA}/anex-IPC-Indices-{mes}{AAAA}.xlsx` (serie histórica de índices) y `anex-IPC-Variacion-{mes}{AAAA}.xlsx`, con `mes` ∈ {ene…dic}. Verificado con `ago2026`.
- Prueba el mes anterior y, si falla, dos meses atrás.
- Del archivo de índices obtén la inflación mensual histórica (al menos 10 años).

## Calibración (`calibracion.py`)

1. **Ventana:** los últimos 10 años de datos mensuales (fin de mes). Es un parámetro `--ventana_anios`.
2. **COLCAP y TRM:** retornos logarítmicos mensuales → μ y σ mensuales. Reporta también la asimetría y la curtosis, y aplica la prueba de Jarque-Bera. Si se rechaza la normalidad, dilo en el MD. La simulación base sigue siendo lognormal por simplicidad, pero ofrece la opción `--dist t` (t de Student con los grados de libertad estimados).
3. **Renta fija (CDT):**
   - la tasa del año 1 es la mejor tasa de hoy, según la Superfinanciera;
   - para los años siguientes, la tasa de reinversión sigue un proceso de reversión a la media (Vasicek discreto) sobre la serie 240, con parámetros estimados por MCO: `r_{t+1} − r_t = a(b − r_t) + σ ε`;
   - si la estimación es inestable (a ≤ 0 o a > 1), usa un camino aleatorio acotado y dilo.
4. **Inflación:** también con reversión a la media, hacia la meta del BanRep (853).
5. **Correlaciones:** matriz de correlación de los shocks mensuales (COLCAP, TRM, variación de la tasa de CDT, inflación). Simula con descomposición de Cholesky. Verifica que la matriz sea definida positiva; si no lo es, aplica la corrección del PSD más cercano y registrala.
6. Guarda todos los parámetros en un diccionario que va a la hoja `Calibracion` del Excel, con la fuente, la ventana y el número de observaciones de cada uno.

## Simulación (`simulacion.py`)

- Numpy vectorizado, con `n_sim × meses`. Semilla fija, y la semilla va en el Excel.
- Cada mes:
  1. entra el aporte, ajustado por la inflación simulada si `crecimiento_aporte = "con IPC"`;
  2. se reparte según los pesos (rebalanceo mensual por defecto; la opción `--rebalanceo anual|ninguno`);
  3. cada parte rinde:
     - CDT: tasa EA simulada convertida a mensual con `_shared/tasas.py`, menos el 4 % de retención sobre el rendimiento;
     - COLCAP: retorno simulado;
     - USD: variación de la TRM simulada.
- **Salidas por simulación:** valor final nominal, valor final **real** (deflactado con la inflación simulada acumulada), máximo drawdown y si se cumple la meta (con el valor real mayor o igual a la meta).
- **Resultados agregados:**
  - P(cumplir la meta);
  - percentiles 5, 25, 50, 75 y 95 del valor real final;
  - VaR y CVaR al 95 % del valor final frente al total aportado;
  - la trayectoria de percentiles mes a mes (para el fan chart);
  - el aporte mensual necesario para llegar al 80 % de probabilidad (búsqueda binaria reutilizando la misma semilla).
- **Escenario determinístico:** una corrida con todos los shocks en cero (valores esperados), para que el Excel tenga una hoja con fórmulas vivas comparables con el modelo del profe.

## El Excel de salida

Nombre: `RiskLive_{meta}_{horizonte}a_{AAAA-MM-DD}.xlsx`, en `Planeación Financiera/salidas/RiskLive/`.

Hojas, en este orden. Sigue la convención del profe: tablas estructuradas, nombres definidos y la validación ΣXfd = 0 donde aplique.

1. **Resumen.** Tarjetas KPI:
   - P(cumplir la meta);
   - valor real mediano;
   - percentil 5;
   - aporte necesario para el 80 %;
   - la fecha de los datos.

   Debajo, un fan chart (gráfico de líneas nativo de openpyxl con los percentiles 5, 25, 50, 75 y 95 mes a mes) y un histograma del valor final (gráfico de barras con los bins calculados en Python).
2. **Parametros.** Las entradas del usuario como nombres definidos: `AhorroInicial`, `AporteMensual`, `HorizonteMeses`, `Meta`, `PesoCDT`, `PesoCOLCAP`, `PesoUSD`, `NSim`, `Seed` y `Retencion`.
3. **Supuestos_EnVivo.** Tabla `TSupuestos`: Variable, Valor, Unidad, Fuente (URL), IDSerie, FechaDato, FechaConsulta. Por ejemplo: la mejor tasa de CDT de hoy, la TPM, la meta de inflación, el último IPC 12m, el último COLCAP y la última TRM.
4. **Calibracion.** μ, σ, asimetría, curtosis, Jarque-Bera, los parámetros de Vasicek, la matriz de correlación y el número de observaciones.
5. **Modelo_Base.** El escenario determinístico mes a mes, **con fórmulas vivas** que apuntan a `Parametros` y `Calibracion`. Columnas: Period, Aporte, SaldoInicialCDT, RendCDT, SaldoInicialCOLCAP, RendCOLCAP, SaldoInicialUSD, RendUSD, SaldoFinal, InflacionAcum, SaldoReal. Esta hoja es la versión personal del modelo del profe: sigue su estructura.
6. **Simulacion.** Las primeras 1.000 corridas como valores (ValorFinalNominal, ValorFinalReal, CumpleMeta, MaxDrawdown), con una nota que indique que el total de corridas es `NSim` y que las estadísticas usan todas.
7. **Resultados.** Percentiles, probabilidad, VaR, CVaR y la tabla de sensibilidad: P(meta) según el aporte mensual (−30 % … +30 %) y según el peso en COLCAP (0 % … 60 %).
8. **Percentiles_Mes.** La tabla detrás del fan chart.
9. **Fuentes.** Las URLs, la fecha y hora, las observaciones descargadas, las advertencias de calibración y la nota metodológica.

## El Markdown de salida

Mismo nombre, con extensión `.md`. Se genera desde `plantilla_md.md`, que es **cerrada**. El modelo solo escribe los bloques `{{INTERPRETACION_*}}`: máximo 3 frases cada uno, solo con cifras que estén en el Excel.

Secciones fijas:
1. **Resultado en una línea**: "Con $X al mes durante N años, hay P % de probabilidad de llegar a $Meta (pesos de hoy)."
2. **Qué supuestos usó el agente hoy**: tabla de `Supuestos_EnVivo` con las fuentes.
3. **Distribución del resultado**: percentiles en una tabla y lectura del peor caso razonable (P5).
4. **Qué mueve el resultado**: sensibilidad al aporte y al peso en COLCAP.
5. **Cómo llegar al 80 %**: el aporte necesario.
6. **Relación con el modelo del profe**: la tabla de mapeo del Paso 0.
7. **Limitaciones**: normalidad (resultado de Jarque-Bera), ventana histórica, correlaciones que cambian en crisis, que la tasa de CDT es un promedio de la Superfinanciera y que no se modelan impuestos distintos de la retención.
8. **Advertencia**: "Educación financiera, no asesoría de inversión."
9. **Fuentes**.

## El SKILL.md

Frontmatter:
```yaml
---
name: RiskLive
description: Versión personal y en vivo del Model Risk del curso de Planeación Financiera. Calibra con datos oficiales del día (BanRep, Superfinanciera, DANE) un portafolio de CDT, COLCAP y dólares, corre una simulación Monte Carlo y entrega un Excel con el modelo, la simulación y los resultados, más un informe Markdown que lo interpreta. Úsala cuando el usuario pregunte "con qué probabilidad llego a mi meta", "simula mi ahorro", "Monte Carlo de mi portafolio", "cuánto debo ahorrar al mes" o invoque PlanFin:RiskLive.
---
```

Cuerpo, igual que CDTLive:
1. Cuándo usarla.
2. Entradas, con sus valores por defecto.
3. Flujo en pasos numerados, cada uno con el comando exacto, un ejemplo literal de la salida esperada y la acción ante fallas. Por ejemplo: `python skills/PlanFin/RiskLive/scripts/risklive.py --aporte 1000000 --meta 80000000 --horizonte 5 --pesos 60,25,15`.
4. Validaciones que el script imprime y que el modelo confirma antes de entregar:
   - los pesos suman 1;
   - la matriz de correlación es PSD;
   - al menos 60 observaciones mensuales por serie;
   - la P(meta) está entre 0 y 1;
   - el escenario determinístico del Excel coincide con el de Python (tolerancia de $1);
   - la fecha de los datos tiene menos de 7 días.
5. Tabla de errores → causa → acción: una serie del BanRep vacía, el DANE no encontrado, la Superfinanciera caída (usar la serie 240 como tasa de partida y avisar), una matriz no PSD o una calibración inestable.
6. Reglas duras:
   - nunca inventar parámetros;
   - la semilla siempre queda registrada;
   - siempre se entregan el Excel y el MD;
   - siempre se incluye la advertencia;
   - el modelo no reinterpreta las cifras, las copia del bloque `RESUMEN_OK` que imprime el script.
7. Qué entregar al final: las dos rutas y el "Resultado en una línea".

## Calidad del código

- Python 3.10+, con `requests`, `openpyxl`, `pandas`, `numpy` y `scipy` (para Jarque-Bera y la t de Student).
- Timeouts, reintentos y mensajes de error en español.
- Guarda en caché los datos descargados en `salidas/RiskLive/cache/{fecha}/`, para no volver a descargar en la misma jornada.
- Tests (pytest):
  - la simulación con volatilidad cero debe coincidir exactamente con el escenario determinístico;
  - con la misma semilla, el resultado es idéntico;
  - el aporte mensual necesario sube al subir la meta;
  - Cholesky con una matriz conocida;
  - la conversión de tasas reutiliza los tests de `_shared`.
- Corre todo con datos reales y guarda esa corrida como el ejemplo.

## Criterios de aceptación (verifica y reporta cada uno)

- [ ] `referencia_model_risk.md` describe con precisión el modelo del profe, con sus fórmulas literales y la tabla de mapeo.
- [ ] `risklive.py` corre de principio a fin con datos reales, en menos de 2 minutos con 10.000 simulaciones.
- [ ] El Excel abre sin errores; `Modelo_Base` recalcula al cambiar `AporteMensual`.
- [ ] El fan chart y el histograma se ven en el Excel.
- [ ] El MD no tiene cifras fuera del Excel.
- [ ] Los tests pasan.
- [ ] Prueba de fuego: sigue el SKILL.md literalmente como si fueras Haiku y corrige cualquier ambigüedad.

No hagas commits de git.
