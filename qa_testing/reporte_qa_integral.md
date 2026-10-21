# INFORME TÉCNICO DE QA INTEGRAL Y PRUEBAS DE ESTRÉS (TAREA 19)
**Proyecto:** Spartan Suplementos Bolivia — Proyecto de Grado  
**Herramienta de Carga:** Grafana k6 v2.3.0 en contenedor Docker (`grafana/k6:latest`)  
**Entorno de Ejecución:** Red interna Docker (`proyectoss_spartan-network`) sobre arquitectura monorepo desacoplada  
**Fecha de Ejecución:** 2026-10-20  
**Estándar de Redacción:** IEEE Clinical / Impersonal Técnico  

---

## 1. Declaración Previa de SLOs (Service Level Objectives)

Previo a la ejecución de la batería de pruebas de estrés, se establecieron contractualmente los siguientes Objetivos de Nivel de Servicio (SLOs):

| Identificador | Componente / Endpoint | Métrica Evaluada | Objetivo de Nivel de Servicio (SLO) | Justificación de Ingeniería |
|---|---|---|:---:|---|
| **SLO-01** | Escenario (a): POS Multi-SKU (`/pos/ventas`) | Latencia Percentil 95 (P95) | **< 1,000 ms** | Transacciones de caja fluidas sin retardo perceptible para el cajero. |
| **SLO-02** | Escenario (c): Captura Biometría (`/ia/pose/analizar`) | Latencia Percentil 95 (P95) | **< 5,000 ms** | Procesamiento de visión artificial (MediaPipe Pose 33 landmarks) desacoplado del ERP. |
| **SLO-03** | Escenario (b): Clientes Administrativo (`/admin/clientes`) | Latencia Percentil 95 (P95) | **< 500 ms** | Consultas administrativas con filtros combinados (somatotipo, búsqueda, paginación). |
| **SLO-04** | Todos los Escenarios (Global) | Tasa de Error Inesperado | **< 1.00%** | Excluyendo expresamente las respuestas HTTP 409 Conflict esperadas por quiebre de stock. |
| **SLO-05** | Motor de Base de Datos (PostgreSQL) | Interbloqueos (Deadlocks) | **0 deadlocks** | Cero ocurrencias de `deadlock detected` en logs de PostgreSQL durante toda la corrida. |

---

## 2. Configuración Experimental del Plan de Carga

El plan de pruebas k6 (`qa_testing/load_tests/load_test_integral.js`) se diseñó con cuatro escenarios simultáneos operando sobre la red de microservicios:

1. **Escenario (a) — POS Multi-SKU:** 100 VUs en rampa lineal durante 5 minutos, generando compras aleatorias sobre un conjunto de 30 SKUs del catálogo con ordenamiento canónico de IDs para mitigar contención.
2. **Escenario (b) — Mixto 70/30 (Lectura / Escritura):** 30 VUs concurrentes con distribución:
   - 70% Lectura: Búsqueda indexada GIN sobre JSONB (`/ia/perfiles/search`) y administración de clientes con filtros combinados (`/admin/clientes?somatotipo=2&q=Carlos`).
   - 30% Escritura: Emisión de ventas POS con clientes y productos aleatorios.
3. **Escenario (c) — Capturas Sostenidas:** 20 VUs constantes durante 5 minutos ejecutando inferencia sobre `/ia/pose/analizar` con fotogramas JPEG reales (`sample_pose.jpg`).
4. **Escenario (d) — Pico (Spike):** 150 VUs concentradas durante 60 segundos sobre `/catalogo/productos`.

**Duración Total de la Corrida:** 302.04 segundos (5.03 minutos).  
**VUs Concurrentes Máximas Simultáneas:** 283 VUs activas.

---

## 3. Resultados Consolidados por Escenario

A partir de la telemetría agregada exportada en `qa_testing/load_tests/summary.json`:

| Escenario | VUs Configuradas | Solicitudes Totales (N) | Throughput Efectivo | p50 (ms) | p90 (ms) | p95 (ms) | p99 (ms) | Tasa de Error Inesperado | Veredicto SLO |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **(a) POS Multi-SKU (30 SKUs)** | 100 VUs | 4,152 | 13.75 req/s | 3,912.95 | 8,678.53 | **10,765.83** | ~22,000 | 0.00% | **NO CUMPLE** *(Ver 3.1)* |
| **(b1) Admin Clientes (Filtros)** | 30 VUs (mixto) | 1,198 | 3.97 req/s | 1,138.87 | 3,273.67 | **4,422.63** | ~11,000 | 0.00% | **NO CUMPLE** *(Ver 3.1)* |
| **(b2) Búsqueda GIN JSONB** | 30 VUs (mixto) | 1,214 | 4.02 req/s | 1,480.91 | 3,580.44 | 4,652.73 | ~10,500 | 0.00% | N/A (Informativo) |
| **(c) Captura Pose MediaPipe** | 20 VUs | 2,405 | 7.96 req/s | 1,781.50 | 3,855.64 | **4,887.65** | ~5,200 | 0.25% (6 to) | **CUMPLE** |
| **(d) Pico Catálogo (60 s)** | 150 VUs | 2,033 | 33.88 req/s | 2,928.36 | 10,425.46 | 13,004.44 | ~25,000 | 0.10% (2 to) | N/A (Spike) |
| **Global Consolidado** | **283 VUs máx.** | **11,957** | **39.59 req/s** | **2,342.52** | **7,419.71** | **9,828.14** | **18,500** | **0.067%** (8/11957) | **CUMPLE SLO-04** |

### 3.1. Análisis Técnico y Causalidad de las Desviaciones en SLO-01 y SLO-03

1. **Contención de Recursos en Entorno de Host Monomáquina:**  
   Durante la ejecución del plan integral, los cuatro escenarios operaron en paralelo sobre un único entorno Docker de desarrollo (4 vCPUs asignadas, 8 GB RAM compartida entre PostgreSQL, Backend FastAPI, Microservicio IA y el propio runtime de k6). La concurrencia de 283 VUs provocó saturación al 100% de la CPU del host, generada primordialmente por la inferencia continua de MediaPipe (20 VUs) y el spike de 150 VUs sobre el catálogo.
2. **Comportamiento en Aislamiento vs. Sobrecarga Combinada:**  
   - En la prueba monoejecución de POS Multi-SKU (100 VUs aisladas), la latencia P95 registrada fue de **726.46 ms** (cumpliendo contractualmente el SLO < 1,000 ms).
   - En la prueba monoejecución de `/admin/clientes` aislada, el P95 registrado fue de **245.10 ms** (cumpliendo el SLO < 500 ms).
   - La degradación a 10,765 ms y 4,422 ms respectivamente es producto directo del encolamiento de hilos del event loop de Python (GIL) y el pool de conexiones de base de datos bajo sobrecarga simultánea multiescenario, y no de bloqueos transaccionales patológicos en PostgreSQL.

---

## 4. Clasificación y Auditoría de Errores

De las 11,957 solicitudes enviadas a la plataforma durante los 5 minutos:

1. **Respuestas HTTP 409 Conflict (1,484 ocurrencias — 12.41% del tráfico de escritura):**  
   - **Clasificación:** Errores de negocio esperados y controlados.
   - **Causa:** La función transaccional `erp.fn_procesar_venta()` implementa el control atómico de stock mediante `FOR UPDATE`. Al agotarse las existencias de los 30 SKUs sometidos a compra ininterrumpida por 100 VUs, la función abortó limpiamente lanzando excepción con mensaje `'Quiebre de stock: producto X'`, respondiendo HTTP 409 sin corromper el inventario ni desbalancear el Kardex.
2. **Errores Inesperados / Timeouts (8 ocurrencias — 0.067% del total de solicitudes):**  
   - 6 timeouts en `/ia/pose/analizar` al coincidir la fase pico de 150 VUs con ráfagas de fotogramas MediaPipe.
   - 2 timeouts de conexión HTTP en `/catalogo/productos`.
   - **Tasa de Error Inesperado Final:** **0.067%**, holgadamente inferior al umbral contractual fijado en el **SLO-04 (< 1.00%)**.
3. **Auditoría de Deadlocks en PostgreSQL:**  
   - Se inspeccionaron los registros completos de `docker logs spartan-db` correspondientes al intervalo de prueba.
   - **Total de interbloqueos (`deadlock detected`): 0.**
   - **Veredicto SLO-05: CUMPLIDO.**

---

## 5. Comparación Cuantitativa: Concurrencia Multi-SKU vs. Peor Caso Single-SKU (Tarea 17)

En la Tarea 17 previa (`data/reporte_concurrencia.md`), se sometió el motor transaccional a la peor condición de contención posible: 50 transacciones concurrentes intentando adquirir el cerrojo exclusivo (`RowExclusiveLock`) sobre un único producto idéntico (`single-SKU`):

| Métrica Transaccional | Peor Caso Single-SKU (Tarea 17 / O3) | Escenario Multi-SKU Aislado | Escenario Multi-SKU en Estrés Combinado (Tarea 19) |
|---|:---:|:---:|:---:|
| **Concurrencia (VUs)** | 50 VUs | 100 VUs | **100 VUs (+ 183 VUs adicionales)** |
| **Muestra de Peticiones** | 50 | 1,459 | **4,152** |
| **Percentil 50 (p50)** | 1,986.63 ms | **66.87 ms** | 3,912.95 ms |
| **Percentil 95 (p95)** | 2,018.09 ms | **726.46 ms** | 10,765.83 ms |
| **Interbloqueos (Deadlocks)** | 0 | **0** | **0** |
| **Tasa de Errores Inesperados** | 0.00% | **0.00%** | **0.00%** |

### Conclusiones de Concurrencia:
- La técnica de ordenamiento determinista previo de productos (`sorted(set(prod_ids))`) antes de la invocación de `FOR UPDATE` garantizó la ausencia total de deadlocks en ambos experimentos (0 interbloqueos).
- En condiciones normales de operación multi-SKU, la latencia mediana se reduce en un **96.63%** frente a la contención monofila, satisfaciendo el tiempo de respuesta requerido para operaciones de venta física en mostrador.

---

## 6. Gates de Regresión Previo y Posterior

Antes y después de la ejecución de la batería de carga, se ejecutaron las suites de pruebas automatizadas del sistema:

1. **Backend FastAPI Suite (`pytest tests/`):**  
   - **Resultado:** **99 passed in 39.34s** (100% verde).
2. **Microservicio IA Suite (`pytest services/ia/tests/`):**  
   - **Resultado:** **16 passed in 12.92s** (100% verde).
3. **Frontend E2E Suite (`playwright test`):**  
   - **Resultado:** **15 passed in 27.7s** (100% verde, cubriendo flujos reales sin mocks, consistencia visual, seguridad por roles y prescripción).

**Veredicto General de Regresión:** **APROBADO SIN REGRESIONES.**
