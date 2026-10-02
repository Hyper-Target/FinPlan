# Guion de Luis D. Peñaranda

De chatbot a agente · Planeación Financiera, Maestría en Finanzas, Universidad del Norte

Tiempo total de la exposición: 60 minutos. Luis habla unos 35 (cerca del 66 %) y Leydis unos 20 (cerca del 34 %). Los últimos 5 minutos son para preguntas.

Lo que va entre corchetes son indicaciones y no se lee en voz alta. Los pasos de Leydis están en su guion aparte (`Guion_Leydis_Niebles.docx`); aquí solo aparecen las entradas y salidas.

| Diapositivas | Tema | Quién | Minutos |
|---|---|---|---|
| 1 a 2 | Portada y agenda | Luis | 1,5 |
| 3 a 6 | Qué es un agente y qué es una skill | Luis | 6 |
| 7 a 12 | El manifiesto | Leydis | 12 |
| 13 a 15 | CDTLive: cómo se pidió y cómo se construyó (con demo) | Luis | 6 |
| 16 | CDTLive: el cálculo | Leydis | 2 |
| 17 a 18 | CDTLive: resultado y comparación | Luis | 3,5 |
| 19 a 20 | CDTLive: Excel e informe | Leydis | 3 |
| 21 a 22 | RiskLive: introducción y cómo se pidió | Luis | 2,5 |
| 23 | RiskLive: el modelo del profesor | Leydis | 1,5 |
| 24 a 28 | RiskLive: calibración, resultado y Excel | Luis | 7 |
| 29 a 36 | Hágalo usted | Luis | 9,5 |
| 37 | Por qué se puede confiar | Leydis | 1,5 |
| 38 | Cierre y preguntas | Luis | 5 |

---

## Diapositiva 1 · Portada (0,5 min)

Buenas noches a todos. Soy Luis Peñaranda y estoy con Leydis Niebles. Hoy les vamos a contar cómo pasamos de usar la inteligencia artificial como un chat a usarla como un asistente que trabaja: busca datos oficiales, calcula y entrega archivos que se pueden revisar.

Al final de la hora, cada uno de ustedes va a saber instalar uno de estos agentes gratis, iniciar sesión desde la terminal y crear su propia herramienta.

## Diapositiva 2 · Agenda (1 min)

Esta es la agenda. Primero les explico qué es un agente, desde cero. Después Leydis presenta el manifiesto, que son las reglas que le pusimos al agente. Luego vemos las dos herramientas que construimos, CDTLive y RiskLive, y en esas Leydis explica la parte contable. Después viene la parte práctica, que es la que más les va a servir: instalar y crear. Y dejamos cinco minutos para preguntas.

## Diapositiva 3 · Parte 1: qué es un agente (0,25 min)

Empecemos por lo básico.

## Diapositiva 4 · Un chatbot conversa, un agente trabaja (2 min)

Todos hemos usado ChatGPT, Gemini o algo parecido. Eso es un chatbot. Uno le pregunta, él responde de memoria. Si le pregunto "¿cuál es la mejor tasa de CDT hoy?", me va a dar una cifra que aprendió en su entrenamiento, y esa cifra puede tener meses. Y no me avisa.

Un agente recibe un objetivo y decide qué hace para cumplirlo. Para la misma pregunta, consulta la Superfinanciera en ese momento, calcula con un programa y me entrega un Excel. El resultado de hoy es Pibank, a 13,46 % efectivo anual.

Abajo está el ciclo que repite un agente: entiende la petición, planea qué hacer, actúa, que es buscar, calcular y crear archivos, y verifica lo que hizo. Si algo falla, corrige y repite. Es lo que haría un analista junior. Uno le pide el resultado y él se encarga del cómo.

## Diapositiva 5 · Seis palabras que vamos a usar (2 min)

Van a escuchar seis palabras todo el rato, así que las fijamos.

LLM es el modelo que redacta y razona: ChatGPT, Gemini, Claude, Grok. Chatbot es ese modelo con una ventana de chat, que responde con lo que ya sabe. Herramienta es todo lo que el modelo puede usar además de escribir: buscar en la web, leer un archivo, correr un programa en Python. Agente es un LLM que decide qué herramientas usar hasta cumplir el objetivo.

Skill es el manual de un procedimiento. Es una carpeta con un archivo de instrucciones, unos programas y unas plantillas. Y rutina es una skill que corre sola a una hora fija, por ejemplo todos los días a las 7 de la mañana.

## Diapositiva 6 · Una skill es un manual más una calculadora (2 min)

Esta es la idea central de toda la exposición. Una skill tiene tres piezas.

La primera es el manual, un archivo que se llama SKILL.md. Dice cuándo usar la skill y qué pasos seguir, con el comando exacto de cada uno. La segunda es la calculadora: programas en Python que descargan los datos oficiales y hacen toda la matemática, con pruebas automáticas. La tercera es el formato, que define cómo se ven el Excel y el informe y qué se revisa antes de entregar.

El modelo de lenguaje no calcula. Sigue el manual y llama a los programas. Eso es lo que permite que funcione incluso con modelos gratuitos.

Abajo está lo que pasa cuando alguien pregunta. La persona escribe "CDT de 10 millones a 360 días". El agente elige la skill por su descripción, trae los datos de la Superfinanciera, del Banco de la República y del DANE, calcula y valida, y entrega un Excel y un informe.

[Pasar la palabra a Leydis]
Antes de ver la primera skill, hay una pregunta que se la hizo Leydis cuando vio esto, y es la más importante: ¿quién le pone las reglas al agente? Te dejo con eso, Leydis.

---

## Diapositivas 7 a 12 · Manifiesto

[Habla Leydis. Luis solo se mueve de diapositiva. Al terminar la 12, Luis retoma.]

---

## Diapositiva 13 · Parte 3: CDTLive (0,25 min)

Gracias, Leydis. Con esas reglas claras, veamos la primera herramienta.

## Diapositiva 14 · Cómo se plantea (3 min)

CDTLive responde una pregunta: ¿dónde rinde más un CDT hoy? Lo que me interesa mostrarles es cómo se plantea el problema, porque no se le pide todo al agente de una vez. Son cuatro etapas.

La primera es el problema y el referente. La pregunta es concreta, y el referente es algo que ya existe y que queremos replicar: el simulador de CDT de Davivienda. Un ejemplo de referencia vale más que un párrafo de explicación.

La segunda es la planeación. Primero se identifican las fuentes oficiales posibles para los bancos y las fintech de Colombia. Todavía no se escribe código. Es el momento de comprobar que vamos en la dirección correcta.

La tercera es la verificación de fuentes. Se buscan los enlaces exactos y se prueban con consultas reales, para confirmar las columnas, las fechas y la cobertura de cada dato.

Y la cuarta es la especificación. Se define el entregable, que es un Excel con fórmulas y un informe en Markdown, y el estándar de calidad: que la skill se pueda ejecutar sin errores incluso con un modelo pequeño.

A la derecha está lo que hace sólido el planteamiento: un referente concreto, planeación antes que código, enlaces verificados, un entregable definido y un estándar explícito y comprobable.

## Diapositiva 15 · Cómo se construyó (3 min)

[Aquí es el momento de la demo. Opción A: pasar a la web en `localhost:5173/#/demo` y presionar Reproducir (dura unos 25 segundos). Opción B: reproducir el video grabado. Volver a la diapositiva al terminar.]

Esto es lo que hizo el agente, en el orden en que lo hizo.

Primero buscó dónde publica la Superfinanciera las tasas de captación por entidad y encontró un conjunto de datos abiertos, el axk9-g2nh. Antes de programar nada, lo probó con una consulta real: el último corte era del 25 de septiembre de 2026, y ya traía las tasas a 360 días de Davivienda, 10,79 %, y de Bancolombia, 11,50 %.

Luego fue a revisar el simulador de Davivienda, que era lo que yo quería replicar, y descubrió un problema. La página bloquea a los programas automáticos y su servicio de cálculo respondía con error. Aquí el agente tomó una decisión que me gustó: no usar el simulador como fuente. En lugar de eso, replicó su cálculo en Python con la tasa que Davivienda reporta a la Superfinanciera. Es el mismo número, pero de una fuente que no se cae.

Después escribió los programas que descargan los datos y la calculadora, corrió 44 pruebas automáticas, ejecutó la skill completa con datos reales y, por último, escribió el manual para que otro agente pueda repetirlo.

Lo importante es esto: yo hice una sola petición y el agente hizo el resto. Pero cada paso se puede revisar, porque todo quedó en archivos.

[Pasar la palabra a Leydis]
Leydis les va a explicar cómo es el cálculo, que es una cuenta que cualquiera de ustedes puede verificar a mano.

---

## Diapositiva 16 · El cálculo

[Habla Leydis.]

---

## Diapositiva 17 · El resultado (2 min)

Gracias, Leydis. Este es el resultado de hoy para 10 millones de pesos a 360 días.

La mejor opción es Pibank, que es el banco digital de Banco Pichincha. Paga 13,46 % efectivo anual, que es 1,38 puntos por encima del promedio del sistema según el Banco de la República. Después de la retención, deja 1.273.334 pesos de interés neto, y descontando la inflación queda una rentabilidad real de 6,28 %.

En la tabla están los seis primeros. Después de Pibank viene KOA CF con 13,25 %, Iris con 12,94 %, Ban100 con 12,87 %, Tuya con 12,78 % y Bold con 12,50 %. Fíjense en el tipo de entidad: son bancos digitales y fintech.

## Diapositiva 18 · Los digitales y las fintech pagan más (1,5 min)

La gráfica confirma lo que se ve en la tabla. Los bancos tradicionales, 16 entidades, pagan en promedio 11,44 %. Los bancos digitales, 4 entidades, 12,39 %. Y las fintech, 5 entidades, 12,49 %. Casi un punto de diferencia.

Hay un contraste que me parece útil para cualquiera: la cuenta de ahorro. Nu y Lulo pagan cerca de 8,8 % efectivo anual, lo que da unos 838.000 pesos en el año con los mismos 10 millones. En cambio, Bancolombia y Nequi pagan alrededor de 0,1 % en cuenta de ahorro. Lo que uno deja quieto en una cuenta tradicional casi no rinde.

Una aclaración sobre los datos: Plata no tiene dato de CDT a 360 días, y Nequi y RappiPay no emiten CDT, así que solo se comparan en ahorro. Son 25 entidades con dato de CDT, y el agente no estima ninguna que falte.

[Pasar la palabra a Leydis]
Leydis les muestra el Excel, que es lo que más le gustó a ella como contadora.

---

## Diapositivas 19 y 20 · El Excel y el informe

[Habla Leydis.]

---

## Diapositiva 21 · Parte 4: RiskLive (0,25 min)

Gracias, Leydis. La segunda herramienta responde otra pregunta: si ahorro cada mes, ¿con qué probabilidad llego a mi meta?

## Diapositiva 22 · Cómo se plantea (2,25 min)

Esta es la skill que más conecta con el curso, porque parte del Model Risk que trabajamos con el profesor. El objetivo es llevar ese modelo a finanzas personales, con datos oficiales en vivo, y entregar un Excel y un informe.

El primer paso, el paso cero, es documentar el modelo del curso antes de programar: las hojas, las tablas, los nombres de las variables y las fórmulas. Así sabemos exactamente qué estructura hay que conservar. Es la tabla MBASE, con Period, Inflow, Outflow, NetCF y Balance, y las variables PerRate, EAR y NOM.

A partir de ahí, RiskLive agrega lo que necesita una persona para tomar decisiones: la calibración con datos de hoy, la simulación Monte Carlo, la sensibilidad y los controles de integridad.

Las entradas son el aporte mensual, la meta en pesos de hoy, el ahorro inicial, los años y cómo se reparte entre CDT, COLCAP y dólares. Y el estándar es el mismo de CDTLive: la estadística va en Python con semilla fija, el Excel con fórmulas vivas y un informe que interpreta.

[Pasar la palabra a Leydis]
Leydis les va a mostrar cómo se parece este modelo al que vimos en clase.

---

## Diapositiva 23 · El mismo modelo, con otras preguntas

[Habla Leydis.]

---

## Diapositiva 24 · Calibración (2,5 min)

Gracias, Leydis. Un modelo de simulación solo vale lo que valen sus supuestos, y aquí los medimos con diez años de datos oficiales, tomados hoy.

Para el COLCAP, el retorno medio mensual es de 0,54 % y la volatilidad de 5,84 %. Le hicimos la prueba de Jarque-Bera, que dio 373, y la asimetría es de menos 1,56. Eso significa que los retornos de la bolsa colombiana no son normales: tienen caídas más fuertes de lo que esperaría una campana. Por eso el programa tiene una opción de colas más pesadas, y queda anotado como limitación en el informe.

Para el dólar, el retorno medio es de 0,13 % mensual y la volatilidad de 3,59 %. Y la correlación entre el dólar y el COLCAP es de menos 0,51: cuando la bolsa cae, el dólar tiende a subir.

La renta fija parte de la mejor tasa de CDT de hoy, 13,46 %, y se va moviendo hacia un nivel de largo plazo de 10,28 %. La inflación parte de 6,25 % y converge hacia la meta del Banco de la República, que es 3 %.

Con todo eso se simulan 10.000 trayectorias mensuales, con los shocks correlacionados y una semilla fija, la 42. Con la misma semilla y los mismos datos sale siempre el mismo resultado, y eso permite repetir y auditar la corrida.

## Diapositiva 25 · El resultado (2 min)

El caso es el siguiente. Una persona tiene 5 millones, ahorra 1 millón al mes durante 5 años y quiere llegar a 80 millones en pesos de hoy. La probabilidad de lograrlo es de 31,8 %. De cada diez escenarios, tres llegan.

El resultado típico, la mediana, es de 76,9 millones: cerca, pero por debajo de la meta. El caso malo razonable, el percentil 5, es de 66,9 millones, y el bueno, el percentil 95, de 88,4. Lo que la persona puso de su bolsillo, en pesos de hoy, es de 64,8 millones. Y la probabilidad de terminar con menos poder adquisitivo del que aportó es de apenas 2,1 %.

Para tener 80 % de probabilidad de llegar, el aporte tendría que ser de 1.127.533 pesos al mes, unos 127.000 más.

## Diapositiva 26 · Cómo leer la simulación (1 min)

A la izquierda está el abanico. La línea oscura es el escenario típico mes a mes. La franja es dónde cae el 90 % de los escenarios, y entre más ancha, más incertidumbre. La línea roja es la meta: el escenario típico se acerca a ella pero termina un poco por debajo.

A la derecha está el histograma. Cada barra agrupa escenarios con un resultado parecido, y las oscuras son las que superan la meta.

## Diapositiva 27 · Qué mueve el resultado (1,5 min)

Esta es la lectura que más me sorprendió. Con 700.000 pesos al mes la probabilidad es de 0 %. Con 900.000 es de 5,6 %. Con el millón actual, 31,8 %. Con 1,1 millones, 71,7 %. Y con 1,3 millones, 99,2 %. Un cambio de 10 % en el aporte cambia el resultado mucho más que casi cualquier decisión de portafolio.

La tabla de la derecha muestra por qué. Pasar de 0 % a 60 % en COLCAP baja la mediana, de 77,7 a 75,3 millones, y empeora el caso malo, de 67,6 a 57,9. Más bolsa aumenta el riesgo sin mejorar el resultado típico. La probabilidad de llegar casi no cambia, porque la meta está por encima de la mediana y más variabilidad le da más opciones de superarla, pero a costa de tener también peores resultados. Por eso lo que más pesa es cuánto se ahorra.

## Diapositiva 28 · El Excel y el informe (0,75 min)

El Excel de RiskLive tiene diez hojas y doce controles. Resumen con el abanico y el histograma, supuestos con su fuente, calibración, el modelo base con el libro de caja del profesor en fórmulas vivas, una muestra de las simulaciones, los resultados y las fuentes. Y el informe en Markdown completa el paquete.

---

## Diapositiva 29 · Parte 5: hágalo usted (0,25 min)

Hasta aquí vieron lo que hicimos. Ahora la parte para que lo hagan ustedes. No necesitan saber programar ni pagar nada.

## Diapositiva 30 · Elegir el agente (1,5 min)

Hay varios agentes que se instalan en la terminal y se usan iniciando sesión con una cuenta que ya tienen. Gemini CLI, de Google, es gratis con un correo Gmail y da 1.000 solicitudes al día. Es el que recomiendo para la clase. Codex, de OpenAI, funciona con la cuenta de ChatGPT, incluso la gratuita, pero con límites bajos que sirven para probar. Ollama con Claude Code permite usar modelos abiertos sin cuenta y sin pagar. Claude Code y Grok Build son muy buenos, pero requieren un plan pago, así que los dejo como referencia.

## Diapositiva 31 · La terminal (1,5 min)

La terminal es una ventana donde se escriben instrucciones al computador. Ahí vive el agente.

En Windows, presionan la tecla Windows, escriben PowerShell y lo abren. Van a ver algo como PS C:\Users y su nombre. Ahí pegan los comandos con clic derecho y presionan Enter. Si después de instalar algo dice que no se reconoce, cierran la ventana y abren otra.

En Mac, presionan Comando y Espacio, escriben Terminal y presionan Enter. Pegan con Comando V. Si pide contraseña, la escriben aunque no se vea nada en pantalla.

## Diapositiva 32 · Instalar (1,5 min)

[Si hay tiempo y buena conexión, se puede hacer en vivo; si no, se muestra el paso a paso.]

En Windows son estos comandos. Primero instalan Node y Python con winget. Cierran y abren PowerShell de nuevo. Luego instalan Gemini CLI con npm install -g @google/gemini-cli, y comprueban con gemini --version que responda con un número.

En Mac se instala primero Homebrew, que es el instalador de programas, con el comando largo de la izquierda, y después brew install node python y brew install gemini-cli.

Todos estos comandos están en la web de la presentación con un botón de copiar, así que no hay que transcribirlos.

## Diapositiva 33 · Iniciar sesión (1,5 min)

Para iniciar sesión, escriben gemini y Enter. Les pregunta cómo quieren entrar y eligen "Sign in with Google". Se abre el navegador solo, entran con su Gmail, aceptan y vuelven a la terminal. Ya pueden escribirle.

Si prefieren ChatGPT, instalan Codex con npm install -g @openai/codex, escriben codex y eligen entrar con ChatGPT. Y si no quieren usar ninguna cuenta, se instala Ollama y se abre con ollama launch claude. Los modelos locales no piden cuenta; los de la nube piden una cuenta gratuita de Ollama.

## Diapositiva 34 · Crear la skill (2 min)

Crear la skill es pegar un prompt. Hacen una carpeta, entran a ella y abren el agente: mkdir MisSkills, cd MisSkills y gemini.

A la izquierda está el comienzo del prompt de una skill sencilla que se llama DolarHoy. Trae la TRM oficial de hoy y de los últimos 90 días y calcula cuánto cuesta en pesos una compra en dólares. Fíjense en las partes: el objetivo, las fuentes con la instrucción de verificar la dirección con una consulta real, las reglas y lo que debe entregar.

Mientras trabaja, el agente les va a pedir permiso para crear archivos y ejecutar comandos. Lean qué quiere hacer y aprueben. Si se detiene, escriban "continúa". Si aparece un error, lo pegan en el chat y le piden que lo corrija. Tarda entre 5 y 15 minutos.

## Diapositiva 35 · Usarla (1,5 min)

Después, la skill se usa como se le pide algo a un colega. Primero, /skills list para comprobar que aparece. Y luego se le habla normal: "usa la skill DolarHoy con una compra de 500 dólares", o en Claude Code se invoca con la barra, como /CDTLive 20 millones a 180 días con pago trimestral.

Para convertirla en rutina, se ejecuta sin abrir el chat con gemini -p y la instrucción, y esa línea se programa a las 7 de la mañana, en el Programador de tareas de Windows o con cron en Mac. Una advertencia: el modo que aprueba solo las acciones se usa únicamente con skills propias que ya probaron.

## Diapositiva 36 · Cómo pedir bien (2 min)

Esta es la diapositiva que más quisiera que se lleven. Hay ocho reglas para pedirle bien a un agente, y todas salen de lo que hicimos con CDTLive y RiskLive: dar contexto y referencias, mostrar ejemplos de lo que esperan, pedir plan antes que código, exigir fuentes verificadas, definir el entregable y el formato, fijar el estándar de calidad, poner límites claros, y corregir sobre la marcha.

Y abajo, seis etapas. No se pide todo de una vez. Se explora, se verifican las fuentes, se especifica, se construye, se prueba como usuario y se pule. Cada etapa se aprueba antes de pasar a la siguiente. Los seis prompts completos están en la web, en la sección "Cómo pedirle bien", listos para copiar.

[Pasar la palabra a Leydis]
Para cerrar, Leydis les explica por qué se puede confiar en todo esto.

---

## Diapositiva 37 · Por qué se puede confiar

[Habla Leydis.]

---

## Diapositiva 38 · Cierre y preguntas (5 min)

Gracias, Leydis. Para cerrar: un agente no reemplaza al analista, le quita lo repetitivo. Lo que hace especial a esto es que cada cifra tiene una fuente oficial y una fecha, los cálculos tienen pruebas y hay un humano que revisa.

Todo lo que mostramos, las dos herramientas, los prompts y esta presentación, está en el repositorio de HyperTarget, así que pueden descargarlo y repetirlo. ¿Preguntas?

---

## Preguntas que pueden salir (para tener la respuesta lista)

**¿Por qué no usaron el simulador de Davivienda directamente?** Bloquea a los programas automáticos y su servicio de cálculo falló en las pruebas. Se replicó su cálculo con la tasa que Davivienda reporta a la Superfinanciera.

**¿La tasa que muestra CDTLive es la que me ofrece el banco?** No exactamente. Es el promedio ponderado de lo que cada entidad pagó por los CDT emitidos ese día. La tasa de cartelera que ofrecen en la oficina o en la app puede ser mayor o menor según el monto y el canal.

**¿Esto es asesoría de inversión?** No. El manifiesto lo prohíbe: el agente describe datos y calcula escenarios, no recomienda el producto de una entidad. Esa respuesta la amplía Leydis.

**¿Los resultados de RiskLive son una predicción?** No. Son escenarios calibrados con diez años de datos. Si el futuro se parece al pasado, el resultado se parece a lo que muestra la distribución. La media histórica del COLCAP puede sobrestimar o subestimar el rendimiento esperado, y eso queda anotado en las limitaciones.

**¿Qué pasa si una fuente falla?** El programa lo informa y no inventa la cifra. Tampoco guarda el informe si el modelo usa un número que no está en las tablas.

**¿Funciona con un modelo pequeño o gratuito?** Está diseñado para eso: la matemática y la descarga van en programas con pruebas, y el modelo solo sigue pasos numerados. En las pruebas se siguió el manual paso a paso como lo haría un modelo pequeño, pero no se ha probado en uno real.

**¿Cuánto cuesta?** Con Gemini CLI y una cuenta de Gmail, nada. Los modelos locales de Ollama tampoco cuestan, pero necesitan un computador con unos 16 GB de memoria.

**¿Dónde descargo todo?** En el repositorio de HyperTarget, `FinPlan`.
