import { useEffect, useState } from 'react';
import { PAGINAS, Inicio } from './paginas.jsx';
import Slides from './Slides.jsx';
import { META } from './data/contenido.js';

// Enrutador por hash: #/ inicio, #/<sección>, #/slides diapositivas, #/slides?print todas para PDF
function useHash() {
  const [h, setH] = useState(window.location.hash || '#/');
  useEffect(() => { const f = () => setH(window.location.hash || '#/'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return h;
}

function Menu({ actual }) {
  const grupos = ['Entender', 'Ver', 'Hacer'];
  return (
    <aside className="side">
      <a className="brand" href="#/" style={{ color: 'inherit', textDecoration: 'none' }}><i /><div>De chatbot a agente<small>{META.autor}</small></div></a>
      <a className={`item ${actual === '' ? 'on' : ''}`} href="#/"><b>⌂</b>Inicio</a>
      {grupos.map((g) => (
        <div key={g} className="grupo">
          <span>{g}</span>
          {PAGINAS.filter((p) => p.grupo === g).map((p) => (
            <a key={p.slug} className={`item ${actual === p.slug ? 'on' : ''}`} href={`#/${p.slug}`}><b>{p.n}</b>{p.titulo}</a>
          ))}
        </div>
      ))}
      <div className="grupo"><span>Presentar</span><a className="item" href="#/slides"><b>▶</b>Diapositivas</a></div>
      <div className="pie">Planeación Financiera · MFi Uninorte<br />Educación financiera, no asesoría de inversión.</div>
    </aside>
  );
}

export default function App() {
  const hash = useHash();
  const ruta = hash.replace(/^#\/?/, '');
  useEffect(() => { window.scrollTo(0, 0); }, [ruta]);
  if (ruta.startsWith('slides')) return <Slides key={ruta.includes('print') ? 'p' : 's'} />;

  const i = PAGINAS.findIndex((p) => p.slug === ruta.split('?')[0]);
  const pag = PAGINAS[i];
  const ant = i > 0 ? PAGINAS[i - 1] : null;
  const sig = i >= 0 && i < PAGINAS.length - 1 ? PAGINAS[i + 1] : null;
  return (
    <div className="shell">
      <Menu actual={pag ? pag.slug : ''} />
      <main className="main">
        <div className="pagina">
          {!pag ? <Inicio paginas={PAGINAS} /> : (<>
            <div className="cab">
              <div className="migas">{pag.grupo} · {pag.n} de {PAGINAS.length}</div>
              <h1>{pag.titulo}</h1>
              <p className="resumen">{pag.resumen}</p>
            </div>
            <pag.C />
            <div className="navpag">
              {ant ? <a href={`#/${ant.slug}`}><small>← Anterior</small><span>{ant.titulo}</span></a> : <a href="#/"><small>← Volver</small><span>Inicio</span></a>}
              {sig ? <a className="sig" href={`#/${sig.slug}`}><small>Siguiente →</small><span>{sig.titulo}</span></a> : <a className="sig" href="#/slides"><small>Siguiente →</small><span>Diapositivas</span></a>}
            </div>
          </>)}
        </div>
      </main>
    </div>
  );
}
