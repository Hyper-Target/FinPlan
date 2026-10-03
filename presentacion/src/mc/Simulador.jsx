import { Component, useEffect, useRef, useState } from 'react';
import { Kpi, Simple, Bloque, ComoLeer } from '../components/ui.jsx';
import { Abanico, Hist, BarrasP, Convergencia, fM, pc } from './graficos.jsx';
import {
  CAL, copiarCal, REF_PYTHON, generarMacro, corridasUnitarias, estadisticas, aporteParaProbabilidad,
  probabilidadConAporte, abanico, histograma, convergencia, sensibilidadColcap, pesosConColcap,
} from './motor.js';

const INICIAL = {
  ahorro0: 5e6, aporte: 1e6, anios: 5, meta: 80e6, wCol: 25, wUsd: 15,
  rebal: 1, conIpc: true, dist: 'normal', dfT: 5, n: 10000, seed: 42, retencion: 4,
};
const MERCADO = (c) => ({
  muCol: c.COLCAP.mu * 100, sigCol: c.COLCAP.sigma * 100, muTrm: c.TRM.mu * 100, sigTrm: c.TRM.sigma * 100,
  cdtHoy: (c.CDT.x0 + c.CDT.spread) * 100, cdtLp: c.CDT.b * 100, sigCdt: c.CDT.sigma * 100,
  infHoy: (Math.pow(1 + c.IPC.pi0, 12) - 1) * 100, infLp: (Math.pow(1 + c.IPC.b, 12) - 1) * 100,
});
const MERCADO0 = MERCADO(CAL);

const PRESETS = [
  { id: 'ej', t: 'Caso del ejemplo', d: '60 / 25 / 15, 5 años', p: {}, m: {} },
  { id: 'cons', t: 'Conservador', d: '100 % CDT', p: { wCol: 0, wUsd: 0 }, m: {} },
  { id: 'agr', t: 'Agresivo', d: '60 % COLCAP', p: { wCol: 60, wUsd: 10 }, m: {} },
  { id: 'lp', t: 'Largo plazo', d: '20 años, meta $400 M', p: { anios: 20, meta: 400e6, aporte: 1e6 }, m: {} },
  { id: 'est', t: 'Estrés', d: 'colas gruesas, volatilidad ×1,5', p: { dist: 't' }, m: { sigCol: MERCADO0.sigCol * 1.5, sigTrm: MERCADO0.sigTrm * 1.5 } },
];

const calDesde = (m) => {
  const c = copiarCal();
  c.COLCAP.mu = m.muCol / 100; c.COLCAP.sigma = m.sigCol / 100;
  c.TRM.mu = m.muTrm / 100; c.TRM.sigma = m.sigTrm / 100;
  c.CDT.x0 = m.cdtHoy / 100 - c.CDT.spread; c.CDT.b = m.cdtLp / 100; c.CDT.sigma = m.sigCdt / 100;
  c.IPC.pi0 = Math.pow(1 + m.infHoy / 100, 1 / 12) - 1; c.IPC.b = Math.pow(1 + m.infLp / 100, 1 / 12) - 1;
  return c;
};

// ------------------------------------------------------------------ controles
const miles = (v) => Math.round(v).toLocaleString('es-CO');
function Dinero({ valor, onChange, min = 0, max = 1e12 }) {
  const [txt, setTxt] = useState(miles(valor));
  useEffect(() => { setTxt(miles(valor)); }, [valor]);
  return (
    <div className="in-dinero"><span>$</span>
      <input inputMode="numeric" value={txt}
        onChange={(e) => { const d = e.target.value.replace(/\D/g, ''); setTxt(d ? miles(+d) : ''); if (d) onChange(Math.min(max, Math.max(min, +d))); }}
        onBlur={() => setTxt(miles(valor))} />
    </div>
  );
}
function Desliz({ valor, min, max, step, onChange, fmt }) {
  return (
    <div className="in-desliz">
      <input type="range" min={min} max={max} step={step} value={valor} onChange={(e) => onChange(+e.target.value)} />
      <b>{fmt(valor)}</b>
    </div>
  );
}
const Campo = ({ t, ayuda, children }) => (<label className="campo"><span className="t">{t}</span>{children}{ayuda && <small>{ayuda}</small>}</label>);
const Numero = ({ valor, onChange, paso = 0.01, dec = 3 }) => (
  <input className="in-num" type="number" step={paso} value={Number(valor.toFixed(dec))} onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(v); }} />
);

// Si un gráfico falla con una combinación extrema de supuestos, se muestra un aviso en lugar de dejar la página en blanco.
class Protegido extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.clave !== this.props.clave && this.state.error) this.setState({ error: null }); }
  render() { return this.state.error ? <p className="muted">Este gráfico no se pudo dibujar con estos supuestos.</p> : this.props.children; }
}

// ------------------------------------------------------------------ página
export default function Simulador() {
  const [p, setP] = useState(INICIAL);
  const [mk, setMk] = useState(MERCADO0);
  const [avanzado, setAvanzado] = useState(false);
  const [res, setRes] = useState(null);
  const [calc, setCalc] = useState(true);
  const cache = useRef({ clave: '', macro: null });
  const set = (k) => (v) => setP((o) => ({ ...o, [k]: v }));
  const setM = (k) => (v) => setMk((o) => ({ ...o, [k]: v }));
  const wCdt = 100 - p.wCol - p.wUsd;

  useEffect(() => {
    setCalc(true);
    let vivo = true, t2 = null;
    const t1 = setTimeout(() => {
      const T = Math.round(p.anios * 12);
      const w = [wCdt / 100, p.wCol / 100, p.wUsd / 100];
      const cal = calDesde(mk);
      const clave = JSON.stringify([p.n, T, p.seed, p.dist, p.dfT, p.retencion, mk]);
      const t0 = performance.now();
      if (cache.current.clave !== clave) {
        cache.current = { clave, macro: generarMacro(cal, { n: p.n, T, seed: p.seed, dist: p.dist, dfT: p.dfT, retencion: p.retencion / 100 }) };
      }
      const macro = cache.current.macro;
      const unit = corridasUnitarias(macro, w, p.conIpc, p.rebal);
      const est = estadisticas(unit, p.ahorro0, p.aporte, p.meta);
      const mult = p.aporte > 0 ? [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3] : [0, 0.25e6, 0.5e6, 0.75e6, 1e6, 1.25e6, 1.5e6];
      const sensAp = mult.map((mu) => {
        const A = p.aporte > 0 ? p.aporte * (1 + mu) : mu;
        return { etq: fM(A, 2), sub: p.aporte > 0 ? (mu === 0 ? 'actual' : `${mu > 0 ? '+' : ''}${Math.round(mu * 100)} %`) : '', p: probabilidadConAporte(unit, p.ahorro0, A, p.meta), base: p.aporte > 0 ? mu === 0 : A === 0 };
      });
      const r = {
        est, unit, w, T, n: p.n,
        ab: abanico(unit, p.ahorro0, p.aporte),
        bins: histograma(est.finReal, est.ord),
        conv: convergencia(est.finReal, p.meta),
        ap80: aporteParaProbabilidad(unit, p.ahorro0, p.meta, 0.8),
        sensAp, sensCol: null, ms: performance.now() - t0, p: { ...p },
      };
      if (!vivo) return;
      setRes(r); setCalc(false);
      t2 = setTimeout(() => {
        if (!vivo) return;
        const niveles = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
        const actual = p.wCol / 100;
        const cercano = niveles.reduce((b, v, i) => (Math.abs(v - actual) < Math.abs(niveles[b] - actual) ? i : b), 0);
        niveles[cercano] = actual;
        niveles.sort((a, b) => a - b);
        const sc = sensibilidadColcap(macro, w, p.conIpc, p.rebal, p.ahorro0, p.aporte, p.meta, niveles).map((d) => {
          const pw = pesosConColcap(w, d.wc);
          return { etq: `${Math.round(d.wc * 100)} % COLCAP`, sub: `CDT ${Math.round(pw[0] * 100)} · USD ${Math.round(pw[2] * 100)}`, p: d.p, base: d.wc === actual };
        });
        setRes((o) => (o && o.p === r.p ? { ...o, sensCol: sc } : o));
      }, 30);
    }, 220);
    return () => { vivo = false; clearTimeout(t1); if (t2) clearTimeout(t2); };
  }, [p, mk, wCdt]);

  const aplicar = (pr) => { setP({ ...INICIAL, ...pr.p }); setMk({ ...MERCADO0, ...pr.m }); };
  const esBase = JSON.stringify(p) === JSON.stringify(INICIAL) && JSON.stringify(mk) === JSON.stringify(MERCADO0);
  const e = res && res.est;
  const ejemplos = e ? Math.round(e.pMeta * 10) : 0;

  return (<>
    <Simple>Cambie los supuestos a la izquierda y el modelo vuelve a simular en su navegador. Es el mismo cálculo que hace la skill RiskLive: shocks correlacionados, reversión a la media para el CDT y la inflación, lognormales para el COLCAP y el dólar.</Simple>

    <div className="presets">
      {PRESETS.map((x) => <button key={x.id} className="btn" onClick={() => aplicar(x)}><b>{x.t}</b><small>{x.d}</small></button>)}
    </div>

    <div className="sim">
      <aside className="sim-ctl card">
        <h3>Su escenario</h3>
        <Campo t="Ahorro inicial"><Dinero valor={p.ahorro0} onChange={set('ahorro0')} /></Campo>
        <Campo t="Aporte mensual" ayuda={p.conIpc ? 'Crece cada mes con la inflación simulada.' : 'Se mantiene fijo en pesos nominales.'}><Dinero valor={p.aporte} onChange={set('aporte')} /></Campo>
        <Campo t="Meta en pesos de hoy"><Dinero valor={p.meta} onChange={set('meta')} /></Campo>
        <Campo t="Horizonte"><Desliz valor={p.anios} min={1} max={30} step={1} onChange={set('anios')} fmt={(v) => `${v} ${v === 1 ? 'año' : 'años'}`} /></Campo>

        <h3 style={{ marginTop: 20 }}>Distribución del portafolio</h3>
        <Campo t="COLCAP (renta variable)"><Desliz valor={p.wCol} min={0} max={100} step={5} onChange={(v) => setP((o) => ({ ...o, wCol: v, wUsd: Math.min(o.wUsd, 100 - v) }))} fmt={(v) => `${v} %`} /></Campo>
        <Campo t="Dólares (efectivo)"><Desliz valor={p.wUsd} min={0} max={100 - p.wCol} step={5} onChange={set('wUsd')} fmt={(v) => `${v} %`} /></Campo>
        <div className="pesos"><i style={{ width: `${wCdt}%`, background: '#5b21b6' }} /><i style={{ width: `${p.wCol}%`, background: '#8b5cf6' }} /><i style={{ width: `${p.wUsd}%`, background: '#c4b5fd' }} /></div>
        <div className="leyenda-p"><span><i style={{ background: '#5b21b6' }} />CDT {wCdt} %</span><span><i style={{ background: '#8b5cf6' }} />COLCAP {p.wCol} %</span><span><i style={{ background: '#c4b5fd' }} />USD {p.wUsd} %</span></div>
        <Campo t="Rebalanceo">
          <select className="in-sel" value={p.rebal} onChange={(ev) => set('rebal')(+ev.target.value)}>
            <option value={1}>Mensual</option><option value={2}>Anual</option><option value={0}>Ninguno</option>
          </select>
        </Campo>
        <Campo t="Aporte"><select className="in-sel" value={p.conIpc ? 1 : 0} onChange={(ev) => set('conIpc')(ev.target.value === '1')}><option value={1}>Crece con la inflación</option><option value={0}>Fijo en pesos nominales</option></select></Campo>

        <h3 style={{ marginTop: 20 }}>Simulación</h3>
        <Campo t="Número de escenarios">
          <select className="in-sel" value={p.n} onChange={(ev) => set('n')(+ev.target.value)}>
            {[200, 1000, 5000, 10000, 20000].map((v) => <option key={v} value={v}>{v.toLocaleString('es-CO')}</option>)}
          </select>
        </Campo>
        <Campo t="Semilla" ayuda="Misma semilla, mismo resultado. Cámbiela para ver la variación por azar."><Numero valor={p.seed} onChange={(v) => set('seed')(Math.max(0, Math.round(v)))} paso={1} dec={0} /></Campo>
        <Campo t="Distribución de los shocks"><select className="in-sel" value={p.dist} onChange={(ev) => set('dist')(ev.target.value)}><option value="normal">Normal</option><option value="t">t de Student (colas gruesas)</option></select></Campo>
        {p.dist === 't' && <Campo t="Grados de libertad (t)" ayuda="Menos grados, colas más gruesas."><Desliz valor={p.dfT} min={3} max={30} step={1} onChange={set('dfT')} fmt={(v) => v} /></Campo>}
        <Campo t="Retención sobre el rendimiento del CDT"><Desliz valor={p.retencion} min={0} max={10} step={0.5} onChange={set('retencion')} fmt={(v) => `${v} %`} /></Campo>

        <button className="btn" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={() => setAvanzado(!avanzado)}>{avanzado ? 'Ocultar' : 'Editar'} supuestos de mercado</button>
        {avanzado && (
          <div className="avanz">
            <p className="muted" style={{ fontSize: 13 }}>Valores calibrados con datos oficiales al {CAL.fecha}. Modifíquelos para probar otros escenarios.</p>
            <Campo t="COLCAP: retorno mensual medio (%)"><Numero valor={mk.muCol} onChange={setM('muCol')} paso={0.05} /></Campo>
            <Campo t="COLCAP: volatilidad mensual (%)"><Numero valor={mk.sigCol} onChange={setM('sigCol')} paso={0.1} dec={2} /></Campo>
            <Campo t="Dólar: variación mensual media (%)"><Numero valor={mk.muTrm} onChange={setM('muTrm')} paso={0.05} /></Campo>
            <Campo t="Dólar: volatilidad mensual (%)"><Numero valor={mk.sigTrm} onChange={setM('sigTrm')} paso={0.1} dec={2} /></Campo>
            <Campo t="CDT: tasa de partida (% EA)"><Numero valor={mk.cdtHoy} onChange={setM('cdtHoy')} paso={0.1} dec={2} /></Campo>
            <Campo t="CDT: nivel de largo plazo (% EA)"><Numero valor={mk.cdtLp} onChange={setM('cdtLp')} paso={0.1} dec={2} /></Campo>
            <Campo t="CDT: volatilidad mensual (pp)"><Numero valor={mk.sigCdt} onChange={setM('sigCdt')} paso={0.05} dec={3} /></Campo>
            <Campo t="Inflación de partida (% anual)"><Numero valor={mk.infHoy} onChange={setM('infHoy')} paso={0.1} dec={2} /></Campo>
            <Campo t="Inflación de largo plazo (% anual)"><Numero valor={mk.infLp} onChange={setM('infLp')} paso={0.1} dec={2} /></Campo>
            <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setMk(MERCADO0)}>Restaurar calibración</button>
          </div>
        )}
      </aside>

      <div className="sim-res" style={{ opacity: calc ? 0.55 : 1, transition: 'opacity .15s' }}>
        {!e ? <div className="card">Simulando…</div> : (<>
          <div className="card destacada resumen-sim">
            <div className="estado">{calc ? 'Recalculando…' : `${e.n.toLocaleString('es-CO')} escenarios en ${Math.round(res.ms)} ms`}</div>
            <p style={{ fontSize: 18, color: 'var(--ink)', margin: 0 }}>
              En <b>{ejemplos} de cada 10</b> escenarios el ahorro alcanza {fM(res.p.meta)} de hoy en {res.p.anios} {res.p.anios === 1 ? 'año' : 'años'}.
              El resultado típico es <b>{fM(e.pct[50])}</b> y en un caso malo razonable (percentil 5) es <b>{fM(e.pct[5])}</b>.
              {' '}Para llegar con 80 % de probabilidad el aporte mensual debería ser <b>${miles(res.ap80)}</b>.
            </p>
          </div>

          <div className="grid g4" style={{ marginTop: 14 }}>
            <Kpi l="Probabilidad de llegar" v={pc(e.pMeta)} d={`± ${(e.ic95 * 100).toFixed(1).replace('.', ',')} pp (IC 95 %)`} tono="vio" />
            <Kpi l="Resultado típico" v={fM(e.pct[50])} d="mediana, pesos de hoy" />
            <Kpi l="Caso malo (P5)" v={fM(e.pct[5])} d="5 % de escenarios peores" />
            <Kpi l="Caso bueno (P95)" v={fM(e.pct[95])} d="5 % de escenarios mejores" />
          </div>
          <div className="grid g4" style={{ marginTop: 12 }}>
            <Kpi l="Aporte para 80 %" v={`$${miles(res.ap80)}`} d="mensual, mismos supuestos" tono="ok" />
            <Kpi l="Aportado en pesos de hoy" v={fM(e.aportesMedio)} d="ahorro inicial más aportes" />
            <Kpi l="Pérdida real" v={pc(e.pPerdida)} d="prob. de terminar con menos de lo aportado" />
            <Kpi l="CVaR 95 %" v={e.cvar95 >= 0 ? fM(e.cvar95) : `+${fM(-e.cvar95)}`} d={e.cvar95 >= 0 ? 'pérdida media en el peor 5 %' : 'ganancia media en el peor 5 %'} />
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Cómo crece el ahorro mes a mes</h3>
            <Protegido clave={res.ms}><Abanico datos={res.ab} meta={res.p.meta} /></Protegido>
            <ComoLeer>la línea oscura es la mediana y las líneas finas son 40 escenarios al azar. La franja clara cubre del percentil 5 al 95 y la oscura del 25 al 75. La línea roja es la meta en pesos de hoy.</ComoLeer>
          </div>

          <div className="grid g2">
            <div className="card">
              <h3>Todos los resultados posibles</h3>
              <Protegido clave={res.ms}><Hist bins={res.bins} meta={res.p.meta} W={520} alto={260} /></Protegido>
              <ComoLeer>cada barra cuenta escenarios con un valor final parecido. Las oscuras superan la meta.</ComoLeer>
            </div>
            <div className="card">
              <h3>Cuánto cambia el resultado</h3>
              <table className="t tabla2" style={{ marginTop: 8 }}><tbody>
                <tr><td>Media</td><td className="n"><b>{fM(e.media)}</b></td></tr>
                <tr><td>Desviación estándar</td><td className="n"><b>{fM(e.desv)}</b></td></tr>
                <tr><td>Percentil 25 / 75</td><td className="n"><b>{fM(e.pct[25])} / {fM(e.pct[75])}</b></td></tr>
                <tr><td>Mediana nominal (pesos futuros)</td><td className="n"><b>{fM(e.nominalMediana)}</b></td></tr>
                <tr><td>VaR 95 % de la ganancia real</td><td className="n"><b>{e.var95 >= 0 ? fM(e.var95) : `+${fM(-e.var95)}`}</b></td></tr>
                <tr><td>Caída máxima, mediana / P95</td><td className="n"><b>{pc(e.ddMediana)} / {pc(e.ddP95)}</b></td></tr>
              </tbody></table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Qué pasa si aporto más o menos</h3>
            <Protegido clave={res.ms}><BarrasP items={res.sensAp} /></Protegido>
            <ComoLeer>misma simulación, cambiando solo el aporte. Gracias a la linealidad del modelo no hace falta volver a simular: se recalcula al instante.</ComoLeer>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Qué pasa si cambio el peso del COLCAP</h3>
            {res.sensCol ? <Protegido clave={res.ms}><BarrasP items={res.sensCol} /></Protegido> : <p className="muted">Calculando…</p>}
            <ComoLeer>más renta variable suele subir el resultado típico y ensanchar el abanico. Según la meta y el horizonte, la probabilidad de llegar puede subir o bajar: compare con sus supuestos.</ComoLeer>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h3>Cuántas simulaciones hacen falta</h3>
            <Protegido clave={res.ms}><Convergencia datos={res.conv} final={e.pMeta} /></Protegido>
            <ComoLeer>la probabilidad estimada con pocas simulaciones oscila. Al aumentar el número se estabiliza y el intervalo de confianza se estrecha con la raíz de N. Con {e.n.toLocaleString('es-CO')} escenarios el error es de ± {(e.ic95 * 100).toFixed(1).replace('.', ',')} puntos.</ComoLeer>
          </div>

          <div className="nota" style={{ marginTop: 16 }}>
            <b>Contraste con la skill.</b> {esBase
              ? <>Con estos mismos valores, la corrida en Python (semilla 42, 10.000 escenarios) dio probabilidad de {pc(REF_PYTHON.pMeta)}, mediana de {fM(REF_PYTHON.mediana)}, percentil 5 de {fM(REF_PYTHON.p5)} y aporte para 80 % de ${miles(REF_PYTHON.aporte80)}. La web usa otro generador de números aleatorios, por eso difiere en décimas dentro del error de muestreo.</>
              : <>Con los valores iniciales (5 millones, 1 millón al mes, 5 años, meta de 80 millones y 60/25/15) la corrida en Python dio {pc(REF_PYTHON.pMeta)} de probabilidad. Pulse &laquo;Caso del ejemplo&raquo; para compararlo.</>}
            {' '}Esto es educación financiera, no asesoría de inversión: el modelo supone que el futuro se parece a los últimos 10 años.
          </div>
        </>)}
      </div>
    </div>
  </>);
}
