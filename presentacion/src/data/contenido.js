// Contenido de la presentación. Comandos verificados en la documentación oficial el 30-sep-2026.

export const META = {
  titulo: 'De chatbot a agente',
  subtitulo: 'Cómo construir skills de IA para finanzas personales con datos oficiales de Colombia, sin pagar',
  curso: 'Planeación Financiera · Maestría en Finanzas · Universidad del Norte',
  autor: 'Luis D. Peñaranda y Leydis Niebles',
  autores: ['Luis D. Peñaranda', 'Leydis Niebles'],
  fecha: 'Octubre de 2026',
};

// ---------------------------------------------------------------- Qué es un agente, desde cero
export const CONCEPTOS = [
  { t: 'Modelo de lenguaje (LLM)', d: 'Un programa entrenado con muchísimo texto que predice la siguiente palabra. Sabe redactar y razonar, pero por sí solo no consulta internet, no abre archivos ni hace cálculos confiables.', ej: 'ChatGPT, Gemini, Claude, Grok' },
  { t: 'Chatbot', d: 'Un LLM con una ventana de conversación. Responde con lo que ya sabe: si le pregunta la tasa de un CDT hoy, puede darle una cifra vieja o inventada.', ej: 'La app de ChatGPT en el celular' },
  { t: 'Herramienta', d: 'Algo que el modelo puede usar además de escribir: buscar en la web, leer un archivo, ejecutar un comando o correr un programa de Python.', ej: 'Descargar la tasa de la Superfinanciera' },
  { t: 'Agente', d: 'Un LLM que recibe un objetivo y decide por sí mismo qué herramientas usar, en qué orden, revisa los resultados y corrige hasta terminar. Trabaja como un analista junior.', ej: 'Gemini CLI, Codex, Claude Code' },
  { t: 'Skill', d: 'Un manual de procedimiento para el agente: un archivo SKILL.md con los pasos exactos, más los scripts y plantillas que necesita. El agente la carga cuando la pregunta coincide.', ej: 'CDTLive, RiskLive' },
  { t: 'Rutina', d: 'Una skill que corre sola a una hora fija, sin que nadie escriba. El agente deja el informe listo cada mañana.', ej: 'Reporte diario de tasas a las 7:00' },
];

export const ANALOGIA = [
  { rol: 'Usted', como: 'El gerente', hace: 'Pide un resultado: "¿dónde me conviene un CDT hoy?"' },
  { rol: 'El agente', como: 'El analista junior', hace: 'Entiende el pedido, abre el manual y ejecuta los pasos' },
  { rol: 'La skill', como: 'El manual de procedimiento', hace: 'Dice qué fuentes consultar, qué script correr y cómo entregar' },
  { rol: 'Los scripts', como: 'La calculadora financiera', hace: 'Descargan los datos y hacen la matemática sin errores' },
];

// ---------------------------------------------------------------- Cómo funciona por dentro
export const FLUJO = [
  { n: '1', t: 'La pregunta', d: 'El usuario escribe en lenguaje natural: "CDT de 10 millones a 360 días".', k: 'Usted' },
  { n: '2', t: 'El agente elige la skill', d: 'Compara la pregunta con la descripción de cada SKILL.md y carga CDTLive.', k: 'LLM' },
  { n: '3', t: 'Ejecuta el script', d: 'Corre el comando exacto que dice el paso 2 del SKILL.md.', k: 'Herramienta' },
  { n: '4', t: 'El script trae datos oficiales', d: 'Superfinanciera, BanRep y DANE por API. Si una fuente falla, lo dice.', k: 'Python' },
  { n: '5', t: 'Calcula y valida', d: 'Replica el simulador, escribe el Excel con fórmulas vivas y corre 7 controles.', k: 'Python' },
  { n: '6', t: 'El agente interpreta', d: 'Escribe 4 párrafos cortos. El script rechaza cualquier cifra que no esté en el informe.', k: 'LLM + control' },
  { n: '7', t: 'Entrega', d: 'Excel + informe Markdown, con fuentes, fecha y advertencia.', k: 'Usted' },
];

// ---------------------------------------------------------------- Paso 0: abrir la terminal
export const ABRIR_TERMINAL = {
  windows: [
    'Presione la tecla Windows, escriba "PowerShell" y haga clic en "Windows PowerShell" (no hace falta abrirlo como administrador).',
    'Verá una ventana con un texto como  PS C:\\Users\\SuNombre>. Ahí se pegan los comandos: clic derecho o Ctrl + V, y luego Enter.',
    'Si un comando dice que no se reconoce después de instalar algo, cierre la ventana y abra PowerShell de nuevo.',
  ],
  mac: [
    'Presione Cmd + Espacio, escriba "Terminal" y presione Enter.',
    'Verá una ventana con un texto como  sunombre@MacBook ~ %. Ahí se pegan los comandos con Cmd + V y luego Enter.',
    'Cuando un comando pida la contraseña, escríbala aunque no se vea nada en pantalla: es normal.',
  ],
};

// ---------------------------------------------------------------- Paso 1: requisitos
export const REQUISITOS = {
  windows: [
    { t: 'Node.js LTS (lo necesita Gemini CLI)', c: 'winget install --id OpenJS.NodeJS.LTS -e' },
    { t: 'Python 3 (las skills calculan en Python)', c: 'winget install --id Python.Python.3.12 -e' },
    { t: 'Git para Windows (opcional, recomendado: le da al agente una terminal Bash)', c: 'winget install --id Git.Git -e' },
    { t: 'Cierre y vuelva a abrir PowerShell. Verifique que cada uno responda con un número de versión:', c: 'node -v; python --version' },
  ],
  mac: [
    { t: 'Homebrew, el instalador de programas de la Mac (pide su contraseña)', c: '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' },
    { t: 'Node.js y Python', c: 'brew install node python' },
    { t: 'Verifique que cada uno responda con un número de versión:', c: 'node -v && python3 --version' },
  ],
};

// ---------------------------------------------------------------- Paso 2: el agente de terminal (se usan iniciando sesión, sin pagar)
export const LLMS = [
  {
    id: 'gemini',
    nombre: 'Gemini CLI',
    empresa: 'Google',
    costo: 'Gratis',
    costoTipo: 'ok',
    recomendado: true,
    modelo: 'Gemini',
    plan: 'Cuenta de Google personal (Gmail). Sin tarjeta. Cuota gratuita: 1.000 solicitudes al día y 60 por minuto',
    skills: '.gemini/skills/<Nombre>/SKILL.md  o  .agents/skills/<Nombre>/SKILL.md',
    fuerte: 'La ruta recomendada para la clase: gratis, generosa y lee skills con el mismo formato SKILL.md.',
    windows: ['npm install -g @google/gemini-cli'],
    mac: ['brew install gemini-cli'],
    alterna: 'Sin instalar nada: npx @google/gemini-cli · En Mac también sirve npm install -g @google/gemini-cli',
    iniciar: 'gemini',
    verificar: 'gemini --version',
    login: 'Al iniciar elija "Sign in with Google": se abre el navegador, entra con su Gmail y vuelve a la terminal.',
    doc: 'https://github.com/google-gemini/gemini-cli',
  },
  {
    id: 'codex',
    nombre: 'Codex CLI',
    empresa: 'OpenAI (ChatGPT)',
    costo: 'Gratis con límites',
    costoTipo: 'aviso',
    modelo: 'GPT',
    plan: 'Cuenta de ChatGPT, incluida la gratuita. En el plan gratuito los límites son bajos: sirve para probar',
    skills: '.agents/skills/<Nombre>/SKILL.md  (o ~/.agents/skills/ para todos sus proyectos)',
    fuerte: 'Si ya usa ChatGPT, entra con la misma cuenta. Lee SKILL.md y AGENTS.md.',
    windows: ['powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"'],
    mac: ['curl -fsSL https://chatgpt.com/codex/install.sh | sh'],
    alterna: 'Alternativas: npm install -g @openai/codex · brew install --cask codex',
    iniciar: 'codex',
    verificar: 'codex --version',
    login: 'Al iniciar elija "Sign in with ChatGPT" y entre con su cuenta de ChatGPT.',
    doc: 'https://github.com/openai/codex',
  },
  {
    id: 'ollama',
    nombre: 'Ollama + Claude Code',
    empresa: 'Modelos abiertos (locales o en la nube de Ollama)',
    costo: 'Gratis',
    costoTipo: 'ok',
    modelo: 'Qwen, GLM, gpt-oss, Llama…',
    plan: 'Gratis. Los modelos locales no necesitan cuenta ni internet (piden 16 GB de memoria); los modelos ":cloud" piden una cuenta gratuita de Ollama',
    skills: 'Con "ollama launch claude" usa la interfaz de Claude Code: .claude/skills/<Nombre>/SKILL.md',
    fuerte: 'La forma de usar Claude Code sin plan pago, y la opción para datos privados (todo en su equipo).',
    windows: ['irm https://ollama.com/install.ps1 | iex', 'irm https://claude.ai/install.ps1 | iex', 'ollama launch claude'],
    mac: ['curl -fsSL https://ollama.com/install.sh | sh', 'curl -fsSL https://claude.ai/install.sh | bash', 'ollama launch claude'],
    alterna: 'Para solo conversar, sin agente: ollama run llama3.2 · Instaladores gráficos en ollama.com/download',
    iniciar: 'ollama launch claude',
    verificar: 'ollama --version',
    login: 'ollama launch le deja elegir el modelo. Si elige uno ":cloud", ejecute antes  ollama signin  para crear la cuenta gratuita.',
    doc: 'https://ollama.com/blog/launch',
  },
  {
    id: 'claude',
    nombre: 'Claude Code',
    empresa: 'Anthropic',
    costo: 'Requiere plan pago',
    costoTipo: 'gris',
    modelo: 'Claude (Opus, Sonnet, Haiku)',
    plan: 'Claude Pro o superior. El plan gratuito de claude.ai no incluye Claude Code (use la opción con Ollama)',
    skills: '.claude/skills/<Nombre>/SKILL.md  (o ~/.claude/skills/)',
    fuerte: 'Con el que se construyeron CDTLive y RiskLive. Skills nativas y rutinas programadas.',
    windows: ['irm https://claude.ai/install.ps1 | iex'],
    mac: ['curl -fsSL https://claude.ai/install.sh | bash'],
    alterna: 'Alternativas: winget install Anthropic.ClaudeCode · brew install --cask claude-code',
    iniciar: 'claude',
    verificar: 'claude --version',
    login: 'La primera vez que ejecuta claude se abre el navegador para iniciar sesión.',
    doc: 'https://code.claude.com/docs/en/setup',
  },
  {
    id: 'grok',
    nombre: 'Grok Build',
    empresa: 'xAI',
    costo: 'Requiere plan pago',
    costoTipo: 'gris',
    modelo: 'Grok',
    plan: 'SuperGrok o X Premium+ (lanzado en 2026, en beta). Grok gratis en grok.com sirve para idear la skill, pero no ejecuta archivos',
    skills: 'Lee AGENTS.md, skills, plugins y servidores MCP del proyecto',
    fuerte: 'El agente de terminal de xAI. Recoge las convenciones del repositorio al iniciar.',
    windows: ['# En Windows se usa dentro de WSL (Ubuntu). Reinicie tras la primera línea y abra "Ubuntu":', 'wsl --install', 'curl -fsSL https://x.ai/cli/install.sh | bash'],
    mac: ['curl -fsSL https://x.ai/cli/install.sh | bash'],
    alterna: 'Es beta: revise x.ai/build por si cambian los comandos o aparece un instalador nativo de Windows.',
    iniciar: 'grok',
    verificar: 'grok --version',
    login: 'Al iniciar se abre el navegador para entrar con su cuenta de X o xAI.',
    doc: 'https://x.ai/news/grok-build-cli',
  },
];

// ---------------------------------------------------------------- Paso 3: carpeta de trabajo (ruta gratuita: Gemini CLI)
export const CARPETA = {
  windows: ['mkdir $HOME\\Documents\\MisSkills', 'cd $HOME\\Documents\\MisSkills', 'gemini'],
  mac: ['mkdir -p ~/Documents/MisSkills', 'cd ~/Documents/MisSkills', 'gemini'],
};

// ---------------------------------------------------------------- Paso 4: prompts listos para copiar
export const PROMPT_MAESTRO = `Quiero que construyas una skill de agente llamada [NOMBRE_SKILL].

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
Corre las pruebas y la skill con datos reales, guarda esa corrida en ejemplos/ y dime qué quedó verificado y qué no.`;

export const PROMPTS_EJEMPLO = [
  {
    id: 'trm',
    titulo: 'DolarHoy: la TRM y lo que significa para mis compras',
    nivel: 'Básico · ideal para empezar',
    texto: `Quiero que construyas una skill de agente llamada DolarHoy.

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
Corre las pruebas y la skill con una compra de 500 dólares, guarda la corrida en ejemplos/ y dime qué quedó verificado.`,
  },
  {
    id: 'credito',
    titulo: 'CreditoLive: ¿cuánto me cuesta de verdad un crédito?',
    nivel: 'Intermedio',
    texto: `Quiero que construyas una skill de agente llamada CreditoLive.

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
Corre las pruebas y la skill con un crédito de 20.000.000 a 36 meses, guarda la corrida en ejemplos/ y dime qué quedó verificado.`,
  },
  {
    id: 'presupuesto',
    titulo: 'MiPresupuesto: diagnóstico de mis gastos desde un Excel',
    nivel: 'Básico · sin internet',
    texto: `Quiero que construyas una skill de agente llamada MiPresupuesto.

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
Corre las pruebas y la skill con el archivo de ejemplo y dime qué quedó verificado.`,
  },
];

// ---------------------------------------------------------------- Paso 5: usarla y programarla
export const USAR_SKILL = [
  { t: 'Pida al agente que recargue las skills y verifique que la nueva aparece (comandos de Gemini CLI):', c: '/skills reload' },
  { t: 'Compruebe que la skill aparece en la lista:', c: '/skills list' },
  { t: 'Úsela en lenguaje natural: el agente la reconoce por su descripción.', c: '¿Cuánto me cuesta en pesos una compra de 500 dólares hoy?' },
  { t: 'Pida mejoras en el mismo chat, como a un analista:', c: 'Agrega al Excel la variación de la TRM en los últimos 30 días y vuelve a correr las pruebas.' },
  { t: 'Ejecútela sin abrir el chat (modo no interactivo). --yolo aprueba solo las acciones del agente: úselo únicamente con skills propias que ya probó. Esta es la línea que se programa como rutina:', c: 'gemini --yolo -p "Usa la skill DolarHoy con una compra de 500 dólares"' },
  { t: 'Rutina diaria en Mac o Linux con cron (días hábiles, 7:00). En Windows se programa la misma línea en el Programador de tareas:', c: '0 7 * * 1-5 cd ~/Documents/MisSkills && gemini --yolo -p "Usa la skill DolarHoy con 500 dólares"' },
];

// ---------------------------------------------------------------- Guion de la demo (conversación real, resumida)
// Cada paso trae `explica`: qué está pasando, en palabras simples, para el panel lateral.
export const DEMO = {
  pregunta: 'Necesito una skill que compare los CDT de los bancos y las fintech de Colombia con datos oficiales del día, que replique el cálculo del simulador de CDT de Davivienda y que entregue un Excel y un informe.',
  explicaPregunta: 'Todo empieza con el planteamiento del problema: qué se necesita, con qué datos y qué debe entregar.',
  turnos: [
    {
      texto: 'Antes de escribir código voy a buscar dónde publica la Superfinanciera las tasas por entidad y a probar cada fuente con una consulta real.',
      explica: 'El agente no responde de memoria. Primero decide qué necesita averiguar y en qué orden.',
      acciones: [
        { tipo: 'terminal', titulo: 'Buscar el dataset de tasas en datos.gov.co', cmd: 'curl "api.us.socrata.com/api/catalog/v1?domains=www.datos.gov.co&q=tasas captacion"', res: 'Encontrado: axk9-g2nh · Tasas de captación por entidad · actualizado hoy', estado: 'ok',
          explica: 'Usa la terminal para buscar en el catálogo de datos abiertos del Gobierno dónde están las tasas de CDT por banco.' },
        { tipo: 'terminal', titulo: 'Probar la fuente con el último corte', cmd: 'curl "datos.gov.co/resource/axk9-g2nh.json?$select=max(fechacorte)"', res: 'Último corte 25-sep-2026 · Davivienda 10,79 % · Bancolombia 11,50 % a 360 días', estado: 'ok',
          explica: 'Antes de programar, prueba la fuente con una consulta real para confirmar que trae datos de esta semana.' },
        { tipo: 'navegador', titulo: 'Revisar el simulador de Davivienda', cmd: 'davivienda.com/simuladores/simulador-cdt', res: 'La página bloquea programas automáticos y su servicio responde error 500', estado: 'aviso',
          explica: 'Revisa el simulador que se quería replicar y descubre un problema: la página bloquea robots y su cálculo falla.' },
      ],
    },
    {
      texto: 'El simulador web no es confiable, así que no lo uso como fuente: replico su cálculo con la tasa que cada banco reporta a la Superfinanciera.',
      explica: 'Toma una decisión como lo haría un analista: si una fuente no es confiable, busca otra forma de llegar al mismo resultado con datos oficiales.',
      acciones: [
        { tipo: 'archivo', titulo: 'Crear los programas que descargan los datos', cmd: 'fuentes_sfc.py · fuentes_banrep.py · fuentes_dane.py · tasas.py', res: '4 archivos creados', estado: 'ok',
          explica: 'Escribe los programas que traen los datos de la Superfinanciera, el Banco de la República y el DANE.' },
        { tipo: 'archivo', titulo: 'Crear la calculadora y la plantilla del informe', cmd: 'cdtlive.py · plantilla_md.md', res: 'Cálculo del CDT, Excel con fórmulas e informe', estado: 'ok',
          explica: 'Escribe la calculadora: el mismo cálculo del simulador, el Excel con fórmulas y la plantilla del informe.' },
        { tipo: 'terminal', titulo: 'Correr las pruebas automáticas', cmd: 'python -m pytest CDTLive/tests -q', res: '44 pruebas pasaron', estado: 'ok',
          explica: 'Corre 44 pruebas automáticas para comprobar que cada cálculo da lo que tiene que dar.' },
        { tipo: 'terminal', titulo: 'Ejecutar la skill con datos reales', cmd: 'python cdtlive.py --monto 10000000 --plazo 360', res: 'Mejor opción: Pibank 13,46 % EA · 25 entidades con dato · 7 controles OK', estado: 'ok',
          explica: 'Ejecuta la skill completa con los datos de hoy, como lo haría un usuario.' },
        { tipo: 'archivo', titulo: 'Escribir el manual de la skill', cmd: 'CDTLive/SKILL.md', res: 'Pasos numerados, errores comunes y reglas', estado: 'ok',
          explica: 'Escribe el manual (SKILL.md) para que cualquier agente, incluso uno pequeño y gratuito, pueda repetir el proceso.' },
      ],
    },
  ],
  final: {
    texto: 'Listo. CDTLive compara 25 entidades con dato de hoy. Con $10 millones a 360 días la mejor tasa es Banco Pichincha (Pibank).',
    explica: 'Entrega el resultado con cifras verificadas, la fuente y la fecha, más los archivos listos para abrir.',
    kpis: [['Mejor tasa', '13,46 % EA'], ['Interés neto', '$1.273.334'], ['Rentabilidad real', '6,28 %'], ['Entidades', '25']],
    archivos: ['CDTLive_10000000_360d.xlsx', 'CDTLive_10000000_360d.md'],
  },
};

// ---------------------------------------------------------------- Fuentes oficiales usadas
export const FUENTES = [
  { nombre: 'Superfinanciera', via: 'datos.gov.co · dataset axk9-g2nh', dato: 'Tasa de CDT y de ahorro por entidad, diaria', ejemplo: 'Pibank 13,46 % EA a 360 días' },
  { nombre: 'Banco de la República', via: 'API Suameca (JSON)', dato: 'CDT del sistema, IBR, TPM, TRM, COLCAP, UVR, meta de inflación', ejemplo: 'TPM 12,00 % · CDT 360 días 12,08 %' },
  { nombre: 'DANE', via: 'Anexo de índices del IPC (xlsx)', dato: 'Inflación mensual desde 2003', ejemplo: 'IPC 12 meses: 6,25 % (ago-2026)' },
];

export const ESTRUCTURA = `PlanFin/
├── _shared/              librería común
│   ├── fuentes.md        catálogo de fuentes verificadas
│   └── scripts/          SFC · BanRep · DANE · tasas · Excel
├── CDTLive/
│   ├── SKILL.md          instrucciones para el agente
│   ├── entidades.csv     28 bancos y fintech
│   ├── scripts/          cdtlive.py · plantilla_md.md
│   ├── tests/            44 pruebas
│   └── ejemplos/         corrida real (Excel + MD)
└── RiskLive/
    ├── SKILL.md
    ├── referencia_model_risk.md
    ├── scripts/          calibración · simulación · Excel
    ├── tests/            28 pruebas
    └── ejemplos/`;

export const SKILL_MD = `---
name: CDTLive
description: Compara con datos oficiales del día la
  rentabilidad de un CDT en los principales bancos y
  fintech de Colombia. Úsala cuando el usuario pregunte
  "dónde me conviene un CDT" o "tasas de CDT hoy".
---

# CDTLive

## Paso 1: recoger las entradas
Monto, plazo en días y periodicidad.

## Paso 2: ejecutar el script
python scripts/cdtlive.py --monto 10000000 --plazo 360

## Paso 3: verificar las validaciones
[OK] continuar · [ERROR] no entregar

## Reglas duras
1. Nunca invente una tasa.`;

export const REGLAS = [
  { t: 'Educación, no asesoría', d: 'La asesoría de inversión está regulada por la Superfinanciera. El agente describe datos; no dice "le conviene".' },
  { t: 'Nunca inventar cifras', d: 'Si una fuente falla, el agente lo informa. El script rechaza interpretaciones con números que no están en el informe.' },
  { t: 'Datos personales', d: 'Ley 1581 de 2012 (habeas data). Para datos sensibles, use modelos locales con Ollama o no suba la información.' },
  { t: 'Trazabilidad', d: 'Cada cifra lleva fuente, fecha y hora de consulta. Un humano puede auditar el resultado.' },
];

// ---------------------------------------------------------------- Qué pedirle a una skill ya creada (invocarla por su nombre)
export const USO_EJEMPLOS = [
  { skill: 'CDTLive', pedidos: [
    '/CDTLive 20 millones a 180 días con pago de intereses trimestral',
    '/CDTLive ¿cuánto dejo de ganar si dejo 10 millones un año en Nu en vez de un CDT?',
    '/CDTLive compara solo bancos digitales y fintech a 90 días con 5 millones',
    '/CDTLive 80 millones a 360 días y dime si paso la cobertura de Fogafín',
  ] },
  { skill: 'RiskLive', pedidos: [
    '/RiskLive ahorro 1 millón al mes por 5 años, meta 80 millones, 60 % CDT, 25 % COLCAP y 15 % dólares',
    '/RiskLive ¿cuánto debo ahorrar al mes para tener 80 % de probabilidad de llegar a 150 millones en 10 años?',
    '/RiskLive el mismo caso pero con 40 % en COLCAP y rebalanceo anual',
    '/RiskLive repite con colas pesadas (--dist t) y compara el percentil 5',
  ] },
  { skill: 'DolarHoy (la que usted va a crear)', pedidos: [
    '/DolarHoy ¿cuánto me cuesta hoy una compra de 500 dólares?',
    '/DolarHoy ¿subió o bajó la TRM en los últimos 30 días?',
  ] },
];

// ---------------------------------------------------------------- Cómo pedirle bien a un agente que construya una skill
// Lecciones de esta sesión: lo que funcionó cuando se construyeron CDTLive y RiskLive.
export const PRINCIPIOS_PROMPT = [
  { t: 'Dé contexto y referencias', d: 'Diga quién es usted, para qué es y qué archivos o trabajos previos debe leer antes de empezar.',
    cita: 'Lee los archivos de esta carpeta antes de empezar y resume lo que entendiste.' },
  { t: 'Muestre ejemplos de lo que espera', d: 'Un enlace, una captura o un archivo de ejemplo vale más que un párrafo de descripción.',
    cita: 'Replica el cálculo de este simulador: [enlace].' },
  { t: 'Pida plan antes que código', d: 'Primero que proponga y verifique; usted aprueba y después construye. Evita trabajo en la dirección equivocada.',
    cita: 'Por ahora solo planifica: propón las fuentes y espera mi aprobación.' },
  { t: 'Exija fuentes verificadas', d: 'Pida los enlaces exactos y que los pruebe con una consulta real antes de programar.',
    cita: 'Dame los enlaces exactos y pruébalos con una consulta real.' },
  { t: 'Defina el entregable y el formato', d: 'Qué archivos, qué hojas, qué secciones. Si no lo dice, el agente lo inventa.',
    cita: 'Cada corrida entrega un Excel con fórmulas y un informe en Markdown.' },
  { t: 'Fije el estándar de calidad', d: 'Para quién debe servir, con qué modelo debe funcionar y a qué nivel de rigor.',
    cita: 'Debe poder ejecutarla sin errores un modelo pequeño y gratuito.' },
  { t: 'Ponga límites claros', d: 'Qué no hacer: no inventar cifras, no construir una app, no usar cierta fuente.',
    cita: 'No construyas una aplicación; solo la skill. No inventes cifras.' },
  { t: 'Corrija sobre la marcha', d: 'Si ve algo que no le gusta, dígalo en el momento con un ejemplo de lo que quiere.',
    cita: 'Ajusta el diseño: fondo blanco y morado como color principal.' },
];

export const SECUENCIA_PROMPTS = [
  { n: '1', t: 'Explorar', d: 'El agente lee su contexto y propone ideas. Todavía no construye nada.',
    p: `Lee los archivos de esta carpeta: [liste archivos o carpetas relevantes, por ejemplo apuntes, Excel del profesor, skills anteriores].
Quiero construir una skill de agente para [objetivo en una frase] dirigida a [quién la va a usar].
Antes de escribir código:
1. Resume en 5 líneas lo que entendiste de mis archivos.
2. Propón 2 o 3 formas de hacerlo y recomienda una, con sus pros y contras.
No construyas nada todavía.` },
  { n: '2', t: 'Verificar fuentes', d: 'Que encuentre y pruebe los enlaces exactos, con datos reales de hoy.',
    p: `Para la opción que recomendaste, busca las fuentes de datos oficiales y públicas (por ejemplo datos.gov.co, Banco de la República, DANE, Superfinanciera).
Para cada una:
- dame la URL exacta,
- haz una consulta real y muéstrame las columnas y un dato de ejemplo con su fecha,
- dime si necesita navegador o si sirve por API.
Si alguna fuente no funciona, dilo y propón una alternativa. Referencia de lo que quiero replicar: [pegue aquí el enlace del simulador o la página de ejemplo].` },
  { n: '3', t: 'Especificar', d: 'Que escriba el plan detallado de la skill para que usted lo revise.',
    p: `Escribe la especificación completa de la skill [NombreSkill] antes de construirla:
- entradas del usuario con valores por defecto,
- fuentes (las que verificaste),
- cálculos y fórmulas,
- estructura de carpetas: .agents/skills/[NombreSkill]/ con SKILL.md, scripts/, tests/, ejemplos/,
- entregables: un Excel con fórmulas vivas y una hoja de controles, y un informe Markdown,
- criterios de aceptación que vas a verificar al final.
Estándar: debe poder ejecutarla sin errores un modelo pequeño. Espera mi aprobación.` },
  { n: '4', t: 'Construir', d: 'Con la especificación aprobada, que construya, pruebe y corra con datos reales.',
    p: `Aprobado. Construye la skill siguiendo la especificación:
1. Toda la descarga y la matemática en Python, con pruebas (pytest).
2. El SKILL.md con pasos numerados: comando exacto, salida esperada y qué hacer si falla.
3. Nunca inventes cifras: si una fuente falla, el script lo informa.
4. El informe termina con "Educación financiera, no asesoría de inversión."
Al terminar, corre las pruebas y la skill con datos reales, guarda la corrida en ejemplos/ y dime qué quedó verificado y qué no.` },
  { n: '5', t: 'Probar como usuario', d: 'Que siga su propio manual como lo haría un modelo pequeño y corrija lo ambiguo.',
    p: `Ahora actúa como si fueras un modelo pequeño que nunca vio este código: sigue el SKILL.md paso a paso, literalmente, con este caso: [describa un caso de prueba].
Anota cada paso donde dudaste o donde el resultado no coincidió con lo que dice el manual, corrige el SKILL.md o los scripts, y repite hasta que pase sin dudas.` },
  { n: '6', t: 'Pulir y compartir', d: 'Ajustes de estilo, casos límite y una guía para que otros la usen.',
    p: `Revisa el Excel y el informe como lo haría un analista exigente: formato, títulos, unidades y consistencia de cifras. [Si tiene una referencia visual, péguela aquí.]
Prueba 3 casos límite (datos faltantes, entradas inválidas y un monto muy grande) y confirma que el script responde con mensajes claros.
Por último, escribe un README corto para que un compañero instale y use la skill.` },
];
