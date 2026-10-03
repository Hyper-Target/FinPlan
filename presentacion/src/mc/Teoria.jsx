import { useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Simple, Bloque, ComoLeer } from '../components/ui.jsx';
import { PuntosPi, NubeCorr, Reversion } from './graficos.jsx';
import { CAL, crearRng } from './motor.js';

const tex = String.raw;
function F({ t, b = false }) {
  const html = katex.renderToString(t, { displayMode: b, throwOnError: false });
  return <span className={b ? 'f-bloque' : 'f-en'} dangerouslySetInnerHTML={{ __html: html }} />;
}
const Formula = ({ t, nota }) => (<div className="f-caja"><F t={t} b />{nota && <div className="f-nota">{nota}</div>}</div>);
const pct = (x, d = 2) => (x * 100).toFixed(d).replace('.', ',') + ' %';

// ------------------------------------------------------------------ demos
function DemoPi() {
  const [n, setN] = useState(500);
  const [semilla, setSemilla] = useState(1);
  const pts = useMemo(() => {
    const r = crearRng(semilla * 7919);
    return Array.from({ length: 5000 }, () => { const x = r.unif(), y = r.unif(); return [x, y, (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.25]; });
  }, [semilla]);
  const vis = pts.slice(0, n);
  const dentro = vis.filter((p) => p[2]).length;
  const est = (4 * dentro) / n;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="demo-pi">
        <PuntosPi puntos={vis} />
        <div>
          <h3>Estimar π con puntos al azar</h3>
          <p>Se lanzan puntos uniformes en un cuadrado de lado 1. La fracción que cae dentro del círculo inscrito converge a π/4.</p>
          <F t={tex`\hat{\pi}_N = 4\cdot\frac{\#\{\text{puntos dentro}\}}{N}`} b />
          <div className="in-desliz" style={{ marginTop: 10 }}><input type="range" min={10} max={5000} step={10} value={n} onChange={(e) => setN(+e.target.value)} /><b>N = {n.toLocaleString('es-CO')}</b></div>
          <table className="t tabla2" style={{ marginTop: 10 }}><tbody>
            <tr><td>Estimación</td><td className="n"><b>{est.toFixed(4).replace('.', ',')}</b></td></tr>
            <tr><td>Valor verdadero</td><td className="n">3,1416</td></tr>
            <tr><td>Error</td><td className="n"><b>{Math.abs(est - Math.PI).toFixed(4).replace('.', ',')}</b></td></tr>
          </tbody></table>
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setSemilla((s) => s + 1)}>Otra semilla</button>
        </div>
      </div>
      <ComoLeer>con pocos puntos la estimación cambia mucho de una semilla a otra. Al aumentar N se acerca a π y el error se reduce más o menos con la raíz de N. La simulación de ahorro funciona igual, con una función más complicada que &laquo;estar dentro del círculo&raquo;.</ComoLeer>
    </div>
  );
}

function DemoReversion() {
  const [a, setA] = useState(0.0156);
  const rutas = useMemo(() => {
    const r = crearRng(11);
    const out = [];
    for (let j = 0; j < 8; j++) {
      const y = [0.15]; let v = 0.15;
      for (let t = 0; t < 120; t++) { v += a * (0.10 - v) + 0.0076 * r.normal(); y.push(v); }
      out.push(y);
    }
    return out;
  }, [a]);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Reversión a la media</h3>
      <p>Ocho trayectorias simuladas de una tasa que parte de 15 % y tiene nivel de largo plazo de 10 %. Mueva la velocidad de reversión.</p>
      <div className="in-desliz" style={{ margin: '8px 0' }}><input type="range" min={0.002} max={0.3} step={0.002} value={a} onChange={(e) => setA(+e.target.value)} /><b>a = {a.toFixed(3).replace('.', ',')}</b></div>
      <Reversion rutas={rutas} b={0.10} />
      <ComoLeer>con a pequeño la tasa tarda años en volver a su nivel de largo plazo (el CDT calibrado tiene a = 0,0156, una vida media de unos 44 meses). Con a grande vuelve en pocos meses (la inflación calibrada tiene a = 0,215, unos 3 meses).</ComoLeer>
    </div>
  );
}

function DemoCorr() {
  const [rho, setRho] = useState(-0.5);
  const pares = useMemo(() => {
    const r = crearRng(5);
    return Array.from({ length: 500 }, () => { const z1 = r.normal(), z2 = r.normal(); return [z1, rho * z1 + Math.sqrt(1 - rho * rho) * z2]; });
  }, [rho]);
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="demo-pi">
        <NubeCorr pares={pares} />
        <div>
          <h3>De shocks independientes a correlacionados</h3>
          <p>Para dos variables, la factorización de Cholesky tiene una forma explícita:</p>
          <F t={tex`X_1 = Z_1,\qquad X_2 = \rho\,Z_1 + \sqrt{1-\rho^2}\;Z_2`} b />
          <div className="in-desliz" style={{ marginTop: 10 }}><input type="range" min={-0.95} max={0.95} step={0.05} value={rho} onChange={(e) => setRho(+e.target.value)} /><b>ρ = {rho.toFixed(2).replace('.', ',')}</b></div>
          <p style={{ marginTop: 10 }}>En los datos, COLCAP y dólar tienen ρ ≈ {CAL.corr[0][1].toFixed(2).replace('.', ',')}: cuando la bolsa cae, el dólar tiende a subir.</p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ página
export default function Teoria() {
  const nombres = ['COLCAP', 'TRM', 'CDT', 'IPC'];
  const mc = CAL.corr;
  const col = (v) => {
    const a = Math.min(1, Math.abs(v)); return v === 1 ? '#ede9fe' : v < 0 ? `rgba(207,63,63,${a * 0.5})` : `rgba(109,40,217,${a * 0.5})`;
  };
  const vm = (a) => Math.log(2) / -Math.log(1 - a);
  return (<>
    <Simple>Antes de simular conviene saber qué se está calculando y por qué se puede confiar en el resultado. Esta página recorre las matemáticas del modelo, en el orden en que el código las usa, con demostraciones que se pueden mover.</Simple>

    <Bloque titulo="1. La idea: un promedio de futuros posibles" sub="El método de Monte Carlo sustituye una integral difícil por un promedio de simulaciones.">
      <div className="grid g2">
        <div className="card">
          <h3>Esperanza como promedio</h3>
          <p>Se busca el valor esperado de una cantidad que depende de variables aleatorias <F t="X" />, por ejemplo el ahorro final. Se generan N muestras independientes <F t="X_1,\dots,X_N" /> y se promedia:</p>
          <F t={tex`E[g(X)]\;\approx\;\frac{1}{N}\sum_{k=1}^{N} g(X_k)`} b />
        </div>
        <div className="card destacada">
          <h3>Una probabilidad es un caso particular</h3>
          <p>Si <F t={tex`g(X)=\mathbf{1}\{V\ge M\}`} /> vale 1 cuando el ahorro final <F t="V" /> alcanza la meta <F t="M" /> y 0 en otro caso, su esperanza es la probabilidad de llegar a la meta:</p>
          <F t={tex`\hat{p}=\frac{1}{N}\sum_{k=1}^{N}\mathbf{1}\{V_k\ge M\}`} b />
        </div>
      </div>
      <DemoPi />
    </Bloque>

    <Bloque titulo="2. Cuántas simulaciones hacen falta" sub="El error del método se puede calcular. No depende de qué tan complicado sea el modelo.">
      <div className="grid g2">
        <div className="card">
          <h3>Ley de los grandes números y teorema central del límite</h3>
          <p>El promedio converge al valor esperado cuando N crece (ley de los grandes números). Además, su error se distribuye aproximadamente normal con desviación <F t={tex`\sigma/\sqrt{N}`} /> (teorema central del límite).</p>
          <F t={tex`\mathrm{EE}(\hat{\mu})=\frac{\sigma}{\sqrt{N}}`} b />
        </div>
        <div className="card">
          <h3>Intervalo de confianza de una probabilidad</h3>
          <p>Para <F t="\hat{p}" /> cada simulación es un ensayo Bernoulli, de modo que:</p>
          <F t={tex`\hat{p}\;\pm\;1{,}96\sqrt{\frac{\hat{p}\,(1-\hat{p})}{N}}`} b />
          <p>Es el intervalo del 95 % que aparece junto a la probabilidad en el simulador.</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table className="t"><thead><tr><th>Simulaciones N</th><th className="n">Error máximo (95 %), p = 50 %</th><th>Lectura</th></tr></thead><tbody>
          {[[100, 'Solo orienta'], [1000, 'Sirve para explorar'], [10000, 'El que usa RiskLive'], [100000, 'Casi sin ruido'], [1000000, 'Rara vez necesario']].map(([n, l]) => (
            <tr key={n}><td><b>{n.toLocaleString('es-CO')}</b></td><td className="n">± {(196 * 0.5 / Math.sqrt(n)).toFixed(2).replace('.', ',')} pp</td><td>{l}</td></tr>))}
        </tbody></table>
        <ComoLeer>para reducir el error a la mitad hay que multiplicar por cuatro el número de simulaciones. Con 10.000 escenarios la probabilidad queda con una precisión cercana a un punto porcentual.</ComoLeer>
      </div>
    </Bloque>

    <Bloque titulo="3. Cómo genera números aleatorios el computador" sub="Son pseudoaleatorios: una secuencia determinista que se comporta como azar.">
      <div className="grid g3">
        <div className="card"><h3>Semilla</h3><p>Un generador parte de un número inicial, la semilla, y produce una secuencia reproducible de uniformes <F t="U\sim[0,1)" />. Con la misma semilla el resultado es idéntico, por eso RiskLive usa la semilla 42. Cambiarla muestra cuánto varía el resultado por azar.</p></div>
        <div className="card"><h3>Uniforme a normal</h3><p>La transformación de Box–Muller convierte dos uniformes independientes en dos normales estándar independientes:</p>
          <F t={tex`Z_1=\sqrt{-2\ln U_1}\cos(2\pi U_2)`} b /><F t={tex`Z_2=\sqrt{-2\ln U_1}\sin(2\pi U_2)`} b /></div>
        <div className="card"><h3>Colas gruesas: t de Student</h3><p>Para eventos extremos más frecuentes que en la normal, se divide la normal por una raíz de chi-cuadrada y se reescala para que la varianza siga siendo 1:</p>
          <F t={tex`Z_t=\frac{Z}{\sqrt{W/\nu}}\sqrt{\frac{\nu-2}{\nu}},\; W\sim\chi^2_\nu`} b /></div>
      </div>
    </Bloque>

    <Bloque titulo="4. El modelo de cada variable" sub="Cuatro variables de mercado, calibradas con 10 años de datos mensuales del Banco de la República, la Superfinanciera y el DANE.">
      <div className="grid g2">
        <div className="card">
          <h3>COLCAP y dólar: retornos lognormales</h3>
          <p>El retorno logarítmico mensual se modela normal. Así el precio nunca es negativo.</p>
          <F t={tex`\ln\frac{P_t}{P_{t-1}}=\mu+\sigma Z_t\;\Rightarrow\; R_t=e^{\mu+\sigma Z_t}-1`} b />
          <p>Se estiman con la media y la desviación muestral de los retornos de la ventana. El retorno esperado incluye la corrección por varianza:</p>
          <F t={tex`E[R_t]=e^{\mu+\sigma^2/2}-1`} b />
        </div>
        <div className="card">
          <h3>CDT e inflación: reversión a la media</h3>
          <p>Las tasas y la inflación no suben ni bajan sin límite. Se modelan con un proceso de Vasicek en tiempo discreto:</p>
          <F t={tex`y_t=y_{t-1}+a\,(b-y_{t-1})+\sigma Z_t`} b />
          <p>El parámetro <F t="b" /> es el nivel de largo plazo, <F t="a" /> la velocidad con que se regresa a él y <F t="\sigma" /> la volatilidad. Se estiman por mínimos cuadrados con la regresión <F t={tex`\Delta y_t=\alpha+\beta y_{t-1}+\varepsilon_t`} />, de donde <F t={tex`a=-\beta`} />, <F t={tex`b=\alpha/a`} /> y <F t={tex`\sigma=\mathrm{std}(\varepsilon)`} />.</p>
        </div>
      </div>
      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card"><h3>Hacia dónde va la tasa</h3>
          <F t={tex`E[y_t\mid y_0]=b+(y_0-b)(1-a)^t`} b />
          <F t={tex`\text{vida media}=\frac{\ln 2}{-\ln(1-a)}\ \text{meses}`} b />
          <p>Con los valores calibrados: CDT, <b>{vm(CAL.CDT.a).toFixed(0)} meses</b>; inflación, <b>{vm(CAL.IPC.a).toFixed(1).replace('.', ',')} meses</b>.</p></div>
        <div className="card"><h3>Dispersión a largo plazo</h3>
          <F t={tex`\mathrm{Var}(y_\infty)=\frac{\sigma^2}{a\,(2-a)}`} b />
          <p>A diferencia de un paseo aleatorio, la varianza no crece sin fin: la reversión la acota. Además el código impone un mínimo y un máximo mensual a la tasa y a la inflación.</p></div>
      </div>
      <DemoReversion />
      <div className="card" style={{ marginTop: 16 }}>
        <h3>De la tasa de mercado al rendimiento que recibe el ahorrador</h3>
        <p>La tasa efectiva anual se convierte a mensual y se descuenta la retención <F t="\tau" /> sobre el rendimiento:</p>
        <F t={tex`R^{cdt}_t=\Big[(1+y_t)^{1/12}-1\Big](1-\tau),\qquad y_t=x_t+\text{prima}`} b />
        <p>Donde <F t="x_t" /> es la tasa del sistema simulada y la prima es la diferencia observada hoy entre la mejor entidad y el promedio.</p>
      </div>
    </Bloque>

    <Bloque titulo="5. Variables que se mueven juntas" sub="Simular cada variable por separado ignoraría que la bolsa y el dólar suelen moverse en sentido contrario.">
      <div className="grid g2">
        <div className="card">
          <h3>Factorización de Cholesky</h3>
          <p>Si <F t="C" /> es la matriz de correlación de los shocks y <F t={tex`C=LL^{\top}`} /> su factorización de Cholesky, entonces para un vector <F t="Z" /> de normales independientes:</p>
          <F t={tex`\tilde Z=LZ\;\Rightarrow\;\mathrm{Corr}(\tilde Z)=C`} b />
          <p>La matriz debe ser definida positiva. El código lo verifica y, si no lo fuera, la corrige recortando autovalores. Con los datos actuales el autovalor mínimo es 0,46, así que no hizo falta.</p>
        </div>
        <div className="card">
          <h3>Correlaciones calibradas</h3>
          <table className="t tabla2 corr"><thead><tr><th /> {nombres.map((n) => <th key={n} className="n">{n}</th>)}</tr></thead><tbody>
            {mc.map((fila, i) => (
              <tr key={i}><td><b>{nombres[i]}</b></td>{fila.map((v, j) => <td key={j} className="n" style={{ background: col(v) }}>{v.toFixed(2).replace('.', ',')}</td>)}</tr>))}
          </tbody></table>
          <p style={{ fontSize: 13.5 }}>Rojo: se mueven en sentido contrario. Morado: en el mismo sentido. La relación más fuerte es COLCAP con dólar.</p>
        </div>
      </div>
      <DemoCorr />
    </Bloque>

    <Bloque titulo="6. El libro de caja del ahorro" sub="Cada escenario recorre los meses aplicando los retornos simulados. Es la tabla MBASE del modelo del curso, para cada una de las N trayectorias.">
      <div className="grid g2">
        <div className="card">
          <h3>Saldo de cada activo</h3>
          <p>Con pesos <F t={tex`w_i`} /> para CDT, COLCAP y dólares, el activo <F t="i" /> rinde durante el mes y al final entra el aporte:</p>
          <F t={tex`B^i_t=B^i_{t-1}\,(1+R^i_t)+w_i\,C_t`} b />
          <p>Si hay rebalanceo, antes de rendir el saldo total <F t={tex`B_{t-1}`} /> se reparte otra vez según <F t={tex`w_i`} />.</p>
        </div>
        <div className="card">
          <h3>Aporte y pesos de hoy</h3>
          <p>La inflación acumulada es <F t={tex`\Pi_t=\prod_{s\le t}(1+\pi_s)`} />. Si el aporte crece con la inflación, y siempre para convertir a pesos de hoy:</p>
          <F t={tex`C_t=A\,\Pi_{t-1},\qquad V^{real}_t=\frac{\sum_i B^i_t}{\Pi_t}`} b />
          <p>La meta se compara en pesos de hoy, que es lo que importa para el poder de compra.</p>
        </div>
      </div>
    </Bloque>

    <Bloque titulo="7. Qué se mide con los resultados" sub="Con N valores finales se calcula todo lo demás.">
      <div className="card">
        <table className="t"><thead><tr><th>Medida</th><th>Definición</th><th>Cómo leerla</th></tr></thead><tbody>
          <tr><td><b>Probabilidad de meta</b></td><td><F t={tex`\frac{1}{N}\sum \mathbf 1\{V_k\ge M\}`} /></td><td>Fracción de escenarios en que se llega</td></tr>
          <tr><td><b>Percentil p</b></td><td><F t={tex`q_p`} />: valor bajo el cual queda p % de los resultados</td><td>P5 es un caso malo razonable, P50 el típico</td></tr>
          <tr><td><b>Ganancia real</b></td><td><F t={tex`G_k=V_k-\sum_t C_t/\Pi_t`} /></td><td>Valor final menos lo aportado, en pesos de hoy</td></tr>
          <tr><td><b>VaR 95 %</b></td><td><F t={tex`-q_5(G)`} /></td><td>Pérdida que se supera en solo 5 % de los casos. Negativo: aún hay ganancia</td></tr>
          <tr><td><b>CVaR 95 %</b></td><td><F t={tex`-E[G\mid G\le q_5(G)]`} /></td><td>Pérdida media dentro del peor 5 %</td></tr>
          <tr><td><b>Caída máxima</b></td><td><F t={tex`\max_t\Big(1-\frac{V_t}{\max_{s\le t}V_s}\Big)`} /></td><td>Peor caída desde un máximo previo del saldo real</td></tr>
          <tr><td><b>Probabilidad de pérdida real</b></td><td><F t={tex`P(G<0)`} /></td><td>Terminar con menos de lo aportado</td></tr>
        </tbody></table>
      </div>
    </Bloque>

    <Bloque titulo="8. Dos atajos matemáticos" sub="Hacen que cambiar el ahorro o el aporte en la web sea instantáneo.">
      <div className="grid g2">
        <div className="card">
          <h3>Linealidad</h3>
          <p>El saldo final es lineal en el ahorro inicial <F t="S_0" /> y en el aporte <F t="A" />, porque los retornos no dependen de cuánto se invierte:</p>
          <F t={tex`V_k=S_0\,f_{0,k}+A\,f_{1,k}`} b />
          <p>Se simula una vez con <F t="(S_0,A)=(1,0)" /> y otra con <F t="(0,1)" />. Cualquier otra combinación sale de una suma, sin repetir la simulación.</p>
        </div>
        <div className="card">
          <h3>Aporte necesario para una probabilidad</h3>
          <p>En cada escenario, el aporte que justo alcanza la meta es:</p>
          <F t={tex`A_k=\frac{M-S_0 f_{0,k}}{f_{1,k}}`} b />
          <p>Para llegar con probabilidad 80 % basta el cuantil 80 % de esos aportes. Es la solución exacta de buscar el aporte por bisección, y los tests lo comprueban.</p>
        </div>
      </div>
    </Bloque>

    <Bloque titulo="9. Supuestos y límites" sub="Un modelo es útil cuando se conoce dónde deja de serlo.">
      <div className="grid g2">
        <div className="card"><h3>Supuestos del modelo</h3><ul className="lista">
          <li>El futuro se parece a los últimos 10 años en promedio, volatilidad y correlaciones.</li>
          <li>Los shocks de meses distintos son independientes. Solo el CDT y la inflación tienen memoria, mediante la reversión.</li>
          <li>Las correlaciones son constantes. En crisis suelen subir.</li>
          <li>Los parámetros se toman como conocidos, aunque se estiman con error.</li>
          <li>No se incluyen comisiones ni impuestos distintos de la retención del CDT.</li>
        </ul></div>
        <div className="card destacada"><h3>Qué dicen los datos sobre la normalidad</h3>
          <p>La prueba de Jarque–Bera rechaza la normalidad de los retornos del COLCAP: asimetría de −1,56 y curtosis en exceso de 8,06. Hay más pérdidas extremas de las que supone la normal. Por eso existe la opción de colas gruesas (t de Student) y conviene comparar ambos resultados antes de concluir.</p>
          <p>Para el dólar no se rechaza la normalidad al 5 % (valor p = 0,057).</p></div>
      </div>
    </Bloque>

    <Bloque titulo="10. Parámetros que usa hoy" sub={`Calibración del ${CAL.fecha}, ventana de 10 años, datos mensuales.`}>
      <div className="card">
        <table className="t"><thead><tr><th>Variable</th><th>Parámetro</th><th className="n">Valor</th><th>Fuente</th></tr></thead><tbody>
          <tr><td rowSpan={2}><b>COLCAP</b></td><td>Retorno log mensual medio μ</td><td className="n">{pct(CAL.COLCAP.mu)}</td><td rowSpan={2}>Banco de la República, serie 6</td></tr>
          <tr><td>Volatilidad mensual σ</td><td className="n">{pct(CAL.COLCAP.sigma)}</td></tr>
          <tr><td rowSpan={2}><b>Dólar (TRM)</b></td><td>Variación log mensual media μ</td><td className="n">{pct(CAL.TRM.mu)}</td><td rowSpan={2}>Banco de la República, serie 1</td></tr>
          <tr><td>Volatilidad mensual σ</td><td className="n">{pct(CAL.TRM.sigma)}</td></tr>
          <tr><td rowSpan={4}><b>CDT</b></td><td>Tasa de partida (mejor de hoy)</td><td className="n">{pct(CAL.CDT.x0 + CAL.CDT.spread)} EA</td><td rowSpan={4}>Superfinanciera y Banco de la República, serie 240</td></tr>
          <tr><td>Nivel de largo plazo b</td><td className="n">{pct(CAL.CDT.b)} EA</td></tr>
          <tr><td>Velocidad a</td><td className="n">{CAL.CDT.a.toFixed(4).replace('.', ',')}</td></tr>
          <tr><td>Volatilidad mensual σ</td><td className="n">{pct(CAL.CDT.sigma)}</td></tr>
          <tr><td rowSpan={4}><b>Inflación</b></td><td>Inflación de partida</td><td className="n">{pct(Math.pow(1 + CAL.IPC.pi0, 12) - 1)} anual</td><td rowSpan={4}>DANE y meta de inflación del Banco de la República</td></tr>
          <tr><td>Nivel de largo plazo b</td><td className="n">{pct(Math.pow(1 + CAL.IPC.b, 12) - 1)} anual</td></tr>
          <tr><td>Velocidad a</td><td className="n">{CAL.IPC.a.toFixed(3).replace('.', ',')}</td></tr>
          <tr><td>Volatilidad mensual σ</td><td className="n">{pct(CAL.IPC.sigma)}</td></tr>
        </tbody></table>
      </div>
      <div style={{ marginTop: 18 }}><a className="btn primary" href="#/simulador">Ir al simulador en vivo →</a></div>
    </Bloque>
  </>);
}
