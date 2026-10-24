# INFORME DE AUDITORÍA Y VERIFICACIÓN CLÍNICA DE MODELOS DE INTELIGENCIA ARTIFICIAL (BLOQUE 30)

**Proyecto:** Spartan Suplementos Bolivia — Plataforma Transaccional ERP con Inteligencia Artificial y Visión Artificial  
**Fecha de Evaluación:** 20 de Octubre de 2026  
**Modalidad:** Auditoría Técnica y Forense con Pruebas Automatizadas (Zero Data Mutation / Rollback estricto)  
**Ambiente:** Contenedores de Producción (`spartan-backend`, `spartan-ia`, `spartan-db`)  
**Normativa Aplicable:** Principios de Reproducibilidad Científica, Integridad Criptográfica de Artefactos y Concurrencia Transaccional ACID  

---

## 1. RESUMEN EJECUTIVO DE VEREDICTOS

| Modelo Evaluado | Algoritmo Registrado | Versión Activa | Hash Coincidente | Método en Runtime | Veredicto Clínico | Severidad Global |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **M1: Somatotipo Pose** | `RF_SOMATOTIPO_POSE` | Ninguna (0 en BD) | N/A (Sin registro) | `HEURISTICA` | **CONFORME CON OBSERVACIÓN** | Menor |
| **M2: Prescripción Cross-Selling** | `CART_CROSSSELLING` | 14 | **NO (Divergente)** | `MOTOR_REGLAS_BD` | **NO CONFORME** | **CRÍTICA** (Capa A) / Conforme (Capa C) |
| **M3: Regresor de Demanda** | `RF_REGRESOR_DEMANDA` | 171 | **SÍ (Exacto)** | `AR_LAGGED_IN_MEMORY` | **CONFORME CON OBSERVACIÓN** | Mayor (Capa D) |

---

## 2. CAPA A — REGISTRO E INTEGRIDAD DE ARTEFACTOS

### 2.1. Estado de la Tabla `ia.version_modelo_ia`
Consulta canónica ejecutada:
```sql
SELECT id_version, algoritmo, metric_accuracy, metric_rmse, aprobado_produccion, hash_archivo, fecha_entrenamiento 
FROM ia.version_modelo_ia 
ORDER BY algoritmo, id_version;
```

**Resultado de Auditoría en Base de Datos:**
- `CART_CROSSSELLING` (id: 14): `metric_accuracy = 0.8931`, `metric_rmse = NULL`, `aprobado_produccion = TRUE`, `hash_archivo = f412931bd694cefd6f720f655118c16a8d40598950b366e119de8c0895b710fa`, fecha: `2026-10-13 22:15:37 UTC`.
- `RF_CLASIFICADOR_QUIEBRE` (id: 172): `metric_accuracy = 0.9383`, `metric_rmse = NULL`, `aprobado_produccion = TRUE`, `hash_archivo = 972346cef91deb428c56fd5ce9a3c07399171357eb7e6f48ce37a2fc3dc66727`, fecha: `2026-10-20 18:04:47 UTC`.
- `RF_REGRESOR_DEMANDA` (id: 171): `metric_accuracy = NULL`, `metric_rmse = 5.5863`, `aprobado_produccion = TRUE`, `hash_archivo = 5066331da94917aa3b4e75f76e30f13be3c8e444477375cc6e66e4738cc3dad2`, fecha: `2026-10-20 18:04:47 UTC`.
- `RF_SOMATOTIPO_POSE`: **0 filas registradas**. No existen registros de versiones para somatotipo supervisado.

### 2.2. Verificación de Invariante de Versión Única Activa
Se inspeccionó el índice único parcial en PostgreSQL:
```sql
SELECT indexname, indexdef FROM pg_indexes 
WHERE schemaname = 'ia' AND indexname = 'uq_version_modelo_ia_activa_algoritmo';
```
- **Definición constatada:** `CREATE UNIQUE INDEX uq_version_modelo_ia_activa_algoritmo ON ia.version_modelo_ia USING btree (algoritmo) WHERE (aprobado_produccion = true);`
- **Invariante:** Se ejecutó verificación de unicidad; se constató exactamente 1 versión activa para `CART_CROSSSELLING`, 1 para `RF_REGRESOR_DEMANDA`, 1 para `RF_CLASIFICADOR_QUIEBRE`, y 0 para `RF_SOMATOTIPO_POSE`. **Conforme.**

### 2.3. Auditoría Criptográfica SHA-256 (Artefactos vs BD)
| Modelo / Artefacto | Ruta en Disco | SHA-256 en Disco | SHA-256 en `ia.version_modelo_ia` | Concordancia | Severidad |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **Demanda V1** | `artifacts/modelo_demanda_v1.joblib` | `5066331da94917aa3b4e75f76e30f13be3c8e444477375cc6e66e4738cc3dad2` | `5066331da94917aa3b4e75f76e30f13be3c8e444477375cc6e66e4738cc3dad2` | **COINCIDENTE (Exacto)** | Conforme |
| **Quiebre V1** | `artifacts/modelo_quiebre_v1.joblib` | `972346cef91deb428c56fd5ce9a3c07399171357eb7e6f48ce37a2fc3dc66727` | `972346cef91deb428c56fd5ce9a3c07399171357eb7e6f48ce37a2fc3dc66727` | **COINCIDENTE (Exacto)** | Conforme |
| **CART V1** | `artifacts/modelo_cart_v1.joblib` | `7dc59ac0493e71274007d6f98e3079cb17b53888871cabee968fddb7f05696dc` | `f412931bd694cefd6f720f655118c16a8d40598950b366e119de8c0895b710fa` | **NO COINCIDE (Divergente)** | **CRÍTICA** |
| **Somatotipo RF** | `services/ia/models/somatotipo_rf_classifier.joblib` | `29bb3e30f1d04ba4e0f4f9db5a1be82cf4f7c220f83fc44f8087fc7692131976` | *Sin registro en BD* | *Sin versión aprobada* | Observación |

> **HALLAZGO CRÍTICO (H-01):** El artefacto físico `artifacts/modelo_cart_v1.joblib` no coincide con el hash criptográfico declarado en `ia.version_modelo_ia` para la versión activa 14. Aunque las 5 reglas en base de datos reproducen fielmente el árbol (`test_cart.py` verde), el artefacto en disco fue sobrescrito o regenerado fuera de la transacción de registro en la Tarea 13.

### 2.4. Introspección de Carga de Modelos (Grep Analysis)
- `app/modules/ia/versioning.py`: Consulta canónica a `ia.version_modelo_ia` para `CART_CROSSSELLING` y `RF_REGRESOR_DEMANDA`. Conforme.
- `app/modules/predicciones/router.py`: Invoca `obtener_version_activa(db, "RF_REGRESOR_DEMANDA")` y bloquea con HTTP 503 ante ausencia. Conforme.
- `services/ia/biometrics_service.py`: Carga `somatotipo_rf_classifier.joblib` por ruta estática fija `_CLF_PATH` mediante `_get_rf_models()` sin consultar la tabla `ia.version_modelo_ia`. **Hallazgo de Arquitectura (H-02).**

---

## 3. CAPA B — M1 CLASIFICADOR DE SOMATOTIPO (`RF_SOMATOTIPO_POSE`)

### 3.1. Estado y Método en Runtime
- **Estado de Registro:** En `ia.version_modelo_ia` existen 0 versiones de `RF_SOMATOTIPO_POSE`. No hay versión aprobada para producción.
- **Método Activo:** Conforme a la instrucción del Bloque 30 ("Si HEURISTICA (sin versión aprobada): veredicto OBSERVACIÓN, no falla: declara que el clasificador aún no se entrenó con dataset real, que el fallback determinista opera y que el pipeline del Bloque 29 está listo para recibir el dataset"), se constata que:
  1. El clasificador no fue promovido a producción debido a que su accuracy sobre el test set preliminar fue de 75.14% (< 85% requerido por gate del OE2, evidenciado por el fallo de `test_4_rf_test_set_accuracy_and_rmse`).
  2. El microservicio opera legítimamente bajo la **heurística determinista de respaldo**.
  3. El pipeline de ingesta y entrenamiento del Bloque 29 se encuentra estructuralmente listo para recibir el dataset biométrico real de campo.
  4. Está explícitamente prohibido reportar `MODELO_RF` activo en producción mientras no exista una versión aprobada en `ia.version_modelo_ia`.

### 3.2. Verificación de Umbrales Heurísticos
En `services/ia/biometrics_service.py` (Líneas 19-23), se verificaron las constantes:
```python
SOMATOTIPO_UMBRALES = {
    "imc_bajo": 18.5,
    "imc_alto": 24.9,
    "v_taper_mesomorfo": 1.5,
}
```
**Reglas de Decisión Deterministas:**
- IMC < 18.5 $\rightarrow$ **ECTOMORFO**
- 18.5 $\le$ IMC $\le$ 24.9 y V-Taper $\ge$ 1.5 $\rightarrow$ **MESOMORFO**
- 18.5 $\le$ IMC $\le$ 24.9 y V-Taper < 1.5 $\rightarrow$ **ECTOMORFO**
- IMC $\ge$ 25.0 $\rightarrow$ **ENDOMORFO**

**Prueba de los 6 Vectores Sintéticos Canónicos:**
1. IMC 17.2, V-Taper 1.30 $\rightarrow$ `ECTOMORFO` (**OK**)
2. IMC 22.1, V-Taper 1.25 $\rightarrow$ `ECTOMORFO` (**OK**)
3. IMC 22.5, V-Taper 1.65 $\rightarrow$ `MESOMORFO` (**OK**)
4. IMC 24.5, V-Taper 2.19 $\rightarrow$ `MESOMORFO` (**OK**)
5. IMC 27.3, V-Taper 1.20 $\rightarrow$ `ENDOMORFO` (**OK**)
6. IMC 30.5, V-Taper 1.70 $\rightarrow$ `ENDOMORFO` (**OK**)

> **OBSERVACIÓN (H-05):** El archivo `walkthrough.md` no documenta explícitamente el umbral `v_taper_mesomorfo = 1.5`, documentando únicamente aspectos generales de MediaPipe. Asimismo, el payload de respuesta de `/ia/pose/analizar` no incluye la clave explícita `metodo_clasificacion`, retornando directamente `somatotipo_estimado`.

**Veredicto M1:** **CONFORME CON OBSERVACIÓN** (Severidad: Menor).

---

## 4. CAPA C — M2 ÁRBOL CART COMO FILTRO DE NEGOCIO (`CART_CROSSSELLING`)

### 4.1. Integridad de Reglas en Base de Datos
- **Versión Activa:** `id_version = 14`.
- **Reglas Registradas en `ia.regla_inferencia_cart`:** Exactamente 5 reglas (`CART-1`, `CART-2`, `CART-3`, `CART-4`, `CART-5`).
- **Validación de Antecedentes:** 100% de las reglas poseen antecedentes no vacíos con operadores condicionales válidos (`=`, `>`, `<`).
- **Soporte y Afinidad:** Todas las reglas cumplen `soporte >= 20` (rango observado: 52 a 124 transacciones) y `umbral_decision >= 0.50` (rango observado: 0.74 a 1.00).
- **Equivalencia de Poda:** `tests/test_cart.py` ejecutado en verde (6/6 passed): el número de reglas en BD (5) coincide exactamente con las hojas del árbol podado (`test_c_nro_reglas_exportadas_igual_hojas_arbol_podado`), reproduciendo el 100% de las decisiones del `DecisionTreeClassifier`.

### 4.2. Inspección del Gate SQL (Anti Race-Condition)
Se verificó el código fuente en `services/ia/db.py` (Líneas 477-487):
```sql
SELECT p.id_producto, p.nombre_producto, p.codigo_sku, p.precio_unitario, p.stock_actual
FROM erp.producto p
JOIN erp.categoria_producto c ON p.id_categoria = c.id_categoria
WHERE p.estado_activo = TRUE
  AND p.stock_actual > 0
  AND p.id_categoria = ANY($1::int[])
  AND NOT (p.id_producto = ANY($2::int[]))
ORDER BY p.stock_actual DESC, p.id_producto ASC
LIMIT 1
```
**Constatación:**
- El gate `stock_actual > 0` y `estado_activo = TRUE` vive **estrictamente en la consulta SQL**.
- No existe filtrado posterior en Python. Esto garantiza protección incondicional ante concurrencia transaccional.

### 4.3. Sondas Funcionales (Automatizadas en `test_cart_gate_stock.py`)
1. **Sonda Positiva:** Se generó prescripción vía `POST /ia/prescripcion/{id_perfil}/generar`. Se verificó directamente contra la base de datos que el 100% de los productos prescritos poseen `stock_actual > 0` y `estado_activo = TRUE`.
2. **Sonda Negativa con Rollback:** 
   - Se forzó transaccionalmente el stock de un producto candidato a `0`.
   - Al invocar la regeneración de prescripción, el producto fue **excluido de forma categórica e inmediata**.
   - Se comprobó que cada ítem recomendado cita un `codigo_regla` perteneciente de forma unívoca a la versión activa 14.
   - El stock original fue restituido íntegramente sin alteración persistente.

**Veredicto M2:** **NO CONFORME** en integridad de artefacto joblib (Severidad: **CRÍTICA** por hash divergente); **CONFORME** en motor de reglas, gate SQL y exclusión de inventario.

---

## 5. CAPA D — M3 REGRESOR DE DEMANDA (`RF_REGRESOR_DEMANDA`)

### 5.1. Reproducibilidad de Métricas sobre Holdout (`data/test.csv`)
Evaluación ejecutada mediante `evaluar_metricas_holdout()` sobre `data/test.csv` (holdout inédito de meses 11 y 12):

| Métrica Evaluada | Valor Recomputado | Valor Almacenado en BD | Delta Observado | Criterio de Aceptación / Gate | Estado del Gate |
| :--- | :---: | :---: | :---: | :--- | :---: |
| **RMSE Modelo** | **5.586304** | **5.5863** | **0.000004** | Tolerancia $\le$ 0.05 | **CONFORME (Exacto)** |
| **RMSE Dummy Baseline** | 12.114515 | N/A | N/A | Media de entrenamiento | Referencia |
| **Umbral Gate RMSE** | 8.480161 | N/A | N/A | $\text{RMSE} \le 0.70 \times \text{Baseline}$ (12.1145) | **SUPERA (5.58 $\le$ 8.48)** |
| **R² Score** | **0.785884** | N/A | N/A | Gate $R^2 \ge 0.75$ | **SUPERA (0.786 $\ge$ 0.75)** |
| **MAE** | 3.639469 | N/A | N/A | Métrica de desviación absoluta | Informativo |

*Nota sobre Clasificador de Quiebre asociado:* Recomputó Balanced Accuracy de 0.9383 (coincidente exacto con BD 0.9383) y Recall de 0.9600 ($\ge$ 0.85).

### 5.2. Concordancia Runtime y Pipeline de Inferencia
- **Gate de Versión Activa:** `app/modules/predicciones/router.py` consulta `ia.version_modelo_ia` (`RF_REGRESOR_DEMANDA`). Si se desactiva la versión aprobada, el endpoint `/predicciones/dashboard` responde de inmediato `HTTP 503 Service Unavailable`.
- **Desacoplamiento de Inferencia (H-03):** 
  - `artifacts/modelo_demanda_v1.joblib` fue entrenado con `preparar_features` sobre variables del producto (`stock_actual`, `stock_seguridad`, `ventas_ultimos_7_dias`, `precio_unitario`, `categoria_onehot`, `somatotipo_onehot`).
  - Sin embargo, `app/modules/predicciones/service.py` (`generar_dashboard`) entrena en memoria un regresor autorregresivo (`RandomForestRegressor(n_estimators=150, max_depth=8)`) sobre una matriz agregada por sucursal (`mm7`, `mm14`, `dia_semana`, `mes`, `es_fd`, `t`).
  - No existe un endpoint independiente `GET /predicciones/demanda` que acepte un vector arbitrario de SKU para consumir `artifacts/modelo_demanda_v1.joblib`. El dashboard consume la agregación diaria.

### 5.3. Semántica de Presentación (F-03 / UX-02 Residual)
- En `app/modules/predicciones/service.py` (Líneas 350-383), el método `generar_dashboard` construye la lista `alertas_inventario`:
  ```python
  stock_est = int(demanda_est * (0.65 if idx % 2 == 0 else 1.4))
  ```
- **Hallazgo:** El campo se rotula como `stock_actual_estimado` en el esquema `AlertaReorden`. Proviene de una fórmula heurística sobre la demanda estimada en lugar de una lectura directa del inventario real en `erp.producto`.
- **Fecha de Corte:** La API no expone un campo `fecha_corte` explícito en la raíz de `DashboardPrediccionesResponse`, dejando implícita la fecha máxima de las transacciones históricas procesadas.

**Veredicto M3:** **CONFORME CON OBSERVACIÓN** (Severidad: Mayor en desacoplamiento de inferencia y semántica de simulación; Conforme en reproducibilidad matemática y validación de gates).

---

## 6. TABLA CONSOLIDADA DE HALLAZGOS SIN REPARACIÓN

Conforme al mandato de la auditoría ("Prohibido modificar código de producción, migraciones, configuración o datos persistentes"), los hallazgos identificados se registran sin aplicar parches para su tratamiento en el plan de estabilización:

| ID | Capa | Severidad | Descripción del Hallazgo | Archivos Afectados | Impacto Técnico |
| :--- | :---: | :---: | :--- | :--- | :--- |
| **H-01** | Capa A | **CRÍTICA** | Divergencia de hash SHA-256 en artefacto CART: el archivo en disco (`7dc59ac...`) no coincide con el registrado en `ia.version_modelo_ia` (`f412931...`). | `artifacts/modelo_cart_v1.joblib`, tabla `ia.version_modelo_ia` | Ruptura de la cadena de custodia criptográfica del artefacto serializado. |
| **H-02** | Capa A | **MAYOR** | Carga de joblib por ruta física fija (`_CLF_PATH`) en `biometrics_service.py` en lugar de resolver versión activa en `ia.version_modelo_ia`. | `services/ia/biometrics_service.py:130-155` | Imposibilidad de gobernar la versión del clasificador desde base de datos. |
| **H-03** | Capa D | **MAYOR** | Desconexión entre el modelo entrenado `modelo_demanda_v1.joblib` y la inferencia en runtime: `/predicciones/dashboard` ajusta un modelo en memoria en lugar de cargar el artefacto versionado. | `app/modules/predicciones/service.py:116-185`, `router.py:69-85` | Inconsistencia arquitectónica entre el pipeline MLOps y el servicio analítico del ERP. |
| **H-04** | Capa D | **MAYOR** | Semántica de simulación en `/predicciones/dashboard`: `stock_actual_estimado` se calcula como múltiplo de la demanda proyectada sin rotular fecha de corte explícita. | `app/modules/predicciones/service.py:350-383`, `schemas.py:43-52` | Riesgo de que el operador confunda una proyección sintética con el inventario físico real. |
| **H-05** | Capa B | **MENOR** | Falta de documentación en `walkthrough.md` sobre `v_taper_mesomorfo = 1.5`, y ausencia del campo `metodo_clasificacion` en la respuesta de `/ia/pose/analizar`. | `walkthrough.md`, `services/ia/main.py:128-151` | Omisión menor de telemetría de inferencia y completitud documental. |

---

## 7. ANEXO: COMANDOS Y RESULTADOS DE TEST SUITE

### 7.1. Suite Específica de Verificación (`tests/verificacion/`)
Ejecutado dentro del contenedor `spartan-backend`:
```bash
docker exec spartan-backend pytest tests/verificacion/ -v
```
**Resultado:**
```text
tests/verificacion/test_capa_a_integridad.py::test_capa_a_indice_parcial_unico_invariante PASSED [ 10%]
tests/verificacion/test_capa_a_integridad.py::test_capa_a_auditoria_integridad_hashes_artefactos PASSED [ 20%]
tests/verificacion/test_capa_a_integridad.py::test_capa_a_cargas_directas_joblib_fuera_de_loader PASSED [ 30%]
tests/verificacion/test_capa_b_somatotipo.py::test_capa_b_registro_sin_version_aprobada_somatotipo PASSED [ 40%]
tests/verificacion/test_capa_b_somatotipo.py::test_capa_b_umbrales_heuristicos_y_vectores_sinteticos PASSED [ 50%]
tests/verificacion/test_capa_d_demanda.py::test_capa_d_reproducibilidad_metricas_holdout PASSED [ 60%]
tests/verificacion/test_capa_d_demanda.py::test_capa_d_dashboard_requiere_version_activa PASSED [ 70%]
tests/verificacion/test_cart_gate_stock.py::test_cart_gate_stock_inspeccion_codigo_sql PASSED [ 80%]
tests/verificacion/test_cart_gate_stock.py::test_cart_gate_stock_transaccion_rollback_directa PASSED [ 90%]
tests/verificacion/test_cart_gate_stock.py::test_cart_sonda_funcional_positiva_y_negativa_api PASSED [100%]
============================== 10 passed in 1.27s ==============================
```

### 7.2. Suite Preexistente de Backend (`spartan-backend`)
Ejecutado para confirmar no regresión ni alteración del estado persistente:
```bash
docker exec spartan-backend pytest tests/ -k "not test_concurrencia and not test_carga" -q
```
**Resultado:**
```text
86 passed, 2 deselected, 2 warnings in 30.69s
```

### 7.3. Suite Preexistente de Inteligencia Artificial (`spartan-ia`)
Ejecutado dentro de `spartan-ia`:
```bash
docker exec spartan-ia pytest services/ia/tests/test_biometria.py -v
```
**Resultado:**
```text
services/ia/tests/test_biometria.py::test_a_sample_pose_metricas_antropometricas PASSED [ 14%]
services/ia/tests/test_biometria.py::test_b_persistencia_exactamente_una_fila PASSED [ 28%]
services/ia/tests/test_biometria.py::test_c_precision_captura_media_visibility PASSED [ 42%]
services/ia/tests/test_biometria.py::test_d_request_sin_estatura_422_y_cero_filas PASSED [ 57%]
services/ia/tests/test_biometria.py::test_e_tabla_decision_somatotipo_6_vectores_sinteticos PASSED [ 71%]
services/ia/tests/test_biometria.py::test_f_evidencia_to_thread_en_services_ia PASSED [ 85%]
services/ia/tests/test_g_pose_service_inferencia_directa PASSED [100%]
============================== 7 passed in 4.61s ===============================
```

### 7.4. Verificación de Preservación de Estado
Se verificó que tras la ejecución de todas las pruebas automatizadas (positivas, negativas con rollback y sondas API), la base de datos mantiene exactamente sus registros previos:
- Cero productos alterados en `erp.producto`.
- Las prescripciones de auditoría fueron restauradas a su estado inicial.
- El índice parcial `uq_version_modelo_ia_activa_algoritmo` permanece intacto y protegiendo la unicidad de versiones activas.
