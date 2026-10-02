# Referencia: el Model Risk del profe y cómo lo toma RiskLive

Documento del Paso 0. Describe lo que hay realmente en los archivos del curso (revisados el 29-sep-2026) y explica qué se conservó, qué se agregó y por qué.

## 1. Qué hay en los archivos del profe

Archivos revisados:

| Archivo | Qué es |
|---|---|
| `OneDrive_1_25-9-2026/Profe/260925 Model Risk.xlsx` | Modelo de clase del 25-sep-2026 |
| `OneDrive_1_25-9-2026/Herramientas/Model Risk.xlsx` | Plantilla del profe |
| `Model Eval Proyectos (1).xlsx` | Libro de trabajo de clase con el modelo ya usado en ejercicios (10-5 a 10-8) |
| `Clase 19 Septiembre 26.xlsx` | Ecuación de valor y modelo de flujos con `Tabla1` |
| `PLANEACIÓN FINANCIERA MFi 2026.pdf` | Programa: el módulo 5 cubre riesgo, distribuciones del VPN y Monte Carlo |

**Hallazgo principal:** los dos `Model Risk.xlsx` son idénticos entre sí y están **vacíos de simulación**. Traen la estructura del modelo y las series históricas de mercado, pero ninguna celda de entrada ni de resultado, ni distribuciones aleatorias, ni tabla de datos, ni gráficas. Es el esqueleto sobre el que se construye el análisis de riesgo. RiskLive conserva esa estructura y agrega la calibración y el Monte Carlo.

### Hojas de `Model Risk.xlsx`

| Hoja | Propósito | Contenido |
|---|---|---|
| `Fundamentales` | Series históricas de mercado | Tablas `TUVR` (DATE, UVR), `TTRM` (DATE, TRM, desde 1991), `TIBR` (DATE, IBRT, IBRD) y `TSMM` (YEAR, SMMLV, Index). Los datos llegan hasta julio de 2024 |
| `Dataset` | Nomenclatura de tasas | Tabla `TTIMES`: Time base, m, Adjective, Noun, NOM, Periodic (Year 1 NAAV/EA, Semester 2 NASV/ES, Four-month 3 NACV/EC, Quarter 4 NATV/ET, Bimester 6 NABV/EB, Month 12 NAMV/EM, Bimonth 24 NAQV/EQ, Week 52 NAWV/EW, Day 365 NADV/ED) |
| `Model` | Modelo de flujo de caja | Tabla de variables (Item, Description, Variable, Value, Unit) y la tabla `MBASE` |

### Tabla de variables (hoja `Model`, columnas B a F)

| Item | Description | Variable (nombre definido, ámbito hoja) |
|---|---|---|
| 1 | Type of asset | (texto) |
| 2 | Value of the asset | `Asset` |
| 3 | Downpayment (%) | `DownpaymentP` |
| 4 | Downpayment ($) | `Downpayment` |
| 5 | Value of the credit | `Principal` |
| 6 | Term (years) | `Term` |
| 7 | Frequency of payments | `Freq` |
| 8 | Number of payments per year | `m` |
| 9 | Effective annual rate (EAR) | `EAR` |
| 10 | Nominal annual rate | `NOM` |
| 11 | Periodic rate | `PerRate` |
| 12 | Disbursement date | `Disbursement` |
| 13 | Number of installments | `nInstallments` |
| 14 | Value of the installment | `Installment` |
| 15 | Perspective | (texto: Investor / Lender / Borrower) |

Nombres globales: `listado` y `ListadoFreq`, ambos `TTIMES[Adjective]`.

### Tabla `MBASE` (hoja `Model`, G21:O22)

Columnas: `Period`, `Date`, `Inflow`, `Outflow`, `NetCF`, `InitialBalance`, `Interest`, `Balance`, `Repayment`. Sin fórmulas ni filas de datos en las plantillas.

### Cómo se usa el modelo en los ejercicios (`Model Eval Proyectos (1).xlsx`, hoja `Model`)

Fórmulas literales del profe:

```
Frecuencia (F10):   =XLOOKUP(Freq,TTIMES[Adjective],TTIMES[Noun],,0)
m (E11):            =XLOOKUP(Freq,TTIMES[Adjective],TTIMES[m],,0)
Downpayment (E7):   =Asset*DownpaymentP
Principal (E8):     =Asset-Downpayment
NOM (E13):          =NOMINAL(EAR,m)
PerRate (E14):      =(1+EAR)^(1/m)-1

MBASE[Date]:            =EDATE(Disbursement,MBASE[[#This Row],[Period]]*12/m)
MBASE[Outflow] (t=0):   =(MBASE[[#This Row],[Period]]=0)*Principal
MBASE[NetCF]:           =MBASE[[#This Row],[Inflow]]-MBASE[[#This Row],[Outflow]]
MBASE[VPk]:             =+PV(PerRate,MBASE[[#This Row],[Period]],,-MBASE[[#This Row],[NetCF]])
MBASE[InitialBalance]:  =N(Q21)                       (el Balance de la fila anterior)
MBASE[Interest]:        =MBASE[[#This Row],[InitialBalance]]*PerRate
MBASE[Balance]:         =MBASE[[#This Row],[InitialBalance]]+MBASE[[#This Row],[Interest]]+MBASE[[#This Row],[Outflow]]-MBASE[[#This Row],[Inflow]]
MBASE[Repayment]:       =(MBASE[[#This Row],[Inflow]]-MBASE[[#This Row],[Outflow]]>MBASE[[#This Row],[Interest]])*(MBASE[[#This Row],[Inflow]]-MBASE[[#This Row],[Outflow]]-MBASE[[#This Row],[Interest]])

Resultados:
VPN Proyecto (K15):   =+K22+NPV(PerRate,K23:K26)
VP LastBalance (K16): =+PV(PerRate,nInstallments,,LastBalance)
SUM VPk (K17):        =+SUM(MBASE[VPk])
TIR PER (K18):        =+IRR(MBASE[NetCF])
```

Nombres de resultado del resumen de escenario (Administrador de escenarios): `LastBalance`, `LastInflow`, `TIR_PER`, `VPN_Proyecto`.

### Modelo de la Clase 19 (`Clase 19 Septiembre 26.xlsx`)

```
Sum Xfd (F4):      =SUM(Tabla1[Xfd])
FCN (E8):          =Tabla1[[#This Row],[Inflow]]-Tabla1[[#This Row],[Outflow]]
Xfd (F8):          =Tabla1[[#This Row],[FCN]]*(1+PerRate)^(fd-Tabla1[[#This Row],[Period]])
InitialBalance:    =IF(Tabla1[[#This Row],[Period]]=0,0,I8)
Interests (H9):    =Tabla1[[#This Row],[InitialBalance]]*PerRate
Balance (I9):      =Tabla1[[#This Row],[InitialBalance]]+Tabla1[[#This Row],[Interests]]+Tabla1[[#This Row],[Outflow]]-Tabla1[[#This Row],[Inflow]]
```

`fd` es la fecha focal; la ecuación de valor se cumple cuando `Sum Xfd = 0` (se resuelve con Buscar objetivo).

### Módulo 5 del programa

"Riesgo e incertidumbre en las decisiones financieras; valor esperado y medidas de dispersión; distribuciones de probabilidad aplicadas a proyectos; valor esperado y distribución del VPN; simulación de Monte Carlo; interpretación de resultados y análisis de riesgo; toma de decisiones bajo incertidumbre." RAE 5: sustentar decisiones bajo incertidumbre con herramientas de evaluación del riesgo y simulación.

## 2. Mapeo del modelo del profe a RiskLive

La perspectiva es la del inversionista (`Investor`): el ahorrador entrega dinero (Outflow) y al final recibe el valor acumulado (Inflow).

| En el Model Risk del profe | En RiskLive (hoja `Modelo_Base`) |
|---|---|
| `Asset` / `Principal` (valor invertido en t = 0) | Ahorro inicial (`AhorroInicial`) |
| `Term`, `Freq`, `m` | Horizonte en años, `Freq = Monthly`, `m = 12` |
| `nInstallments`, `Installment` | Número de aportes (meses) y aporte mensual inicial |
| `Disbursement` | Fecha de inicio (`FechaInicio`) |
| `EAR`, `NOM`, `PerRate` (entradas) | Salidas: `PerRate = IRR(TModelo[NetCF])`, `EAR = (1+PerRate)^m − 1`, `NOM = m·((1+EAR)^(1/m) − 1)`. La tasa implícita del portafolio reemplaza la tasa única del crédito |
| `MBASE`: Period, Date, Inflow, Outflow, NetCF, InitialBalance, Interest, Balance | `TModelo` con las mismas columnas. `Outflow` = ahorro inicial en t = 0 y aportes al final de cada mes; `Inflow` = liquidación en el horizonte |
| `Balance = InitialBalance + Interest + Outflow − Inflow` | Idéntica. `Interest` es la suma de los intereses de CDT, COLCAP y USD |
| `Interest = InitialBalance · PerRate` (tasa constante) | `Interest = Σ (saldo inicial del activo · rendimiento del activo en el mes)`, porque cada activo rinde distinto |
| `LastBalance` (debe cerrar en cero) | `LastBalance`, cero tras liquidar |
| `TIR PER = IRR(NetCF)` | `PerRate` |
| `Sum Xfd = 0` | `SumXfd = 0`, con `fd = (1+PerRate)^(−Period)`; se valida en `Controles` |
| `VPN Proyecto` | **Valor real final**: saldo final deflactado con la inflación acumulada (en pesos de hoy) |
| `P(VPN < 0)` (módulo 5) | **P(no cumplir la meta)** = 1 − P(valor real final ≥ meta) |
| `Fundamentales`: TRM, IBR, UVR, SMMLV (hasta jul-2024) | Series calibradas en vivo desde el BanRep: TRM, COLCAP, CDT a 360 días e IBR; IPC del DANE; mejor tasa de CDT de la Superfinanciera |
| `Dataset` / `TTIMES` (EM, NAMV…) | La conversión de tasas usa `_shared/scripts/tasas.py`, que implementa la misma tabla |
| Distribución del VPN y Monte Carlo (módulo 5) | Simulación de 10.000 corridas con shocks correlacionados; percentiles, VaR, CVaR y fan chart |

Lo que RiskLive **agrega** porque el archivo del profe no lo trae: calibración con datos en vivo, distribuciones de los activos, correlaciones, generación de shocks con semilla fija, hoja de resultados, sensibilidad y controles de integridad. Lo que **no cambia**: nombres de variables, nombres de columnas, la identidad del saldo y la validación ΣXfd = 0.

## 3. Decisiones de diseño que se apartan del profe

| Decisión | Motivo |
|---|---|
| Una tasa por activo en vez de una `PerRate` única de entrada | Un portafolio de CDT, COLCAP y dólares no tiene una sola tasa; la tasa única se recupera como salida (`PerRate = IRR`) |
| Aportes al final del periodo, ahorro inicial en t = 0 | Es la convención del `MBASE` del profe (periodo 0 = desembolso; cuotas vencidas) |
| El Monte Carlo corre en Python y no con fórmulas `RAND()` en Excel | Con 10.000 corridas y 60 a 360 meses, una hoja con `RAND()` sería lenta, no reproducible y cambiaría en cada recálculo. Python usa semilla fija; el Excel muestra una muestra de 1.000 corridas y deja `Modelo_Base` con fórmulas vivas del escenario esperado |
| Los resultados de la simulación completa no son fórmulas | Se dejan como valores de la corrida, y `Controles` (C10) avisa si el usuario edita los parámetros después |
