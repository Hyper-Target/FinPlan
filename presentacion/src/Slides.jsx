import { useEffect, useState } from 'react';
import R from './data/resultados.json';
import { META, LLMS, PRINCIPIOS_PROMPT, SECUENCIA_PROMPTS, DEMO, FUENTES } from './data/contenido.js';
import { fCop, fPct } from './components/ui.jsx';
import { BarrasCDT, LeyendaCategorias, FanChart, SensAporte, Histograma } from './components/charts.jsx';
import imgCdtResumen from './img/CDTLive_Resumen.png';
import imgCdtControles from './img/CDTLive_Controles.png';
import imgRiskResumen from './img/RiskLive_Resumen.png';

const AUTORES = META.autores.join(' y ');

// Plantillas
const Sl = ({ n, ey, titulo, children, clase = '', presenta }) => (
  <div className={`sl ${clase}`}>
    {presenta && <div className="presenta">Presenta: {presenta}</div>}
    {ey && <div className="ey">{ey}</div>}
    {titulo && <h2>{titulo}</h2>}
    <div className="cuerpo">{children}</div>
    <div className="pie"><span>{META.titulo} · {AUTORES}</span><span>{n}</span></div>
  </div>
);
const Seccion = ({ n, num, titulo, lead, presenta }) => (
  <div className="sl seccion">
    {presenta && <div className="presenta">Presenta: {presenta}</div>}
    <div className="ey">Parte {num}</div>
    <h2>{titulo}</h2>
    <p className="lead">{lead}</p>
    <div className="pie"><span>{META.titulo} · {AUTORES}</span><span>{n}</span></div>
  </div>
);
const K = ({ l, v, d, tono }) => <div className="card kpi"><div className="l">{l}</div><div className={`v ${tono || ''}`}>{v}</div>{d && <div className="d">{d}</div>}</div>;
const Cmd = ({ c }) => <div className="cmd"><span>›</span> {c}</div>;
const Card = ({ n, t, children, dest }) => <div className={`card ${dest ? 'destacada' : ''}`}>{n && <div className="num">{n}</div>}<h3>{t}</h3>{children}</div>;
const ICONO = { terminal: '>_', archivo: '✎', navegador: '◎' };

function lista() {
  const acciones = DEMO.turnos.flatMap((t) => t.acciones);
  const grupos = ['Banco tradicional', 'Banco digital', 'Fintech'].map((g) => {
    const x = R.cdt.filter((d) => d.Categoria === g);
    return { g, n: x.length, prom: x.reduce((a, d) => a + d.TasaEA, 0) / x.length, mejor: x[0] };
  });
  return [
    // ================================================================ Portada y agenda
    () => (
      <div className="sl portadaS">
        <div className="ey">{META.curso}</div>
        <h1>De chatbot<br />a <em>agente</em></h1>
        <p className="lead" style={{ marginTop: 26 }}>Skills de IA para finanzas personales con datos oficiales de Colombia, sin pagar</p>
        <p style={{ marginTop: 34, fontSize: 20, color: 'var(--ink-2)', fontWeight: 600 }}>{AUTORES}</p>
        <p style={{ marginTop: 6, fontSize: 16, color: 'var(--ink-3)' }}>{META.fecha}</p>
      </div>
    ),
    (n) => (
      <Sl n={n} ey="Agenda · 1 hora" titulo="Seis partes">
        <table className="t tabla"><thead><tr><th>Parte</th><th>Tema</th><th>Presenta</th><th className="n">Minutos</th></tr></thead><tbody>
          {[['1', 'Qué es un agente y qué es una skill', 'Luis D. Peñaranda', '7'], ['2', 'El manifiesto: reglas, límites y caso de estudio', 'Leydis Niebles', '12'], ['3', 'Skill 1 · CDTLive: de la petición al Excel', 'Luis (cálculo, Excel y controles: Leydis)', '11'], ['4', 'Skill 2 · RiskLive: Monte Carlo con datos en vivo', 'Luis (libro de caja: Leydis)', '11'], ['5', 'Hágalo usted: instalar, iniciar sesión y crear su skill', 'Luis D. Peñaranda', '14'], ['6', 'Cierre y preguntas', 'Leydis y Luis', '5']].map(([a, b, c, d]) => (
            <tr key={a}><td><b>{a}</b></td><td><b>{b}</b></td><td>{c}</td><td className="n">{d}</td></tr>))}
        </tbody></table>
      </Sl>
    ),

    // ================================================================ Parte 1 · Entender
    (n) => <Seccion n={n} num="1" titulo="Qué es un agente" lead="De la herramienta que conversa a la que trabaja." />,
    (n) => (
      <Sl n={n} ey="Parte 1 · Entender" titulo="Un chatbot conversa. Un agente trabaja.">
        <div className="grid g2">
          <div className="card"><span className="etq" style={{ background: 'var(--bg-3)', color: 'var(--ink-2)' }}>Chatbot</span><p style={{ fontSize: 21 }}>"¿La mejor tasa de CDT hoy?"<br />Responde de memoria. Puede darle una tasa de hace meses sin avisar.</p></div>
          <div className="card destacada"><span className="etq">Agente</span><p style={{ fontSize: 21 }}>La misma pregunta.<br />Consulta la Superfinanciera, calcula y entrega un Excel: <b>Pibank, 13,46 %</b>.</p></div>
        </div>
        <div className="ciclo4" style={{ marginTop: 44 }}>
          {[['1. Entender', 'Lee la petición'], ['2. Planear', 'Decide qué hacer'], ['3. Actuar', 'Busca, calcula, crea archivos'], ['4. Verificar', 'Revisa y corrige']].map(([t, d]) => <div key={t}><b>{t}</b><span>{d}</span></div>)}
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Parte 1 · Entender" titulo="Seis palabras que vamos a usar">
        <table className="t tabla"><tbody>
          {[['LLM', 'El modelo que redacta y razona (ChatGPT, Gemini, Claude, Grok).'], ['Chatbot', 'Un LLM con ventana de chat. Responde con lo que ya sabe.'], ['Herramienta', 'Algo que el modelo puede usar: buscar en la web, leer un archivo, correr Python.'], ['Agente', 'Un LLM que decide qué herramientas usar hasta cumplir un objetivo.'], ['Skill', 'El manual de un procedimiento: SKILL.md + scripts + plantillas.'], ['Rutina', 'Una skill que corre sola a una hora fija.']].map(([a, b]) => <tr key={a}><td style={{ width: 200 }}><b style={{ color: 'var(--violet-3)' }}>{a}</b></td><td>{b}</td></tr>)}
        </tbody></table>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Parte 1 · Entender" titulo="Una skill = un manual + una calculadora">
        <div className="grid g3">
          <Card n="1" t="El manual · SKILL.md"><p>Cuándo usar la skill y qué pasos seguir, con el comando exacto de cada uno.</p></Card>
          <Card n="2" t="La calculadora · Python" dest><p>Descarga los datos oficiales y hace toda la matemática, con pruebas automáticas.</p></Card>
          <Card n="3" t="El formato · plantilla y controles"><p>Cómo se ve el Excel y el informe, y qué revisar antes de entregar.</p></Card>
        </div>
        <div className="flecha" style={{ marginTop: 30 }}>
          {[['Pregunta', '"CDT de 10 millones a 360 días"'], ['Elige la skill', 'Por su descripción'], ['Trae datos', 'Superfinanciera, BanRep, DANE'], ['Calcula y valida', 'Python y controles'], ['Entrega', 'Excel + informe']].map(([t, d], i) => (
            <div key={t}><b>Paso {i + 1}</b><h3>{t}</h3><p>{d}</p></div>))}
        </div>
      </Sl>
    ),

    // ================================================================ Parte 2 · Manifiesto (Leydis Niebles) · fuente: Manifiesto_Agente_Finanzas_Personales_2026.xlsx
    (n) => <Seccion n={n} num="2" titulo="El manifiesto del agente" lead="La fuente única de verdad del agente: qué puede hacer, con qué parámetros y dentro de qué límites. Corte normativo: 30 de septiembre de 2026." presenta="Leydis Niebles" />,
    (n) => (
      <Sl n={n} ey="Manifiesto · 1 de 5 · Gobierno" titulo="Si un dato no está en el manifiesto, el agente no lo inventa" clase="denso" presenta="Leydis Niebles">
        <div className="dos">
          <div className="card destacada"><h3>Jerarquía de reglas</h3><p>Ante un conflicto, prevalece el nivel superior.</p>
            <ol className="lista" style={{ fontSize: 17 }}><li><b>Límites regulatorios</b> (no negociables)</li><li><b>Reglas tributarias</b> vigentes</li><li><b>Reglas de prudencia</b> (criterio técnico)</li><li><b>Preferencias del usuario</b></li></ol></div>
          <div className="card"><h3>Cinco principios</h3><table className="t tabla2" style={{ marginTop: 6 }}><tbody>
            {[['Educa, no asesora', 'Explica, calcula y alerta; no recomienda productos ni emisores.'], ['Trazabilidad', 'Toda cifra normativa cita la norma y el año gravable.'], ['Vigencia', 'Cada parámetro tiene fecha; si vence, lo advierte.'], ['Mínimo dato', 'Nunca pide claves, OTP ni números completos de tarjetas.'], ['Escalamiento', 'Casos complejos, crisis de deuda o fraude van a un profesional.']].map(([a, b]) => <tr key={a}><td style={{ width: 170 }}><b>{a}</b></td><td>{b}</td></tr>)}
          </tbody></table></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Manifiesto · 2 de 5 · Límites regulatorios" titulo="Educación financiera sí; asesoría de inversión no" clase="denso" presenta="Leydis Niebles">
        <div className="grid g3" style={{ marginTop: 0 }}>
          <Card t="Sí puede (R-02)"><ul className="lista"><li>Explicar conceptos.</li><li>Calcular escenarios con los datos del usuario.</li><li>Comparar tipologías: CDT vs FIC vs AFC vs FPV.</li><li>Aplicar reglas de prudencia y alertar.</li></ul><p style={{ fontSize: 13 }}>Ley 1328 de 2009 · Decreto 661 de 2018</p></Card>
          <Card t="No puede (R-03)" dest><ul className="lista"><li>Recomendar el CDT o fondo de una entidad específica.</li><li>Armar un portafolio personalizado.</li><li>Prometer rentabilidades como ciertas.</li><li>Mover dinero ni pedir claves u OTP.</li></ul></Card>
          <Card t="Alertas rojas"><ul className="lista"><li><b>Usura (R-06)</b>: consumo sobre 29,24 % EA en septiembre de 2026 es ilegal.</li><li><b>Fraude (R-07)</b>: rentabilidad fija alta, pirámides, gota a gota.</li><li><b>Datos (R-08 a R-14)</b>: Ley 1581 de 2012 y Circular SIC 002 de 2024 sobre IA.</li></ul></Card>
        </div>
        <div className="card" style={{ marginTop: 14, padding: '12px 18px' }}><p style={{ marginTop: 0, fontSize: 15 }}><b>Pregunta frontera (R-04): "¿en qué invierto mis $X?"</b> Permitido: criterios de decisión (plazo, liquidez, riesgo, costo, impuestos, Fogafín) y preguntas para llevarle a un asesor inscrito en el RNPMV. Prohibido: "compre el CDT del banco X a 12 meses".</p></div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Manifiesto · 3 de 5 · Parámetros y reglas tributarias 2026" titulo="Los números que el agente usa, con su norma" clase="denso" presenta="Leydis Niebles">
        <div className="dos">
          <table className="t tabla2"><thead><tr><th>Parámetro</th><th className="n">Valor</th><th>Norma</th></tr></thead><tbody>
            {[['UVT 2026', '$52.374', 'Res. DIAN 000238 de 2025'], ['Salario mínimo 2026', '$1.750.905', 'Decreto 1469 de 2025'], ['Interés bancario corriente (sep)', '19,49 % EA', 'Res. SFC 1260 de 2026'], ['Tasa de usura (sep)', '29,24 % EA', 'Se certifica cada mes'], ['Retención rendimientos CDT', '4 %', 'Art. 395 ET · Dec. 572 de 2025'], ['Retención cuentas de ahorro', '7 %', 'Con base mínima diaria'], ['GMF (4×1000)', '0,4 %', 'Arts. 871 y 872 ET']].map(([a, b, c]) => <tr key={a}><td><b>{a}</b></td><td className="n">{b}</td><td>{c}</td></tr>)}
          </tbody></table>
          <table className="t tabla2"><thead><tr><th>Regla tributaria (AG 2026)</th><th className="n">En pesos</th></tr></thead><tbody>
            {[['Tope para declarar: ingresos, consumos o consignaciones (1.400 UVT)', '$73,3 M'], ['Tope para declarar: patrimonio (4.500 UVT)', '$235,7 M'], ['AFC + pensión voluntaria: hasta 30 % del ingreso, máx. 3.800 UVT', '$199 M'], ['Límite global de exentas y deducciones: 40 %, máx. 1.340 UVT', '$70,2 M'], ['Renta exenta laboral 25 %, máx. 790 UVT', '$41,4 M'], ['Intereses de vivienda deducibles, máx. 1.200 UVT', '$62,8 M'], ['Renta gravable sin impuesto (hasta 1.090 UVT)', '$57,1 M']].map(([a, b]) => <tr key={a}><td>{a}</td><td className="n"><b>{b}</b></td></tr>)}
          </tbody></table>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Manifiesto · 4 de 5 · Prudencia" titulo="Semáforos y el orden correcto: ¿deudas o ahorro?" clase="denso" presenta="Leydis Niebles">
        <div className="dos">
          <table className="t tabla2"><thead><tr><th>Indicador</th><th>Verde</th><th>Rojo</th></tr></thead><tbody>
            {[['P-01 Cuotas totales / ingreso neto', '≤ 30 %', '> 40 %'], ['P-02 Cuotas de consumo / ingreso', '≤ 20 %', '> 25 %'], ['P-03 Primera cuota de vivienda / ingresos', '≤ 30 %', '> 30 %'], ['P-05 Fondo de emergencia', '3 a 6 meses', '< 1 mes'], ['P-07 Tasa de ahorro', '≥ 10 %', '< 5 %'], ['P-08 Uso de la tarjeta', '≤ 30 %', '> 50 %'], ['P-09 Deuda cara', '', 'Tasa > CDT neto + 5 p.p.']].map(([a, b, c]) => <tr key={a}><td><b>{a}</b></td><td style={{ color: 'var(--green)' }}>{b}</td><td style={{ color: 'var(--red)' }}>{c}</td></tr>)}
          </tbody></table>
          <div className="card destacada"><h3>Cascada de prioridades (P-10)</h3><ol className="lista" style={{ fontSize: 16.5 }}>
            <li>Estar al día con todos los mínimos.</li><li>Colchón inicial de 1 mes de gasto esencial.</li><li>Pagar deudas caras, de mayor a menor tasa.</li><li>Completar el fondo de emergencia.</li><li>Metas de mediano plazo (vivienda).</li><li>Inversión de largo plazo y pensión voluntaria.</li></ol></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Manifiesto · 5 de 5 · Caso de estudio" titulo="Familia Rodríguez Cárdenas: la casa todavía no es la prioridad" clase="denso" presenta="Leydis Niebles">
        <div className="dos a">
          <div>
            <p style={{ fontSize: 15.5, color: 'var(--ink-2)' }}>Andrés (35, asalariado) y Laura (33, independiente), una hija, Barranquilla. Ingreso neto del hogar: <b>$7,78 M</b> al mes. Quieren comprar vivienda en 36 meses.</p>
            <table className="t tabla2" style={{ marginTop: 10 }}><tbody>
              {[['Endeudamiento total', '26 %', 'ok'], ['Endeudamiento de consumo', '26 %', 'rojo'], ['Tasa de ahorro', '1,2 %', 'rojo'], ['Uso de la tarjeta (paga el mínimo)', '68 %', 'rojo'], ['Fondo de emergencia', '0,8 meses', 'rojo']].map(([a, b, c]) => <tr key={a}><td>{a}</td><td className="n"><b>{b}</b></td><td><span className={`tag ${c === 'ok' ? 'ok' : 'aviso'}`} style={c === 'rojo' ? { background: '#fde8e8', color: 'var(--red)' } : undefined}>{c === 'ok' ? 'Verde' : 'Rojo'}</span></td></tr>)}
            </tbody></table>
          </div>
          <div className="card"><h3>Lo que el agente le diría</h3><ul className="lista">
            <li>Primero un mes de colchón; al vencer el CDT, pagar la tarjeta (28 % EA) y abonar a la libre inversión.</li>
            <li>Vivienda no VIS: no es viable en 36 meses (97 meses); VIS: 61 meses.</li>
            <li>La AFC sirve para ahorrar la cuota inicial, pero el <b>ahorro tributario es $0</b>: Andrés no tiene impuesto a cargo.</li>
            <li>Para elegir crédito o declarar renta, remite a un asesor o contador.</li></ul></div>
        </div>
      </Sl>
    ),

    // ================================================================ Parte 3 · CDTLive (7)
    (n) => <Seccion n={n} num="3" titulo="Skill 1 · CDTLive" lead="¿Dónde rinde más un CDT hoy? De la petición al Excel, en siete diapositivas." />,
    (n) => (
      <Sl n={n} ey="CDTLive · 1 de 7 · Cómo se plantea" titulo="La skill se plantea en cuatro etapas, no de una vez" clase="denso">
        <div className="dos a">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['1. Problema y referente', 'Una pregunta concreta (¿dónde rinde más un CDT hoy?) y un referente que se quiere replicar: el simulador de CDT de Davivienda.'], ['2. Planeación', 'Primero se identifican las fuentes oficiales posibles para los bancos y las fintech de Colombia. Todavía no se escribe código.'], ['3. Verificación de fuentes', 'Se buscan los enlaces exactos y se prueban con consultas reales para confirmar columnas, fechas y cobertura.'], ['4. Especificación', 'Se define el entregable (un Excel con fórmulas y un informe en Markdown) y el estándar: que una skill se pueda ejecutar sin errores con un modelo pequeño.']].map(([a, b]) => (
              <div key={a} className="card" style={{ padding: '12px 16px' }}><b style={{ color: 'var(--violet-3)', fontSize: 15 }}>{a}</b><p style={{ marginTop: 4 }}>{b}</p></div>))}
          </div>
          <div className="card destacada"><h3>Qué hace sólido el planteamiento</h3><ul className="lista">
            <li>Un <b>referente concreto</b> que se quiere replicar.</li>
            <li><b>Planeación antes que código</b>: primero fuentes, después construcción.</li>
            <li><b>Enlaces verificados</b> con consultas reales.</li>
            <li><b>Entregable definido</b>: Excel con fórmulas e informe en Markdown.</li>
            <li><b>Estándar de calidad</b> explícito y comprobable.</li>
          </ul></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="CDTLive · 2 de 7 · Cómo se construyó" titulo="El agente probó cada fuente antes de programar" clase="denso">
        <div className="acciones chatS" style={{ marginTop: 0, gap: 6 }}>
          {acciones.map((a) => (
            <div key={a.titulo} className="accion"><div className="fila" style={{ cursor: 'default', padding: '5px 12px' }}>
              <span className="ic">{ICONO[a.tipo]}</span><div><div className="tit" style={{ fontSize: 16 }}>{a.titulo}</div><div className="que" style={{ fontSize: 13 }}>{a.res}</div></div>
              <span className={`estado ${a.estado}`}>{a.estado === 'aviso' ? 'Descartado' : 'Listo'}</span>
            </div></div>))}
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="CDTLive · 3 de 7 · El cálculo" titulo="Replica el simulador de Davivienda para 28 entidades" clase="denso" presenta="Leydis Niebles">
        <div className="dos">
          <div>
            <div className="formula"><small>1. Tasa del periodo</small>i = (1 + EA)^(días / 365) − 1</div>
            <div className="formula"><small>2. Interés bruto</small>monto × i × número de periodos</div>
            <div className="formula"><small>3. Interés neto</small>bruto × (1 − 4 % de retención)</div>
            <div className="formula"><small>4. Rentabilidad neta EA</small>TIR anualizada del flujo neto</div>
            <div className="formula"><small>5. Rentabilidad real</small>(1 + neta) / (1 + inflación DANE) − 1</div>
          </div>
          <div className="card"><h3>De dónde sale cada dato</h3><table className="t tabla2" style={{ marginTop: 8 }}><tbody>
            <tr><td><b>Tasa de cada entidad</b></td><td>Superfinanciera · datos.gov.co axk9-g2nh · diaria</td></tr>
            <tr><td><b>Promedio del sistema</b></td><td>BanRep · series 238, 239, 240</td></tr>
            <tr><td><b>Inflación 12 meses</b></td><td>DANE · índice del IPC</td></tr>
            <tr><td><b>Entidades</b></td><td>28 bancos y fintech, por código oficial</td></tr>
            <tr><td><b>Cobertura</b></td><td>Fogafín · $50 millones</td></tr>
          </tbody></table></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="CDTLive · 4 de 7 · El resultado" titulo="$10 millones a 360 días: dónde rinde más hoy" clase="denso">
        <div className="grid g4" style={{ marginTop: 0 }}>
          <K l="Mejor entidad" v="Pibank" d="Banco Pichincha · digital" tono="vio" />
          <K l="Tasa EA bruta" v="13,46 %" d="+1,38 p.p. vs sistema" tono="ok" />
          <K l="Interés neto" v={fCop(R.cdt[0].InteresNeto)} d="tras retención del 4 %" />
          <K l="Rentabilidad real" v={fPct(R.cdt[0].RentRealEA)} d="con IPC de 6,25 %" />
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <table className="t tabla2"><thead><tr><th>#</th><th>Entidad</th><th>Tipo</th><th className="n">Tasa EA</th><th className="n">Interés neto</th><th className="n">Real</th></tr></thead><tbody>
            {R.cdt.slice(0, 6).map((d, i) => <tr key={d.Entidad}><td>{i + 1}</td><td><b>{d.Entidad}{d.MarcaComercial && !d.Entidad.includes(d.MarcaComercial) ? ` (${d.MarcaComercial})` : ''}</b></td><td>{d.Categoria}</td><td className="n">{fPct(d.TasaEA)}</td><td className="n">{fCop(d.InteresNeto)}</td><td className="n">{fPct(d.RentRealEA)}</td></tr>)}
          </tbody></table>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="CDTLive · 5 de 7 · Lo que muestran los datos" titulo="Los digitales y las fintech pagan más que los tradicionales" clase="denso">
        <div className="dos a">
          <div className="card" style={{ padding: '14px 18px' }}><BarrasCDT n={10} W={720} alto={340} /><LeyendaCategorias /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grupos.map((g) => <div key={g.g} className="card"><div className="kpi"><div className="l">{g.g} · {g.n} entidades</div><div className="v">{fPct(g.prom)}</div><div className="d">promedio · mejor: {g.mejor.Entidad}</div></div></div>)}
            <div className="card destacada"><p style={{ marginTop: 0 }}>En cuenta de ahorro, Nu y Lulo pagan cerca de 8,8 %; Bancolombia y Nequi, 0,1 %.</p></div>
          </div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="CDTLive · 6 de 7 · El Excel" titulo="Un Excel de 9 hojas que se recalcula solo" clase="denso" presenta="Leydis Niebles">
        <div className="dos a">
          <div className="shot" style={{ maxHeight: 470 }}><img src={imgCdtResumen} alt="" /></div>
          <table className="t tabla2"><thead><tr><th>Hoja</th><th>Qué tiene</th></tr></thead><tbody>
            {[['Resumen', 'Indicadores, ranking, promedios y gráfica'], ['Controles', '10 chequeos y estado global'], ['Parametros', 'Monto, plazo y retención: cámbielos y todo se recalcula'], ['Tasas', 'Datos crudos con fuente y hora'], ['Simulacion', 'El cálculo de cada entidad en fórmulas'], ['Flujo_Mejor', 'Flujo de caja y ΣXfd = 0'], ['Ahorro', 'Cuentas de ahorro vs mejor CDT'], ['Referencias', 'Series del BanRep y el DANE'], ['Fuentes', 'URL, fecha y validaciones']].map(([a, b]) => <tr key={a}><td><b>{a}</b></td><td>{b}</td></tr>)}
          </tbody></table>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="CDTLive · 7 de 7 · Informe y controles" titulo="Un informe que no puede inventar cifras" clase="denso" presenta="Leydis Niebles">
        <div className="dos">
          <div className="card"><h3>El informe Markdown (9 secciones)</h3><ol className="lista">
            <li>Resultado en una línea</li><li>Las 10 mejores opciones</li><li>Tradicionales vs digitales vs fintech</li><li>Contra la inflación y el sistema</li><li>CDT frente a cuenta de ahorro</li><li>Alertas: rezagos, Fogafín, sin dato</li><li>Cómo leer los datos</li><li>Advertencia</li><li>Fuentes con fecha y hora</li></ol>
            <p style={{ fontSize: 14 }}>El agente solo escribe 4 párrafos cortos. Si usa una cifra que no está en las tablas, el script la <b>rechaza</b>.</p></div>
          <div className="shot"><img src={imgCdtControles} alt="" /></div>
        </div>
      </Sl>
    ),

    // ================================================================ Parte 4 · RiskLive (7)
    (n) => <Seccion n={n} num="4" titulo="Skill 2 · RiskLive" lead="El Model Risk del curso aplicado a una persona: ¿con qué probabilidad llego a mi meta?" />,
    (n) => (
      <Sl n={n} ey="RiskLive · 1 de 7 · Cómo se plantea" titulo="Se parte del Model Risk del curso" clase="denso">
        <div className="dos a">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Objetivo', 'Llevar el Model Risk del curso a finanzas personales, con datos oficiales en vivo, y entregar un Excel y un informe.'], ['Paso 0', 'Documentar el modelo del curso antes de programar: hojas, tablas, nombres de variables y fórmulas.'], ['Entradas', 'Aporte mensual, meta en pesos de hoy, ahorro inicial, años y distribución entre CDT, COLCAP y dólares.'], ['Estándar', 'Estadística y simulación en Python con semilla fija; Excel con fórmulas vivas; informe que interpreta.']].map(([a, b]) => (
              <div key={a} className="card" style={{ padding: '12px 16px' }}><b style={{ color: 'var(--violet-3)', fontSize: 15 }}>{a}</b><p style={{ marginTop: 4 }}>{b}</p></div>))}
          </div>
          <div className="card destacada"><h3>Qué conserva y qué agrega</h3><p><b>Conserva</b> la estructura del modelo del curso: la tabla MBASE (Period, Inflow, Outflow, NetCF, Balance) y las variables PerRate, EAR y NOM.</p><p><b>Agrega</b> la calibración con datos de hoy, la simulación Monte Carlo, la sensibilidad y los controles de integridad.</p></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="RiskLive · 2 de 7 · Del curso a la persona" titulo="El mismo modelo, con otras preguntas" clase="denso" presenta="Leydis Niebles">
        <table className="t tabla2"><thead><tr><th>En el Model Risk del profesor</th><th>En RiskLive</th></tr></thead><tbody>
          {[['Asset, Principal (inversión inicial)', 'Ahorro inicial'], ['Installment, nInstallments', 'Aporte mensual y número de meses'], ['Tabla MBASE: Period, Inflow, Outflow, NetCF, Balance', 'Las mismas columnas, con fórmulas vivas, por activo'], ['PerRate, EAR, NOM (entradas)', 'Salidas: la TIR implícita del portafolio'], ['Validación ΣXfd = 0 y LastBalance = 0', 'Controles automáticos'], ['VPN del proyecto', 'Valor final en pesos de hoy'], ['P(VPN < 0)', 'P(no llegar a la meta)'], ['Series históricas de mercado (TRM, IBR, UVR)', 'COLCAP, TRM, CDT e IPC actualizados en vivo']].map(([a, b]) => <tr key={a}><td>{a}</td><td><b>{b}</b></td></tr>)}
        </tbody></table>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="RiskLive · 3 de 7 · Calibración" titulo="Diez años de datos oficiales, medidos hoy" clase="denso">
        <div className="grid g3" style={{ marginTop: 0 }}>
          <Card t="COLCAP (renta variable)"><p>Retorno medio 0,54 % mensual, volatilidad 5,84 %.</p><p>Jarque-Bera 373: <b>no es normal</b> (asimetría −1,56). Por eso hay opción de colas pesadas.</p></Card>
          <Card t="TRM (dólares)"><p>Retorno medio 0,13 % mensual, volatilidad 3,59 %.</p><p>Correlación con el COLCAP: <b>−0,51</b> (el dólar sube cuando la bolsa cae).</p></Card>
          <Card t="CDT (renta fija)"><p>Parte de la mejor tasa de hoy: <b>13,46 %</b> (Pibank).</p><p>Revierte a la media: largo plazo 10,28 %, velocidad 0,016 al mes.</p></Card>
        </div>
        <div className="grid g2" style={{ marginTop: 14 }}>
          <Card t="Inflación"><p>Parte del IPC de 6,25 % y converge a la meta del BanRep (3 %).</p></Card>
          <Card t="Simulación"><p>10.000 trayectorias mensuales, shocks correlacionados (Cholesky), semilla 42: mismo dato, mismo resultado.</p></Card>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="RiskLive · 4 de 7 · El resultado" titulo="$5 M iniciales + $1 M al mes por 5 años: ¿llego a $80 M?" clase="denso">
        <div className="dos a" style={{ alignItems: 'center' }}>
          <div><div className="big">31,8 %</div><p className="lead" style={{ marginTop: 14 }}>de probabilidad: 3 de cada 10 escenarios llegan a la meta, en pesos de hoy.</p></div>
          <table className="t tabla2"><tbody>
            {[['Percentil 5 (caso malo razonable)', '$66,9 M'], ['Percentil 25', '$72,6 M'], ['Mediana (resultado típico)', '$76,9 M'], ['Percentil 75', '$81,3 M'], ['Percentil 95', '$88,4 M'], ['Aportes reales (lo que puso)', '$64,8 M'], ['Probabilidad de perder poder adquisitivo', '2,1 %'], ['Aporte para 80 % de probabilidad', '$1.127.533']].map(([a, b]) => <tr key={a}><td>{a}</td><td className="n"><b>{b}</b></td></tr>)}
          </tbody></table>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="RiskLive · 5 de 7 · Cómo leer la simulación" titulo="El escenario típico queda cerca, pero por debajo de la meta" clase="denso">
        <div className="dos">
          <div className="card" style={{ padding: '14px 18px' }}><FanChart W={620} alto={330} /><p style={{ fontSize: 14 }}>Línea oscura: el escenario típico. Franja: dónde cae el 90 % de los escenarios. Línea roja: la meta.</p></div>
          <div className="card" style={{ padding: '14px 18px' }}><Histograma W={620} alto={300} /><p style={{ fontSize: 14 }}>Cuántos de los 10.000 escenarios terminan en cada valor. Morado oscuro: superan la meta.</p></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="RiskLive · 6 de 7 · Qué mueve el resultado" titulo="El aporte pesa más que el portafolio" clase="denso">
        <div className="dos a">
          <div className="card" style={{ padding: '14px 18px' }}><SensAporte W={700} alto={320} /><p style={{ fontSize: 14 }}>Con 10 % más de aporte, la probabilidad pasa de 31,8 % a 71,7 %.</p></div>
          <table className="t tabla2"><thead><tr><th>Peso COLCAP</th><th className="n">P(meta)</th><th className="n">Mediana</th><th className="n">Percentil 5</th></tr></thead><tbody>
            {R.sensCol.map((r) => <tr key={r.PesoCOLCAP}><td><b>{Math.round(r.PesoCOLCAP * 100)} %</b></td><td className="n">{fPct(r.PMeta, 1)}</td><td className="n">${(r.MedianaReal / 1e6).toFixed(1).replace('.', ',')} M</td><td className="n">${(r.P5Real / 1e6).toFixed(1).replace('.', ',')} M</td></tr>)}
          </tbody></table>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="RiskLive · 7 de 7 · El Excel e informe" titulo="Diez hojas, doce controles y un informe" clase="denso">
        <div className="dos a">
          <div className="shot" style={{ maxHeight: 470 }}><img src={imgRiskResumen} alt="" /></div>
          <table className="t tabla2"><thead><tr><th>Hoja</th><th>Qué tiene</th></tr></thead><tbody>
            {[['Resumen', 'Indicadores, fan chart, histograma'], ['Controles', '12 chequeos, avisa si se editan parámetros'], ['Parametros', 'Entradas editables'], ['Supuestos_EnVivo', 'Cada supuesto con fuente y fecha'], ['Calibracion', 'μ, σ, Jarque-Bera, correlaciones'], ['Modelo_Base', 'Libro de caja del profesor, fórmulas vivas'], ['Simulacion', 'Muestra de 1.000 corridas'], ['Resultados', 'Percentiles, VaR, CVaR, sensibilidades'], ['Percentiles_Mes', 'Datos del fan chart'], ['Fuentes', 'URL, fechas y limitaciones']].map(([a, b]) => <tr key={a}><td><b>{a}</b></td><td>{b}</td></tr>)}
          </tbody></table>
        </div>
      </Sl>
    ),

    // ================================================================ Parte 5 · Hágalo usted
    (n) => <Seccion n={n} num="5" titulo="Hágalo usted" lead="Instale un agente gratis, inicie sesión desde la terminal y cree su primera skill." />,
    (n) => (
      <Sl n={n} ey="Hágalo usted · 1 · Elegir el agente" titulo="Todos se instalan en la terminal y se entra con su cuenta" clase="denso">
        <table className="t tabla2"><thead><tr><th>Agente</th><th>Costo</th><th>Cuenta</th><th>Comando para abrirlo</th></tr></thead><tbody>
          {LLMS.map((l) => <tr key={l.id}><td><b>{l.nombre}</b>{l.recomendado ? ' · recomendado' : ''}</td><td><span className={`tag ${l.costoTipo}`}>{l.costo}</span></td><td>{l.plan.split('.')[0].split('(')[0]}</td><td><code>{l.iniciar}</code></td></tr>)}
        </tbody></table>
        <p className="lead" style={{ marginTop: 22, fontSize: 20 }}>Para la clase: <b>Gemini CLI</b>. Gratis con Gmail, 1.000 solicitudes al día, lee skills.</p>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Hágalo usted · 2 · Abrir la terminal" titulo="La terminal: donde vive el agente" clase="denso">
        <div className="dos">
          <Card t="Windows · PowerShell"><ol className="lista"><li>Tecla Windows, escriba <b>PowerShell</b> y ábralo.</li><li>Verá <code>PS C:\Users\SuNombre&gt;</code></li><li>Pegue con clic derecho o Ctrl + V y presione Enter.</li><li>Si algo "no se reconoce" tras instalar, cierre y abra PowerShell de nuevo.</li></ol></Card>
          <Card t="Mac · Terminal"><ol className="lista"><li>Cmd + Espacio, escriba <b>Terminal</b> y Enter.</li><li>Verá <code>sunombre@MacBook ~ %</code></li><li>Pegue con Cmd + V y presione Enter.</li><li>Si pide contraseña, escríbala aunque no se vea.</li></ol></Card>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Hágalo usted · 3 · Instalar" titulo="Instalar Node, Python y Gemini CLI" clase="denso">
        <div className="dos">
          <div className="card"><span className="etq">Windows · PowerShell</span><Cmd c="winget install --id OpenJS.NodeJS.LTS -e" /><Cmd c="winget install --id Python.Python.3.12 -e" /><p style={{ fontSize: 13.5 }}>Cierre y abra PowerShell de nuevo.</p><Cmd c="npm install -g @google/gemini-cli" /><Cmd c="gemini --version" /></div>
          <div className="card"><span className="etq">Mac · Terminal</span><Cmd c='/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' /><Cmd c="brew install node python" /><Cmd c="brew install gemini-cli" /><Cmd c="gemini --version" /></div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Hágalo usted · 4 · Iniciar sesión" titulo="Iniciar sesión desde la terminal, sin pagar" clase="denso">
        <div className="flecha" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[['Escriba', 'gemini y Enter'], ['Elija', '"Sign in with Google"'], ['Navegador', 'Se abre solo: entre con su Gmail y acepte'], ['Listo', 'Vuelva a la terminal: ya puede escribirle']].map(([t, d], i) => <div key={t}><b>Paso {i + 1}</b><h3>{t}</h3><p>{d}</p></div>)}
        </div>
        <div className="grid g2" style={{ marginTop: 20 }}>
          <Card t="Con ChatGPT (Codex)"><p>Instale con <code>npm install -g @openai/codex</code>, escriba <code>codex</code> y elija "Sign in with ChatGPT". Gratis con límites bajos.</p></Card>
          <Card t="Sin cuenta (Ollama + Claude Code)"><p>Instale Ollama y Claude Code, y abra con <code>ollama launch claude</code>. Modelos locales sin cuenta; los ":cloud" piden <code>ollama signin</code>.</p></Card>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Hágalo usted · 5 · Crear la skill" titulo="Una carpeta, un prompt y aprobar" clase="denso">
        <div className="dos a">
          <div className="code"><div className="bar"><span>Prompt · DolarHoy (inicio)</span></div><pre>{`Quiero que construyas una skill de agente llamada DolarHoy.

OBJETIVO
Traer la TRM oficial de hoy y de los últimos 90 días, y calcular cuánto cuesta en pesos una compra en dólares.

FUENTES DE DATOS
- TRM: datos.gov.co, dataset 32sa-8pi3.
- Verifica la URL con una consulta real. Nunca inventes cifras.

REGLAS
1. Cálculos en Python con pytest.
2. Guárdala en .agents/skills/DolarHoy/
3. SKILL.md con pasos numerados.
4. Entrega un Excel y un informe Markdown.
…`}</pre></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Cmd c="mkdir MisSkills" /><Cmd c="cd MisSkills" /><Cmd c="gemini" />
            <Card t="Mientras trabaja"><ul className="lista"><li>Lea y apruebe cada permiso.</li><li>Si se detiene: escriba <i>continúa</i>.</li><li>Si hay error: péguelo y pida que lo corrija.</li><li>Tarda de 5 a 15 minutos.</li></ul></Card>
          </div>
        </div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Hágalo usted · 6 · Usarla" titulo="Después, se le pide como a un colega" clase="denso">
        <Cmd c="/skills list" />
        <Cmd c="/CDTLive 20 millones a 180 días con pago trimestral" />
        <Cmd c="/RiskLive ¿cuánto debo ahorrar al mes para llegar a 150 millones en 10 años?" />
        <Cmd c="Usa la skill DolarHoy con una compra de 500 dólares" />
        <div className="card destacada" style={{ marginTop: 18 }}><h3>Como rutina diaria</h3><p><code>gemini --yolo -p "Usa la skill DolarHoy con 500 dólares"</code> programado a las 7:00 en el Programador de tareas (Windows) o con cron (Mac). Solo con skills propias ya probadas.</p></div>
      </Sl>
    ),
    (n) => (
      <Sl n={n} ey="Hágalo usted · 7 · Cómo pedir bien" titulo="Ocho reglas y seis etapas" clase="denso">
        <div className="grid g4" style={{ marginTop: 0 }}>{PRINCIPIOS_PROMPT.map((x, i) => <div key={x.t} className="card" style={{ padding: 14 }}><b style={{ color: 'var(--violet)' }}>{i + 1}</b> <b>{x.t}</b></div>)}</div>
        <div className="flecha" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginTop: 22 }}>
          {SECUENCIA_PROMPTS.map((x) => <div key={x.n} style={{ padding: '16px 14px' }}><b>Etapa {x.n}</b><h3 style={{ fontSize: 18 }}>{x.t}</h3></div>)}
        </div>
        <p style={{ marginTop: 16, fontSize: 17, color: 'var(--ink-2)' }}>Los seis prompts completos, listos para copiar, están en la web (sección "Cómo pedirle bien").</p>
      </Sl>
    ),

    // ================================================================ Cierre
    (n) => (
      <Sl n={n} ey="Cierre" titulo="Por qué se puede confiar" presenta="Leydis Niebles">
        <div className="grid g4">
          <K l="Pruebas automáticas" v="72" tono="vio" /><K l="Controles en Excel" v="22" /><K l="Excel vs Python" v="$0" d="de diferencia" tono="ok" /><K l="Cifras inventadas" v="0" tono="ok" />
        </div>
        <p className="lead" style={{ marginTop: 40 }}>Fuentes oficiales, cálculos probados y un humano que revisa. Educación financiera, no asesoría de inversión.</p>
      </Sl>
    ),
    () => (
      <div className="sl portadaS">
        <div className="ey">Gracias</div>
        <h1 style={{ fontSize: 72 }}>Un agente no reemplaza<br />al analista: <em>le quita<br />lo repetitivo</em></h1>
        <p style={{ marginTop: 34, fontSize: 20, color: 'var(--ink-2)', fontWeight: 600 }}>{AUTORES}</p>
        <p style={{ marginTop: 6, fontSize: 16, color: 'var(--ink-3)' }}>¿Preguntas?</p>
      </div>
    ),
  ];
}

export default function Slides() {
  const L = lista();
  const imprimir = window.location.hash.includes('print');
  const [i, setI] = useState(() => { const m = window.location.hash.match(/slides\/(\d+)/); return m ? Math.min(L.length - 1, Number(m[1]) - 1) : 0; });
  const [esc, setEsc] = useState(1);
  useEffect(() => {
    if (imprimir) return;
    const aj = () => setEsc(Math.min(window.innerWidth / 1300, (window.innerHeight - 30) / 740));
    aj(); window.addEventListener('resize', aj);
    const tecla = (e) => {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setI((v) => Math.min(L.length - 1, v + 1)); }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) setI((v) => Math.max(0, v - 1));
      if (e.key === 'Escape') window.location.hash = '#/';
    };
    window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('resize', aj); window.removeEventListener('keydown', tecla); };
  }, [imprimir, L.length]);
  useEffect(() => { if (!imprimir) history.replaceState(null, '', `#/slides/${i + 1}`); }, [i, imprimir]);

  if (imprimir) return <div className="deck-print">{L.map((f, k) => <div key={k} className="pag">{f(k + 1)}</div>)}</div>;
  return (
    <div className="deck" onClick={(e) => { if (e.target.closest('a,button')) return; setI((v) => (e.clientX > window.innerWidth / 2 ? Math.min(L.length - 1, v + 1) : Math.max(0, v - 1))); }}>
      <div className="stage" style={{ transform: `translate(-50%, -52%) scale(${esc})` }}>{L[i](i + 1)}</div>
      <div className="deck-ui"><a href="#/" className="btn" style={{ padding: '5px 10px', fontSize: 12 }}>← Salir</a><span>{i + 1} / {L.length}</span><div className="barra"><i style={{ width: `${((i + 1) / L.length) * 100}%` }} /></div></div>
    </div>
  );
}
