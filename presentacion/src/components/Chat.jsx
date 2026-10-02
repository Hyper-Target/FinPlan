import { useEffect, useMemo, useRef, useState } from 'react';
import { DEMO } from '../data/contenido.js';

const ICONO = { terminal: '>_', archivo: '✎', navegador: '◎' };
const QUE = { terminal: 'Ejecutó un comando', archivo: 'Creó archivos', navegador: 'Abrió una página' };

// Línea de tiempo plana: pregunta, cada texto del agente, cada acción y la respuesta final.
function pasos() {
  const l = [{ tipo: 'pregunta', titulo: 'La petición', explica: DEMO.explicaPregunta }];
  DEMO.turnos.forEach((t, ti) => {
    l.push({ tipo: 'texto', ti, titulo: 'El agente planea', explica: t.explica });
    t.acciones.forEach((a, ai) => l.push({ tipo: 'accion', ti, ai, titulo: a.titulo, explica: a.explica }));
  });
  l.push({ tipo: 'final', titulo: 'Entrega', explica: DEMO.final.explica });
  return l;
}

function Accion({ a, actual, abierta, onToggle }) {
  return (
    <div className={`accion ${actual ? 'actual' : ''}`}>
      <div className="fila" onClick={onToggle}>
        <span className="ic">{ICONO[a.tipo]}</span>
        <div><div className="que">{QUE[a.tipo]}</div><div className="tit">{a.titulo}</div></div>
        <span className={`estado ${actual ? 'run' : a.estado}`}>{actual ? 'En curso' : a.estado === 'aviso' ? 'Revisar' : 'Listo'}</span>
      </div>
      {abierta && !actual && (
        <div className="det"><div className="cmd">{a.cmd}</div><div className={`res ${a.estado}`}>→ {a.res}</div></div>
      )}
    </div>
  );
}

// Conversación. `hasta` = cuántos pasos de la línea de tiempo se muestran; `detalles` abre todas las acciones.
export function Conversacion({ hasta, animando = false, detalles = false, alto }) {
  const L = useMemo(pasos, []);
  const [abiertas, setAbiertas] = useState({});
  const hilo = useRef(null);
  useEffect(() => { if (hilo.current && animando) hilo.current.scrollTop = hilo.current.scrollHeight; }, [hasta, animando]);
  const visto = (pred) => L.slice(0, hasta).some(pred);
  const actualIdx = animando ? hasta - 1 : -1;
  const idx = (pred) => L.findIndex(pred);

  return (
    <div className="hilo" ref={hilo} style={alto ? { height: alto } : undefined}>
      {hasta >= 1 && <div className="m-user">{DEMO.pregunta}</div>}
      {DEMO.turnos.map((t, ti) => !visto((p) => p.tipo === 'texto' && p.ti === ti) ? null : (
        <div key={ti} className="m-agent">
          <span className="av">A</span>
          <div>
            <div className="txt">{t.texto}</div>
            <div className="acciones">
              {t.acciones.map((a, ai) => {
                const k = idx((p) => p.tipo === 'accion' && p.ti === ti && p.ai === ai);
                if (k >= hasta) return null;
                const clave = `${ti}-${ai}`;
                return <Accion key={clave} a={a} actual={k === actualIdx} abierta={detalles || abiertas[clave]}
                  onToggle={() => setAbiertas((s) => ({ ...s, [clave]: !s[clave] }))} />;
              })}
            </div>
          </div>
        </div>
      ))}
      {animando && hasta < L.length && L[hasta - 1]?.tipo !== 'accion' && (
        <div className="m-agent"><span className="av">A</span><div className="escribe"><i /><i /><i /></div></div>
      )}
      {hasta >= L.length && (
        <div className="m-agent">
          <span className="av">A</span>
          <div className="m-final">
            <div className="txt" style={{ paddingTop: 0 }}>{DEMO.final.texto}</div>
            <div className="kp">{DEMO.final.kpis.map(([l, v]) => <div key={l}><small>{l}</small><b>{v}</b></div>)}</div>
            <div className="files">{DEMO.final.archivos.map((f) => <span key={f}>📄 {f}</span>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Demo completa: ventana de chat + controles + panel "Qué está pasando".
export default function Chat() {
  const L = useMemo(pasos, []);
  const [n, setN] = useState(1);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!auto) return;
    if (n >= L.length) { setAuto(false); return; }
    const t = setTimeout(() => setN((v) => v + 1), L[n - 1].tipo === 'accion' ? 1700 : 2600);
    return () => clearTimeout(t);
  }, [auto, n, L]);
  const paso = L[n - 1];

  return (
    <div className="demo">
      <div className="ventana">
        <div className="top"><span className="pto" />Agente · carpeta MisSkills<small>Recreación de la sesión real</small></div>
        <Conversacion hasta={n} animando={auto} />
        <div className="controles">
          <button className="btn primary" onClick={() => { if (n >= L.length) setN(1); setAuto(!auto); }}>{auto ? 'Pausar' : n >= L.length ? 'Ver de nuevo' : '▶ Reproducir'}</button>
          <button className="btn" disabled={n <= 1} onClick={() => { setAuto(false); setN((v) => Math.max(1, v - 1)); }}>Anterior</button>
          <button className="btn" disabled={n >= L.length} onClick={() => { setAuto(false); setN((v) => Math.min(L.length, v + 1)); }}>Siguiente</button>
          <div className="prog"><i style={{ width: `${(n / L.length) * 100}%` }} /></div>
          <small>Paso {n} de {L.length}</small>
        </div>
      </div>
      <div className="panel">
        <div className="card">
          <div className="migas">Qué está pasando</div>
          <h3 style={{ marginTop: 8 }}>{paso.titulo}</h3>
          <p className="explica">{paso.explica}</p>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="migas">Recorrido</div>
          <ul className="linea">
            {L.map((p, i) => (
              <li key={i} className={i < n - 1 ? 'hecho' : i === n - 1 ? 'ahora' : ''} onClick={() => { setAuto(false); setN(i + 1); }} style={{ cursor: 'pointer' }}>
                <i />{p.titulo}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
