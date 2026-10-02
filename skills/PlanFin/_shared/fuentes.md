# Catálogo de fuentes de datos (PlanFin)

Verificadas el 29-sep-2026 con datos reales. Todas son públicas y no requieren login. Regla general: **si una fuente falla, se informa "no disponible" y jamás se inventa la cifra.**

Los scripts de `_shared/scripts/` ya implementan cada descarga; las URL de abajo son para auditar, no para armarlas a mano.

## 1. Superfinanciera de Colombia (datos.gov.co, API Socrata)

| Dato | Dataset | Endpoint | Notas |
|---|---|---|---|
| Tasas de captación por entidad (CDT y ahorro) | `axk9-g2nh` | `https://www.datos.gov.co/resource/axk9-g2nh.json` | Diario (días hábiles), un día de rezago. `uca=1` CDT, `uca=7` ahorro. Ver detalle abajo |
| Interés bancario corriente (base de la usura) | `pare-7x5i` | `https://www.datos.gov.co/resource/pare-7x5i.json?$order=vigencia_desde DESC&$limit=5` | Usura = 1,5 × interés bancario corriente. Columna `interes_bancario_corriente` viene como texto con `%` |
| Tasas de crédito por banco, últimos 2 meses | `qzsc-9esp` | `https://www.datos.gov.co/resource/qzsc-9esp.json` | Producto, plazo y `tasa_efectiva_promedio` |
| Tasas de crédito, histórico | `w9zh-vetq` | `https://www.datos.gov.co/resource/w9zh-vetq.json` | Mismas columnas que `qzsc-9esp` |
| Rentabilidad de fondos de pensiones (retiro programado) | `gfy9-fpbr` | `https://www.datos.gov.co/resource/gfy9-fpbr.json` | **No utilizable por API**: devuelve filas vacías y no expone columnas (verificado 29-sep-2026). RiskLive no lo usa |
| TRM diaria | `32sa-8pi3` | `https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde DESC&$limit=2` | La fila más reciente puede tener vigencia del día siguiente |

### Dataset `axk9-g2nh`, lo que hay que saber

- Columnas: `tipoentidad`, `codigoentidad`, `nombreentidad`, `fechacorte`, `uca`, `nombre_unidad_de_captura`, `subcuenta`, `descripcion`, `tasa` (% EA, texto), `monto` (**miles de pesos**, texto).
- Pasar siempre `$limit=50000`: el valor por defecto de Socrata es 1000 y corta filas en silencio.
- La tasa es el **promedio ponderado por monto de lo efectivamente pagado**, no la tasa de cartelera.
- Identificar entidades por `(tipoentidad, codigoentidad)`, nunca por nombre: la fuente escribe nombres irregulares (`"RappiPAY"` con comillas, `Itaú; Banco Itaú.`).
- Subcuentas de CDT (`uca=1`): 10 = a 30 días, 20 = 31 a 44, 30 = a 45, 50 = a 60, 60 = 61 a 89, 70 = a 90, 80 = 91 a 119, 90 = a 120, 100 = 121 a 179, 110 = a 180, 120 = 181 a 359, 130 = a 360, 140 = más de 360. Totales `900` (red de oficinas) y `910` (tesorería): no usar para comparar entidades.
- **Subcuenta 40 no se usa.** Aparece con la misma etiqueta "A 30 DIAS" que la 10. Por su posición entre "a 45 días" y "a 60 días" y por sus valores, parece corresponder a un rango de 46 a 59 días, pero la fuente no lo documenta. Por eso se filtra siempre por número de subcuenta y la 40 queda excluida.
- Ahorro: `uca=7`, subcuenta `10` = depósitos de ahorro activos de persona natural.
- Entidades de interés y sus códigos: ver `CDTLive/entidades.csv`.

## 2. Banco de la República (Suameca)

`GET https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie={ID}`

Respuesta: lista con un elemento `{nombre, unidad, descripcionPeriodicidad, data: [[timestamp_ms, valor], ...]}`. El timestamp es medianoche de Colombia (UTC-5, sin horario de verano) en milisegundos UTC. **Se descartan las fechas futuras** (UVR y TRM se publican por adelantado).

| ID | Serie | Periodicidad | Valor visto el 29-sep-2026 |
|---|---|---|---|
| 1 | TRM | diaria | 3.341,23 |
| 6 | Índice COLCAP | diaria | 2.558,92 |
| 59 | Tasa de política monetaria | diaria | 12,0 % |
| 65 | DTF a 90 días | semanal | 10,26 % |
| 89 | Tasa interbancaria (TIB) | diaria | |
| 238 / 239 / 240 | Tasa de CDT a 90 / 180 / 360 días (promedio del sistema) | diaria | 10,18 / 10,59 / 12,08 % |
| 242 / 243 | IBR overnight / a 3 meses (nominal) | diaria | 11,54 % (3 meses) |
| 850 | UVR | diaria | 419,67 |
| 853 | Meta de inflación | anual | 3,0 % |

Problema conocido: el servidor entrega la **cadena de certificados incompleta**. `requests` falla con `CERTIFICATE_VERIFY_FAILED` aunque el navegador y `curl` funcionan. `_http.py` usa `truststore` (almacén del sistema, `pip install truststore`) y, como último recurso, consulta sin verificar el certificado y deja una ADVERTENCIA visible en el Excel y el informe.

## 3. DANE, IPC

`https://www.dane.gov.co/files/operaciones/IPC/{mes}{AAAA}/anex-IPC-Indices-{mes}{AAAA}.xlsx`, con `mes` en `ene…dic`. Ejemplo verificado: `ago2026`.

- Hoja `IndicesIPC`; fila de encabezado con `Mes` en la columna A y los años a la derecha; debajo, 12 filas Enero a Diciembre.
- Inflación a 12 meses = índice(t) / índice(t−12) − 1. Agosto 2026: 160,42 / 150,99 − 1 = 6,25 %.
- El archivo del mes M se publica a comienzos de M+1. El script prueba el mes actual y hasta 3 meses atrás.
- También existe `anex-IPC-Variacion-{mes}{AAAA}.xlsx` (variaciones mensuales; el año corrido es una fila aparte).

## 4. Fuentes que NO se usan como fuente de datos

| Fuente | Motivo |
|---|---|
| Simulador de CDT de Davivienda (`davivienda.com/simuladores/simulador-cdt`) | Protección antibots (Incapsula). En el navegador la página carga pero su backend (`cuentaCdtPostTipoDeposito`) respondió con error 500 en la prueba. Se replica su cálculo en Python con la tasa que Davivienda reporta a la Superfinanciera |
| Página de Bancolombia (Desayuno con Bancolombia) | El enlace al PDF se arma con JavaScript. Ver la skill DesayunoOportunidades |

## 5. Constantes regulatorias (cuando cambien, actualizar aquí y en `cdtlive.py`)

| Constante | Valor | Verificado | Fuente |
|---|---|---|---|
| Cobertura del seguro de depósitos | $50.000.000 por persona y por entidad (capital más intereses) | 2026-09-29 | Fogafín, [ABC del proceso de pago del seguro de depósitos](https://www.fogafin.gov.co/sites/default/files/2025-12/ABC%20del%20proceso%20de%20pago%20del%20seguro%20de%20dep%C3%B3sitos.pdf) y prensa (La FM, Valora Analitik) |
| Retención en la fuente sobre rendimientos de CDT | 4 % (parámetro `--retencion`) | **por verificar** con el contador o la entidad | La tarifa depende del tipo de título y del titular; el parámetro se puede cambiar |
| GMF (4×1000) | 0,4 % | no aplicado por defecto | Aplica al retirar de cuentas, no al CDT |

## 6. Uso por skill

| Skill | Fuentes que consume |
|---|---|
| CDTLive | Superfinanciera `axk9-g2nh` (CDT y ahorro), BanRep 238/239/240 (promedio del sistema), 59, 243, 65, 853, DANE (IPC) |
| RiskLive | BanRep 6 (COLCAP), 1 (TRM), 240 (CDT 360, calibración), 59, 243, 853; Superfinanciera `axk9-g2nh` (mejor CDT a 360 días, con `fuentes_sfc.mejor_cdt`); DANE (serie de índices del IPC desde 2003 para la inflación mensual). Ventana de 10 años: 119 a 121 observaciones mensuales por serie |
