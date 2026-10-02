---
name: RiskLive
description: Versión personal y en vivo del Model Risk del curso de Planeación Financiera. Calibra con datos oficiales del día (BanRep, Superfinanciera, DANE) un portafolio de CDT, COLCAP y dólares, corre una simulación Monte Carlo y entrega un Excel con el modelo, la simulación y los resultados, más un informe Markdown que lo interpreta. Úsala cuando el usuario pregunte "con qué probabilidad llego a mi meta", "simula mi ahorro", "Monte Carlo de mi portafolio", "cuánto debo ahorrar al mes" o invoque PlanFin:RiskLive.
---

# RiskLive (PlanFin)

Responde una pregunta de planeación: si una persona ahorra un monto cada mes durante N años repartido entre CDT, COLCAP y dólares, ¿con qué probabilidad llega a una meta, cuál es el peor caso razonable y cuánto debería aportar para tener 80 % de probabilidad?

Toma la estructura del `Model Risk.xlsx` del profe (libro de caja con `Period`, `Inflow`, `Outflow`, `NetCF`, `InitialBalance`, `Interest`, `Balance`) y la calibra con datos oficiales de hoy en lugar de supuestos fijos.

**Siempre entrega dos archivos:** un Excel y un Markdown que lo interpreta.

Los scripts hacen la descarga, la estadística y la simulación. Usted (el modelo) solo ejecuta comandos, verifica la salida y escribe cuatro interpretaciones cortas.

## Cuándo usarla

- "¿Con qué probabilidad llego a $80 millones ahorrando $1 millón al mes durante 5 años?"
- "Simula mi ahorro", "Monte Carlo de mi portafolio", "cuál es mi peor escenario".
- "¿Cuánto debo ahorrar al mes para llegar a mi meta?"
- "¿Cambia mucho si pongo más plata en la bolsa?"
- El usuario invoca `PlanFin:RiskLive`.

No la use para créditos, para evaluar un CDT puntual (eso es `CDTLive`) ni para recomendar acciones específicas.

## Perfil del usuario (asumir siempre)

Científico de Datos en Finanzas, estudiante de la Maestría en Finanzas de Uninorte. Quiere cifras exactas, trazabilidad a la fuente y entregables en español. Sin relleno ni adjetivos inflados.

## Antes de empezar (una sola vez)

Requisitos: Python 3.10 o superior.

```bash
pip install requests openpyxl pandas numpy scipy truststore
```

Todos los comandos se ejecutan **desde la carpeta `Planeación Financiera`** (la que contiene `skills/` y `salidas/`). Si `python` no existe, use `python3`.

## Paso 1: recoger las entradas

Dos son obligatorias. Si el usuario no las dio, pregunte **una sola vez**, con opciones:

| Entrada | Bandera | Ejemplo | Valor por defecto |
|---|---|---|---|
| Aporte mensual en pesos | `--aporte` | `1000000` | **obligatorio** |
| Meta en pesos **de hoy** | `--meta` | `80000000` | **obligatorio** |
| Ahorro inicial | `--ahorro-inicial` | `5000000` | 0 |
| Años | `--horizonte` | `5` | 5 (entre 1 y 30) |
| Pesos CDT,COLCAP,USD | `--pesos` | `60,25,15` | `70,20,10` (deben sumar 100) |
| El aporte crece con la inflación | `--crecimiento-aporte` | `ipc` o `fijo` | `ipc` |
| Rebalanceo | `--rebalanceo` | `mensual`, `anual`, `ninguno` | `mensual` |
| Número de simulaciones | `--n-sim` | `10000` | 10000 |
| Semilla | `--seed` | `42` | 42 |
| Distribución de los shocks | `--dist` | `normal` o `t` | `normal` (`t` da colas más pesadas) |
| Ventana de calibración | `--ventana-anios` | `10` | 10 |
| Retención sobre el rendimiento de CDT | `--retencion` | `0.04` | 0.04 |

No cambie los valores por defecto avanzados (`--n-sim`, `--seed`, `--dist`, `--ventana-anios`, `--retencion`) salvo que el usuario lo pida.

La meta va en **pesos de hoy**: el resultado se compara contra el valor real (descontada la inflación).

## Paso 2: ejecutar el script

```bash
python skills/PlanFin/RiskLive/scripts/risklive.py --aporte 1000000 --meta 80000000 --horizonte 5 --pesos 60,25,15 --ahorro-inicial 5000000
```

Tarda cerca de un minuto: descarga y calibra los datos, simula 10.000 trayectorias, escribe el Excel, lo recalcula con Excel si está instalado (solo Windows) y escribe el Markdown.

**Salida esperada (ejemplo real del 29-sep-2026):**

```
RESUMEN_OK
excel=...\salidas\RiskLive\RiskLive_80000000_5a_2026-09-29.xlsx
md=...\salidas\RiskLive\RiskLive_80000000_5a_2026-09-29.md
fecha_datos=2026-09-25; semilla=42; simulaciones=10000
resultado=Aporte $1.000.000/mes x 5 anos: P(meta $80.000.000) = 31,8 %; mediana real $76.928.501; P5 $66.949.562; P95 $88.411.988
aporte_para_80=$1.127.533; var95=-$2.167.232; cvar95=$68.105
calibracion: COLCAP mu=0.0054 sigma=0.0584; CDT modo=vasicek; tasa_partida=13,46 %; ipc12m=6,25 %
VALIDACION [OK] Los pesos suman 100 %: Suma = 100 %
VALIDACION [OK] Matriz de correlación definida positiva: Autovalor mínimo 0.4577
VALIDACION [OK] Al menos 60 observaciones mensuales por serie: Mínimo 119 meses
VALIDACION [OK] P(meta) entre 0 y 1: P(meta) = 0.3180
VALIDACION [OK] Con volatilidad cero la simulación coincide con el escenario esperado ...
VALIDACION [OK] Fecha de los datos con menos de 7 días: ...
VALIDACION [OK] Aporte para 80 % coincide con la búsqueda binaria: ...
VALIDACION [OK] Excel recalculado coincide con Python; al duplicar el aporte todo se recalcula: ...
SIGUIENTE_PASO: escriba las 4 interpretaciones y ejecute --rellenar (ver SKILL.md, paso 4)
```

Si no aparece `RESUMEN_OK`, no siga: vaya a **Manejo de errores**.

## Paso 3: verificar las validaciones

Lea cada línea `VALIDACION [...]` y cada línea `AVISO_CALIBRACION`:

| Resultado | Qué hacer |
|---|---|
| `[OK]` | Nada |
| `[OMITIDA]` | La validación con Excel solo corre en Windows con Excel. Continúe y dígale al usuario: "El Excel no se pudo recalcular en este equipo; las cifras las calculó Python" |
| `[ADVERTENCIA]` | Continúe y mencione la advertencia en su mensaje final |
| `[ERROR]` | No entregue. Repita el paso 2 una vez. Si vuelve a salir, informe el error tal cual y no entregue los archivos |
| `AVISO_CALIBRACION` | La calibración usó una alternativa (por ejemplo, reversión a la media inestable en la tasa de CDT). Continúe: el informe ya lo dice en "Limitaciones". Mencione el aviso al usuario |

Un `[ERROR]` hace que el script termine con código de salida 4.

## Paso 4: escribir las interpretaciones

El informe Markdown quedó con cuatro marcadores: `{{INTERPRETACION_SUPUESTOS}}`, `{{INTERPRETACION_DISTRIBUCION}}`, `{{INTERPRETACION_SENSIBILIDAD}}` y `{{INTERPRETACION_OBJETIVO}}`. Abra el archivo `md=` que imprimió el script, léalo y escriba un texto para cada uno.

**Reglas de cada texto:**
1. **Máximo 3 frases.**
2. **Solo cifras que ya estén en las tablas del informe**, copiadas tal cual (por ejemplo `31,8 %`, `$76.928.501`). No calcule diferencias ni promedios nuevos: el script rechaza cualquier cifra que no esté en el informe.
3. Sin adjetivos inflados, sin emojis, sin prometer resultados ni decir "le conviene". Describa lo que muestran los datos.

**Qué debe decir cada uno:**

| Marcador | Contenido |
|---|---|
| `SUPUESTOS` | Desde qué tasa de CDT, inflación y meta de inflación parte la simulación y cómo se comparan con el promedio del sistema |
| `DISTRIBUCION` | La mediana frente a la meta, la probabilidad de llegar a ella y el peor caso razonable (percentil 5) |
| `SENSIBILIDAD` | Cómo cambia la probabilidad al subir o bajar el aporte, y qué pasa con la mediana y el percentil 5 al aumentar el peso en COLCAP |
| `OBJETIVO` | El aporte mensual necesario para 80 % de probabilidad y su diferencia con el aporte actual |

**Comando** (en bash, el signo `$` de los montos se escribe `\$` dentro de comillas dobles; en PowerShell use comillas simples y `$` normal):

```bash
python skills/PlanFin/RiskLive/scripts/risklive.py --rellenar "RUTA_DEL_MD" \
  --supuestos "La simulación parte de la mejor tasa de CDT a 360 días (13,46 %) y de una inflación de 6,25 % que converge a la meta de 3,00 %. El promedio del sistema es 12,08 % y la tasa de política monetaria, 12,00 %." \
  --distribucion "La mediana del valor real es \$76.928.501, por debajo de la meta de \$80.000.000, y la probabilidad de alcanzarla es 31,8 %. El peor caso razonable (percentil 5) es \$66.949.562 y solo 2,1 % de las corridas termina con menos poder adquisitivo del aportado." \
  --sensibilidad "Subir el aporte un 10 % lleva la probabilidad de 31,8 % a 71,7 %, mientras que bajarlo un 10 % la deja en 5,6 %. Con más COLCAP la mediana baja (de \$77.691.870 con 0 % a \$75.332.016 con 60 %) y el percentil 5 cae de \$67.587.989 a \$57.926.241." \
  --objetivo "Para 80 % de probabilidad hace falta aportar \$1.127.533 al mes. Son \$127.533 más que los \$1.000.000 actuales."
```

(Las cifras del ejemplo son del 29-sep-2026; use siempre las del informe que acaba de generar.)

**Salida esperada:** `MD_FINAL_OK ...` y código de salida 0.

**Si sale `ERROR_RELLENAR`:** el script le dice qué texto tiene más de 3 frases o qué cifra no está en el informe y no modificó el archivo. Corrija ese texto y ejecute el mismo comando otra vez. Puede repetirlo las veces que haga falta.

Compruebe que no quedan marcadores:

```bash
grep -c "{{" "RUTA_DEL_MD"
```

Debe imprimir `0`.

## Paso 5: cierre (opcional) y entrega

- Opcional: si existe la skill `clean-finance`, aplíquela al Markdown para quitar relleno. No debe cambiar cifras.
- Entregue al usuario **solo** esto: la ruta del Excel, la ruta del Markdown y la línea "Resultado en una línea" de la sección 1 del informe. **No reinterprete las cifras**: cópielas del informe.
- Si hubo advertencias o avisos en el paso 3, agréguelos en una línea.

## Qué hay dentro del Excel

| Hoja | Contenido |
|---|---|
| `Resumen` | Estado del modelo, indicadores (probabilidad, valor real mediano, percentil 5, aporte para 80 %), hallazgos, fan chart de percentiles, histograma del valor final y supuestos del día |
| `Controles` | 12 controles de integridad en vivo y estado global (incluye aviso si se editan los parámetros tras la corrida) |
| `Parametros` | Entradas (celdas azules): al editarlas, `Modelo_Base` se recalcula |
| `Supuestos_EnVivo` | Cada supuesto con su fuente, id de serie y fecha del dato |
| `Calibracion` | Media, volatilidad, asimetría, curtosis, Jarque-Bera, parámetros de reversión a la media y matriz de correlación |
| `Modelo_Base` | Escenario esperado con **fórmulas vivas** y la estructura del libro de caja del profe |
| `Simulacion` | Muestra de 1.000 corridas con estadísticas en vivo |
| `Resultados` | Percentiles, probabilidad, VaR, CVaR, aporte para 80 %, sensibilidades e histograma (valores de la corrida) |
| `Percentiles_Mes` | Tabla detrás del fan chart |
| `Fuentes` | URL y fecha de cada consulta, validaciones y notas metodológicas |

## Cómo funciona (resumen)

1. **Calibración** con los últimos 10 años de datos mensuales: COLCAP y TRM con retornos logarítmicos (media, volatilidad, Jarque-Bera); tasa de CDT a 360 días con reversión a la media (Vasicek por mínimos cuadrados) más la prima de la mejor entidad de hoy según la Superfinanciera; inflación con reversión a la meta del BanRep; correlaciones entre los cuatro shocks con Cholesky.
2. **Simulación** de 10.000 trayectorias mensuales con semilla fija. El aporte entra al final de cada mes; el saldo rinde durante el mes; el CDT paga la tasa simulada menos la retención.
3. **Resultados:** valor real final (pesos de hoy), P(llegar a la meta), percentiles, VaR y CVaR de la ganancia real, caída máxima y el aporte mensual que da 80 % de probabilidad.
4. **Relación con el profe:** el detalle de qué es del `Model Risk.xlsx` y qué se agregó está en `referencia_model_risk.md`.

## Manejo de errores

| Mensaje o síntoma | Causa probable | Qué hacer |
|---|---|---|
| `ERROR: faltan datos obligatorios` | No se dio `--aporte` o `--meta` | Pregunte al usuario (una vez) y repita |
| `ERROR: Los pesos deben sumar 100` | `--pesos` mal escrito | Corrija los pesos (por ejemplo `60,25,15`) |
| `ERROR: el horizonte debe estar entre 1 y 30 años` | Horizonte fuera de rango | Pida otro horizonte |
| `ERROR_FUENTE: ... BanRep Suameca ... vacía` | Una serie del BanRep vino vacía | Reintente una vez; si persiste, informe que no se pudo calibrar. **No invente parámetros** |
| `ERROR_FUENTE: ... CERTIFICATE_VERIFY_FAILED` | Falta `truststore` en ese equipo | `pip install truststore` y repita |
| `ERROR_FUENTE: ... IPC ... DANE` | El DANE cambió la URL o el formato | Reintente una vez; si persiste, informe que el IPC no está disponible |
| `AVISO_CALIBRACION: Superfinanciera no disponible ...` | La Superfinanciera no respondió | El script usa la tasa del sistema (serie 240) como punto de partida y lo advierte; mencione el aviso al usuario |
| `AVISO_CALIBRACION: La matriz de correlación no era definida positiva` | Datos con correlaciones incoherentes | El script la corrigió a la PSD más cercana; mencione el aviso |
| `AVISO_CALIBRACION: Reversión a la media inestable` | El ajuste de la tasa de CDT dio un parámetro fuera de rango | El script usa un camino aleatorio acotado; ya queda en "Limitaciones" |
| `ERROR_FUENTE: ... menos de 60 ...` | Hay menos de 60 observaciones mensuales en la ventana | Informe al usuario; no reduzca el mínimo |
| `VALIDACION [OMITIDA]` | Excel no instalado (Mac, Linux) | Continúe; use el mensaje del paso 3 |
| `AVISO_ARCHIVO: ... está abierto en Excel` | El Excel de una corrida anterior sigue abierto y Windows lo bloquea | Continúe: el script guardó los archivos nuevos con la hora en el nombre. Dígale al usuario que cierre el archivo anterior si quiere reutilizar el nombre |
| `ERROR_RELLENAR` | Texto con más de 3 frases o cifra que no está en el informe | Corrija y repita el comando (paso 4) |
| `ModuleNotFoundError` | Falta una librería | `pip install requests openpyxl pandas numpy scipy truststore` |

## Reglas duras

1. **Nunca invente parámetros** ni estime una cifra que no salió del script.
2. **La semilla siempre queda registrada** (en la salida, el Excel y el informe). Misma semilla y mismos datos, mismo resultado.
3. **Siempre entregue el Excel y el Markdown**, con las interpretaciones ya insertadas.
4. **Siempre incluya la advertencia**: "Educación financiera, no asesoría de inversión." (ya está en el informe).
5. **No reinterprete las cifras**: cópielas del informe o del bloque `RESUMEN_OK`. No calcule probabilidades ni aportes por su cuenta.
6. **Nunca recomiende** un portafolio ni diga "le conviene". Describa datos.
7. **No edite los scripts ni el Excel a mano.** Si algo falla, informe.
8. Si el usuario edita los parámetros en el Excel, `Modelo_Base` se recalcula pero `Resultados` no: para nuevos resultados hay que volver a correr el script.

## Archivos de la skill

| Archivo | Para qué |
|---|---|
| `scripts/risklive.py` | Punto de entrada único (datos, simulación, Excel, informe, relleno) |
| `scripts/calibracion.py` | Calibración estadística con datos en vivo |
| `scripts/simulacion.py` | Motor de simulación vectorizado |
| `scripts/excel_risklive.py` | Construcción del Excel |
| `scripts/plantilla_md.md` | Plantilla cerrada del informe |
| `referencia_model_risk.md` | Qué contiene el modelo del profe y cómo se mapea a RiskLive |
| `tests/test_risklive.py` | 28 tests: `python -m pytest skills/PlanFin/RiskLive/tests -q` |
| `ejemplos/` | Una ejecución real completa (Excel e informe) |
| `../_shared/` | Fuentes, convenciones y librería común (compartida con CDTLive) |
