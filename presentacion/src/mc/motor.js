// Motor Monte Carlo de RiskLive en JavaScript.
// Es la misma lógica de skills/PlanFin/RiskLive/scripts/simulacion.py (shocks correlacionados, reversión a la media,
// lognormales, libro de caja mensual, linealidad), para que la web pueda simular en el navegador.
// Diferencia buscada: el generador de números aleatorios. Python usa PCG64 (numpy) y aquí mulberry32, así que con la
// misma semilla los resultados coinciden en el orden de magnitud y difieren en décimas por error de muestreo.

// ------------------------------------------------------------------ calibración de la corrida del 29-sep-2026
export const CAL = {
  fecha: '29 de septiembre de 2026',
  COLCAP: { mu: 0.005398243302054333, sigma: 0.05838797413546559 },
  TRM: { mu: 0.001258974659082838, sigma: 0.03594890672189385 },
  CDT: { a: 0.01555162072965532, b: 0.1027993562518545, sigma: 0.00757623472079284, x0: 0.1208, spread: 0.0138, min: 0.005, max: 0.30 },
  IPC: { a: 0.215072963784099, b: 0.002466269772303686, sigma: 0.002841644967227725, pi0: 0.005061245590411101, min: -0.01, max: 0.03 },
  corr: [
    [1, -0.5107773381777182, -0.02187267902925951, 0.1531146349548959],
    [-0.5107773381777182, 1, 0.08315730676542417, 0.03017594136492213],
    [-0.02187267902925951, 0.08315730676542417, 1, 0.2078423666749891],
    [0.1531146349548959, 0.03017594136492213, 0.2078423666749891, 1],
  ],
  dfT: 3.618050148541087,
};

export const copiarCal = () => JSON.parse(JSON.stringify(CAL));

// Resultados de la corrida en Python (semilla 42, 10.000 simulaciones, distribución normal) para contrastar
export const REF_PYTHON = { pMeta: 0.318, mediana: 76.9e6, p5: 66.9e6, aporte80: 1127533 };

// ------------------------------------------------------------------ números aleatorios
export function crearRng(seed) {
  let a = (seed >>> 0) || 1;
  const unif = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let guardado = null;
  const normal = () => {
    if (guardado !== null) { const g = guardado; guardado = null; return g; }
    let u = 0;
    while (u === 0) u = unif();
    const v = unif();
    const r = Math.sqrt(-2 * Math.log(u));
    guardado = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  // Gamma(forma, 1) por Marsaglia-Tsang; chi-cuadrada(df) = 2 * Gamma(df / 2)
  const gamma = (forma) => {
    if (forma < 1) return gamma(forma + 1) * Math.pow(unif() || 1e-12, 1 / forma);
    const d = forma - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x, v;
      do { x = normal(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = unif();
      if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const chi2 = (df) => 2 * gamma(df / 2);
  return { unif, normal, chi2 };
}

export function cholesky(c) {
  const n = c.length;
  const L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = c[i][j];
      for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
      L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j][j];
    }
  }
  return L;
}

// ------------------------------------------------------------------ macro: shocks, inflación, CDT, retornos
// Devuelve arreglos planos (simulación k, mes t) -> índice k*T + t. Orden de shocks: [COLCAP, TRM, CDT, IPC].
export function generarMacro(cal, { n, T, seed, dist = 'normal', dfT = 5, retencion = 0.04 }) {
  const rng = crearRng(seed);
  const L = cholesky(cal.corr);
  const rCdt = new Float32Array(n * T), rCol = new Float32Array(n * T), rUsd = new Float32Array(n * T);
  const cum = new Float32Array(n * (T + 1));
  const { COLCAP: col, TRM: trm, CDT: cdt, IPC: ipc } = cal;
  const esc = Math.sqrt((dfT - 2) / dfT);
  const z = [0, 0, 0, 0];
  for (let k = 0; k < n; k++) {
    let p = ipc.pi0, x = cdt.x0, c = 1;
    cum[k * (T + 1)] = 1;
    for (let t = 0; t < T; t++) {
      for (let i = 0; i < 4; i++) z[i] = rng.normal();
      if (dist === 't') {
        const f = esc / Math.sqrt(rng.chi2(dfT) / dfT);
        for (let i = 0; i < 4; i++) z[i] *= f;
      }
      const zc0 = L[0][0] * z[0];
      const zc1 = L[1][0] * z[0] + L[1][1] * z[1];
      const zc2 = L[2][0] * z[0] + L[2][1] * z[1] + L[2][2] * z[2];
      const zc3 = L[3][0] * z[0] + L[3][1] * z[1] + L[3][2] * z[2] + L[3][3] * z[3];
      p = Math.min(ipc.max, Math.max(ipc.min, p + ipc.a * (ipc.b - p) + ipc.sigma * zc3));
      x = Math.min(cdt.max, Math.max(cdt.min, x + cdt.a * (cdt.b - x) + cdt.sigma * zc2));
      const y = Math.min(cdt.max, Math.max(cdt.min, x + cdt.spread));
      const i = k * T + t;
      rCdt[i] = (Math.pow(1 + y, 1 / 12) - 1) * (1 - retencion);
      rCol[i] = Math.exp(col.mu + col.sigma * zc0) - 1;
      rUsd[i] = Math.exp(trm.mu + trm.sigma * zc1) - 1;
      c *= 1 + p;
      cum[k * (T + 1) + t + 1] = c;
    }
  }
  return { n, T, rCdt, rCol, rUsd, cum };
}

// ------------------------------------------------------------------ cartera: libro de caja mensual
// rebal: 0 ninguno, 1 mensual, 2 anual. `salida` (opcional) recibe el saldo real de cada mes, forma (n, T+1).
export function correr(m, w, S0, A, conIpc, rebal, salida) {
  const { n, T, rCdt, rCol, rUsd, cum } = m;
  const fin = new Float64Array(n), aportes = new Float64Array(n);
  const [w0, w1, w2] = w;
  for (let k = 0; k < n; k++) {
    let b0 = w0 * S0, b1 = w1 * S0, b2 = w2 * S0, ar = S0;
    const ic = k * (T + 1), o = k * T;
    if (salida) salida[ic] = S0;
    for (let t = 1; t <= T; t++) {
      if (rebal === 1 || (rebal === 2 && (t - 1) % 12 === 0)) {
        const s = b0 + b1 + b2; b0 = s * w0; b1 = s * w1; b2 = s * w2;
      }
      b0 *= 1 + rCdt[o + t - 1]; b1 *= 1 + rCol[o + t - 1]; b2 *= 1 + rUsd[o + t - 1];
      const c = A * (conIpc ? cum[ic + t - 1] : 1);
      b0 += w0 * c; b1 += w1 * c; b2 += w2 * c;
      const cu = cum[ic + t];
      if (salida) salida[ic + t] = (b0 + b1 + b2) / cu;
      ar += c / cu;
    }
    fin[k] = (b0 + b1 + b2) / cum[ic + T];
    aportes[k] = ar;
  }
  return { fin, aportes };
}

// Linealidad: valor final = ahorro0 * f0 + aporte * f1. Dos corridas unitarias bastan para cualquier (ahorro0, aporte).
export function corridasUnitarias(m, w, conIpc, rebal, conTrayectorias = true) {
  const T1 = m.T + 1;
  const p0 = conTrayectorias ? new Float32Array(m.n * T1) : null;
  const p1 = conTrayectorias ? new Float32Array(m.n * T1) : null;
  const u0 = correr(m, w, 1, 0, conIpc, rebal, p0);
  const u1 = correr(m, w, 0, 1, conIpc, rebal, p1);
  return { m, u0, u1, p0, p1 };
}

// ------------------------------------------------------------------ estadística
export function percentil(ordenado, p) {
  const idx = (p / 100) * (ordenado.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return ordenado[lo] + (ordenado[hi] - ordenado[lo]) * (idx - lo);
}
const ordenar = (a) => Float64Array.from(a).sort();
const media = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s / a.length; };

export function combinar(unit, S0, A) {
  const { m, u0, u1 } = unit;
  const n = m.n;
  const finReal = new Float64Array(n), aportes = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    finReal[k] = S0 * u0.fin[k] + A * u1.fin[k];
    aportes[k] = S0 * u0.aportes[k] + A * u1.aportes[k];
  }
  return { finReal, aportes };
}

function drawdowns(unit, S0, A) {
  const { m, p0, p1 } = unit;
  const T1 = m.T + 1, dd = new Float64Array(m.n);
  for (let k = 0; k < m.n; k++) {
    let pico = 0, peor = 0;
    for (let t = 0; t < T1; t++) {
      const v = S0 * p0[k * T1 + t] + A * p1[k * T1 + t];
      if (v > pico) pico = v;
      if (pico > 0) { const d = 1 - v / pico; if (d > peor) peor = d; }
    }
    dd[k] = peor;
  }
  return dd;
}

export function estadisticas(unit, S0, A, meta) {
  const { m } = unit;
  const { finReal, aportes } = combinar(unit, S0, A);
  const n = m.n;
  const ord = ordenar(finReal);
  const gan = new Float64Array(n);
  let sobre = 0, perdida = 0;
  for (let k = 0; k < n; k++) { gan[k] = finReal[k] - aportes[k]; if (finReal[k] >= meta) sobre++; if (gan[k] < 0) perdida++; }
  const ganOrd = ordenar(gan);
  const p5g = percentil(ganOrd, 5);
  let sc = 0, nc = 0;
  for (let k = 0; k < n; k++) if (gan[k] <= p5g) { sc += gan[k]; nc++; }
  const mu = media(finReal);
  let v = 0;
  for (let k = 0; k < n; k++) v += (finReal[k] - mu) ** 2;
  const nominal = new Float64Array(n);
  for (let k = 0; k < n; k++) nominal[k] = finReal[k] * m.cum[k * (m.T + 1) + m.T];
  const dd = ordenar(drawdowns(unit, S0, A));
  const pMeta = sobre / n;
  return {
    n, pMeta,
    ic95: 1.96 * Math.sqrt(Math.max(pMeta * (1 - pMeta), 1e-12) / n),
    pct: { 5: percentil(ord, 5), 25: percentil(ord, 25), 50: percentil(ord, 50), 75: percentil(ord, 75), 95: percentil(ord, 95) },
    media: mu, desv: Math.sqrt(v / (n - 1)),
    nominalMediana: percentil(ordenar(nominal), 50),
    aportesMedio: media(aportes),
    gananciaMediana: percentil(ganOrd, 50),
    var95: -p5g, cvar95: -(sc / nc),
    pPerdida: perdida / n,
    ddMediana: percentil(dd, 50), ddP95: percentil(dd, 95),
    finReal, ord,
  };
}

// Aporte mínimo con P(valor real >= meta) >= objetivo: cuantil del aporte que cada simulación exigiría.
export function aporteParaProbabilidad(unit, S0, meta, objetivo = 0.8) {
  const { m, u0, u1 } = unit;
  const umbral = [];
  for (let k = 0; k < m.n; k++) umbral.push((meta - S0 * u0.fin[k]) / u1.fin[k]);
  const ord = Float64Array.from(umbral).sort();
  return Math.max(0, percentil(ord, objetivo * 100));
}

export function probabilidadConAporte(unit, S0, A, meta) {
  const { m, u0, u1 } = unit;
  let c = 0;
  for (let k = 0; k < m.n; k++) if (S0 * u0.fin[k] + A * u1.fin[k] >= meta) c++;
  return c / m.n;
}

// Percentiles del saldo real mes a mes (como máximo ~60 puntos en el tiempo) y algunas trayectorias de muestra.
export function abanico(unit, S0, A, muestra = 40) {
  const { m, p0, p1 } = unit;
  const T1 = m.T + 1, paso = Math.max(1, Math.ceil(m.T / 60));
  const meses = [];
  for (let t = 0; t <= m.T; t += paso) meses.push(t);
  if (meses[meses.length - 1] !== m.T) meses.push(m.T);
  const buf = new Float64Array(m.n);
  const filas = meses.map((t) => {
    for (let k = 0; k < m.n; k++) buf[k] = S0 * p0[k * T1 + t] + A * p1[k * T1 + t];
    const o = Float64Array.from(buf).sort();
    return [5, 25, 50, 75, 95].map((p) => percentil(o, p));
  });
  const ns = Math.min(muestra, m.n);
  const trayectorias = [];
  for (let k = 0; k < ns; k++) trayectorias.push(meses.map((t) => S0 * p0[k * T1 + t] + A * p1[k * T1 + t]));
  return { meses, filas, trayectorias };
}

export function histograma(finReal, ord, bins = 30) {
  const lo = percentil(ord, 0.5), hi = percentil(ord, 99.5);
  const ancho = (hi - lo) / bins || 1;
  const cuentas = new Array(bins).fill(0);
  for (let k = 0; k < finReal.length; k++) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor((finReal[k] - lo) / ancho)));
    cuentas[i]++;
  }
  return cuentas.map((c, i) => ({ desde: lo + i * ancho, hasta: lo + (i + 1) * ancho, n: c }));
}

// Probabilidad estimada con las primeras j simulaciones: muestra cómo converge y cuánto se estrecha el intervalo.
export function convergencia(finReal, meta, puntos = 80) {
  const n = finReal.length, salida = [];
  let sobre = 0;
  const marcas = new Set();
  for (let i = 0; i < puntos; i++) marcas.add(Math.max(10, Math.round(Math.pow(n / 10, i / (puntos - 1)) * 10)));
  for (let k = 0; k < n; k++) {
    if (finReal[k] >= meta) sobre++;
    if (marcas.has(k + 1)) {
      const p = sobre / (k + 1), e = 1.96 * Math.sqrt(p * (1 - p) / (k + 1));
      salida.push({ n: k + 1, p, e });
    }
  }
  return salida;
}

export const pesosConColcap = (w, wc) => {
  const resto = 1 - wc, base = w[0] + w[2];
  return base > 0 ? [resto * w[0] / base, wc, resto * w[2] / base] : [resto, wc, 0];
};

// Probabilidad de meta para distintos pesos de COLCAP (reutiliza la misma macro).
export function sensibilidadColcap(m, w, conIpc, rebal, S0, A, meta, niveles = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]) {
  return niveles.map((wc) => {
    const un = corridasUnitarias(m, pesosConColcap(w, wc), conIpc, rebal, false);
    return { wc, p: probabilidadConAporte(un, S0, A, meta) };
  });
}
