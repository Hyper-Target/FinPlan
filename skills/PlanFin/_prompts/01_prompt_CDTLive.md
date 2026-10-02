# Prompt para construir la skill CDTLive

> Copia todo lo que está debajo de la línea y pégalo en una sesión nueva de Claude Code (Sonnet 5.5), abierta en la carpeta `Planeación Financiera`.

---

## Rol y objetivo

Vas a construir una **skill de Claude Code** llamada `CDTLive`. La skill compara, con datos oficiales del día, lo que rinde un CDT en los bancos y las fintech más importantes de Colombia. Replica el cálculo del simulador de CDT de Davivienda (https://www.davivienda.com/simuladores/simulador-cdt), pero para todas las entidades a la vez.

**Toda ejecución de la skill entrega siempre dos archivos:**
1. un **Excel** con el cálculo completo, hecho con fórmulas vivas;
2. un **Markdown** que interpreta ese Excel.

**Requisito central:** la skill debe quedar tan detallada que un modelo pequeño (Claude Haiku 4.5 o un Sonnet con esfuerzo medio) la ejecute sin errores. Eso implica:
- Toda la matemática y toda la descarga de datos van en **scripts de Python probados**. El modelo que ejecuta la skill nunca calcula nada de cabeza ni arma URLs a mano.
- El `SKILL.md` son pasos numerados. Cada paso tiene un comando exacto, la salida esperada y qué hacer si falla.
- Las plantillas de salida son cerradas: el modelo solo llena espacios.

No construyas ninguna app ni interfaz web. Solo la skill: `SKILL.md`, scripts, referencias y un ejemplo.

## Ubicación y estructura

Crea exactamente esta estructura:

```
Planeación Financiera/skills/PlanFin/
├── _shared/
│   ├── fuentes.md
│   ├── convenciones.md
│   └── scripts/
│       ├── fuentes_sfc.py      # descarga de datos.gov.co (Superfinanciera)
│       ├── fuentes_banrep.py   # descarga de la API Suameca del BanRep
│       ├── fuentes_dane.py     # IPC del DANE
│       ├── tasas.py            # conversión de tasas
│       └── excel_profe.py      # utilidades para escribir Excel con la convención del profe
└── CDTLive/
    ├── SKILL.md
    ├── entidades.csv
    ├── scripts/
    │   ├── cdtlive.py          # punto de entrada único
    │   └── plantilla_md.md     # plantilla cerrada del informe
    ├── tests/
    │   └── test_cdtlive.py
    └── ejemplos/
        ├── ejemplo_entrada.json
        ├── CDTLive_ejemplo.xlsx
        └── CDTLive_ejemplo.md
```

`_shared/` lo reutilizará la skill RiskLive. Diséñalo como una librería genérica, no atada a CDTLive.

## Paso 0: contexto que debes leer antes de escribir código

1. Lee `C:\Users\Luis D Peñaranda\Documents\Maestria-Finanzas-Uninorte\Gestión Financiera\Reportes\skills\FinTech\DailyReport\SKILL.md` e `IncAnalyze\SKILL.md`. Son skills anteriores del usuario. Imita su tono, su estructura de secciones ("Cuándo usarla", "Perfil del usuario", "Flujo de trabajo", "Manejo de errores") y su frontmatter.
2. Abre con openpyxl `OneDrive_1_25-9-2026/Herramientas/01 Calculadora Financiera v9.xlsx` y `Sistemas de Amortización.xlsx`. Documenta en `_shared/convenciones.md`:
   - cómo nombra el profe las tasas (NAMV, EA, ET…) y la tabla TPERIODOS/TTIMES;
   - cómo usa tablas de Excel con referencias estructuradas (`Tabla[[#This Row],[Col]]`);
   - los nombres con ámbito de hoja (PerRate, fd, Principal, nCuotas…);
   - las columnas Period, Inflow, Outflow, FCN, Xfd, InitialBalance, Interests, Balance y Repayment;
   - la validación ΣXfd = 0.

   El Excel de CDTLive debe seguir esa convención.

## Fuentes de datos (verificadas el 29-sep-2026; úsalas exactamente así)

### Fuente A (principal): Superfinanciera, tasas de captación por entidad

- Dataset `axk9-g2nh` de datos.gov.co: "Tasas de interés de captación y operaciones del mercado monetario". Datos diarios de días hábiles, publicados con un día de rezago.
- Endpoint: `https://www.datos.gov.co/resource/axk9-g2nh.json` (API Socrata, SoQL, sin login).
- Columnas: `tipoentidad`, `codigoentidad`, `nombreentidad`, `fechacorte`, `uca`, `nombre_unidad_de_captura`, `subcuenta`, `descripcion`, `tasa` (% EA, texto), `monto` (**miles de pesos**, texto).
- Consulta del último corte: `?$select=max(fechacorte)`.
- Consulta de datos: `?$where=fechacorte='AAAA-MM-DDT00:00:00.000' AND uca='1'&$limit=50000`.
  - Siempre pasa `$limit=50000`, porque el valor por defecto es 1000 y cortaría filas.
  - Codifica la URL con `requests` (`params=`); no concatenes a mano.
- `uca='1'`: emisiones de CDT. `uca='7'`: saldos de depósitos de ahorro (subcuenta `10` = ahorro activo de persona natural). Esta última permite comparar las cuentas de ahorro de las fintech (Nu, Nequi, RappiPay) con los CDT.
- **Mapa plazo → subcuenta (uca 1).** Filtra SIEMPRE por `subcuenta`, nunca por `descripcion`, porque "A 30 DIAS" aparece en dos subcuentas (10 y 40):

  | subcuenta | plazo |
  |---|---|
  | 10 | a 30 días (usar esta; si falta, usar 40) |
  | 20 | entre 31 y 44 días |
  | 30 | a 45 días |
  | 50 | a 60 días |
  | 60 | entre 61 y 89 días |
  | 70 | a 90 días |
  | 80 | entre 91 y 119 días |
  | 90 | a 120 días |
  | 100 | entre 121 y 179 días |
  | 110 | a 180 días |
  | 120 | entre 181 y 359 días |
  | 130 | a 360 días |
  | 140 | más de 360 días |
  | 900 / 910 | totales por red de oficinas / tesorería (NO usar para comparar) |

  Implementa `plazo_a_subcuenta(dias)`: los plazos exactos (30, 45, 60, 90, 120, 180, 360) van a su subcuenta exacta; los demás, al rango que los contiene.
- **Qué significa la tasa.** Es la tasa **promedio ponderada efectivamente pagada** por la entidad ese día en ese plazo. No es la tasa de cartelera. Dilo explícitamente en el MD.
- **Reglas de calidad** (implementarlas en código):
  - Si una entidad no tiene dato en el último corte para ese plazo, busca hacia atrás hasta 5 cortes. Usa el más reciente y marca `Rezago = n cortes`. Si no hay dato en 5 cortes, la fila queda "Sin dato" y **nunca se inventa una tasa**.
  - Si `monto < 50000` (menos de $50 millones captados), marca la alerta "Baja representatividad".
  - Si `tasa` es 0 o es mayor que 25, descarta la fila y márcala como "Dato atípico".

### Entidades a cubrir: `CDTLive/entidades.csv`

Identifica cada entidad por la pareja **(tipoentidad, codigoentidad)**, nunca por el nombre, porque la Superfinanciera escribe los nombres de forma irregular (por ejemplo `"RappiPAY"` con comillas). Verificado el 29-sep-2026:

```csv
tipoentidad,codigoentidad,nombre_corto,categoria,marca_comercial,ofrece_cdt,nota
1,7,Bancolombia,Banco tradicional,,si,
1,1,Banco de Bogotá,Banco tradicional,,si,
1,39,Davivienda,Banco tradicional,,si,Referencia del simulador replicado
1,13,BBVA Colombia,Banco tradicional,,si,
1,23,Banco de Occidente,Banco tradicional,,si,
1,2,Banco Popular,Banco tradicional,,si,
1,49,AV Villas,Banco tradicional,,si,
1,30,Banco Caja Social,Banco tradicional,,si,
1,42,Scotiabank Colpatria,Banco tradicional,,si,
1,6,Itaú,Banco tradicional,,si,
1,12,GNB Sudameris,Banco tradicional,,si,
1,59,Banco Santander,Banco tradicional,,si,
1,43,Banco Agrario,Banco tradicional,,si,
1,54,Bancoomeva,Banco tradicional,,si,
1,56,Banco Falabella,Banco tradicional,,si,
1,63,Banco Serfinanza,Banco tradicional,,si,
1,55,Banco Finandina,Banco digital,,si,
1,65,Lulo Bank,Banco digital,,si,
1,57,Banco Pichincha,Banco digital,Pibank,si,La tasa es la del banco completo; Pibank es su marca digital
1,51,Banco Credifinanciera,Banco digital,Ban100,si,La tasa es la del banco completo; Ban100 es su marca digital
4,128,Nu Colombia,Fintech,Nu,si,Compañía de financiamiento; también reporta cuenta de ahorro (uca 7)
4,108,Iris CF,Fintech,Iris,si,
4,132,Plata,Fintech,Plata,si,
4,127,Bold CF,Fintech,Bold,si,
4,129,KOA CF,Fintech,KOA,si,
4,26,Tuya,Fintech,Tuya,si,
4,130,Nequi,Fintech,Nequi,no,Solo ahorro (uca 7); no emite CDT
4,124,RappiPay,Fintech,RappiPay,no,Solo ahorro (uca 7); no emite CDT
```

El script, en su primera ejecución, debe verificar que cada pareja siga existiendo en el dataset. Si alguna desaparece, lo reporta en el MD y en la hoja `Fuentes`; no falla en silencio.

### Fuente B: Banco de la República (API Suameca, JSON sin login)

- `GET https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie={ID}`
- La respuesta es una lista. El elemento `[0]` trae `nombre`, `unidad`, `descripcionPeriodicidad` y `data = [[timestamp_ms, valor], ...]`.
- Convierte el timestamp a fecha con zona `America/Bogota`.
- **Descarta las fechas futuras.** La UVR se publica por adelantado; usa el último dato con fecha menor o igual a hoy.
- IDs verificados: `238` CDT 90 días (diaria), `239` CDT 180 días, `240` CDT 360 días, `65` DTF 90 días (semanal), `243` IBR a 3 meses, `59` tasa de política monetaria, `853` meta de inflación, `1` TRM, `850` UVR.
- Uso en CDTLive: el **promedio del sistema** (238/239/240, según el plazo) como línea de referencia en la tabla y en la gráfica, más la tasa de política monetaria y el IBR como contexto.

### Fuente C: DANE, IPC (inflación a 12 meses)

- Archivo: `https://www.dane.gov.co/files/operaciones/IPC/{mes}{AAAA}/anex-IPC-Variacion-{mes}{AAAA}.xlsx`, con `mes` ∈ {ene, feb, mar, abr, may, jun, jul, ago, sep, oct, nov, dic}. Ejemplo verificado: `ago2026`.
- Algoritmo:
  1. Prueba el mes anterior al actual; si da 404, prueba dos meses atrás.
  2. Abre el archivo con openpyxl, busca la variación anual total más reciente y documenta en el código en qué hoja y celda la encontraste.
  3. Si falla todo, usa la meta de inflación del BanRep (serie 853) y marca "IPC no disponible, se usa la meta".

### Por qué no se usa el simulador de Davivienda

El sitio tiene protección antibots (Incapsula) y su backend (`cuentaCdtPostTipoDeposito`) respondió con error 500 en la prueba. **No se consulta nunca.** Replicamos su lógica en Python y la aplicamos a la tasa que cada entidad reporta a la Superfinanciera. Explícalo en una nota del `SKILL.md`.

## El cálculo (replica del simulador de Davivienda)

Implementa en `_shared/scripts/tasas.py`, con docstrings y tests:

- `ea_a_periodica(ea, dias_periodo, base=365)` = (1 + EA)^(dias_periodo/base) − 1
- `ea_a_nominal(ea, periodos_por_año)`: nominal anual con la nomenclatura colombiana (NAMV, NATV, NASV…), siguiendo la convención del profe.
- `nominal_a_ea(...)`, y la conversión entre anticipada y vencida.
- `tasa_real(ea, inflacion)` = (1 + EA)/(1 + π) − 1

En `CDTLive/scripts/cdtlive.py`, para cada entidad:

| Concepto | Fórmula |
|---|---|
| Entradas | `monto` (COP), `plazo_dias`, `periodicidad_pago` ∈ {mensual 30, trimestral 90, semestral 180, anual 360, al vencimiento = plazo} |
| Número de periodos | n = plazo_dias / dias_periodo (entero; si no es entero, error claro al usuario) |
| Tasa periódica | ip = (1+EA)^(dias_periodo/365) − 1 |
| Interés bruto por periodo | monto × ip |
| Interés bruto total | monto × ip × n (los intereses se pagan, no se capitalizan) |
| Retención en la fuente | 4 % × interés bruto (parámetro `retencion`, por defecto 0.04) |
| Interés neto | bruto − retención |
| Valor final | monto + interés neto total |
| Rentabilidad neta EA | la TIR anualizada del flujo neto |
| Rentabilidad real EA | tasa_real(rent_neta_EA, IPC12m) |
| Alerta Fogafín | si monto > cobertura del seguro de depósitos por entidad |

La cobertura de Fogafín va como constante en `convenciones.md`, con su valor, la fecha y la fuente. Verifica el valor vigente en fogafin.gov.co y, si no lo encuentras, escribe "verificar" en lugar de inventarlo.

Parámetros configurables con valor por defecto: `base_dias=365`, `retencion=0.04` y `aplicar_gmf=False`. El GMF (4×1000) es opcional porque aplica al retirar la plata de una cuenta, no al CDT.

Para las fintech sin CDT (Nequi, RappiPay) y como comparación general, agrega el cálculo equivalente de dejar el mismo monto en su **cuenta de ahorro** durante el mismo plazo, con la tasa de uca 7, subcuenta 10. Marca claramente que es ahorro, no CDT.

## El Excel de salida

Nombre: `CDTLive_{monto}_{plazo}d_{AAAA-MM-DD}.xlsx`. Por defecto se guarda en `Planeación Financiera/salidas/CDTLive/` (crea la carpeta si no existe).

**Regla de oro:** todos los cálculos del Excel son **fórmulas vivas** que apuntan a los parámetros. Si el usuario cambia el monto en la hoja `Parametros`, todo se recalcula. Python calcula los mismos valores por su lado **solo para validar**.

Hojas, en este orden:

1. **Resumen.** Tarjetas KPI hechas con celdas con formato:
   - mejor tasa y entidad;
   - interés neto de la mejor opción;
   - rentabilidad real;
   - diferencia contra el promedio del sistema (BanRep);
   - fecha del dato.

   Debajo, un gráfico de barras nativo de openpyxl con la rentabilidad neta EA por entidad (top 15), coloreado por categoría (Banco tradicional / Banco digital / Fintech) y con la línea del promedio del sistema.
2. **Parametros.** `Monto`, `PlazoDias`, `Periodicidad`, `DiasPeriodo`, `BaseDias`, `Retencion`, `IPC12m`, `PromedioSistema`, `FechaCorte` y `FechaConsulta`, como **nombres definidos**, siguiendo la convención del profe.
3. **Tasas.** Tabla `TTasas` con los datos crudos de la Superfinanciera: Categoria, Entidad, MarcaComercial, TipoEntidad, CodigoEntidad, Subcuenta, PlazoDescripcion, TasaEA, MontoCaptadoMiles, FechaCorte, RezagoCortes, Alerta.
4. **Simulacion.** Tabla `TSimulacion`, una fila por entidad con dato. Columnas con fórmulas estructuradas: TasaEA, TasaPeriodica, NumPeriodos, InteresBrutoPeriodo, InteresBrutoTotal, Retencion, InteresNeto, ValorFinal, RentNetaEA, RentRealEA, DifVsSistema y Ranking (`RANK`). Ordenada por RentNetaEA de mayor a menor.
5. **Flujo_Mejor.** Flujo de caja periodo a periodo de la mejor opción con la convención del profe: Period, Inflow, Outflow, FCN, fd, Xfd, más la validación **ΣXfd = 0** a la TIR, que muestra "OK" o "ERROR".
6. **Ahorro.** Comparación de cuentas de ahorro (uca 7, subcuenta 10): Nu, Nequi, RappiPay, Lulo y los bancos grandes, frente al mejor CDT.
7. **Referencias.** Series del BanRep usadas: CDT 90/180/360 del sistema, IBR 3M, tasa de política e IPC, con su fecha.
8. **Fuentes.** Cada URL consultada, la fecha y hora de consulta, el número de filas recibidas, las entidades sin dato o con rezago y la nota metodológica ("tasa promedio ponderada pagada, no tasa de cartelera").

Formato: encabezados con relleno oscuro y texto blanco, porcentajes con 2 decimales, pesos con separador de miles y sin decimales, paneles inmovilizados en las tablas y anchos de columna ajustados.

## El Markdown de salida

Mismo nombre que el Excel, con extensión `.md`, en la misma carpeta. Se genera desde `scripts/plantilla_md.md`, una **plantilla cerrada** con marcadores `{{...}}` que llena Python. El modelo solo escribe los párrafos marcados como `{{INTERPRETACION_*}}`, con reglas estrictas dentro de la plantilla (máximo 3 frases cada uno, citar cifras del Excel y no introducir cifras nuevas).

Secciones fijas:
1. **Resultado en una línea**: dónde rinde más un CDT de $X a N días hoy y cuánto gana neto.
2. **Tabla top 10**: entidad, categoría, tasa EA, interés neto, rentabilidad real.
3. **Bancos tradicionales vs digitales vs fintech**: promedio y mejor de cada grupo.
4. **Contra la inflación y el sistema**: tasa real y diferencia contra el promedio del BanRep.
5. **CDT vs cuenta de ahorro**: cuánto se deja de ganar en Nu, Nequi o RappiPay frente al mejor CDT.
6. **Alertas**: rezagos, baja representatividad, Fogafín y entidades sin dato.
7. **Cómo leer estos datos**: qué es la tasa de la Superfinanciera y por qué puede diferir de la tasa de cartelera que le ofrezcan en la oficina.
8. **Advertencia**: "Educación financiera, no asesoría de inversión. Verifique la tasa con la entidad antes de invertir."
9. **Fuentes**, con fecha y hora.

Estilo: español, sin relleno, sin adjetivos inflados y sin emojis. Si existe la skill `clean-finance`, menciónala en el SKILL.md como paso final opcional.

## El SKILL.md

Frontmatter:
```yaml
---
name: CDTLive
description: Compara con datos oficiales del día (Superfinanciera y BanRep) la rentabilidad de un CDT en los principales bancos y fintech de Colombia, replicando el cálculo del simulador de CDT de Davivienda, y entrega un Excel con fórmulas vivas más un informe Markdown que lo interpreta. Úsala cuando el usuario pregunte "dónde me conviene un CDT", "compara CDT", "tasas de CDT hoy", "cuánto gano en un CDT de X a N días" o invoque PlanFin:CDTLive.
---
```

Cuerpo, en este orden:
1. **Cuándo usarla**, con ejemplos de frases del usuario.
2. **Entradas.** Monto, plazo en días y periodicidad. Si falta alguna, pregunta UNA sola vez, con opciones; si el usuario no responde, usa como valores por defecto $10.000.000, 360 días y pago al vencimiento.
3. **Flujo de trabajo en pasos numerados.** Cada paso tiene:
   - el comando exacto, por ejemplo `python skills/PlanFin/CDTLive/scripts/cdtlive.py --monto 10000000 --plazo 360 --periodicidad vencimiento`;
   - la salida esperada: qué imprime el script cuando todo sale bien, con un ejemplo literal;
   - qué hacer si falla, con la causa probable y la acción concreta.
4. **Validaciones.** Lista de chequeos que el script ya ejecuta y que el modelo debe confirmar en la salida de consola antes de entregar:
   - ΣXfd = 0 (con tolerancia de 1 peso);
   - los valores de Python coinciden con las fórmulas del Excel (recalcula con LibreOffice en modo headless si está instalado; si no, compara contra el cálculo en Python y dilo);
   - FechaCorte con menos de 7 días de antigüedad;
   - al menos 10 entidades con dato.
5. **Manejo de errores.** Tabla de error → causa → acción. Ejemplos: datos.gov.co caído, BanRep caído, IPC no encontrado, entidad desaparecida, plazo no divisible por la periodicidad.
6. **Reglas duras:**
   - nunca inventar una tasa;
   - nunca armar URLs a mano;
   - nunca usar el simulador web de Davivienda;
   - siempre entregar el Excel y el MD;
   - siempre incluir la advertencia.
7. **Qué entregar al usuario al final.** Las dos rutas de archivo y el "Resultado en una línea", nada más.

## Calidad del código

- Python 3.10+, con `requests`, `openpyxl`, `pandas` y `numpy`. No uses librerías raras.
- `timeout=30` en cada request y 3 reintentos con backoff. Mensajes de error en español que digan qué hacer.
- `cdtlive.py` imprime al final un bloque `RESUMEN_OK` con las cifras clave, para que el modelo solo copie.
- Tests con pytest (`tests/test_cdtlive.py`):
  - conversión de tasas, con casos conocidos (12 % EA a 360 días; 12 % EA pagado mensual);
  - `plazo_a_subcuenta` para todos los plazos de la tabla;
  - un cálculo completo con una tasa fija, comparado con un valor esperado hecho a mano;
  - la regla de rezago usando un DataFrame falso.
- Ejecuta los tests y la skill completa con datos reales antes de terminar. Guarda esa ejecución real como el ejemplo en `ejemplos/`.

## Criterios de aceptación (revísalos uno por uno al final y repórtalos)

- [ ] `python cdtlive.py --monto 10000000 --plazo 360 --periodicidad vencimiento` corre de principio a fin con datos reales.
- [ ] El Excel abre sin errores; al cambiar el `Monto` en `Parametros` cambia todo.
- [ ] Aparecen al menos 10 entidades, incluidas Davivienda, Bancolombia, Nu y Lulo.
- [ ] ΣXfd = 0 muestra "OK".
- [ ] El MD no contiene cifras que no estén en el Excel.
- [ ] Los tests pasan.
- [ ] El SKILL.md se puede seguir sin leer el código.
- [ ] Prueba de fuego: simula que eres Haiku y sigue el SKILL.md literalmente. Si algún paso es ambiguo, reescríbelo.

No hagas commits de git.
