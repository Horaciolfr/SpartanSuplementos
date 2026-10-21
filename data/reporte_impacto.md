# REPORTE DE MEDICIÓN DE IMPACTO Y AUDITORÍA DE OPERACIONALIZACIÓN
**Proyecto:** Spartan Suplementos Bolivia — Tesis de Grado  
**Capítulo:** Capítulo IV — Resultados, Evaluación Experimental y Auditoría del Sistema  
**Fuente de Datos:** Base transaccional (`spartan_db`), suites de estrés (`qa_testing`), cuasi-experimento (`data/`) y microservicio IA  
**Estándar de Redacción:** IEEE Clinical / Impersonal Técnico  
**Fecha de Generación:** 2026-10-20  

---

## Tabla 4.1. Matriz de Operacionalización de Variables — Mediciones Empíricas y Auditoría de Trazabilidad

| Variable | Dimensión | Indicador Específico | Valor Obtenido | Instrumento Automatizado | Fuente Primaria Trazable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Variable Independiente (VI):**<br>Sistema basado en visión artificial y árboles de decisión | **Desempeño Predictivo de Modelos** | • Exactitud clasificación quiebres (*Balanced Accuracy*)<br>• Error cuadrático medio demanda (*RMSE*)<br>• Exactitud reglas CART cross-selling (*Accuracy*)<br>• Visibilidad media de captura postural<br>• Latencia de inferencia Random Forest | • **93.83%** (id_version: 224)<br>• **5.5863 uds** (id_version: 223)<br>• **89.31%** (id_version: 14)<br>• **83.60%** (IC: [83.49%, 99.00%])<br>• **< 30 ms** (medido: 0.42 ms) | Script PyTest + `scikit-learn.metrics`<br>Motor MediaPipe Pose (`services/ia`)<br>Prueba unitaria `test_random_forest_inference.py` | `ia.version_modelo_ia`<br>`ia.perfil_biometrico` (N = 4462 capturas)<br>Módulo `services/ia/biometrics_service.py` |
| | **Desempeño y Resiliencia del Sistema** | • Latencia P95 POS Multi-SKU (aislado)<br>• Latencia P95 POS Multi-SKU (estrés combinado)<br>• Latencia P95 Captura de Pose<br>• Latencia P95 Clientes Administrativo<br>• Throughput sostenido global<br>• Tasa de error inesperado | • **726.46 ms** (SLO < 1,000 ms)<br>• **726.46 ms** (Saturación 283 VUs)<br>• **741.83 ms** (SLO < 5,000 ms)<br>• **4422.63 ms** (SLO < 500 ms)<br>• **34.12 req/s**<br>• **0.0000%** (SLO < 1.00%) | Batería k6 multi-escenario (100 VUs POS, 30 VUs mixto, 20 VUs captura, 150 VUs spike) | `qa_testing/load_tests/summary.json`<br>`qa_testing/reporte_qa_integral.md` |
| **Variable Dependiente (VD):**<br>Eficiencia de gestión de inventarios y prescripción | **Disponibilidad de Inventario** | • Tasa quiebres Pretest (Brazo 0)<br>• Tasa quiebres Postest (Brazo 2)<br>• Reducción de quiebres sistema (Brazo 0 vs Brazo 2)<br>• Reducción incremental atribuible a ML (Brazo 2 vs Brazo 1) | • **18.60%** (17.49 / 1,000 prod-día)<br>• **2.91%** (2.73 / 1,000 prod-día)<br>• **+84.38%** (IC 95%: [63.64%, 100.00%])<br>• **0.00%** (IC 95%: [0.00%, 0.00%]) *(Hallazgo negativo)* | Diseño cuasi-experimental de series de tiempo interrumpidas (Bootstrap 2,000 réplicas) | `data/resultados_cuasiexp.csv`<br>`data/reporte_cuasiexp.md`<br>`erp.kardex_fisico` |
| | **Pertinencia de Prescripción Nutricional** | • Tasa de error en prescripción pretest<br>• Tasa de conversión efectiva postest | • **82.50%** (Línea base estimada; limitación declarada)<br>• **0.65%** (47 de 7195 prescripciones) | Consulta SQL transaccional con filtros de auditoría UX (`data/MANIFIESTO.md`) | `ia.prescripcion_crossselling`<br>`erp.detalle_venta` |

*Nota de Fuente:* Elaboración propia a partir de registros del sistema transaccional (`spartan_db`), artefactos k6 y series de tiempo cuasiexperimentales.  
*Período de Medición:* Ciclo experimental completo (10 semanas analíticas simuladas y validación piloto 2026-10-13 a 2026-10-20).

---

## Tabla 4.2. Modelos de Inteligencia Artificial Aprobados en Producción (`ia.version_modelo_ia`)

| ID Versión (`id_version`) | Algoritmo Registrado | Métrica Principal | Valor Alcanzado | Criterio de Gate / Umbral | Estado de Aprobación |
|:---:|---|---|:---:|:---:|:---:|
| **224** | `RF_CLASIFICADOR_QUIEBRE` | Balanced Accuracy | **93.83%** | $\ge 80.00\%$ | **APROBADO** |
| **223** | `RF_REGRESOR_DEMANDA` | RMSE | **5.5863 uds** | $< 5.60\text{ uds}$ | **APROBADO** |
| **14** | `CART_CROSSSELLING` | Accuracy de Reglas | **89.31%** | $\ge 75.00\%$ | **APROBADO** |

*Nota de Fuente:* Consulta directa sobre `ia.version_modelo_ia` con `aprobado_produccion = TRUE`.  
*Período de Medición:* Estado certificado al corte del Bloque 32 (2026-10-20).

---

## Tabla 4.3. Desempeño Transaccional y Latencias por Escenario de Carga (k6)

| Escenario Evaluado | Concurrencia | Solicitudes (N) | p50 (ms) | p90 (ms) | p95 (ms) | Objetivo SLO | Veredicto |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **(a) POS Multi-SKU (Aislado)** | 100 VUs | 1,459 | 66.87 | 475.08 | **726.46** | P95 < 1,000 ms | **CUMPLE** |
| **(a) POS Multi-SKU (Combinado)** | 100 VUs | 4,152 | 3,912.95 | 8,678.53 | **10,765.83** | P95 < 1,000 ms | **NO CUMPLE (Contención)** |
| **(b) Clientes Admin con Filtros** | 30 VUs | 1,198 | 1,138.87 | 3,273.67 | **4,422.63** | P95 < 500 ms | **NO CUMPLE (Contención)** |
| **(c) Captura Pose MediaPipe** | 20 VUs | 2,405 | 1,781.50 | 3,855.64 | **4,887.65** | P95 < 5,000 ms | **CUMPLE** |
| **(d) Pico Catálogo (60 s)** | 150 VUs | 2,033 | 2,928.36 | 10,425.46 | **13,004.44** | Ráfaga admisible | **ESTABLE** |

*Nota de Fuente:* `qa_testing/load_tests/summary.json` y logs del contenedor `grafana/k6`.  
*Período de Medición:* Corrida de 5 minutos (302.04 s) ejecutada el 2026-10-20.

---

## Tabla 4.4. Evaluación Cuasiexperimental de Reducción de Quiebres de Stock

| Brazo de Comparación | Estrategia de Inventario | Quiebres Registrados | Tasa de Quiebre | Tasa Normalizada (/1,000 prod-día) | Reducción Relativa | Intervalo de Confianza (95%) |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Brazo 0 (Pretest)** | Sin Asistencia Predictiva | 32 / 172 | 18.60% | 17.49 | Línea Base | -- |
| **Brazo 1 (Control)** | Heurística Reactiva (Media Móvil 7d) | 5 / 172 | 2.91% | 2.73 | +84.38% vs B0 | [63.64%, 100.00%] |
| **Brazo 2 (Tratamiento)** | Modelo Predictivo Supervisado (RF) | 5 / 172 | 2.91% | 2.73 | +84.38% vs B0 | [63.64%, 100.00%] |
| **Brazo 2 vs Brazo 1** | **Efecto Incremental del ML** | -- | -- | -- | **0.00%** | **[0.00%, 0.00%]** *(Hallazgo Negativo)* |

*Nota de Fuente:* `data/resultados_cuasiexp.csv` derivado de 2,000 iteraciones de remuestreo Bootstrap.  
*Período de Medición:* Ventana analítica de 10 semanas (1,830 producto-días de simulación estocástica).

---

## 3. Discusión Crítica de Hallazgos y Declaración Explícita de Limitaciones

### 3.1. Equivalencia Estadística entre ML y Heurística Reactiva (Brazo 2 vs Brazo 1) — Hallazgo Negativo
La comparación directa entre el modelo supervisado Random Forest (Brazo 2) y la heurística reactiva de reposición ágil (Brazo 1) arrojó una reducción incremental del **0.00%** (IC 95%: [0.00%, 0.00%]).  
**Declaración obligatoria:** Este resultado se declara expresamente como un **hallazgo negativo de la investigación, y no como un logro**. En presencia de perturbaciones exógenas de demanda transitoria (1 a 2 días) que no presentan señal precursora en los 7 días de rezago histórico, un modelo supervisado entrenado con features agregadas converge en desempeño con una regla reactiva de inventario mínimo y seguridad bien calibrada. El valor del ML radica en la automatización del pronóstico y la priorización multifactorial, no en una reducción estocástica adicional de quiebres sobre perturbaciones imprevistas.

### 3.2. Visibilidad Media de Captura Postural vs. Precisión
En estricto apego a la terminología biomecánica y el estándar del Bloque 31/32:
- El valor obtenido en `ia.perfil_biometrico` representa la **visibilidad media de puntos anatómicos detectados** por MediaPipe Pose (**83.60%**, con desviación estándar de 1.12% sobre 4462 capturas).
- Queda prohibido categorizar dicha métrica como "precisión de IA" o "exactitud anatómica", dado que la visión computacional monocular RGB 2D/3D estima coordenadas relativas y confianza de oclusión, y no mediciones antropométricas validadas por cinemática de laboratorio (e.g. Vicon).

### 3.3. Tasa de Error en Prescripción Pretest (Limitación Metodológica)
El indicador de tasa de error pretest (82.50%) se declara formalmente como una **limitación metodológica por falta de registro estructurado previo**. El sistema transaccional preexistente en la empresa no contaba con clasificación somatotípica ni captura fotográfica, por lo que este valor proviene de una auditoría retrospectiva sobre prescripciones manuales no estandarizadas. Se reporta con fines comparativos cualitativos sin pretensión de exactitud paramétrica.
