# RiskLive: aporte de {{APORTE}} al mes durante {{ANIOS}} años

Datos al corte: {{FECHA_DATOS}} · Consulta: {{FECHA_CONSULTA}} · Simulaciones: {{NSIM}} · Semilla: {{SEED}}
Excel de soporte: `{{EXCEL}}`

## 1. Resultado en una línea

{{RESULTADO_UNA_LINEA}}

## 2. Qué supuestos usó el agente hoy

Portafolio: {{PORTAFOLIO}}. Rebalanceo {{REBALANCEO}}; el aporte {{CRECIMIENTO}}.

{{TABLA_SUPUESTOS}}

{{INTERPRETACION_SUPUESTOS}}

## 3. Distribución del resultado

Valor real final en pesos de hoy (la meta es {{META}}):

{{TABLA_PERCENTILES}}

{{BLOQUE_DISTRIBUCION}}

{{INTERPRETACION_DISTRIBUCION}}

## 4. Qué mueve el resultado

Sensibilidad al aporte mensual (misma simulación, mismos shocks):

{{TABLA_SENS_APORTE}}

Sensibilidad al peso en COLCAP (el resto se reparte entre CDT y dólares en su proporción original):

{{TABLA_SENS_COLCAP}}

{{INTERPRETACION_SENSIBILIDAD}}

## 5. Cómo llegar al 80 %

{{BLOQUE_OBJETIVO}}

{{INTERPRETACION_OBJETIVO}}

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

{{LIMITACIONES}}

## 8. Advertencia

{{ADVERTENCIA}}

## 9. Fuentes

{{FUENTES}}
