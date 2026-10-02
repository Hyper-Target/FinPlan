import { useState } from 'react';

export function Copiar({ texto }) {
  const [ok, setOk] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); } catch {
      const t = document.createElement('textarea'); t.value = texto; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    }
    setOk(true); setTimeout(() => setOk(false), 1600);
  };
  return <button className={`copy ${ok ? 'ok' : ''}`} onClick={copiar}>{ok ? 'Copiado ✓' : 'Copiar'}</button>;
}

// Bloque para copiar. `lineas`: comandos (cada uno con ›). `texto`: bloque libre (un prompt).
export function Codigo({ lineas, texto, etiqueta = 'Terminal', alto }) {
  const copiable = texto ?? lineas.filter((l) => !l.startsWith('#')).join('\n');
  return (
    <div className="code">
      <div className="bar"><span>{etiqueta}</span><Copiar texto={copiable} /></div>
      <pre style={alto ? { maxHeight: alto, overflowY: 'auto' } : undefined}>
        {texto ?? lineas.map((l, i) => (
          <div key={i} style={l.startsWith('#') ? { color: 'var(--ink-3)' } : undefined}>
            {!l.startsWith('#') && <span className="sym">› </span>}{l}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function Pestanas({ opciones, valor, onChange }) {
  return (
    <div className="tabs">
      {opciones.map((o) => <button key={o.id} className={valor === o.id ? 'on' : ''} onClick={() => onChange(o.id)}>{o.label}</button>)}
    </div>
  );
}

export function Kpi({ l, v, d, tono }) {
  return <div className="card kpi"><div className="l">{l}</div><div className={`v ${tono || ''}`}>{v}</div>{d && <div className="d">{d}</div>}</div>;
}

export function Simple({ children }) {
  return <div className="simple"><strong>En simple</strong><span>{children}</span></div>;
}

export function Bloque({ titulo, sub, children }) {
  return <div className="bloque"><h2>{titulo}</h2>{sub && <p className="sub">{sub}</p>}{children}</div>;
}

export function ComoLeer({ children }) {
  return <div className="leer"><b>Cómo leerla: </b>{children}</div>;
}

export const fCop = (x) => '$' + Math.round(x).toLocaleString('es-CO');
export const fPct = (x, d = 2) => (x * 100).toFixed(d).replace('.', ',') + ' %';
