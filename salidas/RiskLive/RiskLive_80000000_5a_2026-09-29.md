# RiskLive: aporte de $1.000.000 al mes durante 5 años

Datos al corte: 2026-09-25 · Consulta: 2026-09-29 23:12 · Simulaciones: 10.000 · Semilla: 42
Excel de soporte: `RiskLive_80000000_5a_2026-09-29.xlsx`

## 1. Resultado en una línea

Con $1.000.000 al mes durante 5 años, hay 31,8 % de probabilidad de llegar a $80.000.000 (pesos de hoy); la mediana es $76.928.501.

## 2. Qué supuestos usó el agente hoy

Portafolio: 60 % CDT, 25 % COLCAP y 15 % dólares. Rebalanceo mensual; el aporte crece con la inflación.

| Variable | Valor | Fuente | Fecha del dato |
|---|---|---|---|
| Mejor tasa de CDT a 360 días hoy | 13,46 % | Banco Pichincha (Superfinanciera, corte 2026-09-25) | 2026-09-25 |
| Tasa de CDT a 360 días del sistema | 12,08 % | BanRep Suameca | 2026-09-25 |
| Tasa de política monetaria | 12,00 % | BanRep Suameca | 2026-09-29 |
| IBR a 3 meses | 11,54 % | BanRep Suameca | 2026-09-29 |
| Meta de inflación | 3,00 % | BanRep Suameca | 2026-08-31 |
| Inflación a 12 meses (IPC) | 6,25 % | DANE, archivo de índices del IPC | 2026-08-31 |
| Último COLCAP | 2.558,92 | BanRep Suameca | 2026-09-29 |
| Última TRM | 3.349,63 | BanRep Suameca | 2026-09-29 |

La simulación parte de la mejor tasa de CDT a 360 días (13,46 %) y de una inflación de 6,25 % que converge a la meta de 3,00 %. El promedio del sistema es 12,08 % y la tasa de política monetaria, 12,00 %.

## 3. Distribución del resultado

Valor real final en pesos de hoy (la meta es $80.000.000):

| Indicador | Valor real final (pesos de hoy) |
|---|---|
| Percentil 5 (peor caso razonable) | $66.949.562 |
| Percentil 25 | $72.633.770 |
| Mediana | $76.928.501 |
| Percentil 75 | $81.340.500 |
| Percentil 95 | $88.411.988 |
| Media | $77.178.811 |
| Aportes reales medios (ahorro inicial más aportes) | $64.842.409 |

- Probabilidad de llegar a la meta: 31,8 %.
- Valor en riesgo al 95 % de la ganancia real: -$2.167.232; CVaR al 95 %: $68.105. Aun en el peor 5 % de los casos hay ganancia real.
- Probabilidad de terminar con menos poder adquisitivo del aportado: 2,1 %.
- Caída máxima del saldo real desde su máximo previo: mediana 0,2 %, percentil 95 1,4 %.

La mediana del valor real es $76.928.501, por debajo de la meta de $80.000.000, y la probabilidad de alcanzarla es 31,8 %. El peor caso razonable (percentil 5) es $66.949.562 y solo 2,1 % de las corridas termina con menos poder adquisitivo del aportado.

## 4. Qué mueve el resultado

Sensibilidad al aporte mensual (misma simulación, mismos shocks):

| Cambio del aporte | Aporte mensual | P(meta) | Mediana del valor real |
|---|---|---|---|
| -30 % | $700.000 | 0,0 % | $55.896.163 |
| -20 % | $800.000 | 0,3 % | $62.902.427 |
| -10 % | $900.000 | 5,6 % | $69.919.153 |
| 0 % | $1.000.000 | 31,8 % | $76.928.501 |
| +10 % | $1.100.000 | 71,7 % | $83.952.236 |
| +20 % | $1.200.000 | 93,6 % | $90.960.372 |
| +30 % | $1.300.000 | 99,2 % | $97.969.657 |

Sensibilidad al peso en COLCAP (el resto se reparte entre CDT y dólares en su proporción original):

| Peso en COLCAP | Peso en CDT | Peso en dólares | P(meta) | Mediana | Percentil 5 |
|---|---|---|---|---|---|
| 0 % | 80 % | 20 % | 35,6 % | $77.691.870 | $67.587.989 |
| 10 % | 72 % | 18 % | 32,4 % | $77.338.931 | $68.280.536 |
| 20 % | 64 % | 16 % | 31,4 % | $77.081.452 | $67.691.709 |
| 30 % | 56 % | 14 % | 32,1 % | $76.791.239 | $65.937.275 |
| 40 % | 48 % | 12 % | 33,3 % | $76.310.400 | $63.473.125 |
| 50 % | 40 % | 10 % | 34,2 % | $75.916.590 | $60.759.686 |
| 60 % | 32 % | 8 % | 35,0 % | $75.332.016 | $57.926.241 |

Subir el aporte un 10 % lleva la probabilidad de 31,8 % a 71,7 %, mientras que bajarlo un 10 % la deja en 5,6 %. Con más COLCAP la mediana baja (de $77.691.870 con 0 % a $75.332.016 con 60 %) y el percentil 5 cae de $67.587.989 a $57.926.241.

## 5. Cómo llegar al 80 %

- Aporte mensual necesario para 80 % de probabilidad de llegar a $80.000.000: $1.127.533.
- Aporte actual: $1.000.000; diferencia: $127.533 al mes (más que el actual).

Para 80 % de probabilidad hace falta aportar $1.127.533 al mes. Son $127.533 más que los $1.000.000 actuales.

## 6. Relación con el modelo del profe

El archivo `Model Risk.xlsx` del curso es una plantilla: trae la estructura del modelo y las series históricas, pero no incluye la calibración ni la simulación. RiskLive conserva esa estructura y agrega lo que falta.

| En el Model Risk del profe | En RiskLive |
|---|---|
| Hoja `Model`: variables `Asset`, `Principal`, `Term`, `Freq`, `m`, `EAR`, `NOM`, `PerRate`, `Disbursement`, `nInstallments`, `Installment`, `Perspective` | Las mismas variables en `Modelo_Base` con perspectiva `Investor`: `Asset` es el ahorro inicial, `nInstallments` los meses y `Installment` el aporte. `EAR`, `NOM` y `PerRate` salen como la TIR implícita del flujo |
| Tabla `MBASE`: Period, Date, Inflow, Outflow, NetCF, InitialBalance, Interest, Balance | Tabla `TModelo` con las mismas columnas, más el detalle por activo |
| Hoja `Fundamentales`: series históricas TRM, IBR, UVR y SMMLV | Series calibradas en vivo: TRM, COLCAP y CDT a 360 días del BanRep, IPC del DANE y mejor tasa de CDT de la Superfinanciera |
| Resumen de escenario: `LastBalance`, `TIR_PER`, `Sum Xfd` | `LastBalance`, `PerRate` y `SumXfd`, con la validación ΣXfd = 0 en `Controles` |
| Módulo 5: valor esperado, dispersión, distribución del VPN y Monte Carlo | Valor real final en lugar del VPN; P(no cumplir la meta) equivale a P(VPN < 0) |

## 7. Limitaciones

- Normalidad de los retornos mensuales: COLCAP: Jarque-Bera 373,5 (valor p 0,000), asimetría -1,56, curtosis en exceso 8,06; se rechaza la normalidad. TRM: Jarque-Bera 5,7 (valor p 0,057), asimetría 0,22, curtosis en exceso 0,98; no se rechaza la normalidad. La simulación base usa retornos logarítmicos normales; con `--dist t` se usan colas más pesadas.
- Ventana histórica de 10 años (119 observaciones mensuales como mínimo): el pasado no garantiza el futuro, y la media histórica del COLCAP puede sobrestimar o subestimar el rendimiento esperado.
- Las correlaciones se estiman con todo el periodo; en crisis las correlaciones entre activos suelen subir.
- La tasa de CDT es el promedio ponderado de lo que las entidades pagaron (Superfinanciera), no la tasa de cartelera; la renta fija se modela como una escalera que rota mensualmente.
- No se modelan impuestos distintos de la retención sobre el rendimiento del CDT (ni ganancia ocasional, ni renta, ni GMF), ni costos de comisión, ni el rendimiento de tener dólares en efectivo.
- Los aportes y el rebalanceo se hacen sin fricciones y a fin de mes.

## 8. Advertencia

Educación financiera, no asesoría de inversión.

## 9. Fuentes

- COLCAP: https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie=6 (consulta 2026-09-29 23:12)
- TRM: https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie=1 (consulta 2026-09-29 23:12)
- CDT 360 días (sistema): https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie=240 (consulta 2026-09-29 23:12)
- Mejor CDT 360 días (Superfinanciera): https://www.datos.gov.co/resource/axk9-g2nh.json?$where=fechacorte>='2026-09-18T00:00:00.000' AND uca in('1')&$limit=50000 (consulta 2026-09-29 23:12)
- IPC total nacional (DANE): https://www.dane.gov.co/files/operaciones/IPC/ago2026/anex-IPC-Indices-ago2026.xlsx (consulta 2026-09-29 23:12)
- Meta de inflación (BanRep): https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie=853 (consulta 2026-09-29 23:12)
- BanRep Suameca serie 59: https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie=59 (consulta 2026-09-29 23:12)
- BanRep Suameca serie 243: https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService/consultaInformacionSerie?idSerie=243 (consulta 2026-09-29 23:12)
