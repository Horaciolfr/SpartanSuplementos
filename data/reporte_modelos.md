# REPORTE DE ENTRENAMIENTO DE MODELOS PREDICTIVOS (ML)
**Proyecto:** Spartan Suplementos Bolivia — Módulo ERP Predictivo (Tarea 11)  
**Semilla Determinista:** 42  
**Muestras de Entrenamiento:** 951 registros  

## 1. Configuración de Hiperparámetros de Modelos
- `n_estimators`: 300
- `min_samples_split`: 10
- `min_samples_leaf`: 5
- `random_state`: 42
- `n_jobs`: 1

## 2. Artefactos Generados y Registro de Versionamiento
| Algoritmo | Archivo Joblib | SHA-256 | ID Versión BD | Aprobado Producción |
|---|---|---|---|---|
| **RF_REGRESOR_DEMANDA** | `modelo_demanda_v1.joblib` | `b71f186f3829973813476f23e46d85f9a624248b74a2035851b7d5c374fca2ef` | 243 | FALSE |
| **RF_CLASIFICADOR_QUIEBRE** | `modelo_quiebre_v1.joblib` | `b68f8a8663caa9a054a6be7411c03c46cb8eed6cb366ded0080c0d933ccec754` | 244 | FALSE |

## 3. Top-10 Feature Importances: Modelo A (Demanda Próxima Semana)
| Ranking | Feature | Importancia Relativa | Importancia % |
|---|---|---|---|
| 1 | `ventas_ultimos_30_dias` | 0.824601 | 82.46% |
| 2 | `ventas_ultimos_7_dias` | 0.065490 | 6.55% |
| 3 | `promo_activa` | 0.057406 | 5.74% |
| 4 | `precio_unitario` | 0.027416 | 2.74% |
| 5 | `dia_semana` | 0.009268 | 0.93% |
| 6 | `stock_actual` | 0.008662 | 0.87% |
| 7 | `stock_seguridad` | 0.003288 | 0.33% |
| 8 | `somatotipo_ECTOMORFO` | 0.001709 | 0.17% |
| 9 | `somatotipo_MESOMORFO` | 0.000897 | 0.09% |
| 10 | `somatotipo_ENDOMORFO` | 0.000723 | 0.07% |

*Suma total de importancias:* 1.000000 (tolerancia 1e-6 = 1.000000)

## 4. Top-10 Feature Importances: Modelo B (Riesgo Quiebre de Stock)
| Ranking | Feature | Importancia Relativa | Importancia % |
|---|---|---|---|
| 1 | `stock_actual` | 0.555537 | 55.55% |
| 2 | `ventas_ultimos_7_dias` | 0.178037 | 17.80% |
| 3 | `ventas_ultimos_30_dias` | 0.177384 | 17.74% |
| 4 | `stock_seguridad` | 0.034447 | 3.44% |
| 5 | `precio_unitario` | 0.024783 | 2.48% |
| 6 | `dia_semana` | 0.009740 | 0.97% |
| 7 | `categoria_SUPLEMENTOS` | 0.005940 | 0.59% |
| 8 | `categoria_INDUMENTARIA` | 0.004289 | 0.43% |
| 9 | `somatotipo_ECTOMORFO` | 0.002619 | 0.26% |
| 10 | `somatotipo_MESOMORFO` | 0.002573 | 0.26% |

*Suma total de importancias:* 1.000000 (tolerancia 1e-6 = 1.000000)
