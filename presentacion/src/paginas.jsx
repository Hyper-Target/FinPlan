import { useState } from 'react';
import R from './data/resultados.json';
import {
  META, CONCEPTOS, ANALOGIA, FLUJO, ABRIR_TERMINAL, REQUISITOS, LLMS, CARPETA, PROMPT_MAESTRO, PROMPTS_EJEMPLO,
  USAR_SKILL, FUENTES, ESTRUCTURA, SKILL_MD, REGLAS, USO_EJEMPLOS, PRINCIPIOS_PROMPT, SECUENCIA_PROMPTS,
} from './data/contenido.js';
import { Codigo, Pestanas, Kpi, Simple, Bloque, ComoLeer, fCop, fPct } from './components/ui.jsx';
import { BarrasCDT, LeyendaCategorias, FanChart, Histograma, SensAporte } from './components/charts.jsx';
import Chat from './components/Chat.jsx';
import Teoria from './mc/Teoria.jsx';
import Simulador from './mc/Simulador.jsx';
import skillCdt from '../../skills/PlanFin/CDTLive/SKILL.md?raw';
import skillRisk from '../../skills/PlanFin/RiskLive/SKILL.md?raw';
import imgCdtResumen from './img/CDTLive_Resumen.png';
import imgCdtControles from './img/CDTLive_Controles.png';
import imgRiskResumen from './img/RiskLive_Resumen.png';

const OS = [{ id: 'windows', label: 'Windows' }, { id: 'mac', label: 'Mac' }];

// ================================================================ Entender
function Agente() {
  return (<>
    <Simple>Un chatbot conversa. Un agente trabaja: recibe un objetivo, usa herramientas (buscar en internet, calcular, crear archivos), revisa lo que hizo y entrega un resultado.</Simple>

    <Bloque titulo="La diferencia, con un ejemplo" sub="La misma pregunta: ¿cuál es la mejor tasa de CDT hoy?">
      <div className="grid g2">
        <div className="card">
          <span className="tag gris">Chatbot</span>
          <ul className="lista"><li>Responde con lo que recuerda de su entrenamiento.</li><li>Puede darle una tasa de hace meses sin avisarle.</li><li>No entrega archivos ni cálculos que se puedan revisar.</li></ul>
        </div>
        <div className="card destacada">
          <span className="tag vio">Agente con skill</span>
          <ul className="lista"><li>Consulta la Superfinanciera en ese momento.</li><li>Calcula con Python y cita la fuente y la fecha.</li><li>Entrega un Excel y un informe: <b>Pibank, 13,46 % EA</b>.</li></ul>
        </div>
      </div>
    </Bloque>

    <Bloque titulo="Seis palabras para entender el resto" sub="De la más básica a la más avanzada.">
      <div className="grid g3">
        {CONCEPTOS.map((c, i) => (
          <div key={c.t} className={`card ${i === 3 ? 'destacada' : ''}`}>
            <div className="num">{i + 1}</div><h3>{c.t}</h3><p>{c.d}</p>
            <p style={{ fontSize: 13.5 }}><span className="muted">Ejemplo:</span> {c.ej}</p>
          </div>
        ))}
      </div>
    </Bloque>

    <Bloque titulo="Cómo trabaja un agente" sub="Repite este ciclo hasta terminar la tarea.">
      <div className="grid g4">
        {[['Entender', 'Lee la petición y elige la skill que corresponde.'], ['Planear', 'Decide qué pasos seguir y qué herramientas usar.'], ['Actuar', 'Ejecuta comandos, consulta fuentes, crea archivos.'], ['Verificar', 'Revisa los resultados; si algo falla, corrige y repite.']].map(([t, d], i) => (
          <div key={t} className="card"><div className="num">{i + 1}</div><h3>{t}</h3><p>{d}</p></div>
        ))}
      </div>
    </Bloque>

    <Bloque titulo="Una analogía de oficina">
      <div className="grid g4">
        {ANALOGIA.map((a) => <div key={a.rol} className="card"><span className="tag vio">{a.rol}</span><h3 style={{ marginTop: 12 }}>{a.como}</h3><p>{a.hace}</p></div>)}
      </div>
    </Bloque>
  </>);
}

function Funciona() {
  return (<>
    <Simple>Una skill es un manual (el archivo SKILL.md) más una calculadora (programas en Python). El agente sigue el manual; los números los calcula Python. Por eso funciona bien incluso con modelos pequeños y gratuitos.</Simple>

    <Bloque titulo="Las tres piezas de una skill">
      <div className="grid g3">
        <div className="card"><div className="num">1</div><h3>El manual · SKILL.md</h3><p>Dice cuándo usar la skill y qué pasos seguir, con el comando exacto de cada paso.</p></div>
        <div className="card destacada"><div className="num">2</div><h3>La calculadora · scripts</h3><p>Programas en Python que descargan los datos oficiales y hacen toda la matemática. Tienen pruebas automáticas.</p></div>
        <div className="card"><div className="num">3</div><h3>El formato · plantilla y controles</h3><p>Definen cómo se ve el Excel y el informe, y revisan que ninguna cifra sea inventada.</p></div>
      </div>
    </Bloque>

    <Bloque titulo="Qué pasa cuando alguien pregunta" sub="Ejemplo: ¿dónde me conviene un CDT de $10 millones a 360 días?">
      <div className="card" style={{ marginTop: 16, padding: '6px 22px' }}>
        {FLUJO.map((f, i) => (
          <div key={f.n} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 130px', gap: 14, alignItems: 'center', padding: '14px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
            <div className="num" style={{ margin: 0 }}>{f.n}</div>
            <div><b>{f.t}</b><div style={{ color: 'var(--ink-2)', fontSize: 14.5 }}>{f.d}</div></div>
            <span className="tag vio" style={{ justifySelf: 'end' }}>{f.k}</span>
          </div>
        ))}
      </div>
    </Bloque>

    <Bloque titulo="El manual por dentro" sub="Así se ve el comienzo del SKILL.md de CDTLive.">
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <Codigo texto={SKILL_MD} etiqueta="CDTLive/SKILL.md" />
        <div className="card">
          <h3>Qué tiene cada parte</h3>
          <ul className="lista">
            <li><b>name</b> y <b>description</b>: el agente lee la descripción para decidir si esta skill sirve para la pregunta.</li>
            <li><b>Pasos numerados</b>: qué hacer, en orden, con el comando exacto.</li>
            <li><b>Validaciones</b>: qué revisar antes de entregar.</li>
            <li><b>Reglas duras</b>: lo que nunca debe hacer, por ejemplo inventar una tasa.</li>
          </ul>
        </div>
      </div>
    </Bloque>

    <Bloque titulo="De dónde salen los datos" sub="Tres fuentes oficiales y públicas, consultadas en vivo.">
      <div className="grid g3">
        {FUENTES.map((f) => <div key={f.nombre} className="card"><h3>{f.nombre}</h3><p className="muted" style={{ fontSize: 13 }}>{f.via}</p><p>{f.dato}</p><p style={{ color: 'var(--violet-3)', fontWeight: 600 }}>{f.ejemplo}</p></div>)}
      </div>
    </Bloque>

    <Bloque titulo="Cómo quedaron organizadas las carpetas">
      <div className="card" style={{ marginTop: 16 }}><pre className="arbol">{ESTRUCTURA}</pre></div>
    </Bloque>
  </>);
}

// ================================================================ Ver
function Demo() {
  return (<>
    <Simple>Esta es la conversación con la que se construyó CDTLive, resumida. Una sola petición y el agente hizo el resto. Presione Reproducir y siga el panel de la derecha, que explica cada paso. Haga clic en cualquier acción para ver el comando exacto.</Simple>
    <Chat />
  </>);
}

function Pregunta({ children }) {
  return <div className="card" style={{ marginBottom: 20 }}><span className="migas">La pregunta</span><h3 style={{ fontSize: 22, marginTop: 6 }}>{children}</h3></div>;
}

function CDTLive() {
  const top = R.cdt[0];
  return (<>
    <Pregunta>¿Dónde rinde más un CDT de $10 millones a 360 días, hoy?</Pregunta>
    <Simple>En Banco Pichincha (Pibank): paga 13,46 % EA y deja $1.273.334 de interés neto en un año. Dejar la misma plata en la cuenta de ahorro de Nu o de Lulo deja cerca de $838.000: un tercio menos.</Simple>
    <div className="grid g4">
      <Kpi l="Mejor entidad" v="Pibank" d="Banco Pichincha · banco digital" tono="vio" />
      <Kpi l="Tasa EA" v="13,46 %" d="1,38 puntos sobre el promedio" tono="ok" />
      <Kpi l="Interés neto" v={fCop(top.InteresNeto)} d="después de la retención del 4 %" />
      <Kpi l="Rentabilidad real" v={fPct(top.RentRealEA)} d="descontada la inflación (6,25 %)" />
    </div>

    <Bloque titulo="Las 12 entidades que más pagan" sub="Rentabilidad neta: lo que queda después de la retención en la fuente.">
      <div className="card" style={{ marginTop: 16 }}>
        <BarrasCDT W={900} alto={430} />
        <LeyendaCategorias />
        <ComoLeer>cada barra es una entidad; más larga, más rinde. La línea roja punteada es el promedio de todo el sistema: las barras que la pasan pagan más que el promedio. Los bancos digitales y las fintech (morados) dominan el primer lugar.</ComoLeer>
      </div>
    </Bloque>

    <Bloque titulo="¿Y si la dejo en una cuenta de ahorro?" sub="Mismo monto ($10 millones) y mismo plazo (360 días).">
      <div className="card" style={{ marginTop: 16 }}>
        <table className="t"><thead><tr><th>Dónde</th><th className="n">Tasa EA</th><th className="n">Interés neto en un año</th></tr></thead><tbody>
          <tr><td><b style={{ color: 'var(--violet)' }}>CDT en Pibank</b></td><td className="n">13,46 %</td><td className="n"><b>{fCop(top.InteresNeto)}</b></td></tr>
          {R.ahorro.filter((a) => ['Lulo Bank', 'Nu Colombia', 'RappiPay', 'Davivienda', 'Nequi', 'Bancolombia'].includes(a.Entidad)).map((a) => (
            <tr key={a.Entidad}><td>Ahorro en {a.Entidad}</td><td className="n">{fPct(a.TasaEA)}</td><td className="n">{fCop(a.InteresNeto)}</td></tr>))}
        </tbody></table>
      </div>
    </Bloque>

    <Bloque titulo="El Excel que entrega" sub="Nueve hojas: resumen, parámetros (cambie el monto y todo se recalcula), datos crudos con fuente y hora, cálculos y controles.">
      <div className="shot" style={{ marginTop: 16 }}><img src={imgCdtResumen} alt="Hoja Resumen del Excel de CDTLive" /></div>
    </Bloque>
  </>);
}

function RiskLive() {
  return (<>
    <Pregunta>Si tengo $5 millones y ahorro $1 millón al mes durante 5 años, ¿llego a $80 millones de hoy?</Pregunta>
    <Simple>Probablemente no: solo en 3 de cada 10 escenarios se llega a la meta. Subiendo el aporte a $1,13 millones al mes, se llega en 8 de cada 10. Es el Model Risk del curso aplicado a una persona, con datos de hoy.</Simple>
    <div className="grid g4">
      <Kpi l="Probabilidad de llegar" v="31,8 %" d="3 de cada 10 escenarios" tono="vio" />
      <Kpi l="Resultado típico" v="$76,9 M" d="mediana, en pesos de hoy" />
      <Kpi l="Caso malo razonable" v="$66,9 M" d="solo 5 % de escenarios peores" />
      <Kpi l="Aporte para 80 %" v="$1.127.533" d="al mes" tono="ok" />
    </div>

    <div className="nota" style={{ marginTop: 18 }}><b>Pruébelo usted.</b> La matemática del modelo está en <a href="#/montecarlo">Monte Carlo: la matemática</a> y puede cambiar todos los supuestos en el <a href="#/simulador">Simulador en vivo</a>.</div>

    <Bloque titulo="Cómo crece el ahorro mes a mes" sub="10.000 escenarios posibles de un portafolio 60 % CDT, 25 % COLCAP y 15 % dólares.">
      <div className="card" style={{ marginTop: 16 }}>
        <FanChart W={900} alto={380} />
        <ComoLeer>la línea oscura es el escenario típico (la mediana). La franja morada muestra dónde cae el 90 % de los escenarios: entre más ancha, más incertidumbre. La línea roja es la meta; el escenario típico termina un poco por debajo.</ComoLeer>
      </div>
    </Bloque>

    <Bloque titulo="Qué pasa si aporto más o menos" sub="Misma simulación, cambiando solo el aporte mensual.">
      <div className="card" style={{ marginTop: 16 }}>
        <SensAporte W={900} alto={300} />
        <ComoLeer>cada barra es la probabilidad de llegar a la meta con ese aporte. Pequeños cambios mueven mucho el resultado: con 10 % más de aporte ($1,1 millones) la probabilidad pasa de 31,8 % a 71,7 %.</ComoLeer>
      </div>
    </Bloque>

    <Bloque titulo="Todos los resultados posibles" sub="Cuántos de los 10.000 escenarios terminan en cada valor.">
      <div className="card" style={{ marginTop: 16 }}>
        <Histograma W={900} alto={260} />
        <ComoLeer>cada barra agrupa escenarios con un resultado parecido. Las barras moradas oscuras superan la meta de $80 millones; las claras no.</ComoLeer>
      </div>
    </Bloque>

    <Bloque titulo="Qué conserva del modelo del curso">
      <div className="card" style={{ marginTop: 16 }}>
        <table className="t"><thead><tr><th>En el Model Risk del profesor</th><th>En RiskLive</th></tr></thead><tbody>
          <tr><td>Tabla MBASE: Period, Inflow, Outflow, NetCF, Balance</td><td>Las mismas columnas, con fórmulas vivas</td></tr>
          <tr><td>PerRate, EAR, NOM</td><td>La tasa implícita del portafolio</td></tr>
          <tr><td>Validación ΣXfd = 0</td><td>Control automático en el Excel</td></tr>
          <tr><td>VPN y probabilidad de VPN negativo</td><td>Valor final y probabilidad de no llegar a la meta</td></tr>
          <tr><td>Series históricas de mercado (TRM, IBR, UVR)</td><td>Series del Banco de la República y el DANE actualizadas en vivo</td></tr>
        </tbody></table>
      </div>
    </Bloque>

    <Bloque titulo="El Excel que entrega">
      <div className="shot" style={{ marginTop: 16 }}><img src={imgRiskResumen} alt="Hoja Resumen del Excel de RiskLive" /></div>
    </Bloque>
  </>);
}

function Confianza() {
  return (<>
    <Simple>Un agente útil en finanzas no es el que más habla, sino el que se puede auditar. Cada cifra tiene fuente y fecha, los cálculos tienen pruebas y el Excel se revisa a sí mismo.</Simple>
    <div className="grid g4">
      <Kpi l="Pruebas automáticas" v="72" d="44 de CDTLive y 28 de RiskLive" tono="vio" />
      <Kpi l="Controles en los Excel" v="22" d="se revisan solos al abrir" />
      <Kpi l="Diferencia Excel vs Python" v="$0" d="los dos cálculos coinciden" tono="ok" />
      <Kpi l="Cifras inventadas" v="0" d="el sistema las rechaza" tono="ok" />
    </div>
    <Bloque titulo="Cuatro reglas del agente">
      <div className="grid g2">{REGLAS.map((r) => <div key={r.t} className="card"><h3>{r.t}</h3><p>{r.d}</p></div>)}</div>
    </Bloque>
    <Bloque titulo="La hoja de controles" sub="Diez revisiones automáticas. Si alguna falla, el estado del modelo cambia a REVISAR.">
      <div className="shot" style={{ marginTop: 16 }}><img src={imgCdtControles} alt="Hoja de controles" /></div>
    </Bloque>
  </>);
}

// ================================================================ Hacer
function Paso({ n, titulo, texto, children }) {
  return <div className="paso"><div className="n">{n}</div><div className="c"><h3>{titulo}</h3>{texto && <p>{texto}</p>}{children}</div></div>;
}

function Instalar() {
  const [os, setOs] = useState('windows');
  const [id, setId] = useState('gemini');
  const llm = LLMS.find((l) => l.id === id);
  const term = os === 'windows' ? 'PowerShell' : 'Terminal';
  return (<>
    <Simple>No necesita saber programar ni pagar. Va a abrir la terminal, pegar unos comandos e iniciar sesión con su cuenta de Google. Toma unos 15 minutos.</Simple>

    <Bloque titulo="Elija su agente" sub="Todos funcionan igual: se instalan en la terminal y se inicia sesión en el navegador. Para la clase recomiendo Gemini CLI.">
      <div className="card" style={{ marginTop: 16 }}>
        <table className="t"><thead><tr><th>Agente</th><th>Costo</th><th>Con qué cuenta</th></tr></thead><tbody>
          {LLMS.map((l) => (
            <tr key={l.id} onClick={() => setId(l.id)} style={{ cursor: 'pointer', background: l.id === id ? 'var(--violet-soft)' : undefined }}>
              <td><b>{l.nombre}</b> {l.recomendado && <span className="tag vio">Recomendado</span>}</td>
              <td><span className={`tag ${l.costoTipo}`}>{l.costo}</span></td>
              <td>{l.plan.split('.')[0]}</td>
            </tr>))}
        </tbody></table>
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Haga clic en una fila para ver sus comandos abajo.</p>
      </div>
    </Bloque>

    <Bloque titulo={`Instalación de ${llm.nombre}, paso a paso`}>
      <div style={{ marginTop: 14 }}><Pestanas opciones={OS} valor={os} onChange={setOs} /></div>
      <Paso n="1" titulo="Abra la terminal" texto="Es una ventana donde se escriben instrucciones al computador. Ahí vive el agente.">
        <ol className="lista">{ABRIR_TERMINAL[os].map((t, i) => <li key={i}>{t}</li>)}</ol>
      </Paso>
      <Paso n="2" titulo="Instale los programas necesarios" texto="Pegue cada línea y presione Enter. Espere a que termine antes de pegar la siguiente.">
        <div className="cmds">{REQUISITOS[os].map((r, i) => <div key={i}><div className="t">{r.t}</div><Codigo lineas={[r.c]} etiqueta={term} /></div>)}</div>
      </Paso>
      <Paso n="3" titulo={`Instale ${llm.nombre}`} texto={llm.fuerte}>
        <Codigo lineas={llm[os]} etiqueta={term} />
        <div className="cmds" style={{ marginTop: 12 }}><div className="t">Compruebe que quedó instalado (debe responder con un número de versión):</div><Codigo lineas={[llm.verificar]} etiqueta={term} /></div>
        <div className="nota" style={{ marginTop: 12 }}>{llm.alterna}</div>
      </Paso>
      <Paso n="4" titulo="Ábralo e inicie sesión" texto={llm.login}>
        <Codigo lineas={[llm.iniciar]} etiqueta={term} />
        <div className="nota"><b>Cuenta:</b> {llm.plan}.</div>
      </Paso>
    </Bloque>
  </>);
}

function Crear() {
  const [os, setOs] = useState('windows');
  const [p, setP] = useState(PROMPTS_EJEMPLO[0].id);
  const actual = PROMPTS_EJEMPLO.find((x) => x.id === p);
  return (<>
    <Simple>Con el agente instalado, crear una skill es pegar un prompt. El agente busca las fuentes, escribe los programas, los prueba y le entrega la skill lista. Empiece por DolarHoy: es la más corta.</Simple>
    <div><Pestanas opciones={OS} valor={os} onChange={setOs} /></div>
    <Paso n="1" titulo="Cree una carpeta y abra el agente dentro de ella" texto="El agente trabaja en la carpeta donde lo abre: ahí va a crear la skill.">
      <Codigo lineas={CARPETA[os]} etiqueta={os === 'windows' ? 'PowerShell' : 'Terminal'} />
      <div className="nota">Si usa otro agente, cambie la última línea por <code>codex</code> u <code>ollama launch claude</code>. La primera vez le pregunta si confía en la carpeta: responda que sí.</div>
    </Paso>
    <Paso n="2" titulo="Elija un prompt, cópielo y péguelo en el chat del agente" texto="Cada uno ya trae las fuentes oficiales verificadas y las reglas que hacen confiable la skill.">
      <Pestanas opciones={PROMPTS_EJEMPLO.map((x) => ({ id: x.id, label: x.titulo.split(':')[0] }))} valor={p} onChange={setP} />
      <p style={{ margin: '12px 0 10px', color: 'var(--ink-2)' }}><b style={{ color: 'var(--ink)' }}>{actual.titulo}</b> · {actual.nivel}</p>
      <Codigo texto={actual.texto} etiqueta={`Prompt · ${actual.titulo.split(':')[0]}`} alto={380} />
    </Paso>
    <Paso n="3" titulo="Acompañe al agente mientras trabaja" texto="Va a tardar entre 5 y 15 minutos.">
      <ul className="lista">
        <li>Le va a pedir permiso para crear archivos y ejecutar comandos: lea qué quiere hacer y apruebe.</li>
        <li>Si se detiene, escriba <i>continúa</i>.</li>
        <li>Si aparece un error, péguelo en el chat y pídale que lo corrija.</li>
        <li>Al final le dirá qué quedó verificado. Abra el Excel de la carpeta <code>ejemplos/</code>.</li>
      </ul>
    </Paso>
    <Paso n="4" titulo="¿Tiene otra idea? Use la plantilla" texto="Cambie lo que está entre corchetes por su idea y péguela igual que en el paso 2.">
      <Codigo texto={PROMPT_MAESTRO} etiqueta="Prompt maestro" alto={380} />
    </Paso>
  </>);
}

function Usar() {
  return (<>
    <Simple>Una skill se usa como a un colega: se le pide un resultado, no se le explica cómo hacerlo. En Claude Code se llama con /NombreSkill; en Gemini CLI y Codex basta con nombrarla ("usa la skill CDTLive para…").</Simple>
    <Bloque titulo="Ejemplos de pedidos" sub="Copie uno y cambie los números.">
      <div className="grid g3" style={{ alignItems: 'start' }}>
        {USO_EJEMPLOS.map((u) => (
          <div key={u.skill} className="card">
            <span className="tag vio">{u.skill}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>{u.pedidos.map((q) => <Codigo key={q} texto={q} etiqueta="Pedido" />)}</div>
          </div>
        ))}
      </div>
    </Bloque>
    <Bloque titulo="Mejorarla y convertirla en rutina">
      {USAR_SKILL.map((u, i) => (
        <Paso key={i} n={i + 1} titulo={u.t || 'Luego'}><Codigo lineas={[u.c]} etiqueta="En el agente o la terminal" /></Paso>
      ))}
    </Bloque>
  </>);
}

function Pedir() {
  const [k, setK] = useState('1');
  const actual = SECUENCIA_PROMPTS.find((x) => x.n === k);
  return (<>
    <Simple>La calidad de la skill depende de cómo se plantee el problema. Las prácticas que se aplicaron: dar ejemplos de referencia, pasar enlaces para verificar, definir el formato esperado, pedir primero un plan y ajustar sobre la marcha. Y no pedirlo todo de una vez, sino por etapas.</Simple>
    <Bloque titulo="Ocho reglas para pedirle bien a un agente" sub="Cada una con un ejemplo de cómo redactarla.">
      <div className="grid g2">
        {PRINCIPIOS_PROMPT.map((x, i) => (
          <div key={x.t} className="card"><div className="num">{i + 1}</div><h3>{x.t}</h3><p>{x.d}</p><div className="cita">"{x.cita}"</div></div>
        ))}
      </div>
    </Bloque>
    <Bloque titulo="Los seis prompts, en orden" sub="Use uno por mensaje y apruebe el resultado antes de pasar al siguiente. Cambie lo que está entre corchetes.">
      <div style={{ marginTop: 16 }}><Pestanas opciones={SECUENCIA_PROMPTS.map((x) => ({ id: x.n, label: `${x.n}. ${x.t}` }))} valor={k} onChange={setK} /></div>
      <div className="card destacada" style={{ marginTop: 14 }}><span className="tag vio">Etapa {actual.n} de 6</span><h3 style={{ marginTop: 10 }}>{actual.t}</h3><p>{actual.d}</p></div>
      <div style={{ marginTop: 12 }}><Codigo texto={actual.p} etiqueta={`Prompt · etapa ${actual.n}`} /></div>
    </Bloque>
  </>);
}

// ================================================================ Inicio

// ================================================================ Descargar y copiar
const REPO = 'https://github.com/Hyper-Target/FinPlan';

function Descargar() {
  const [os, setOs] = useState('windows');
  const [ag, setAg] = useState('gemini');
  const [sk, setSk] = useState('cdt');
  const carpeta = { gemini: '.agents/skills', codex: '.agents/skills', claude: '.claude/skills' }[ag];
  const win = (n) => `New-Item -ItemType Junction -Path ${carpeta.replace(/\//g, '\\')}\\${n} -Target skills\\PlanFin\\${n}`;
  const mac = (n) => `ln -s "$PWD/skills/PlanFin/${n}" ${carpeta}/${n}`;
  const enlaces = os === 'windows'
    ? [`New-Item -ItemType Directory -Force -Path ${carpeta.replace(/\//g, '\\')}`, win('CDTLive'), win('RiskLive')]
    : [`mkdir -p ${carpeta}`, mac('CDTLive'), mac('RiskLive')];
  const term = os === 'windows' ? 'PowerShell' : 'Terminal';
  return (<>
    <Simple>Todo lo que se hizo está en un repositorio público de GitHub: las dos skills, los prompts, esta presentación y los guiones. Puede descargarlo, copiar lo que necesite y usarlo con su propio agente.</Simple>

    <Bloque titulo="1. Descargar el repositorio" sub="Dos formas. La segunda no necesita instalar nada.">
      <div className="grid g2">
        <div className="card"><h3>Con Git</h3><p>Si ya tiene Git instalado:</p><div style={{ marginTop: 12 }}><Codigo lineas={[`git clone ${REPO}`, 'cd FinPlan']} etiqueta={term} /></div></div>
        <div className="card"><h3>Como archivo ZIP</h3><p>Descargue, descomprima y abra la carpeta resultante en la terminal.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <a className="btn primary" href={`${REPO}/archive/refs/heads/main.zip`}>Descargar ZIP</a>
            <a className="btn" href={REPO} target="_blank" rel="noreferrer">Ver en GitHub</a>
          </div></div>
      </div>
    </Bloque>

    <Bloque titulo="2. Qué hay en el repositorio">
      <div className="card" style={{ marginTop: 16 }}>
        <table className="t"><thead><tr><th>Carpeta</th><th>Contenido</th></tr></thead><tbody>
          {[['skills/PlanFin/CDTLive', 'Compara CDT de 28 bancos y fintech con datos de la Superfinanciera'], ['skills/PlanFin/RiskLive', 'Monte Carlo de CDT, COLCAP y dólares calibrado con datos históricos'], ['skills/PlanFin/_shared', 'Fuentes verificadas, convenciones y librería común'], ['skills/PlanFin/_prompts', 'Los prompts de construcción y la guía para pedir bien'], ['salidas', 'Una corrida real de cada skill (Excel e informe)'], ['presentacion', 'Esta web y las diapositivas, en React, con los guiones']].map(([a, b]) => (
            <tr key={a}><td><a href={`${REPO}/tree/main/${a}`} target="_blank" rel="noreferrer"><code>{a}</code></a></td><td>{b}</td></tr>))}
        </tbody></table>
      </div>
    </Bloque>

    <Bloque titulo="3. Instalar las skills en su agente" sub="Se enlazan a la carpeta donde su agente busca skills. No se copian, para que encuentren la librería común.">
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 14 }}>
        <Pestanas opciones={OS} valor={os} onChange={setOs} />
        <Pestanas opciones={[{ id: 'gemini', label: 'Gemini CLI' }, { id: 'codex', label: 'Codex' }, { id: 'claude', label: 'Claude Code' }]} valor={ag} onChange={setAg} />
      </div>
      <Paso n="1" titulo="Instale las librerías" texto="Se necesita Python 3.10 o superior.">
        <Codigo lineas={['pip install requests openpyxl pandas numpy scipy truststore']} etiqueta={term} />
      </Paso>
      <Paso n="2" titulo={`Enlace las skills en ${carpeta}`} texto="Ejecute estas líneas dentro de la carpeta FinPlan.">
        <Codigo lineas={enlaces} etiqueta={term} />
      </Paso>
      <Paso n="3" titulo="Abra el agente en esa carpeta y pruebe" texto="Escriba / para ver la lista de skills, o nombre la skill en lenguaje natural.">
        <Codigo lineas={[ag]} etiqueta={term} />
        <div style={{ marginTop: 10 }}><Codigo texto="/CDTLive 10 millones a 360 días con pago al vencimiento" etiqueta="Pedido" /></div>
        <p style={{ marginTop: 10 }}>También funcionan sin agente, desde la carpeta FinPlan: <code>python skills/PlanFin/CDTLive/scripts/cdtlive.py --monto 10000000 --plazo 360</code></p>
      </Paso>
    </Bloque>

    <Bloque titulo="4. Copiar el manual de cada skill" sub="El archivo SKILL.md es el que lee el agente. Está completo, con botón de copiar.">
      <div style={{ marginTop: 14 }}><Pestanas opciones={[{ id: 'cdt', label: 'CDTLive' }, { id: 'risk', label: 'RiskLive' }]} valor={sk} onChange={setSk} /></div>
      <div style={{ marginTop: 12 }}><Codigo texto={sk === 'cdt' ? skillCdt : skillRisk} etiqueta={`${sk === 'cdt' ? 'CDTLive' : 'RiskLive'}/SKILL.md`} alto={460} /></div>
    </Bloque>

    <Bloque titulo="5. Más para copiar">
      <div className="grid g3">
        <div className="card"><h3>Prompts para crear su skill</h3><p>Tres listos y una plantilla, con la guía para pedir bien.</p><div style={{ marginTop: 12 }}><a className="btn" href="#/crear">Ver los prompts</a></div></div>
        <div className="card"><h3>Guía de prompts</h3><p>Las reglas y las etapas, en un solo archivo Markdown.</p><div style={{ marginTop: 12 }}><a className="btn" href={`${REPO}/blob/main/skills/PlanFin/_prompts/03_GUIA_PROMPTS.md`} target="_blank" rel="noreferrer">Abrir en GitHub</a></div></div>
        <div className="card"><h3>Diapositivas en PDF</h3><p>Las 38 diapositivas de la exposición.</p><div style={{ marginTop: 12 }}><a className="btn" href={`${import.meta.env.BASE_URL}descargas/Diapositivas_Agentes_PlanFin.pdf`}>Descargar PDF</a></div></div>
      </div>
    </Bloque>
  </>);
}

function Inicio({ paginas }) {
  const grupos = ['Entender', 'Ver', 'Hacer'];
  const desc = { Entender: 'Qué es un agente y cómo funciona una skill.', Ver: 'La demo y los resultados de las dos skills.', Hacer: 'Instale un agente gratis y cree su propia skill.' };
  return (<>
    <div className="portada">
      <span className="migas">{META.curso}</span>
      <h1>De chatbot a <em>agente</em></h1>
      <p>{META.subtitulo}.</p>
      <div className="chips"><span className="chip">{META.autor}</span><span className="chip">Datos oficiales al 25-sep-2026</span><span className="chip">2 skills · 72 pruebas</span><span className="chip">Guía para Windows y Mac</span></div>
    </div>
    <div className="grid g3" style={{ marginTop: 22 }}>
      {grupos.map((g) => (
        <div key={g} className="card">
          <h3>{g}</h3><p>{desc[g]}</p>
          <div className="ruta">{paginas.filter((p) => p.grupo === g).map((p) => <a key={p.slug} href={`#/${p.slug}`}><b>{p.n}</b>{p.titulo}</a>)}</div>
        </div>
      ))}
    </div>
    <div className="card" style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div><h3>Diapositivas</h3><p>La presentación completa en 38 diapositivas. Use las flechas del teclado.</p></div>
      <a className="btn primary" href="#/slides">Abrir diapositivas →</a>
    </div>
  </>);
}

export const PAGINAS = [
  { slug: 'agente', n: 1, grupo: 'Entender', titulo: '¿Qué es un agente?', resumen: 'La diferencia entre un chatbot que conversa y un agente que trabaja.', C: Agente },
  { slug: 'funciona', n: 2, grupo: 'Entender', titulo: 'Cómo funciona una skill', resumen: 'Un manual para el agente más una calculadora en Python.', C: Funciona },
  { slug: 'demo', n: 3, grupo: 'Ver', titulo: 'Demo: así se construyó', resumen: 'La conversación con el agente que creó CDTLive, paso a paso.', C: Demo },
  { slug: 'cdtlive', n: 4, grupo: 'Ver', titulo: 'Skill 1: CDTLive', resumen: 'Compara los CDT de 28 bancos y fintech con datos oficiales del día.', C: CDTLive },
  { slug: 'risklive', n: 5, grupo: 'Ver', titulo: 'Skill 2: RiskLive', resumen: 'Simula 10.000 escenarios para saber si se llega a una meta de ahorro.', C: RiskLive },
  { slug: 'montecarlo', n: 6, grupo: 'Ver', titulo: 'Monte Carlo: la matemática', resumen: 'Qué se calcula y por qué se puede confiar en el resultado, con demostraciones que se mueven.', C: Teoria },
  { slug: 'simulador', n: 7, grupo: 'Ver', titulo: 'Simulador en vivo', resumen: 'Cambie ahorro, aporte, meta y portafolio y vea la simulación recalcularse en el navegador.', C: Simulador },
  { slug: 'confianza', n: 8, grupo: 'Ver', titulo: 'Por qué confiar', resumen: 'Pruebas, controles y trazabilidad de cada cifra.', C: Confianza },
  { slug: 'instalar', n: 9, grupo: 'Hacer', titulo: 'Instalar un agente gratis', resumen: 'Desde abrir la terminal hasta iniciar sesión, en Windows o Mac.', C: Instalar },
  { slug: 'crear', n: 10, grupo: 'Hacer', titulo: 'Crear su skill', resumen: 'Pegue un prompt y el agente construye la skill.', C: Crear },
  { slug: 'usar', n: 11, grupo: 'Hacer', titulo: 'Usar su skill', resumen: 'Qué pedirle, cómo mejorarla y cómo programarla cada día.', C: Usar },
  { slug: 'pedir', n: 12, grupo: 'Hacer', titulo: 'Cómo pedirle bien', resumen: 'Las reglas y la secuencia de prompts que hacen una buena skill.', C: Pedir },
  { slug: 'descargar', n: 13, grupo: 'Hacer', titulo: 'Descargar y copiar todo', resumen: 'El repositorio, los comandos para instalar las skills y sus manuales.', C: Descargar },
];
export { Inicio };
