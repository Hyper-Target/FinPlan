# FinPlan

Skills de agente para finanzas personales en Colombia, con datos oficiales en vivo, y la presentación que explica cómo construirlas. Proyecto de Planeación Financiera (Maestría en Finanzas, Universidad del Norte) de Luis D. Peñaranda y Leydis Niebles.

Toda corrida entrega dos archivos: un Excel con fórmulas vivas y un informe en Markdown que lo interpreta.

## Qué hay aquí

| Carpeta | Contenido |
|---|---|
| `skills/PlanFin/CDTLive` | Compara los CDT de 28 bancos y fintech con las tasas que reportan a la Superfinanciera. Replica el cálculo del simulador de CDT de Davivienda |
| `skills/PlanFin/RiskLive` | Monte Carlo de un portafolio de CDT, COLCAP y dólares calibrado con 10 años de datos. Parte del Model Risk del curso |
| `skills/PlanFin/_shared` | Fuentes verificadas, convenciones y la librería común (tasas, descargas, Excel) |
| `skills/PlanFin/_prompts` | Los prompts con los que se construyeron las skills y la guía para pedir bien |
| `salidas/` | Una corrida real de cada skill (Excel e informe) |
| `presentacion/` | La web y las diapositivas, en React. Incluye el guion de cada expositor y el PDF |

## Usar las skills

Requisitos: Python 3.10 o superior.

```bash
pip install requests openpyxl pandas numpy scipy truststore pytest
python skills/PlanFin/CDTLive/scripts/cdtlive.py --monto 10000000 --plazo 360 --periodicidad vencimiento
python skills/PlanFin/RiskLive/scripts/risklive.py --aporte 1000000 --meta 80000000 --horizonte 5 --pesos 60,25,15
python -m pytest skills/PlanFin/CDTLive/tests skills/PlanFin/RiskLive/tests -q
```

Cada skill trae un `SKILL.md` con los pasos para que la ejecute un agente. Se copian a `.agents/skills/` (Gemini CLI y Codex) o a `.claude/skills/` (Claude Code).

La validación contra Excel (recalcular el libro y comparar con Python) solo corre en Windows con Excel instalado; en otros equipos se omite y el script lo avisa.

## Ver la presentación

```bash
cd presentacion
npm install
npm run dev
```

Abra http://localhost:5173. Las diapositivas están en `#/slides`. Los guiones están en `presentacion/entregables/`.

## Fuentes de datos

Todas públicas: datos.gov.co (Superfinanciera), Banco de la República (Suameca) y DANE. El catálogo con cada enlace verificado está en `skills/PlanFin/_shared/fuentes.md`.

Educación financiera, no asesoría de inversión.
