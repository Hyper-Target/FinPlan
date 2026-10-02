---
name: CDTLive
description: Compara con datos oficiales del día (Superfinanciera y BanRep) la rentabilidad de un CDT en los principales bancos y fintech de Colombia, replicando el cálculo del simulador de CDT de Davivienda, y entrega un Excel con fórmulas vivas más un informe Markdown que lo interpreta. Úsala cuando el usuario pregunte "dónde me conviene un CDT", "compara CDT", "tasas de CDT hoy", "cuánto gano en un CDT de X a N días" o invoque PlanFin:CDTLive.
---

# CDTLive (PlanFin)

Compara cuánto rinde un CDT en 28 bancos y fintech de Colombia (bancos tradicionales, bancos digitales como Lulo, Pibank y Ban100, y fintech como Nu, Iris, Bold, KOA, Tuya, Nequi y RappiPay) con las tasas que cada entidad reporta a la Superfinanciera. Descuenta la retención, la inflación y compara contra el promedio del sistema.

**Siempre entrega dos archivos:** un Excel con fórmulas vivas y un Markdown que lo interpreta.

Los scripts hacen toda la descarga y toda la matemática. Usted (el modelo) solo ejecuta comandos, verifica la salida y escribe cuatro interpretaciones cortas.

## Cuándo usarla

- "¿Dónde me conviene un CDT?", "compara CDT", "tasas de CDT hoy".
- "¿Cuánto gano con $20 millones en un CDT a 180 días?"
- "¿Nu o Lulo o Bancolombia?", "¿un CDT rinde más que la cuenta de ahorro de Nequi?"
- El usuario invoca `PlanFin:CDTLive`.

No la use para créditos (eso es otra skill), para acciones o fondos, ni para dar recomendaciones personalizadas de inversión.

## Perfil del usuario (asumir siempre)

Científico de Datos en Finanzas, estudiante de la Maestría en Finanzas de Uninorte. Quiere cifras exactas, trazabilidad a la fuente y entregables en español. Sin relleno ni adjetivos inflados.

## Antes de empezar (una sola vez)

Requisitos: Python 3.10 o superior. Instale las librerías:

```bash
pip install requests openpyxl pandas numpy scipy truststore
```

`truststore` es necesario en algunos equipos para consultar al Banco de la República (ver Manejo de errores).

Todos los comandos se ejecutan **desde la carpeta `Planeación Financiera`** (la que contiene `skills/` y `salidas/`). Si su carpeta actual es otra, use la ruta completa al script. Si `python` no existe en el equipo (Mac, Linux), use `python3`.

## Paso 1: recoger las entradas

Necesita tres datos. Si el usuario no los dio, pregunte **una sola vez**, con opciones:

| Entrada | Bandera | Valores | Si no responde |
|---|---|---|---|
| Monto en pesos | `--monto` | entero, sin puntos: `10000000` | 10.000.000 |
| Plazo en días | `--plazo` | 30 o más; los que más datos tienen: 30, 60, 90, 120, 180, 360 | 360 |
| Cómo se pagan los intereses | `--periodicidad` | `vencimiento`, `mensual`, `trimestral`, `semestral`, `anual` | `vencimiento` |

Reglas que el script valida:
- El plazo debe ser al menos 30 días.
- Con `mensual` el plazo debe ser múltiplo de 30; `trimestral`, de 90; `semestral`, de 180; `anual`, de 360. Con `vencimiento` sirve cualquier plazo.
- Máximo 60 periodos de pago.

Opcional: `--retencion 0.04` (retención en la fuente sobre intereses; cámbiela solo si el usuario da otra tarifa) y `--salida CARPETA`.

## Paso 2: ejecutar el script

```bash
python skills/PlanFin/CDTLive/scripts/cdtlive.py --monto 10000000 --plazo 360 --periodicidad vencimiento
```

Tarda entre 20 y 60 segundos: descarga datos, calcula, escribe el Excel, lo recalcula con Excel si está instalado (solo Windows) y escribe el Markdown.

**Salida esperada (ejemplo real del 29-sep-2026):**

```
RESUMEN_OK
excel=...\salidas\CDTLive\CDTLive_10000000_360d_2026-09-29.xlsx
md=...\salidas\CDTLive\CDTLive_10000000_360d_2026-09-29.md
fecha_corte=2026-09-25
resultado=$10.000.000 a 360 dias: mejor Banco Pichincha (Pibank), 13,46 % EA, interes neto $1.273.334
rentabilidad_real_ea=6,28 %; promedio_sistema=12,08 %; ipc12m=6,25 %
entidades_con_dato=25; sin_dato=Plata, Nequi, RappiPay
VALIDACION [OK] ΣXfd = 0 a la TIR (tolerancia $1): ΣXfd = -0.000002
VALIDACION [OK] TIR anualizada = rentabilidad neta EA de la mejor opción: ...
VALIDACION [OK] Fecha de corte con menos de 7 días: Último corte 2026-09-25 (4 días)
VALIDACION [OK] Al menos 10 entidades con dato: 25 entidades con dato de CDT
VALIDACION [OK] Plazo múltiplo del periodo y hasta 60 periodos: ...
VALIDACION [OK] Entidades de entidades.csv presentes en el dataset: Todas presentes
VALIDACION [OK] Excel recalculado coincide con Python; al duplicar el Monto todo se recalcula: 0 errores de fórmula; ...
SIGUIENTE_PASO: escriba las 4 interpretaciones y ejecute --rellenar (ver SKILL.md, paso 4)
```

Si no aparece `RESUMEN_OK`, no siga: vaya a **Manejo de errores**.

## Paso 3: verificar las validaciones

Lea cada línea `VALIDACION [...]`:

| Resultado | Qué hacer |
|---|---|
| `[OK]` | Nada |
| `[OMITIDA]` | Solo aparece en la validación con Excel cuando Excel no está instalado (Mac, Linux). Continúe y dígale al usuario: "El Excel no se pudo recalcular en este equipo; las cifras las calculó Python". Si quiere saltarla a propósito: `--sin-validar-excel` |
| `[ADVERTENCIA]` | Continúe, pero mencione la advertencia en su mensaje final. La sección "Alertas" del informe ya la recoge |
| `[ERROR]` | No entregue. Repita el paso 2 una vez. Si vuelve a salir, informe el error tal cual y no entregue los archivos |

Si el script terminó con `[ERROR]`, el código de salida es 4.

## Paso 4: escribir las interpretaciones

El informe Markdown quedó con cuatro marcadores: `{{INTERPRETACION_GRUPOS}}`, `{{INTERPRETACION_INFLACION}}`, `{{INTERPRETACION_AHORRO}}` y `{{INTERPRETACION_ALERTAS}}`. Abra el archivo `md=` que imprimió el script, léalo y escriba un texto para cada uno.

**Reglas de cada texto:**
1. **Máximo 3 frases.**
2. **Solo cifras que ya estén en las tablas del informe**, copiadas tal cual (por ejemplo `12,49 %`, `$1.273.334`). No calcule diferencias ni promedios nuevos: el script rechaza cualquier cifra que no esté en el informe.
3. Sin adjetivos inflados, sin emojis, sin recomendar una entidad ("le conviene") ni prometer resultados. Describa lo que muestran los datos.

**Qué debe decir cada uno:**

| Marcador | Contenido |
|---|---|
| `GRUPOS` | Qué tipo de entidad (tradicional, digital, fintech) paga más en promedio y quién lidera dentro de cada grupo |
| `INFLACION` | La rentabilidad real de la mejor opción frente a la inflación del DANE, y su diferencia con el promedio del sistema |
| `AHORRO` | Qué se deja de ganar al usar una cuenta de ahorro en vez del mejor CDT (tomar las cifras de la tabla de la sección 5) |
| `ALERTAS` | Los rezagos, la baja representatividad, la cobertura de Fogafín y las entidades sin dato que aparecen en la sección 6 |

**Comando** (en bash, el signo `$` de los montos debe escribirse `\$` dentro de comillas dobles; en PowerShell use comillas simples y escriba `$` normal):

```bash
python skills/PlanFin/CDTLive/scripts/cdtlive.py --rellenar "RUTA_DEL_MD" \
  --grupos "Las fintech (12,49 %) y los bancos digitales (12,39 %) pagan en promedio más que los bancos tradicionales (11,44 %). Entre los tradicionales, AV Villas lidera con 12,50 %." \
  --inflacion "Con inflación de 6,25 %, la mejor opción deja una rentabilidad real de 6,28 % EA. Su tasa bruta supera al promedio del sistema (12,08 %) en +1,38 p.p." \
  --ahorro "Dejar el dinero en ahorro rinde mucho menos: Lulo Bank y Nu pagan 8,86 % y 8,83 %, frente a 13,46 % del mejor CDT. En Bancolombia y Nequi el ahorro paga 0,07 % y 0,10 %." \
  --alertas "Seis entidades usan datos con un corte de rezago y GNB Sudameris tiene baja representatividad. El monto queda dentro de la cobertura de \$50.000.000 de Fogafín."
```

(Las cifras del ejemplo son del 29-sep-2026; use siempre las del informe que acaba de generar.)

**Salida esperada:** `MD_FINAL_OK ...` y código de salida 0.

**Si sale `ERROR_RELLENAR`:** el script le dice qué frase o qué cifra falló y no modificó el archivo. Corrija ese texto (acorte, o reemplace la cifra por una que esté en las tablas) y ejecute el mismo comando otra vez. Puede repetirlo las veces que haga falta.

Después de `MD_FINAL_OK`, el archivo ya no debe contener `{{`. Compruébelo:

```bash
grep -c "{{" "RUTA_DEL_MD"
```

Debe imprimir `0`.

## Paso 5: cierre (opcional) y entrega

- Opcional: si existe la skill `clean-finance`, aplíquela al Markdown para quitar relleno. No debe cambiar cifras.
- Entregue al usuario **solo** esto: la ruta del Excel, la ruta del Markdown y la línea "Resultado en una línea" de la sección 1 del informe. Nada más.
- Si hubo advertencias en el paso 3, agréguelas en una línea.

## Qué hay dentro del Excel

| Hoja | Contenido |
|---|---|
| `Resumen` | Estado del modelo, indicadores, hallazgos, ranking de las 10 mejores, promedio por tipo de entidad y gráfica |
| `Controles` | 10 controles de integridad en vivo y estado global |
| `Parametros` | Entradas (celdas azules): cámbielas y todo el libro se recalcula |
| `Tasas` | Datos crudos de la Superfinanciera por entidad, con linaje |
| `Simulacion` | El cálculo por entidad, con fórmulas |
| `Flujo_Mejor` | Flujo de caja de la mejor opción y validación ΣXfd = 0 |
| `Ahorro` | Cuentas de ahorro frente al mejor CDT |
| `Referencias` | Series del BanRep y del DANE |
| `Fuentes` | URL, fecha y hora de cada consulta, validaciones y notas metodológicas |

## Cómo se calcula (replica del simulador de CDT de Davivienda)

Para cada entidad, con la tasa efectiva anual (EA) que reporta a la Superfinanciera:

1. Tasa del periodo: `(1 + EA)^(días del periodo / 365) − 1`.
2. Interés bruto: `monto × tasa del periodo × número de periodos` (los intereses se pagan, no se capitalizan).
3. Retención: 4 % del interés bruto. Interés neto = bruto − retención.
4. Rentabilidad neta EA: TIR anualizada del flujo neto. Rentabilidad real: `(1 + neta) / (1 + inflación DANE 12 meses) − 1`.
5. Alerta de Fogafín si capital más intereses superan $50.000.000 en una misma entidad.

**Por qué no se consulta el simulador de Davivienda:** el sitio tiene protección antibots y su servicio de cálculo respondió con error 500 en las pruebas. Se replicó su lógica en Python y se aplicó a la tasa que Davivienda reporta a la Superfinanciera. Los detalles y las demás fuentes están en `skills/PlanFin/_shared/fuentes.md`.

## Manejo de errores

| Mensaje o síntoma | Causa probable | Qué hacer |
|---|---|---|
| `ERROR_FUENTE: ... datos.gov.co ...` | La API de la Superfinanciera no responde | Reintente una vez; si persiste, dígale al usuario que la fuente no está disponible. **No estime tasas** |
| `ERROR_FUENTE: ... BanRep Suameca ... CERTIFICATE_VERIFY_FAILED` | Falta `truststore` en ese equipo | `pip install truststore` y repita |
| `ERROR_FUENTE: ... BanRep ...` (otra causa) | El BanRep no responde | Reintente una vez; si persiste, informe que no se pudo obtener el promedio del sistema |
| `IPC no disponible, se usa la meta de inflación` (en Alertas) | El DANE cambió la URL o el formato del archivo, o no ha publicado | Continúe: el informe ya lo advierte. Avise al usuario de que la rentabilidad real usa la meta de inflación |
| `ERROR: ... el plazo debe ser múltiplo de ...` | Plazo y periodicidad incompatibles | Ofrezca al usuario un plazo válido o `vencimiento`, y repita |
| `ERROR: el plazo mínimo es 30 días` | Plazo menor a 30 | Explique que los CDT se emiten desde 30 días y pida otro plazo |
| Falta una entidad en "Alertas" (`ya no aparecen en el dataset`) | La Superfinanciera cambió su código o dejó de reportarla | Continúe; avise al usuario. No corrija `entidades.csv` sin que lo pida |
| Entidad con `Sin dato` | No reportó CDT a ese plazo en los últimos 6 cortes | Normal para fintech pequeñas. No se estima |
| `VALIDACION [OMITIDA]` | Excel no instalado (Mac, Linux) | Continúe; use el mensaje del paso 3 |
| `AVISO_ARCHIVO: ... está abierto en Excel` | El Excel de una corrida anterior sigue abierto y Windows lo bloquea | Continúe: el script guardó los archivos nuevos con la hora en el nombre. Dígale al usuario que cierre el archivo anterior si quiere reutilizar el nombre |
| `ERROR_RELLENAR` | El texto tiene más de 3 frases o una cifra que no está en el informe | Corrija y repita el comando (paso 4) |
| `ModuleNotFoundError` | Falta una librería | `pip install requests openpyxl pandas numpy scipy truststore` |

## Reglas duras

1. **Nunca invente una tasa** ni estime una cifra que no salió del script.
2. **Nunca arme URLs a mano**: los scripts ya conocen las fuentes.
3. **Nunca use el simulador web de Davivienda.**
4. **Siempre entregue el Excel y el Markdown**, con las interpretaciones ya insertadas.
5. **Siempre incluya la advertencia**: "Educación financiera, no asesoría de inversión. Verifique la tasa con la entidad antes de invertir." (ya está en el informe).
6. **Nunca recomiende una entidad**. Describa datos; no diga "le conviene".
7. **No edite el Excel a mano** ni los scripts. Si algo falla, informe.

## Archivos de la skill

| Archivo | Para qué |
|---|---|
| `scripts/cdtlive.py` | Punto de entrada único (cálculo, Excel, informe, relleno) |
| `scripts/plantilla_md.md` | Plantilla cerrada del informe |
| `scripts/validar_excel.ps1` | Recalcula el Excel con Excel (Windows) |
| `entidades.csv` | Entidades, códigos de la Superfinanciera, categoría y marca comercial |
| `tests/test_cdtlive.py` | 44 tests: `python -m pytest skills/PlanFin/CDTLive/tests -q` |
| `ejemplos/` | Una ejecución real completa (Excel e informe) |
| `../_shared/` | Fuentes, convenciones y librería común (la reutiliza RiskLive) |
