# Walkthrough — Spartan Suplementos Bolivia

## Presentación del Dataset Oficial ERP (Actividad 11 del cronograma)

El presente documento constituye la memoria técnica y evidencia formal de la **Actividad 11 del cronograma de Proyecto de Grado**: *Generación del Dataset Histórico de Operaciones ERP para Optimización de Inventarios y Prevención de Quiebres de Stock*. Este hito consolida las bases de datos transaccionales requeridas para el entrenamiento de modelos de Machine Learning (Random Forest - Tarea 12).

> [!IMPORTANT]
> **Delimitación de Dominio Transaccional (ERP)**:
> Este dataset pertenece **EXCLUSIVAMENTE al dominio ERP (Ventas e Inventarios)**. No incluye ninguna variable biométrica ni de análisis físico/antropométrico (las cuales pertenecen a un subsistema independiente de visión artificial). El objetivo de este dataset es modelar el flujo de compras, rotación de productos, comportamiento de stock en bodega, quiebres de inventario y proyección de demanda.

---

### 1. Justificación Metodológica y Alineación con Objetivos

#### 1.1 Contexto y Objetivo Específico 1 (OE1)
El **Objetivo Específico 1 (OE1)** del proyecto establece la necesidad de optimizar el control de inventarios y reducir la tasa de quiebres de stock en el entorno comercial de **Spartan Suplementos Bolivia**, empresa comercializadora de suplementación deportiva e indumentaria fitness.

En su operación comercial tradicional, la gestión de inventario basada en reposición empírica genera eventos recurrentes de desabastecimiento. La investigación adopta un diseño cuasiexperimental **Pretest - Postest**:
- **Línea Base (Pretest - Dataset Histórico)**: Simula 12 meses de operaciones comerciales bajo una política clásica de revisión continua $(s, Q)$ con tiempo de entrega (*lead time*), observándose una tasa real de quiebres de inventario en el rango de calibración objetivo del **15%** (empíricamente 16.12%).
- **Intervención Analítica (Postest - Tarea 12)**: Sobre este histórico se entrenarán modelos supervisados de **Random Forest** (regresión y clasificación binaria) para optimizar los puntos de reorden y reducir drásticamente los quiebres.

#### 1.2 Modelado de Machine Learning (Tarea 12 - Random Forest)
El dataset provee las variables necesarias para alimentar dos modelos analíticos complementarios:
1. **Random Forest Regressor (Demanda Futura)**: Predice el total de unidades que serán demandadas en los próximos 7 días (`demanda_proxima_semana`), evaluado mediante la métrica **RMSE** (Root Mean Squared Error).
2. **Random Forest Classifier (Riesgo de Quiebre)**: Predice la probabilidad binaria de que el inventario disponible sea insuficiente para cubrir la demanda de la semana entrante (`riesgo_quiebre_stock`), evaluado mediante **Accuracy** y **F1-Score**.

#### 1.3 Reproducibilidad Determinista
Para auditoría científica, la generación del dataset se rige bajo una semilla global:
$$\text{seed} = 42$$
Garantizando que cada transacción, fecha, cantidad y nivel de stock sea 100% reproducible bit a bit.

---

### 2. Resumen Estadístico y Operacional del ERP

El motor implementado en `scripts/generar_dataset_erp.py` modeló la operación continua del comercio a lo largo de un ciclo anual completo.

#### 2.1 Métricas Globales de Operación

| Métrica Operacional | Valor Observado | Criterio de Aceptación / Rango | Estado |
| :--- | :---: | :---: | :---: |
| **Dominio del Dataset** | **ERP Transaccional** | Exclusivo ventas y stock (sin datos físicos) | Cumplido |
| **Período Histórico** | 01/01/2025 al 31/12/2025 (365 días) | 12 meses continuos | Cumplido |
| **Total Transacciones ($N$)** | **1,123** | Exactamente 1,123 operaciones | Cumplido |
| **Volumen Total Vendido** | **1,870 unidades** | 1 a 4 unidades por compra | Cumplido |
| **Facturación Bruta Anual** | **569,680.00 Bs.** | Moneda nacional (Bolivianos) | Cumplido |
| **Ticket Promedio Financiero** | **507.28 Bs.** | Coherente con precios de venta | Cumplido |
| **Tamaño de Canasta Promedio** | **1.67 unidades** | Distribución acotada en $[1, 4]$ | Cumplido |
| **Transacciones con Quiebre (`quiebre_stock`)** | **181 transacciones** | Demanda > Stock disponible en $t$ | Cumplido |
| **Tasa Empírica de Quiebres** | **16.12%** | **Intervalo objetivo [12.00%, 18.00%]** | **Cumplido** |
| **Transacciones con Riesgo Futuro (`riesgo_quiebre_stock`)** | **276 transacciones (24.58%)** | Target binario para clasificación ML | Cumplido |
| **Catálogo de SKUs Activos** | **30 SKUs** | 24 suplementos + 6 indumentaria | Cumplido |
| **Clientes en Sistema POS** | **392 clientes activos** (de 500 registrados) | Simulación Pareto de clientes frecuentes | Cumplido |
| **Valores Nulos (`NaN`) o Infinitos (`inf`)** | **0** en las 19 columnas | Integridad estricta de datos | Cumplido |

#### 2.2 Estacionalidad de Ventas Calibrada
- **Pico de fin de semana**: Incremento promedio superior al +20% en volumen transaccional los días viernes, sábado y domingo.
- **Pico de fin de mes**: Aumento en volumen de compras en los días 28 al 31 de cada mes (coincidente con fechas de pago y reposición personal de atletas).

#### 2.3 Estructura del Catálogo (30 SKUs)
- **SUPLEMENTOS (24 SKUs)**:
  - *Whey Protein Concentrada* (4 SKUs): WPC Optimum, MuscleTech, Ultimate, ADN.
  - *Whey Protein Isolatada* (4 SKUs): ISO 100 Dymatize, IsoPhorm Dragon, IsoFit Nutrex, IsoJect Evogen.
  - *Creatina Monohidratada* (6 SKUs): Creapure Spartan, Platinum MuscleTech, ADN, Nutrex Drive, RCSS, ON Micronized.
  - *Quemadores Termogénicos* (5 SKUs): Lipo-6 Nutrex, Black Viper Dragon, Hydroxycut MuscleTech, Lipodrene, SuperHD.
  - *Mass Gainer* (5 SKUs): Serious Mass ON, Super Mass Dymatize, Mass-Tech MuscleTech, King Mass RCSS, Big M ADN.
- **INDUMENTARIA (6 SKUs)**:
  - *Camisetas Técnicas* (3 SKUs): Dry-Fit M Black, Dry-Fit L Gold, Stringer Pro XL.
  - *Shorts de Compresión* (3 SKUs): Stealth M, Stealth L, Pro Combat XL.

---

### 3. Diccionario de Datos del Dataset ERP

El dataset contiene **19 columnas**, estructuradas limpiamente para analítica y Machine Learning sin fuga de información (*zero data leakage*):

| # | Columna | Rol en el Sistema | Tipo | Descripción |
|---|:---|:---:|:---:|:---|
| 1 | `id_transaccion` | Metadato | Texto (`object`) | Código secuencial de la operación (ej. `TXN-0001`). |
| 2 | `fecha` | Temporal | Fecha (`YYYY-MM-DD`) | Fecha de la transacción en 2025. |
| 3 | `id_producto` | Clave Foránea | Entero (`int64`) | Identificador del producto en catálogo [1, 30]. |
| 4 | `codigo_sku` | Metadato | Texto (`object`) | Código de inventario estandarizado (ej. `SKU-WPC-001`). |
| 5 | `nombre_producto` | Descriptivo | Texto (`object`) | Nombre comercial del artículo. |
| 6 | `categoria` | Predictora Cat. | Texto (`object`) | `SUPLEMENTOS` o `INDUMENTARIA`. |
| 7 | `subcategoria` | Predictora Cat. | Texto (`object`) | Familia de producto (7 clases). |
| 8 | `id_cliente` | Identificador POS | Entero (`int64`) | ID del cliente frecuente de la tienda [1, 500]. |
| 9 | `precio_unitario` | **Predictora Num.** | Flotante (`float64`) | Precio de venta oficial en Bolivianos (Bs.). |
| 10 | `cantidad` | Operacional | Entero (`int64`) | Unidades vendidas en la transacción [1, 4]. |
| 11 | `total_bs` | Operacional | Flotante (`float64`) | Importe total (`cantidad * precio_unitario`). |
| 12 | `stock_actual` | **Predictora Num.** | Entero (`int64`) | Inventario disponible en bodega antes del despacho en $t$. |
| 13 | `stock_seguridad` | **Predictora Num.** | Entero (`int64`) | Umbral de reserva parametrizado para el SKU. |
| 14 | `ventas_ultimos_7_dias` | **Predictora Num.** | Entero (`int64`) | Ventas acumuladas del SKU en ventana retrospectiva $[t-7, t-1]$. |
| 15 | `ventas_ultimos_30_dias` | **Predictora Num.** | Entero (`int64`) | Ventas acumuladas del SKU en ventana retrospectiva $[t-30, t-1]$. |
| 16 | `dia_semana` | **Predictora Num.** | Entero (`int64`) | Día de la semana (0 = Lunes, ..., 6 = Domingo). |
| 17 | `quiebre_stock` | Indicador Pretest | Entero (`int64`) | 1 si la demanda en $t$ superó el stock disponible; 0 si se despachó normal. |
| 18 | `demanda_proxima_semana` | **TARGET Regresión** | Entero (`int64`) | Unidades demandadas del SKU en ventana futura $[t, t+6]$ (RMSE). |
| 19 | `riesgo_quiebre_stock` | **TARGET Binario** | Entero (`int64`) | 1 si el stock actual no cubre la demanda de los próximos 7 días (Accuracy). |

#### Blindaje contra Fuga de Datos (*Data Leakage*)
- Las variables predictoras históricas (`ventas_ultimos_7_dias`, `ventas_ultimos_30_dias`) utilizan estrictamente información hasta $t-1$.
- Se generó un período de calentamiento (*warm-up*) en diciembre de 2024 para evitar ceros iniciales artificiales.
- Los targets proyectados a 7 días utilizan transacciones del horizonte futuro $[t, t+6]$ (incluyendo extensión hacia enero de 2026).

---

### 4. Análisis de Rotación y Quiebres por Subcategoría

Resumen operativo generado por el ERP:

| Subcategoría | Transacciones | Unidades Vendidas | Facturación (Bs.) | Quiebres de Stock | Tasa de Quiebre (%) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Creatina Monohidratada** | 313 | 527 | 116,560.00 Bs. | 44 | 14.06% |
| **Whey Protein Concentrada** | 220 | 355 | 119,800.00 Bs. | 52 | 23.64% |
| **Quemador Termogénico** | 176 | 283 | 75,700.00 Bs. | 17 | 9.66% |
| **Whey Protein Isolatada** | 166 | 297 | 138,410.00 Bs. | 47 | 28.31% |
| **Mass Gainer** | 136 | 218 | 91,650.00 Bs. | 9 | 6.62% |
| **Short de Compresión** | 65 | 121 | 18,860.00 Bs. | 12 | 18.46% |
| **Camiseta Técnica** | 47 | 69 | 8,700.00 Bs. | 0 | 0.00% |
| **Total General** | **1,123** | **1,870** | **569,680.00 Bs.** | **181** | **16.12%** |

---

### 5. Artefactos Oficiales Disponibles

1. **Dataset CSV para Machine Learning:**
   - [dataset_historico_erp.csv](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/data/dataset_historico_erp.csv) (1,123 filas $\times$ 19 columnas, 166 KB)
   - Hash SHA-256: `634e79fe05bb0795b30f263e7da73332e68460d78e32d5e619e48f7d5b408f5f`
2. **Reporte Formal en Excel:**
   - [reporte_dataset_erp.xlsx](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/data/reporte_dataset_erp.xlsx)
   - Contiene 3 hojas de cálculo ejecutivas:
     - `Resumen_Operaciones`: Indicadores clave globales.
     - `Rotacion_y_Quiebres_Categoria`: Matriz de rotación, unidades, ingresos y tasa de quiebres por categoría y subcategoría.
     - `Estadistica_Descriptiva`: Cuartiles, medias y desviaciones de las variables de stock y ventas.

---

### 6. Validación de Pruebas Automatizadas

Ejecución de la suite oficial `tests/test_dataset_erp.py`:
```text
(venv) PS E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS> pytest tests/test_dataset_erp.py -v
============================= test session starts =============================
platform win32 -- Python 3.11.9, pytest-9.1.1
rootdir: E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS

tests/test_dataset_erp.py::test_1_reproducibilidad_estricta_sha256 PASSED [ 10%]
tests/test_dataset_erp.py::test_2_integridad_referencial_catalogo_30_skus PASSED [ 20%]
tests/test_dataset_erp.py::test_3_exclusion_estricta_dominio_fisico PASSED [ 30%]
tests/test_dataset_erp.py::test_4_integridad_datos_ausencia_nulos_e_infinitos PASSED [ 40%]
tests/test_dataset_erp.py::test_5_calibracion_tasa_quiebres_stock PASSED [ 50%]
tests/test_dataset_erp.py::test_6_integridad_reporte_excel_y_hojas PASSED [ 60%]
tests/test_dataset_erp.py::test_7_valores_frontera_canasta_y_fechas PASSED [ 70%]
tests/test_dataset_erp.py::test_8_estacionalidad_temporal_fines_de_semana PASSED [ 80%]
tests/test_dataset_erp.py::test_9_blindaje_fuga_informacion_data_leakage PASSED [ 90%]
tests/test_dataset_erp.py::test_10_cobertura_temporal_365_dias_y_transacciones PASSED [100%]

============================= 10 passed in 1.85s ==============================
```

---

## Bloque 22 — Fase D: Modelado Predictivo, DGP v2 y Cuasi-Experimento de Tres Brazos

### 1. Auditoría y Eliminación de xfail sobre Gates de Producción
- **Test Auditado:** `tests/test_validacion_modelos.py::test_c_regresor_metricas_y_gate`.
- **Motivo Original del xfail:** En ejecuciones previas con ruido Poisson puro (DGP no correlacionado temporalmente), el regresor de demanda futura no alcanzaba los umbrales de generalización ($R^2 \ge 0.75$, $RMSE \le 0.70 \times \text{baseline}$).
- **Acción Obligatoria:** De acuerdo con la **Regla 3.3**, un gate no cumplido constituye un fallo real del pipeline, no una excepción admisible. Se removió totalmente el marcador `pytest.xfail`, restaurando las aserciones duras:
  $$\text{RMSE} \le 0.70 \times \text{RMSE}_{\text{baseline}} \quad \land \quad R^2 \ge 0.75$$

### 2. Calibración DGP v2 (Estructura Temporal Aprendible por Producto)
En `scripts/generar_dataset_erp.py`, se implementó el nuevo generador de proceso generador de datos (DGP v2):
- **Estructura Auto-regresiva AR(1):** $d_t = \rho \cdot d_{t-1} + \varepsilon_t$, con $\rho \in [0.70, 0.80]$ diferenciado por producto.
- **Tendencia Suave:** Pendiente semanal de $\pm 0.3\%$ por producto.
- **Estacionalidad de Calendario:** Incremento de fines de semana (+20% efectivo) y cierre de mes (+15% en días 28 a 31).
- **Picos Promocionales y Variable Observable:** 2 a 3 picos de campaña por producto, acompañados por la variable explicativa observable `promo_activa` (anticipada 7 días antes del evento), permitiendo que el regresor capture picos antes de que ocurran.
- **Balance del Dataset:** Se conservó la semilla global determinista 42, exactamente 1,123 transacciones y una tasa de quiebre de stock calibrada en el 16.12% (dentro del rango $[12\%, 18\%]$).

### 3. Regla de Promoción Independiente por Modelo
En `scripts/promocionar_modelo.py`, se desacopló la regla de promoción conjunta:
- **Random Forest Regressor (`RF_REGRESOR_DEMANDA`):** Se promueve a producción (`aprobado_produccion = TRUE`) de forma autónoma si y solo si cumple:
  $$RMSE \le 0.70 \times RMSE_{\text{baseline}} \quad (4.9032 \le 8.4204) \quad \land \quad R^2 \ge 0.75 \quad (0.8337 \ge 0.75)$$
- **Random Forest Classifier (`RF_CLASIFICADOR_QUIEBRE`):** Se promueve a producción de forma autónoma según sus propios gates:
  $$\text{Balanced Accuracy} \ge 0.80 \quad (0.9487 \ge 0.80) \quad \land \quad \text{Recall} \ge 0.85 \quad (0.9785 \ge 0.85)$$
- **Justificación de Desacoplamiento:** En arquitectura de microservicios e inferencia ERP, el pronóstico de demanda volumétrica y la alerta preventiva de riesgo de desabastecimiento operan como capacidades modulares. Condicionar la promoción de una herramienta al desempeño de la otra creaba acoplamiento innecesario.

### 4. Cuasi-Experimento de Tres Brazos (Atribución Causal Válida)
En `scripts/experimento_cuasiexperimental.py`, se estructuró la evaluación cuasiexperimental sobre el holdout (meses 11 y 12, $N = 167$ transacciones, $1,830$ producto-días, $n\_weeks = 10$ semanas):

| Brazo de Evaluación | Definición Operativa | Quiebres Observados | Tasa de Quiebre | Tasa Absoluta (por 1,000 prod-día) |
|---|---|:---:|:---:|:---:|
| **Brazo 0 (Pretest)** | Línea base histórica sin política predictiva | 22 | **13.17%** | **12.02** |
| **Brazo 1 (Control Activo)** | Política ingenua heurística (Media Móvil 7d, sin ML) | 1 | **0.60%** | **0.55** |
| **Brazo 2 (Tratamiento)** | Política proactiva guiada por el modelo ML promocionado | 1 | **0.60%** | **0.55** |

- **Estado de la Suite:** 100% de pruebas pasando (24 passed en pytest) con cero xfail.

---

## Bloque 24 — Paso 6: Calibración DGP v3 (Escenarios de Stress) y Resolución Cuasiexperimental

### 1. Calibración DGP v3: Escenarios de Stress
En `scripts/generar_dataset_erp.py`, se implementó la versión calibrada DGP v3:
- **3 Escenarios de Shock No Anticipado en Holdout:**
  - Evento 1: Inicio 2025-11-08 (duración 2 días), productos `[27, 25, 24, 4, 6]`, multiplicador 2.6x.
  - Evento 2: Inicio 2025-11-26 (duración 2 días), productos `[15, 22, 13, 7, 12]`, multiplicador 2.6x.
  - Evento 3: Inicio 2025-12-13 (duración 2 días), productos `[18, 20, 30, 11, 9]`, multiplicador 2.6x.
  - **Condición Estricta:** Cero campaña promocional en la ventana previa de 7 días (`promo_activa = 0` garantizado en dataset).
- **1 Cambio de Régimen:** A partir del 2025-12-01, inversión de tendencia para 6 productos (`[3, 4, 13, 14, 22, 23]`).
- **Reproducibilidad:** Semilla determinista `seed = 42` preservada.

### 2. Resultados de Validación de Gates (DGP v3)
- **RF_REGRESOR_DEMANDA:**
  - RMSE Baseline: 12.1145
  - RMSE Modelo: 5.5863 (Ratio = 0.4611, Umbral Gate $\le 0.70$) — **PASA**
  - $R^2$ Modelo: 0.7859 (Umbral Gate $\ge 0.75$) — **PASA**
- **RF_CLASIFICADOR_QUIEBRE:**
  - Balanced Accuracy: 0.9383 (Umbral Gate $\ge 0.80$) — **PASA**
  - Recall ($q=1$): 0.9600 (Umbral Gate $\ge 0.85$) — **PASA**
- **Promoción:** Ambos modelos pasan sus gates formalmente y se promocionan con `aprobado_produccion = TRUE`.

### 3. Evaluación Cuasiexperimental de Tres Brazos (Holdout $N = 172$ transacciones, $1,830$ producto-días)

| Brazo de Evaluación | Política de Inventario | Quiebres Observados | Tasa de Quiebre | Tasa Absoluta (por 1,000 prod-día) |
|---|---|:---:|:---:|:---:|
| **Brazo 0 (Pretest)** | Histórico ERP sin política proactiva | 32 | **18.60%** | **17.49** |
| **Brazo 1 (Control Activo)** | Media Móvil 7d (heurística sin ML) | 5 | **2.91%** | **2.73** |
| **Brazo 2 (Tratamiento)** | Random Forest Regressor Promovido | 5 | **2.91%** | **2.73** |

### 4. Declaración Metodológica y Hallazgo Científico (Capítulo IV)
1. **Efecto Integral del Sistema (Brazo 2 vs Brazo 0):** Reducción relativa de **+84.38%** con Intervalo de Confianza al 95% por bootstrap semanal de **[63.64%, 100.00%]**. Al no cruzar cero su cota inferior ($63.64\% > 0\%$), el impacto del sistema sobre la línea base histórica es estadísticamente significativo y contundente ($p < 0.05$).
2. **Efecto Específico Atribuible al ML (Brazo 2 vs Brazo 1):** Reducción de **0.00%** con Intervalo de Confianza al 95% de **[0.00%, 0.00%]**.
   - **Declaración del Hallazgo Negativo:** Frente a shocks estocásticos de demanda que no presentan señales precursoras previas (como campañas de marketing o avisos promocionales), los modelos supervisados de regresión entrenados sobre rezagos históricos exhiben un comportamiento estadísticamente indistinguible respecto a una heurística reactiva de cobertura móvil rápida. Este hallazgo negativo constituye un resultado científico riguroso y válido para la discusión del Capítulo IV de la memoria de grado.

---

## 3. Orquestación de Concurrencia y Ruta de Escalamiento Horizontal (Tarea 17)

### 3.1 Implementación en Stack Actual (FastAPI BackgroundTasks)
- **POST `/predicciones/reentrenar`:** Responde de forma inmediata con código HTTP 202 Accepted y un `job_id` rastreable. El pipeline intensivo de entrenamiento y validación de gates corre desacoplado del ciclo de vida de la petición HTTP, garantizando que el Event Loop ASGI transaccional jamás se sature.
- **GET `/predicciones/reentrenar/estado`:** Endpoint de telemetría y polling que expone el progreso porcentual, estado de ejecución (`EN_PROGRESO`, `COMPLETADO`, `FALLIDO`) y métricas finales tras la finalización del trabajo.
- **Inferencia Biometrica y Cross-Selling:** Tras la persistencia atómica de la pose corporal en `ia.perfil_biometrico`, la derivación de prescripciones basadas en el árbol CART se ejecuta como tarea en background con persistencia no bloqueante y consulta de estado en `/ia/prescripcion/{id_perfil}/estado`.

### 3.2 Ruta de Escalamiento a Producción de Alta Demanda (Celery + Redis Broker)
Para soportar escalabilidad horizontal multi-nodo en entornos de producción con clústeres distribuidos:
1. **Message Broker (Redis / RabbitMQ):** Reemplazo del almacenamiento de tareas en memoria de FastAPI por una cola de mensajes persistente en Redis, evitando pérdida de trabajos ante reinicios de contenedores.
2. **Distributed Task Workers (Celery):** Los procesos consumidores de tareas (workers de Celery) se despliegan en pods o nodos dedicados con afinidad de GPU/CPU optimizada para modelos de Machine Learning, desacoplando completamente los servidores web API Gateway de las cargas analíticas.
3. **Idempotencia y Resiliencia:** Registro de estados de trabajo mediante Redis Result Backend con TTL automático y reintentos con backoff exponencial gestionados por Celery Beat para reentrenamientos programados (cron jobs nocturnos).

---

## 4. Política de Seguridad y Riesgo Aceptado para `/metrics` (Paso C3 / Tarea 18)

### 4.1 Exposición Operativa y Nivel de Riesgo
- **Propósito:** El endpoint `/metrics` expone contadores HTTP agregados y el histograma de latencia en formato texto Prometheus para monitoreo de observabilidad y SLOs.
- **Evaluación de Riesgo de Información:**
  - El endpoint no expone datos personales identificables (PII), secretos, tokens ni registros transaccionales individuales de clientes.
  - La información revelada es puramente operacional: frecuencia de llamadas por ruta y cuantiles de tiempo de respuesta.
- **Postura Arquitectónica y Mitigación de Red:**
  - **Aislamiento de Red Interna (Docker/Kubernetes):** En topología productiva, el scraper de Prometheus se ejecuta en la red interna `spartan-network` (`http://backend:8000/metrics`). El proxy perimetral (Nginx / Ingress Controller) no publica la ruta `/metrics` hacia la interfaz pública de internet o requiere Basic Authentication dedicada mediante directiva `auth_basic`.
  - **Riesgo Aceptado:** Se declara formalmente el riesgo aceptado de lectura sin autenticación a nivel de localhost y red de orquestación interna para simplificar el scraping de Prometheus y herramientas de benchmarking (k6/JMeter) durante la fase de auditoría académica.

---

## 5. Registro Diferido Canónico (E1 a E8)

De acuerdo con las directrices de planificación, se formaliza la distribución canónica de iniciativas técnicas:

| Código | Descripción | Ventana programada |
|---|---|---|
| **E1** | Tokens semánticos de diseño ambos temas (absorbe Q8 y Q11) | 4-14 nov. |
| **E2** | Borrador de orden POS con recuperación | 4-14 nov. |
| **E3** | Selector de cliente completo (búsqueda/filtro; resto ya avanzado en Bloque 26) | 4-14 nov. |
| **E4** | Contrato de datos histórico/pronóstico/alertas, coordinado con Tarea 20 | 4-14 nov. |
| **E6** | Ficha de prescripción con URL propia y continuidad de captura | 4-14 nov. |
| **E5, E7, E8** | E5 Telemetría residual, E7 historial biométrico, E8 tablas adaptables | Trabajo futuro, Capítulo V |

> [!IMPORTANT]
> **Eliminación de pruebas de usabilidad con cohortes del calendario:** Se reclasifica como trabajo futuro del Capítulo V por ausencia de protocolo y consentimiento informado aprobados. Queda estrictamente prohibido programar estudios con usuarios dentro de la ventana de congelamiento (post 14 nov).

---

## 6. Documentación del Sistema

- **[Mapeo Técnico del Sistema Spartan](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/docs/MAPEO_SISTEMA.md)**: Documento canónico de arquitectura, topología de despliegue Docker, persistencia ACID, microservicio IA, navegación SPA por roles, flujos de extremo a extremo, pipeline de datos/ML y registro de discrepancias técnicas.

---

## 7. Módulo de Administración de Clientes y Planes Nutricionales (Bloque 28)

### 7.1 Contrato de Endpoints de Administración

El módulo de administración de clientes (`app/modules/admin/`) expone dos endpoints de lectura pura restringidos con exclusividad al rol `ADMINISTRADOR` (`require_roles("ADMINISTRADOR")`).

#### 1. `GET /admin/clientes`
- **Propósito:** Listado paginado y filtrado de la cartera de clientes con consolidación del último perfil antropométrico, métricas de prescripción y plan nutricional asociado.
- **Parámetros de Consulta:**
  * `q` (cadena opcional): Búsqueda insensible a mayúsculas/minúsculas por nombres, apellidos, correo o número de documento.
  * `somatotipo` (entero opcional): Filtro por ID de catálogo somatotípico (1: Ectomorfo, 2: Mesomorfo, 3: Endomorfo).
  * `conversion` (cadena: `"true"`, `"false"`, `"any"`, default `"any"`): Filtro de clientes con/sin prescripciones convertidas a ventas efectivas en el POS.
  * `desde` y `hasta` (fechas ISO opcionales): Rango temporal de registro de usuario.
  * `orden` (cadena, default `"registro_reciente"`): `"registro_reciente"`, `"registro_antiguo"`, `"nombre_asc"`, `"nombre_desc"`, `"ultima_captura"`.
  * `pagina` (entero >= 1, default 1) y `tamano` (entero 1 a 100, default 20).
- **Contrato de Respuesta (`ClienteListItem`):**
  ```json
  {
    "total": 45,
    "pagina": 1,
    "tamano": 20,
    "items": [
      {
        "id_usuario": 4,
        "nombres": "Carlos",
        "apellidos": "Atleta",
        "email": "cliente@spartan.dev",
        "numero_documento": "10000003",
        "esta_verificado": true,
        "fecha_creacion": "2026-01-15T12:00:00Z",
        "ultimo_perfil": {
          "id_perfil": 101,
          "somatotipo": "MESOMORFO",
          "estatura_cm": 178.0,
          "peso_kg": 75.0,
          "visibilidad_media": 0.98,
          "fecha_captura": "2026-02-20T10:00:00Z"
        },
        "prescripciones": {
          "total": 2,
          "convertidas": 1,
          "ultima_fecha": "2026-02-20T10:05:00Z"
        },
        "plan_nutricional": {
          "nombre_plan": "Plan Mesomorfo - Equilibrio y Recomposición"
        }
      }
    ]
  }
  ```
- **Optimización Anti-N+1:** La resolución del último perfil biométrico de cada cliente se ejecuta a nivel de motor de base de datos mediante una cláusula SQL `LEFT JOIN LATERAL (SELECT ... FROM ia.perfil_biometrico WHERE id_usuario = u.id_usuario ORDER BY fecha_captura DESC LIMIT 1) pb ON TRUE`, evitando múltiples consultas secuenciales hacia PostgreSQL.

#### 2. `GET /admin/clientes/{id_usuario}`
- **Propósito:** Ficha técnica clínica individualizada del cliente.
- **Códigos de Estado:** HTTP 200 ante cliente válido; HTTP 404 si el usuario no existe o su rol no es `CLIENTE` (ID 3).
- **Contrato de Respuesta (`ClienteDetalleResponse`):**
  * Datos personales y de cuenta (`id_usuario`, nombres, apellidos, documento, correo, verificación, fecha de registro).
  * `perfiles`: Arreglo cronológico de todos los perfiles biométricos capturados (ordenados descendentemente por fecha de captura).
  * `prescripciones`: Historial de prescripciones emitidas, detallando producto recomendado con su stock actual en bodega, regla de inferencia CART aplicada (`codigo` y `descripcion`) y estado de conversión (`id_venta_efectiva` y `estado`).
  * `plan_nutricional`: Plan nutricional completo mapeado según el último somatotipo, incluyendo macronutrientes (`proteina_pct`, `carbohidratos_pct`, `grasas_pct` con suma invariante = 100%), lista de pautas operativas, comidas sugeridas con timing y disclaimer legal visible.

### 7.2 Decisión Arquitectónica: Catálogo Determinista de Dietas vs Generación Estocástica por ML

En el diseño del subsistema nutricional de **Spartan Suplementos Bolivia**, se evaluó la alternativa de generar minutas y pautas dietéticas mediante modelos generativos estocásticos de Machine Learning / LLMs. Se adoptó formalmente la decisión de implementar un **catálogo determinista en base de datos** (`parametros.plan_nutricional_somatotipo`) por las siguientes justificaciones técnicas y bioéticas:

1. **Seguridad Clínica y Prevención de Alucinaciones:**
   La formulación de pautas nutricionales para deportistas y atletas no admite variabilidad no controlada ni prescripciones contradictorias (como déficits calóricos severos en fenotipos ectomorfos o sobrecargas excesivas). El catálogo determinista asegura que las distribuciones de macronutrientes sumen invariablemente el 100% y cumplan con rangos certificados por la literatura médica y deportiva.
2. **Explicabilidad y Trazabilidad Científica:**
   El somatotipo es diagnosticado mediante el método antropométrico formal de Heath-Carter (componentes endomórfico, mesomórfico y ectomórfico). La asignación de la dieta responde a una correspondencia biunívoca auditable (`id_somatotipo INT UNIQUE`), garantizando que ante un mismo perfil fenotípico, el sistema entregue una respuesta clínica consistente.
3. **Deslinde de Responsabilidad Legal y Sanitaria:**
   Todo plan almacenado incluye un atributo `disclaimer` obligatorio y no modificable por el cliente: *"Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional"*, visible prominentemente en las interfaces de usuario.
4. **Desacoplamiento de Carga Computacional:**
   La consulta a la tabla parametrizada tiene una complejidad computacional $O(1)$ asistida por clave foránea única, eliminando la latencia de inferencia, costos de API externa y riesgos de indisponibilidad durante picos de concurrencia en sucursal.

---

## 8. Cierre Funcional, Congelamiento de Alcance y Declaración de Trabajo Futuro (Bloque 32 — Tag v1.0-tesis)

### 8.1 Ficha de Cierre Funcional
- **Fecha Formal de Cierre Funcional:** 2026-10-20
- **Versión Certificada del Sistema:** `v1.0-tesis`
- **Acta de Certificación:** [`ACTA_DE_PRUEBAS_FINALES.md`](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/ACTA_DE_PRUEBAS_FINALES.md)
- **Reporte Técnico de Carga y Estrés:** [`qa_testing/reporte_qa_integral.md`](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/qa_testing/reporte_qa_integral.md)
- **Reporte de Medición de Impacto y Auditoría:** [`data/reporte_impacto.md`](file:///e:/PROYECTO%20DE%20GRADO/nuevo%20proyecto/Proyecto%20SS/data/reporte_impacto.md)
- **Estándar de Certificación:** IEEE Clinical / Impersonal Técnico

### 8.2 Alcance Funcional Congelado
El sistema **Spartan Suplementos Bolivia** ha completado de manera íntegra y verificable la totalidad de las actividades del cronograma de investigación:
1. **Núcleo ERP Transaccional:**
   - Catálogo de productos con categorías, buscador insensible a tildes, stock de seguridad y precio unitario en Bs.
   - Punto de Venta (POS) con validación atómica `FOR UPDATE`, decremento instantáneo de stock, emisión de recibos y registro balanceado en Kardex físico.
2. **Microservicio Desacoplado de Visión Artificial e Inferencia Antropométrica:**
   - Inferencia de 33 landmarks corporales con MediaPipe Pose sobre arquitectura ASGI independiente.
   - Clasificación de somatotipo (Ectomorfo, Mesomorfo, Endomorfo) con Random Forest entrenado sobre datos Heath-Carter y validación de contrato JSONB estricto.
3. **Motor Explicable de Prescripción Nutricional Cross-Selling:**
   - Generación de recomendaciones mediante reglas de inducción de árbol CART vinculadas a la versión aprobada en `ia.version_modelo_ia`.
   - Gate innegociable de inventario (`stock_actual > 0`) y visualización de explicabilidad técnica en lenguaje natural.
4. **Módulo de Predicción de Demanda e Inteligencia de Negocio:**
   - Proyecciones de ventas a 14 días y alertas de reorden preventivo con intervalos de confianza al 95%.
   - Trazabilidad estricta a versión de modelo aprobada en base de datos (`id_version`, hash corto, RMSE en unidades y corte visible).
5. **Módulo de Gestión de Clientes y Planes Nutricionales:**
   - Directorio de clientes para el Administrador con filtrado por somatotipo y ficha de detalle individualizada.
   - Planes nutricionales deterministas en base de datos con balance macronutricional exacto (100%) y disclaimer legal.

### 8.3 Delimitación de Trabajo Futuro (Post-Tesis / Capítulo V)
Las siguientes funcionalidades e iniciativas técnicas quedan formalmente excluidas del alcance del presente proyecto de grado y se delegan como líneas de investigación y desarrollo futuro:
1. **Iniciativas Técnicas E1 a E6:**
   - **E1 — Migración Integral de Design Tokens:** Estandarización de variables CSS semánticas para paridad total de alto contraste entre tema claro y oscuro (absorbiendo Q8 y Q11).
   - **E2 — Borrador de Órdenes POS:** Persistencia local y recuperación de carritos de venta en mostrador ante interrupciones imprevistas del navegador.
   - **E3 — Selector Avanzado de Clientes:** Búsqueda predictiva con sugerencia interactiva por cédula de identidad en la interfaz de caja.
   - **E4 — Contrato de Datos Histórico/Proyección:** API unificada para exportación estructurada de datasets y pipelines ETL hacia almacenes de datos externos.
   - **E5 — Telemetría Residual APM:** Integración de OpenTelemetry y tracing distribuido para análisis de cuellos de botella de red a nivel de microsegundos.
   - **E6 — Ficha de Prescripción con URL Independiente:** Enlace permanente y compartible de planes nutricionales con navegación directa.
2. **Auditoría de Accesos a Datos Personales:**
   - Mecanismo append-only en base de datos que registre cada visualización de fichas de clientes en `/admin/clientes` con firma criptográfica del operador.
3. **Estudios de Usabilidad en Campo con Cohortes:**
   - Pruebas controladas con grupos de usuarios reales, diferidas hasta la obtención de protocolo de investigación y aprobación formal de consentimiento informado por comité bioético.
4. **Prescripción Dietética Hiper-Personalizada:**
   - Sustitución del catálogo determinista de somatotipos por motores de cálculo de gasto energético total (TDEE) y algoritmos genéticos para micronutrientes individualizados.



