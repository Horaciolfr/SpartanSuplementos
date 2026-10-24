# REPORTE DE PARTICIÓN TEMPORAL DE DATOS (TRAIN / TEST)
**Proyecto:** Spartan Suplementos Bolivia — Módulo ERP Predictivo  
**Criterio de Partición:** Temporal (Meses 1-10 Train / Meses 11-12 Test)  
**Semilla Determinista:** 42  

## 1. Justificación Metodológica de No-Fuga (Leakage Temporal)
En series de demanda y gestión de inventarios, el split aleatorio filtra información del futuro hacia el entrenamiento (data leakage temporal), inflando artificialmente las métricas de evaluación. La partición cronológica garantiza que los modelos evalúen exclusivamente horizontes futuros nunca antes vistos.

## 2. Resumen de Dimensiones y Rangos Temporales
| Partición | Registros (n) | % del Total | Fecha Inicio | Fecha Fin | Meses Cubiertos |
|---|---|---|---|---|---|
| **Dataset Completo** | 1123 | 100.0% | 2025-01-01 | 2025-12-31 | Enero - Diciembre (1-12) |
| **Train** | 951 | 84.7% | 2025-01-01 | 2025-10-31 | Enero - Octubre (1-10) |
| **Test** | 172 | 15.3% | 2025-11-01 | 2025-12-31 | Noviembre - Diciembre (11-12) |

## 3. Distribución de Clases (riesgo_quiebre_stock)
| Partición | Clase 0 (Sin Riesgo) | Clase 1 (Riesgo Quiebre) | % Clase 1 | Observación |
|---|---|---|---|---|
| **Train** | 407 (42.80%) | 544 (57.20%) | 57.20% | Clase minoritaria > 5% (sin sobremuestreo artificial) |
| **Test** | 72 (41.86%) | 100 (58.14%) | 58.14% | N >= 30 por clase (100 >= 30) |

## 4. Integridad Criptográfica (SHA-256)
- **data/train.csv:** `dd135f8bd5a378846a52a9ef194f46663dcba1ff55f083d3050a52af5de8978d`
- **data/test.csv:** `067547bb1e2f7699ba8bfc75332ade7425efc72c550c17723ac2d7e5d5cdb21d`
