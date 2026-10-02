# Guía: cómo pedirle a un agente que construya una buena skill

Documento generado desde la presentación "De chatbot a agente" (Planeación Financiera, MFi Uninorte). Resume lo que funcionó al construir CDTLive y RiskLive.

## 1. Ocho reglas para pedir bien

| # | Regla | Qué significa | Cómo se pidió en esta sesión |
|---|---|---|---|
| 1 | Dé contexto y referencias | Diga quién es usted, para qué es y qué archivos o trabajos previos debe leer antes de empezar. | "Revisen los skills que hay en la carpeta fintech… con los documentos que tengo en la carpeta de OneDrive." |
| 2 | Muestre ejemplos de lo que espera | Un enlace, una captura o un archivo de ejemplo vale más que un párrafo de descripción. | "Cálculo de esto: davivienda.com/simuladores/simulador-cdt" |
| 3 | Pida plan antes que código | Primero que proponga y verifique; usted aprueba y después construye. Evita trabajo en la dirección equivocada. | "Por ahora solo planea, dime qué fuentes de bancos colombianos podemos obtener." |
| 4 | Exija fuentes verificadas | Pida los enlaces exactos y que los pruebe con una consulta real antes de programar. | "Busca de manera precisa los links exactos que usaríamos para extraer la información." |
| 5 | Defina el entregable y el formato | Qué archivos, qué hojas, qué secciones. Si no lo dice, el agente lo inventa. | "Toda salida será en Excel y en un MD interpretando eso." |
| 6 | Fije el estándar de calidad | Para quién debe servir, con qué modelo debe funcionar y a qué nivel de rigor. | "Que la gente lo pueda ejecutar en Haiku o Sonnet medio y aún así lo haga excelente." |
| 7 | Ponga límites claros | Qué no hacer: no inventar cifras, no construir una app, no usar cierta fuente. | "No quiero que me hagas una app de finanzas ni nada (no es el objetivo)." |
| 8 | Corrija sobre la marcha | Si ve algo que no le gusta, dígalo en el momento con un ejemplo de lo que quiere. | "Los fondos blancos dan más confianza, usa mejor esta plantilla…" |

## 2. La secuencia de prompts (una etapa a la vez, cada una aprobada)

Cambie lo que está entre corchetes.

### Etapa 1. Explorar

El agente lee su contexto y propone ideas. Todavía no construye nada.

```text
Lee los archivos de esta carpeta: [liste archivos o carpetas relevantes, por ejemplo apuntes, Excel del profesor, skills anteriores].
Quiero construir una skill de agente para [objetivo en una frase] dirigida a [quién la va a usar].
Antes de escribir código:
1. Resume en 5 líneas lo que entendiste de mis archivos.
2. Propón 2 o 3 formas de hacerlo y recomienda una, con sus pros y contras.
No construyas nada todavía.
```

### Etapa 2. Verificar fuentes

Que encuentre y pruebe los enlaces exactos, con datos reales de hoy.

```text
Para la opción que recomendaste, busca las fuentes de datos oficiales y públicas (por ejemplo datos.gov.co, Banco de la República, DANE, Superfinanciera).
Para cada una:
- dame la URL exacta,
- haz una consulta real y muéstrame las columnas y un dato de ejemplo con su fecha,
- dime si necesita navegador o si sirve por API.
Si alguna fuente no funciona, dilo y propón una alternativa. Referencia de lo que quiero replicar: [pegue aquí el enlace del simulador o la página de ejemplo].
```

### Etapa 3. Especificar

Que escriba el plan detallado de la skill para que usted lo revise.

```text
Escribe la especificación completa de la skill [NombreSkill] antes de construirla:
- entradas del usuario con valores por defecto,
- fuentes (las que verificaste),
- cálculos y fórmulas,
- estructura de carpetas: .agents/skills/[NombreSkill]/ con SKILL.md, scripts/, tests/, ejemplos/,
- entregables: un Excel con fórmulas vivas y una hoja de controles, y un informe Markdown,
- criterios de aceptación que vas a verificar al final.
Estándar: debe poder ejecutarla sin errores un modelo pequeño. Espera mi aprobación.
```

### Etapa 4. Construir

Con la especificación aprobada, que construya, pruebe y corra con datos reales.

```text
Aprobado. Construye la skill siguiendo la especificación:
1. Toda la descarga y la matemática en Python, con pruebas (pytest).
2. El SKILL.md con pasos numerados: comando exacto, salida esperada y qué hacer si falla.
3. Nunca inventes cifras: si una fuente falla, el script lo informa.
4. El informe termina con "Educación financiera, no asesoría de inversión."
Al terminar, corre las pruebas y la skill con datos reales, guarda la corrida en ejemplos/ y dime qué quedó verificado y qué no.
```

### Etapa 5. Probar como usuario

Que siga su propio manual como lo haría un modelo pequeño y corrija lo ambiguo.

```text
Ahora actúa como si fueras un modelo pequeño que nunca vio este código: sigue el SKILL.md paso a paso, literalmente, con este caso: [describa un caso de prueba].
Anota cada paso donde dudaste o donde el resultado no coincidió con lo que dice el manual, corrige el SKILL.md o los scripts, y repite hasta que pase sin dudas.
```

### Etapa 6. Pulir y compartir

Ajustes de estilo, casos límite y una guía para que otros la usen.

```text
Revisa el Excel y el informe como lo haría un analista exigente: formato, títulos, unidades y consistencia de cifras. [Si tiene una referencia visual, péguela aquí.]
Prueba 3 casos límite (datos faltantes, entradas inválidas y un monto muy grande) y confirma que el script responde con mensajes claros.
Por último, escribe un README corto para que un compañero instale y use la skill.
```

## 3. Prompt maestro (todo en uno, para skills sencillas)

```text
Quiero que construyas una skill de agente llamada [NOMBRE_SKILL].

OBJETIVO
[Describa en 2 o 3 frases qué problema financiero resuelve. Ejemplo: "Comparar el costo real de un crédito de libre inversión en los bancos de Colombia con datos oficiales del día".]

ENTRADAS DEL USUARIO
[Liste los datos que pide la skill. Ejemplo: monto, plazo en meses.]

FUENTES DE DATOS
- Usa solo fuentes oficiales y públicas (datos.gov.co, Banco de la República, DANE, Superfinanciera).
- Antes de programar, verifica cada URL con una consulta real y muéstrame las columnas que devuelve.
- Si una fuente falla, el script debe decirlo; nunca inventes cifras.

REGLAS DE CONSTRUCCIÓN
1. Toda la descarga y toda la matemática van en scripts de Python con pruebas (pytest). El modelo que ejecute la skill no calcula de cabeza.
2. Guarda la skill en .agents/skills/[NOMBRE_SKILL]/ (si usas Claude Code, en .claude/skills/[NOMBRE_SKILL]/) con esta estructura:
   SKILL.md (con encabezado name y description), scripts/, tests/, ejemplos/
3. El SKILL.md debe tener pasos numerados: comando exacto, salida esperada y qué hacer si falla. Debe poder seguirlo un modelo pequeño.
4. Cada ejecución entrega dos archivos: un Excel con fórmulas vivas (parámetros en celdas azules, una hoja de controles) y un informe Markdown que lo interpreta.
5. El informe termina con: "Educación financiera, no asesoría de inversión."

CIERRE
Corre las pruebas y la skill con datos reales, guarda esa corrida en ejemplos/ y dime qué quedó verificado y qué no.
```

## 4. Tres prompts listos para copiar

### DolarHoy: la TRM y lo que significa para mis compras (Básico · ideal para empezar)

```text
Quiero que construyas una skill de agente llamada DolarHoy.

OBJETIVO
Traer la TRM oficial de hoy y de los últimos 90 días, y calcular cuánto cuesta en pesos una compra en dólares, con su variación reciente.

ENTRADAS DEL USUARIO
Valor de la compra en dólares.

FUENTES DE DATOS
- TRM: datos.gov.co, dataset 32sa-8pi3 (columnas valor, vigenciadesde, vigenciahasta). Ordena por vigenciadesde descendente.
- Verifica la URL con una consulta real antes de programar. Si falla, dilo; nunca inventes cifras.

REGLAS DE CONSTRUCCIÓN
1. La descarga y los cálculos van en Python con pytest.
2. Guárdala en .agents/skills/DolarHoy/ (en Claude Code: .claude/skills/DolarHoy/) con SKILL.md (encabezado name y description), scripts/, tests/ y ejemplos/.
3. SKILL.md con pasos numerados, comando exacto, salida esperada y qué hacer si falla.
4. Entrega un Excel (TRM de hoy, serie de 90 días con gráfico, costo de la compra con fórmulas vivas) y un informe Markdown de una página.
5. El informe termina con: "Educación financiera, no asesoría de inversión."

CIERRE
Corre las pruebas y la skill con una compra de 500 dólares, guarda la corrida en ejemplos/ y dime qué quedó verificado.
```

### CreditoLive: ¿cuánto me cuesta de verdad un crédito? (Intermedio)

```text
Quiero que construyas una skill de agente llamada CreditoLive.

OBJETIVO
Comparar el costo de un crédito de consumo o de libre inversión entre los bancos de Colombia, con datos oficiales del día, y alertar si alguna tasa se acerca a la usura.

ENTRADAS DEL USUARIO
Monto en pesos y plazo en meses.

FUENTES DE DATOS
- Tasas por banco: datos.gov.co, dataset qzsc-9esp (Superfinanciera, tasas de interés activas por tipo de crédito, últimos dos meses). Columnas útiles: nombre_entidad, tipo_de_cr_dito, producto_de_cr_dito, plazo_de_cr_dito, tasa_efectiva_promedio, montos_desembolsados.
- Interés bancario corriente: datos.gov.co, dataset pare-7x5i. La tasa de usura es 1,5 veces el interés bancario corriente vigente.
- Verifica cada URL con una consulta real antes de programar. Si una fuente falla, dilo; nunca inventes tasas.

REGLAS DE CONSTRUCCIÓN
1. La descarga y la matemática van en Python con pytest. Calcula la cuota fija con la tasa efectiva anual convertida a mensual: (1+EA)^(1/12)-1.
2. Guárdala en .agents/skills/CreditoLive/ (en Claude Code: .claude/skills/CreditoLive/) con SKILL.md (encabezado name y description), scripts/, tests/ y ejemplos/.
3. SKILL.md con pasos numerados, comando exacto, salida esperada y qué hacer si falla.
4. Entrega un Excel con fórmulas vivas (hoja de parámetros, tabla de amortización del banco más barato, controles) y un informe Markdown.
5. El informe termina con: "Educación financiera, no asesoría de inversión."

CIERRE
Corre las pruebas y la skill con un crédito de 20.000.000 a 36 meses, guarda la corrida en ejemplos/ y dime qué quedó verificado.
```

### MiPresupuesto: diagnóstico de mis gastos desde un Excel (Básico · sin internet)

```text
Quiero que construyas una skill de agente llamada MiPresupuesto.

OBJETIVO
Leer un archivo de gastos del mes (fecha, descripción, valor, categoría) y entregar un diagnóstico: gasto por categoría, tasa de ahorro, meses de fondo de emergencia y alertas.

ENTRADAS DEL USUARIO
Ruta del archivo CSV o Excel de gastos, ingreso mensual neto y ahorros actuales.

REGLAS DE CONSTRUCCIÓN
1. Crea también un archivo de ejemplo con 60 gastos ficticios para probar.
2. Los cálculos van en Python con pytest. Reglas de alerta: ahorro menor al 10 % del ingreso, fondo de emergencia menor a 3 meses de gastos, una categoría mayor al 35 % del gasto.
3. Guárdala en .agents/skills/MiPresupuesto/ (en Claude Code: .claude/skills/MiPresupuesto/) con SKILL.md (encabezado name y description), scripts/, tests/ y ejemplos/.
4. SKILL.md con pasos numerados, comando exacto, salida esperada y qué hacer si falla. Los datos del usuario nunca salen del computador.
5. Entrega un Excel (resumen por categoría con fórmulas vivas, gráfico, alertas) y un informe Markdown.
6. El informe termina con: "Educación financiera, no asesoría de inversión."

CIERRE
Corre las pruebas y la skill con el archivo de ejemplo y dime qué quedó verificado.
```

## 5. Qué pedirle a una skill ya creada

En Claude Code se invoca con `/NombreSkill`. En Gemini CLI y Codex basta con nombrarla ("usa la skill CDTLive para…") o preguntar algo que coincida con su descripción.

**CDTLive**

- `/CDTLive 20 millones a 180 días con pago de intereses trimestral`
- `/CDTLive ¿cuánto dejo de ganar si dejo 10 millones un año en Nu en vez de un CDT?`
- `/CDTLive compara solo bancos digitales y fintech a 90 días con 5 millones`
- `/CDTLive 80 millones a 360 días y dime si paso la cobertura de Fogafín`

**RiskLive**

- `/RiskLive ahorro 1 millón al mes por 5 años, meta 80 millones, 60 % CDT, 25 % COLCAP y 15 % dólares`
- `/RiskLive ¿cuánto debo ahorrar al mes para tener 80 % de probabilidad de llegar a 150 millones en 10 años?`
- `/RiskLive el mismo caso pero con 40 % en COLCAP y rebalanceo anual`
- `/RiskLive repite con colas pesadas (--dist t) y compara el percentil 5`

**DolarHoy (la que usted va a crear)**

- `/DolarHoy ¿cuánto me cuesta hoy una compra de 500 dólares?`
- `/DolarHoy ¿subió o bajó la TRM en los últimos 30 días?`

---
Educación financiera, no asesoría de inversión.
