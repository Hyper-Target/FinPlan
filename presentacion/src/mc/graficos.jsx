// Gráficos SVG de la simulación en vivo. Mismo estilo que charts.jsx (morado sobre fondo blanco), con ejes que se ajustan a los datos.
const GRIS = '#85809a', LINEA = '#eceaf2', MORADO = '#6d28d9', OSCURO = '#5b21b6', ROJO = '#d64545';

export const fM = (v, d = 1) => {
  const s = Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(d)} MM` : `${(v / 1e6).toFixed(Math.abs(v) >= 1e8 ? 0 : d)} M`;
  return `${v < 0 ? '-' : ''}$${s.replace('-', '').replace('.', ',')}`;
};
export const pc = (p, d = 1) => `${(p * 100).toFixed(d).replace('.', ',')} %`;

// Marcas "redondas" para un eje que va de 0 a max
function marcas(max, n = 5) {
  const crudo = max / n, pot = Math.pow(10, Math.floor(Math.log10(crudo)));
  const f = crudo / pot, paso = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * pot;
  const out = [];
  for (let v = 0; v <= max + paso * 0.01; v += paso) out.push(v);
  return out;
}
const tickM = (v) => (v === 0 ? '0' : v >= 1e9 ? `${(v / 1e9).toLocaleString('es-CO')} MM` : `${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`);

// ------------------------------------------------------------------ abanico de percentiles + trayectorias
export function Abanico({ datos, meta, W = 900, alto = 380, trayectorias = true }) {
  const { meses, filas, trayectorias: tr } = datos;
  const pad = { l: 56, r: 16, t: 14, b: 32 };
  const T = meses[meses.length - 1];
  const maxY = Math.max(meta * 1.12, filas[filas.length - 1][4] * 1.05);
  const ticks = marcas(maxY, 5);
  const tope = ticks[ticks.length - 1];
  const x = (t) => pad.l + (t / T) * (W - pad.l - pad.r);
  const y = (v) => alto - pad.b - (Math.max(0, v) / tope) * (alto - pad.t - pad.b);
  const banda = (a, b) =>
    filas.map((f, i) => `${i ? 'L' : 'M'}${x(meses[i])},${y(f[a])}`).join(' ') + ' ' +
    filas.slice().reverse().map((f, j) => `L${x(meses[filas.length - 1 - j])},${y(f[b])}`).join(' ') + ' Z';
  const linea = (k) => filas.map((f, i) => `${i ? 'L' : 'M'}${x(meses[i])},${y(f[k])}`).join(' ');
  const anios = T / 12;
  const paso = anios <= 6 ? 1 : anios <= 12 ? 2 : anios <= 20 ? 4 : 5;
  const ejeX = [];
  for (let a = 0; a <= anios + 1e-9; a += paso) ejeX.push(a);
  const ultimo = filas[filas.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart" role="img" aria-label="Abanico de percentiles del ahorro real">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={LINEA} />
          <text x={pad.l - 8} y={y(v) + 4} fill={GRIS} fontSize="11" textAnchor="end">{tickM(v)}</text>
        </g>
      ))}
      {ejeX.map((a) => (
        <text key={a} x={x(a * 12)} y={alto - 10} fill={GRIS} fontSize="11" textAnchor="middle">{a === 0 ? 'Hoy' : `${a} ${a === 1 ? 'año' : 'años'}`}</text>
      ))}
      <path d={banda(0, 4)} fill={MORADO} fillOpacity=".12" />
      <path d={banda(1, 3)} fill={MORADO} fillOpacity=".22" />
      {trayectorias && tr.map((p, j) => (
        <path key={j} d={p.map((v, i) => `${i ? 'L' : 'M'}${x(meses[i])},${y(v)}`).join(' ')} fill="none" stroke={MORADO} strokeOpacity=".16" strokeWidth="1" />
      ))}
      <path d={linea(2)} fill="none" stroke={OSCURO} strokeWidth="2.6" />
      <line x1={pad.l} x2={W - pad.r} y1={y(meta)} y2={y(meta)} stroke={ROJO} strokeDasharray="6 5" strokeWidth="1.6" />
      <text x={pad.l + 6} y={y(meta) - 7} fill={ROJO} fontSize="12" fontWeight="600">Meta {fM(meta)} (pesos de hoy)</text>
      <text x={W - pad.r - 4} y={Math.max(y(ultimo[4]) - 7, 12)} fill={OSCURO} fontSize="11.5" textAnchor="end">P95 {fM(ultimo[4])}</text>
      <text x={W - pad.r - 4} y={y(ultimo[2]) - 7} fill={OSCURO} fontSize="12" fontWeight="600" textAnchor="end">Mediana {fM(ultimo[2])}</text>
      <text x={W - pad.r - 4} y={y(ultimo[0]) + 16} fill={OSCURO} fontSize="11.5" textAnchor="end">P5 {fM(ultimo[0])}</text>
    </svg>
  );
}

// ------------------------------------------------------------------ histograma del valor final
export function Hist({ bins, meta, W = 900, alto = 280 }) {
  const pad = { l: 10, r: 10, t: 14, b: 30 };
  const maxC = Math.max(...bins.map((d) => d.n));
  const bw = (W - pad.l - pad.r) / bins.length;
  const xv = (v) => {
    const lo = bins[0].desde, hi = bins[bins.length - 1].hasta;
    return pad.l + ((v - lo) / (hi - lo)) * (W - pad.l - pad.r);
  };
  const cada = Math.ceil(bins.length / 6);
  const enRango = meta >= bins[0].desde && meta <= bins[bins.length - 1].hasta;
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart" role="img" aria-label="Histograma del valor final en pesos de hoy">
      {bins.map((d, i) => {
        const bh = (d.n / maxC) * (alto - pad.t - pad.b);
        const sobre = (d.desde + d.hasta) / 2 >= meta;
        return <rect key={i} x={pad.l + i * bw + 1.5} y={alto - pad.b - bh} width={bw - 3} height={bh} rx="3" fill={sobre ? '#7c3aed' : '#dcd6ec'} />;
      })}
      {bins.map((d, i) => (i % cada === 0 ? (
        <text key={i} x={pad.l + i * bw + bw / 2} y={alto - 10} fill={GRIS} fontSize="11" textAnchor="middle">{fM(d.desde, 0)}</text>
      ) : null))}
      {enRango && (<>
        <line x1={xv(meta)} x2={xv(meta)} y1={pad.t} y2={alto - pad.b} stroke={ROJO} strokeDasharray="6 5" strokeWidth="1.6" />
        <text x={xv(meta) + 6} y={pad.t + 10} fill={ROJO} fontSize="12" fontWeight="600">Meta</text>
      </>)}
    </svg>
  );
}

// ------------------------------------------------------------------ barras de probabilidad (sensibilidades)
export function BarrasP({ items, objetivo = 0.8, W = 900, alto = 270 }) {
  const pad = { l: 10, r: 10, t: 30, b: 46 };
  const bw = (W - pad.l - pad.r) / items.length;
  const y = (v) => alto - pad.b - v * (alto - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart" role="img" aria-label="Probabilidad de llegar a la meta según el escenario">
      <line x1={pad.l} x2={W - pad.r} y1={y(objetivo)} y2={y(objetivo)} stroke={ROJO} strokeDasharray="5 4" />
      <text x={pad.l + 2} y={y(objetivo) - 6} fill={ROJO} fontSize="11">Objetivo {Math.round(objetivo * 100)} %</text>
      {items.map((d, i) => (
        <g key={i}>
          <rect x={pad.l + i * bw + bw * 0.18} y={y(d.p)} width={bw * 0.64} height={Math.max(2, y(0) - y(d.p))} rx="6" fill={d.base ? OSCURO : '#a78bfa'} />
          <text x={pad.l + i * bw + bw / 2} y={y(d.p) - 7} fill="#16131f" fontSize="13" fontWeight="600" textAnchor="middle">{pc(d.p, 1)}</text>
          <text x={pad.l + i * bw + bw / 2} y={alto - 26} fill="#4b4760" fontSize="11.5" textAnchor="middle">{d.etq}</text>
          <text x={pad.l + i * bw + bw / 2} y={alto - 10} fill={GRIS} fontSize="11" textAnchor="middle">{d.sub}</text>
        </g>
      ))}
    </svg>
  );
}

// ------------------------------------------------------------------ convergencia de la probabilidad estimada
export function Convergencia({ datos, W = 900, alto = 300, final }) {
  const pad = { l: 50, r: 16, t: 14, b: 34 };
  const nMax = datos[datos.length - 1].n, nMin = datos[0].n;
  const lx = (n) => pad.l + ((Math.log(n) - Math.log(nMin)) / (Math.log(nMax) - Math.log(nMin))) * (W - pad.l - pad.r);
  const lo = Math.max(0, Math.min(...datos.map((d) => d.p - d.e)));
  const hi = Math.min(1, Math.max(...datos.map((d) => d.p + d.e)));
  const y = (v) => alto - pad.b - ((v - lo) / (hi - lo || 1)) * (alto - pad.t - pad.b);
  const area = datos.map((d, i) => `${i ? 'L' : 'M'}${lx(d.n)},${y(Math.min(hi, d.p + d.e))}`).join(' ') + ' ' +
    datos.slice().reverse().map((d) => `L${lx(d.n)},${y(Math.max(lo, d.p - d.e))}`).join(' ') + ' Z';
  const ejeN = [10, 100, 1000, 10000, 100000].filter((n) => n >= nMin && n <= nMax);
  const filas = marcas(hi - lo, 4).map((v) => lo + v).filter((v) => v <= hi + 1e-9);
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart" role="img" aria-label="Convergencia de la probabilidad estimada al aumentar las simulaciones">
      {filas.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={LINEA} />
          <text x={pad.l - 8} y={y(v) + 4} fill={GRIS} fontSize="11" textAnchor="end">{pc(v, 0)}</text>
        </g>
      ))}
      {ejeN.map((n) => (
        <text key={n} x={lx(n)} y={alto - 12} fill={GRIS} fontSize="11" textAnchor="middle">{n.toLocaleString('es-CO')}</text>
      ))}
      <path d={area} fill={MORADO} fillOpacity=".16" />
      <path d={datos.map((d, i) => `${i ? 'L' : 'M'}${lx(d.n)},${y(d.p)}`).join(' ')} fill="none" stroke={OSCURO} strokeWidth="2.4" />
      {final != null && <line x1={pad.l} x2={W - pad.r} y1={y(final)} y2={y(final)} stroke={ROJO} strokeDasharray="5 4" />}
      <text x={W - pad.r} y={alto - 1} fill={GRIS} fontSize="11" textAnchor="end">número de simulaciones (escala logarítmica)</text>
    </svg>
  );
}

// ------------------------------------------------------------------ demos pedagógicas
// Estimar π lanzando puntos al azar en un cuadrado
export function PuntosPi({ puntos, W = 420 }) {
  const s = W - 20;
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="chart" style={{ maxWidth: 420 }} role="img" aria-label="Puntos aleatorios dentro de un cuadrado y un círculo">
      <rect x="10" y="10" width={s} height={s} fill="#fff" stroke="#d6d3e0" />
      <circle cx={10 + s / 2} cy={10 + s / 2} r={s / 2} fill="none" stroke="#d6d3e0" />
      {puntos.map((p, i) => <circle key={i} cx={10 + p[0] * s} cy={10 + p[1] * s} r="2.1" fill={p[2] ? MORADO : '#c9c3dc'} />)}
    </svg>
  );
}

// Nube de puntos de dos variables correlacionadas
export function NubeCorr({ pares, W = 420 }) {
  const s = W - 40, c = W / 2, esc = s / 8;
  return (
    <svg viewBox={`0 0 ${W} ${W}`} className="chart" style={{ maxWidth: 420 }} role="img" aria-label="Nube de puntos de dos variables con correlación">
      <line x1="20" x2={W - 20} y1={c} y2={c} stroke={LINEA} /><line y1="20" y2={W - 20} x1={c} x2={c} stroke={LINEA} />
      {pares.map((p, i) => <circle key={i} cx={c + p[0] * esc} cy={c - p[1] * esc} r="2.4" fill={MORADO} fillOpacity=".5" />)}
      <text x={W - 22} y={c - 6} fill={GRIS} fontSize="11" textAnchor="end">variable 1</text>
      <text x={c + 6} y="30" fill={GRIS} fontSize="11">variable 2</text>
    </svg>
  );
}

// Trayectorias de reversión a la media
export function Reversion({ rutas, b, W = 560, alto = 260 }) {
  const pad = { l: 44, r: 12, t: 12, b: 26 };
  const T = rutas[0].length - 1;
  const todos = rutas.flat().concat([b]);
  const lo = Math.min(...todos), hi = Math.max(...todos);
  const x = (t) => pad.l + (t / T) * (W - pad.l - pad.r);
  const y = (v) => alto - pad.b - ((v - lo) / (hi - lo || 1)) * (alto - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart" role="img" aria-label="Trayectorias que revierten a la media">
      <line x1={pad.l} x2={W - pad.r} y1={y(b)} y2={y(b)} stroke={ROJO} strokeDasharray="5 4" />
      <text x={W - pad.r} y={y(b) - 6} fill={ROJO} fontSize="11" textAnchor="end">nivel de largo plazo b</text>
      {rutas.map((r, j) => <path key={j} d={r.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={MORADO} strokeOpacity=".5" strokeWidth="1.4" />)}
      <text x={pad.l - 6} y={y(hi) + 4} fill={GRIS} fontSize="11" textAnchor="end">{(hi * 100).toFixed(1).replace('.', ',')} %</text>
      <text x={pad.l - 6} y={y(lo) + 4} fill={GRIS} fontSize="11" textAnchor="end">{(lo * 100).toFixed(1).replace('.', ',')} %</text>
      <text x={x(T / 2)} y={alto - 6} fill={GRIS} fontSize="11" textAnchor="middle">meses</text>
    </svg>
  );
}
