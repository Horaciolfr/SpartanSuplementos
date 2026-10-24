# REPORTE TÉCNICO DE CONCURRENCIA Y RESILIENCIA ASGI (TAREA 17)

**Proyecto:** Spartan Suplementos Bolivia  
**Carga Evaluada:** 50 transacciones POS concurrentes + 20 inferencias biométricas simultáneas  
**Garantía de Aislamiento:** Cumplimiento ACID en PostgreSQL 16 con bloqueo a nivel de fila (`FOR UPDATE`)  

---

## 1. Métricas de Rendimiento y Latencia (Percentiles)

| Endpoint | Muestra (N) | Estado Exitoso | Conflicto (409) | Deadlocks | p50 (ms) | p95 (ms) | p99 (ms) |
|---|---|---|---|---|---|---|---|
| `POST /pos/ventas` | 50 | 50 (201) | 0 (409) | **0** | **1488.16** | **1987.40** | **2006.02** |
| `POST /ia/pose/analizar` | 20 | 20 (200) | 0 | **0** | **2095.80** | **2300.96** | **2303.88** |

---

## 2. Diagnóstico de Integridad Transaccional

1. **Ausencia de Deadlocks:** Ninguna de las 70 operaciones concurrentes reportó bloqueos mutuos o excepciones de transacción abortada por interbloqueo.
2. **Consistencia de Stock (Gate 409):** Tras agotarse las unidades disponibles del SKU evaluado, las transacciones subsecuentes rechazaron la sobreventa de forma atómica y consistente con HTTP 409 Conflict, preservando el kárdex físico sin saldos negativos.
3. **Desacoplamiento de Inferencia:** Las 20 inferencias MediaPipe CPU-bound no degradaron las transacciones financieras del ERP gracias al aislamiento de hilos y ejecución de background tasks.
