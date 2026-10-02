import R from '../data/resultados.json';
import { fPct } from './ui.jsx';

const COLOR = { 'Banco tradicional': '#c9c1e0', 'Banco digital': '#8b5cf6', Fintech: '#5b21b6' };
export const COLOR_CATEGORIA = COLOR;

// Barras horizontales: rentabilidad neta EA por entidad
export function BarrasCDT({ n = 12, alto = 420, W = 600 }) {
  const datos = R.cdt.slice(0, n);
  const pad = { l: 215, r: 64, t: 8, b: 26 };
  const fila = (alto - pad.t - pad.b) / datos.length;
  const min = 0.105, max = Math.max(...datos.map((d) => d.RentNetaEA)) * 1.01;
  const x = (v) => pad.l + ((v - min) / (max - min)) * (W - pad.l - pad.r);
  // promedio del sistema (BanRep 12,08 %) pasado por el mismo cálculo neto que las entidades
  const sistema = Math.pow(1 + (Math.pow(1.1208, 360 / 365) - 1) * 0.96, 365 / 360) - 1;
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart">
      {[0.11, 0.12, 0.13].map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={pad.t} y2={alto - pad.b} stroke="#eceaf2" />
          <text x={x(t)} y={alto - 6} fill="#85809a" fontSize="11" textAnchor="middle">{fPct(t, 0)}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const y = pad.t + i * fila;
        const nombre = d.MarcaComercial && !d.Entidad.toLowerCase().includes(d.MarcaComercial.toLowerCase())
          ? `${d.Entidad} (${d.MarcaComercial})` : d.Entidad;
        return (
          <g key={d.Entidad}>
            <text x={pad.l - 10} y={y + fila / 2 + 4} fill="#4b4760" fontSize="13" textAnchor="end">{nombre}</text>
            <rect x={x(min)} y={y + fila * 0.18} width={x(d.RentNetaEA) - x(min)} height={fila * 0.64} rx="5" fill={COLOR[d.Categoria]} />
            <text x={x(d.RentNetaEA) + 8} y={y + fila / 2 + 4} fill="#16131f" fontSize="12.5" fontWeight="600">{fPct(d.RentNetaEA)}</text>
          </g>
        );
      })}
      <line x1={x(sistema)} x2={x(sistema)} y1={pad.t} y2={alto - pad.b} stroke="#d64545" strokeDasharray="5 4" strokeWidth="1.5" />
      
    </svg>
  );
}

export function LeyendaCategorias() {
  return (
    <div className="leyenda">
      {Object.entries(COLOR).map(([k, c]) => <span key={k}><i style={{ background: c }} />{k}</span>)}
      <span><i style={{ background: 'transparent', borderTop: '2px dashed #d64545', height: 0, borderRadius: 0 }} />Promedio neto del sistema (BanRep)</span>
    </div>
  );
}

// Fan chart del saldo real (percentiles 5-95) con la meta
export function FanChart({ alto = 360, meta = 80e6, W = 560 }) {
  const pm = R.pctMes; // [mes][P5,P25,P50,P75,P95]
  const pad = { l: 50, r: 16, t: 14, b: 30 };
  const maxY = 100e6;
  const x = (i) => pad.l + (i / (pm.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => alto - pad.b - (v / maxY) * (alto - pad.t - pad.b);
  const banda = (a, b) =>
    pm.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[a])}`).join(' ') + ' ' +
    pm.slice().reverse().map((p, j) => `L${x(pm.length - 1 - j)},${y(p[b])}`).join(' ') + ' Z';
  const linea = (k) => pm.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[k])}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart">
      <defs>
        <linearGradient id="fanA" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#8b5cf6" stopOpacity=".35" /><stop offset="1" stopColor="#8b5cf6" stopOpacity=".08" /></linearGradient>
      </defs>
      {[0, 20e6, 40e6, 60e6, 80e6, 100e6].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#eceaf2" />
          <text x={pad.l - 8} y={y(t) + 4} fill="#85809a" fontSize="11" textAnchor="end">{t / 1e6} M</text>
        </g>
      ))}
      {[0, 12, 24, 36, 48, 60].map((m) => (
        <text key={m} x={x(m)} y={alto - 8} fill="#85809a" fontSize="11" textAnchor="middle">{m === 0 ? 'Mes 0' : m}</text>
      ))}
      <path d={banda(0, 4)} fill="url(#fanA)" />
      <path d={banda(1, 3)} fill="#8b5cf6" fillOpacity=".28" />
      <path d={linea(2)} fill="none" stroke="#5b21b6" strokeWidth="2.5" />
      <line x1={pad.l} x2={W - pad.r} y1={y(meta)} y2={y(meta)} stroke="#d64545" strokeDasharray="6 5" strokeWidth="1.6" />
      <text x={pad.l + 6} y={y(meta) - 7} fill="#d64545" fontSize="12" fontWeight="600">Meta $80 M (pesos de hoy)</text>
      <text x={x(60) - 4} y={y(pm[60][0]) + 18} fill="#5b21b6" fontSize="12" fontWeight="600" textAnchor="end">Mediana a los 5 años: $76,9 M</text>
    </svg>
  );
}

// Histograma del valor real final
export function Histograma({ alto = 300, meta = 80e6, W = 560 }) {
  const h = R.hist;
  const pad = { l: 10, r: 10, t: 10, b: 28 };
  const maxC = Math.max(...h.map((d) => d.Corridas));
  const bw = (W - pad.l - pad.r) / h.length;
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart">
      {h.map((d, i) => {
        const bh = (d.Corridas / maxC) * (alto - pad.t - pad.b);
        const sobre = (d.Desde + d.Hasta) / 2 >= meta;
        return <rect key={i} x={pad.l + i * bw + 1.5} y={alto - pad.b - bh} width={bw - 3} height={bh} rx="3" fill={sobre ? '#7c3aed' : '#dcd6ec'} />;
      })}
      {h.filter((_, i) => i % 6 === 0).map((d) => {
        const i = h.indexOf(d);
        return <text key={i} x={pad.l + i * bw + bw / 2} y={alto - 8} fill="#85809a" fontSize="11" textAnchor="middle">${d.Centro} M</text>;
      })}
    </svg>
  );
}

// Sensibilidad al aporte: barras verticales de P(meta)
export function SensAporte({ alto = 280, W = 560 }) {
  const s = R.sensAporte;
  const pad = { l: 10, r: 10, t: 30, b: 44 };
  const bw = (W - pad.l - pad.r) / s.length;
  const y = (v) => alto - pad.b - v * (alto - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${alto}`} className="chart">
      <line x1={pad.l} x2={W - pad.r} y1={y(0.8)} y2={y(0.8)} stroke="#d64545" strokeDasharray="5 4" />
      <text x={pad.l + 2} y={y(0.8) - 6} fill="#d64545" fontSize="11">Objetivo 80 %</text>
      {s.map((d, i) => {
        const base = d.CambioAporte === 0;
        return (
          <g key={i}>
            <rect x={pad.l + i * bw + bw * 0.18} y={y(d.PMeta)} width={bw * 0.64} height={Math.max(2, y(0) - y(d.PMeta))} rx="6"
              fill={base ? '#5b21b6' : '#a78bfa'} />
            <text x={pad.l + i * bw + bw / 2} y={y(d.PMeta) - 7} fill="#16131f" fontSize="13" fontWeight="600" textAnchor="middle">{fPct(d.PMeta, 1)}</text>
            <text x={pad.l + i * bw + bw / 2} y={alto - 24} fill="#4b4760" fontSize="11.5" textAnchor="middle">${(d.AporteMensual / 1e6).toFixed(1).replace('.', ',')} M</text>
            <text x={pad.l + i * bw + bw / 2} y={alto - 8} fill="#85809a" fontSize="11" textAnchor="middle">{d.CambioAporte === 0 ? 'actual' : `${d.CambioAporte > 0 ? '+' : ''}${Math.round(d.CambioAporte * 100)} %`}</text>
          </g>
        );
      })}
    </svg>
  );
}
