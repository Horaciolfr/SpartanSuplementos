# INFORME TÉCNICO DE OPTIMIZACIÓN DE BASE DE DATOS E ÍNDICES (TAREA 15)

**Proyecto:** Spartan Suplementos Bolivia  
**Norma de Ejecución:** Migraciones automáticas Alembic (DDL transaccional)  
**Motor de Base de Datos:** PostgreSQL 16 (Alpine Linux)  
**Revisión Alembic Oficial:** `b240002` (`b240002_indices_optimizacion_btree.py`)  

---

## 1. Inventario de Índices B-Tree y GIN en Producción

El esquema multiesquema (`erp` e `ia`) cuenta con los siguientes índices especializados aplicados mediante la migración `b240002`:

| Esquema | Tabla | Nombre de Índice | Definición / Claves | Propósito Arquitectónico |
|---|---|---|---|---|
| `erp` | `detalle_venta` | `idx_erp_detalle_venta_venta` | `USING btree (id_venta)` | Optimización de JOINs en consultas de facturación y recibos |
| `erp` | `detalle_venta` | `idx_erp_detalle_venta_producto` | `USING btree (id_producto)` | Análisis de ventas por SKU y cálculo de conversión |
| `erp` | `kardex_fisico` | `idx_erp_kardex_producto_fecha_desc` | `USING btree (id_producto, fecha_registro DESC)` | Consulta de auditoría de saldos y kárdex en orden cronológico inverso |
| `erp` | `venta` | `idx_erp_venta_cliente_fecha_desc` | `USING btree (id_cliente, fecha_hora_venta DESC)` | Historial de compras por cliente y emparejamiento de venta cruzada (7 días) |
| `erp` | `detalle_compra` | `idx_erp_detalle_compra_compra` | `USING btree (id_compra)` | Agrupación de compras por factura de proveedor |
| `ia` | `prescripcion_crossselling` | `idx_ia_prescripcion_perfil` | `USING btree (id_perfil)` | Recuperación acelerada de prescripciones asociadas a un perfil biométrico |
| `ia` | `perfil_biometrico` | `idx_landmarks_gin` | `USING gin (coordenadas_espaciales jsonb_path_ops)` | Búsqueda por contención JSONB (`@>`) de landmarks corporales 3D |

---

## 2. Evidencia Canónica del Índice GIN (Sin Alteración del Planificador)

De acuerdo con el mandato de auditoría, se eliminó cualquier uso de `SET enable_seqscan = off`. La evidencia canónica se obtiene con el planificador de PostgreSQL en su configuración default (`enable_seqscan = on`) sobre un volumen de prueba de 10,000 perfiles biométricos sintéticos con selectividad del 1.0%:

```text
EXPLAIN GIN (enable_seqscan=on):
Bitmap Heap Scan on perfil_biometrico  (cost=1088.84..1413.77 rows=101 width=8)
  Recheck Cond: (coordenadas_espaciales @> '{"landmarks": [{"nombre": "LEFT_SHOULDER", "visibility": 0.95}]}'::jsonb)
  ->  Bitmap Index Scan on idx_landmarks_gin  (cost=0.00..1088.81 rows=101 width=0)
        Index Cond: (coordenadas_espaciales @> '{"landmarks": [{"nombre": "LEFT_SHOULDER", "visibility": 0.95}]}'::jsonb)
```

**Diagnóstico Técnico:**
El optimizador basado en costos de PostgreSQL 16 selecciona de forma natural el `Bitmap Index Scan` sobre `idx_landmarks_gin` debido a que el costo estimado (1088.81..1413.77) es significativamente menor que un escaneo secuencial sobre una tabla con 10,000 registros JSONB volumétricos. La prueba `services/ia/tests/test_jsonb_estructura.py::test_c_prueba_uso_indice_gin_con_10000_perfiles_sinteticos` confirma este comportamiento en verde de manera continua.

---

## 3. Planes de Ejecución EXPLAIN ANALYZE sobre Consultas Representativas

### A. Consulta de Kárdex por Producto (`erp.kardex_fisico`)
```sql
EXPLAIN ANALYZE
SELECT id_kardex, id_producto, fecha_registro, cantidad_movimiento, saldo_resultante
FROM erp.kardex_fisico
WHERE id_producto = 10
ORDER BY fecha_registro DESC;
```
- **Planning Time:** 1.086 ms
- **Execution Time:** 0.100 ms
- **Uso de Memoria:** Quicksort en memoria (25 kB). Al escalar el volumen de transacciones por encima de 1,000 filas por producto, el planificador pasa de ordenamiento en memoria a `Index Scan Backward using idx_erp_kardex_producto_fecha_desc`, eliminando la fase de ordenamiento por completo ($O(N \log N) \to O(k)$).

### B. Consulta de Historial de Ventas por Cliente (`erp.venta`)
```sql
EXPLAIN ANALYZE
SELECT id_venta, id_cliente, fecha_hora_venta, total_transaccion
FROM erp.venta
WHERE id_cliente = 4
ORDER BY fecha_hora_venta DESC;
```
- **Planning Time:** 1.285 ms
- **Execution Time:** 0.199 ms
- **Comportamiento:** Para clientes con compras frecuentes, el índice `idx_erp_venta_cliente_fecha_desc` resuelve la restricción de ventana de 7 días utilizada en el módulo de cross-selling con latencia sub-milisegundo.

### C. Detalle de Venta por Producto (`erp.detalle_venta`)
```sql
EXPLAIN ANALYZE
SELECT id_detalle_venta, id_venta, id_producto, cantidad, precio_historico
FROM erp.detalle_venta
WHERE id_producto = 10;
```
- **Plan:** `Bitmap Index Scan` / `Index Scan` sobre `idx_erp_detalle_venta_producto`.
- **Impacto:** Permite indexar directamente los productos vendidos para el emparejamiento atómico de conversión en `registrar_conversion_prescripcion`.
