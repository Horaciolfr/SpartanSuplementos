# Manifiesto de datasets

Estado canónico a 2026-10-07. El dataset analítico oficial es
data/dataset_historico_erp.csv; data/train.csv y data/test.csv son sus
particiones temporales oficiales. Los CSV biométricos quedan congelados como
evidencia histórica y sus generadores están archivados.

| CSV | Productor | Consumidor | Estado |
|---|---|---|---|
| data/dataset_erp_ventas_stock.csv | Fuente heredada/manual; no existe generador canónico | scripts/build_notebook.py | Legado, no oficial |
| data/dataset_historico_erp.csv | scripts/generar_dataset_erp.py | scripts/split_dataset.py, tests/test_dataset_erp.py | **Dataset analítico oficial** |
| data/train.csv | scripts/split_dataset.py | scripts/train_modelos.py, scripts/promocionar_modelo.py, tests ML | Partición oficial de entrenamiento |
| data/test.csv | scripts/split_dataset.py | scripts/promocionar_modelo.py, scripts/experimento_cuasiexperimental.py, tests ML | Holdout temporal oficial |
| data/transacciones_historicas.csv | scripts/generar_dataset_erp.py | scripts/train_cart.py, tests/test_cart.py | Fuente oficial CART |
| data/resultados_cuasiexp.csv | scripts/experimento_cuasiexperimental.py | tests/test_cuasiexp.py, reporte cuasiexperimental | Resultado derivado |
| data/registro_ventas_spartan.csv | scripts/_deprecated/generar_excel_ventas_real.py | app/modules/predicciones/service.py | Snapshot operativo congelado |
| data/registro_ventas_santa_cruz.csv | scripts/_deprecated/generar_excel_santa_cruz.py | app/modules/predicciones/service.py | Snapshot operativo congelado |
| services/ia/data/dataset_roboflow_extracted.csv | scripts/_deprecated/roboflow_sync_dataset.py | scripts/_deprecated/generar_dataset_heath_carter.py | Evidencia biométrica congelada |
| services/ia/data/dataset_somatotipo_master.csv | scripts/_deprecated/generar_dataset_heath_carter.py | scripts/_deprecated/train_somatotype_model.py | Entrenamiento biométrico congelado |
| services/ia/data/test_split.csv | scripts/_deprecated/train_somatotype_model.py | scripts/evaluar_modelo_tesis.py, services/ia/tests/test_random_forest_inference.py | Holdout biométrico congelado |

## Cadena oficial reproducible

generar_dataset_erp.py → dataset_historico_erp.csv → split_dataset.py →
train.csv + test.csv → train_modelos.py → gates de promocionar_modelo.py →
experimento_cuasiexperimental.py.

## Política de exclusión de registros de auditoría UX (Bloque 26 — Paso 0)

Los siguientes identificadores corresponden a registros generados durante la auditoría técnica de interfaces y flujos de usuario (UI/UX). Queda estrictamente prohibido ejecutar `DELETE` sobre estas filas para preservar la integridad referencial, el balance de asientos de kárdex y los triggers de auditoría. Para la Tarea 20, cuasi-experimentos y cualquier reporte operativo, se deben aplicar obligatoriamente las siguientes cláusulas de exclusión SQL:

- Ventas operativas: `id_venta <> 13450`
- Catálogo de productos: `id_producto <> 205` (producto desactivado con `estado_activo = FALSE`)
- Usuarios del sistema: `id_usuario <> 23`
- Perfiles biométricos: `id_perfil <> 149511`
- Prescripciones nutricionales: `id_prescripcion NOT IN (1319, 1320)`

## Política de compilación y credenciales demo (Bloque 26 — Paso 1 / F-01)

Los botones de acceso rápido con credenciales de demostración en `frontend/src/pages/Login.tsx` están condicionados exclusivamente a la variable de entorno de compilación `VITE_DEMO_ACCOUNTS=true`.
Por defecto, dicha variable está ausente en el entorno de desarrollo y en los archivos de configuración base.
El build de demostración para el tribunal académico se genera de manera controlada y explícita con `VITE_DEMO_ACCOUNTS=true npm run build`.
Ningún build expuesto en producción o entorno operativo público incluye este flag ni compila los botones de credenciales predefinidas.

## Justificación del Hotfix de Contraste en Tema Claro (Bloque 26 — Paso 4 / UX-01)

Se implementó una excepción documentada y focalizada a la migración integral de design tokens (E1):
- **Diagnóstico previo**: En el módulo `/predicciones` bajo tema claro (`.light`), las clases tipográficas (`#0f172a`, `#475569`, `#785600`) se renderizaban sobre contenedores con fondos oscuros no adaptados (`bg-zinc-950/80`, `bg-zinc-950/90`, `bg-[#070707]`), produciendo un ratio de contraste crítico de 1.114:1 (registrado en `contraste_titulo.json`) que bloqueaba la legibilidad y presentación ante el tribunal examinador.
- **Hotfix aplicado**: Se establecieron sobreescrituras en `frontend/src/index.css` mapeando las superficies base y contenedores analíticos de `/predicciones` a superficies de porcelana clara translúcida (`rgba(255, 255, 255, 0.85)` y `#eef0f5`).
- **Medición posterior**: Registrada en `../revision_ux_spartan/contraste_postfix.json`:
  * Encabezados (`#0f172a` sobre `#fcfdfe`): ratio **17.53:1** (supera umbral normal >= 4.5:1 y grande >= 3.0:1).
  * Subtítulos y descripciones (`#475569` sobre `#fcfdfe`): ratio **7.44:1** (supera umbral >= 4.5:1).
  * Acentos dorados (`#785600` sobre `#fcfdfe`): ratio **6.59:1** (supera umbral >= 4.5:1).
  * Acentos dorados sobre badge (`#785600` sobre `#fdfce6`): ratio **6.47:1** (supera umbral >= 4.5:1).
  * Botón primario activo (`#000000` sobre `#f2e500`): ratio **15.98:1** (supera umbral >= 4.5:1).
- **Alcance y diferimiento**: La migración integral de tokens CSS globales (E1, que absorberá Q8 y Q11) permanece estrictamente diferida para la ventana programada del 4 al 14 de noviembre.


## Registro de Limpieza de Artefactos E2E (Paso 3 / V-09 — 2026-10-20T21:38:07.249089)

En cumplimiento del aislamiento estricto de datos de prueba y preservando los IDs protegidos `[13450, 205, 23, 149511, 1319, 1320]`, se eliminaron los siguientes registros transaccionales:

- **Usuarios eliminados (36)**:
  `[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 41, 42, 43, 44, 45]`
  (Emails: `['atleta_1fe659@test.com', 'atleta_5d8135@test.com', 'atleta_a1c222@test.com', 'atleta_1a2fac@test.com', 'atleta_728374@test.com', 'atleta_83354c@test.com', 'atleta_c34c0e@test.com', 'atleta_004a1f@test.com', 'atleta_53aee2@test.com', 'atleta_d10cb1@test.com', 'atleta_be3304@test.com', 'atleta_f50e2a@test.com', 'atleta_97847f@test.com', 'atleta_3b83cf@test.com', 'atleta_213ff4@test.com', 'atleta_719bdc@test.com', 'atleta_b9d6f9@test.com', 'atleta_ad02fe@test.com', 'atleta_ae8086@test.com', 'atleta_a83464@test.com', 'atleta_d32413@test.com', 'atleta_6247e8@test.com', 'atleta_fc0308@test.com', 'atleta_21b495@test.com', 'atleta_aeeec8@test.com', 'cliente_sin_capturas_test@spartan.dev', 'atleta_748ae2@test.com', 'atleta_30178b@test.com', 'atleta_f8199a@test.com', 'atleta_dbc96e@test.com', 'atleta_c8e28d@test.com', 'fsafsa@gmail.com', 'atleta_ee73df@test.com', 'atleta_19c424@test.com', 'atleta_ff80e4@test.com', 'atleta_1417d3@test.com']`)
- **Ventas eliminadas (4)**:
  `[1, 3245, 7199, 10520]`
  (Recibos: `['REC-E2EE55F9', 'REC-E2E9F15D', 'REC-E2E537C3', 'REC-E2E4028D']`)
- **Perfiles biométricos eliminados (10)**:
  `[209833, 209834, 209835, 209836, 209837, 209838, 209839, 209840, 209841, 209842]`
- **Prescripciones eliminadas (20)**:
  `[2103, 2104, 2105, 2106, 2107, 2108, 2111, 2112, 2115, 2116, 2117, 2118, 2119, 2120, 2121, 2122, 2123, 2124, 2125, 2126]`
- **Asientos de kárdex eliminados (10)**:
  `[1, 6029, 6030, 6031, 14000, 14001, 14002, 20684, 20685, 20686]`
- **Detalles de venta eliminados (10)**:
  `[1, 6068, 6069, 6070, 14039, 14040, 14041, 20723, 20724, 20725]`

## Procedimiento Documentado de Reset del Volumen de Demostración (Paso 6 / V-01, V-02 — 2026-10-20T21:56:01.219337)

### 1. Instrucción de Ejecución Idempotente
Para restablecer el volumen de datos de demostración a su estado clínico impecable pre-defensa:
```bash
docker exec spartan-backend python scripts/cleanup_artefactos_e2e.py
docker exec spartan-backend python scripts/seed_demo_realista.py
```

### 2. Magnitudes Garantizadas
- **Inventario normalizado**: Rango estricto de **20 a 300 unidades** por SKU en `erp.producto`.
- **Alertas de stock de seguridad**: Exactamente **10-15%** de los productos activos presentan `stock_actual < stock_seguridad` (para validar visualmente badges ámbar/rojo en POS y Catálogo).
- **Cifra pública del catálogo**: Derivada en tiempo real de `SELECT COUNT(*) FROM erp.producto WHERE estado_activo = TRUE AND id_producto <> 205` (198 productos activos). No existen conteos estáticos 'hardcodeados'.
- **Clientes del directorio administrativo**: 8 clientes con nombres bolivianos verosímiles, correos corporativos `@spartan.dev`, documentos de identidad CI, perfiles con somatotipos y prescripciones explicables.
- **Protección estricta de auditoría UX**: Los identificadores `[13450, 205, 23, 149511, 1319, 1320]` jamás son modificados ni eliminados.

### 3. Declaración de Independencia de Artefactos de Machine Learning
> [!IMPORTANT]
> **Declaración de Inmutabilidad de Modelos de Inteligencia Artificial:**
> Los modelos predictivos y clasificadores del sistema:
> 1. `RF_REGRESOR_DEMANDA` (Random Forest, v175)
> 2. `RF_CLASIFICADOR_QUIEBRE` (Random Forest, v175)
> 3. `RF_SOMATOTIPO_POSE` (Random Forest, v14)
> 4. `CART_CROSSSELLING` (Árbol CART, v14)
>
> Fueron entrenados, hiperparametrizados y evaluados exclusivamente sobre los conjuntos analíticos sintéticos generados por el DGP canónico (`data/dataset_historico_erp.csv`, `data/train.csv`, `data/test.csv`).
> **Ningún modelo de IA depende ni se entrena sobre la base viva transaccional de PostgreSQL**.
> En consecuencia, la ejecución de resets de volumen, sembrado de demostración o eliminación de transacciones operativas **NO invalida** los artefactos `.joblib`, las matrices de confusión, las métricas de exactitud (`metric_accuracy`, `metric_rmse`) ni los registros canónicos de `ia.version_modelo_ia`.

## Registro de Limpieza de Artefactos E2E (Paso 3 / V-09 — 2026-10-21T02:36:57.516963)

En cumplimiento del aislamiento estricto de datos de prueba y preservando los IDs protegidos `[13450, 205, 23, 149511, 1319, 1320]`, se eliminaron los siguientes registros transaccionales:

- **Usuarios eliminados (1)**:
  `[56]`
  (Emails: `['cliente_sin_capturas_test@spartan.dev']`)
- **Ventas eliminadas (0)**:
  `[]`
  (Recibos: `[]`)
- **Perfiles biométricos eliminados (0)**:
  `[]`
- **Prescripciones eliminadas (0)**:
  `[]`
- **Asientos de kárdex eliminados (0)**:
  `[]`
- **Detalles de venta eliminados (0)**:
  `[]`

## Procedimiento Documentado de Reset del Volumen de Demostración (Paso 6 / V-01, V-02 — 2026-10-21T02:37:06.165943)

### 1. Instrucción de Ejecución Idempotente
Para restablecer el volumen de datos de demostración a su estado clínico impecable pre-defensa:
```bash
docker exec spartan-backend python scripts/cleanup_artefactos_e2e.py
docker exec spartan-backend python scripts/seed_demo_realista.py
```

### 2. Magnitudes Garantizadas
- **Inventario normalizado**: Rango estricto de **20 a 300 unidades** por SKU en `erp.producto`.
- **Alertas de stock de seguridad**: Exactamente **10-15%** de los productos activos presentan `stock_actual < stock_seguridad` (para validar visualmente badges ámbar/rojo en POS y Catálogo).
- **Cifra pública del catálogo**: Derivada en tiempo real de `SELECT COUNT(*) FROM erp.producto WHERE estado_activo = TRUE AND id_producto <> 205` (198 productos activos). No existen conteos estáticos 'hardcodeados'.
- **Clientes del directorio administrativo**: 8 clientes con nombres bolivianos verosímiles, correos corporativos `@spartan.dev`, documentos de identidad CI, perfiles con somatotipos y prescripciones explicables.
- **Protección estricta de auditoría UX**: Los identificadores `[13450, 205, 23, 149511, 1319, 1320]` jamás son modificados ni eliminados.

### 3. Declaración de Independencia de Artefactos de Machine Learning
> [!IMPORTANT]
> **Declaración de Inmutabilidad de Modelos de Inteligencia Artificial:**
> Los modelos predictivos y clasificadores del sistema:
> 1. `RF_REGRESOR_DEMANDA` (Random Forest, v175)
> 2. `RF_CLASIFICADOR_QUIEBRE` (Random Forest, v175)
> 3. `RF_SOMATOTIPO_POSE` (Random Forest, v14)
> 4. `CART_CROSSSELLING` (Árbol CART, v14)
>
> Fueron entrenados, hiperparametrizados y evaluados exclusivamente sobre los conjuntos analíticos sintéticos generados por el DGP canónico (`data/dataset_historico_erp.csv`, `data/train.csv`, `data/test.csv`).
> **Ningún modelo de IA depende ni se entrena sobre la base viva transaccional de PostgreSQL**.
> En consecuencia, la ejecución de resets de volumen, sembrado de demostración o eliminación de transacciones operativas **NO invalida** los artefactos `.joblib`, las matrices de confusión, las métricas de exactitud (`metric_accuracy`, `metric_rmse`) ni los registros canónicos de `ia.version_modelo_ia`.

## Registro de Limpieza de Artefactos E2E (Paso 3 / V-09 — 2026-10-21T02:59:57.980957)

En cumplimiento del aislamiento estricto de datos de prueba y preservando los IDs protegidos `[13450, 205, 23, 149511, 1319, 1320]`, se eliminaron los siguientes registros transaccionales:

- **Usuarios eliminados (1)**:
  `[65]`
  (Emails: `['cliente_sin_capturas_test@spartan.dev']`)
- **Ventas eliminadas (1)**:
  `[14766]`
  (Recibos: `['REC-E2E781FC']`)
- **Perfiles biométricos eliminados (0)**:
  `[]`
- **Prescripciones eliminadas (0)**:
  `[]`
- **Asientos de kárdex eliminados (1)**:
  `[27903]`
- **Detalles de venta eliminados (1)**:
  `[27840]`

## Procedimiento Documentado de Reset del Volumen de Demostración (Paso 6 / V-01, V-02 — 2026-10-21T03:00:06.538126)

### 1. Instrucción de Ejecución Idempotente
Para restablecer el volumen de datos de demostración a su estado clínico impecable pre-defensa:
```bash
docker exec spartan-backend python scripts/cleanup_artefactos_e2e.py
docker exec spartan-backend python scripts/seed_demo_realista.py
```

### 2. Magnitudes Garantizadas
- **Inventario normalizado**: Rango estricto de **20 a 300 unidades** por SKU en `erp.producto`.
- **Alertas de stock de seguridad**: Exactamente **10-15%** de los productos activos presentan `stock_actual < stock_seguridad` (para validar visualmente badges ámbar/rojo en POS y Catálogo).
- **Cifra pública del catálogo**: Derivada en tiempo real de `SELECT COUNT(*) FROM erp.producto WHERE estado_activo = TRUE AND id_producto <> 205` (198 productos activos). No existen conteos estáticos 'hardcodeados'.
- **Clientes del directorio administrativo**: 8 clientes con nombres bolivianos verosímiles, correos corporativos `@spartan.dev`, documentos de identidad CI, perfiles con somatotipos y prescripciones explicables.
- **Protección estricta de auditoría UX**: Los identificadores `[13450, 205, 23, 149511, 1319, 1320]` jamás son modificados ni eliminados.

### 3. Declaración de Independencia de Artefactos de Machine Learning
> [!IMPORTANT]
> **Declaración de Inmutabilidad de Modelos de Inteligencia Artificial:**
> Los modelos predictivos y clasificadores del sistema:
> 1. `RF_REGRESOR_DEMANDA` (Random Forest, v175)
> 2. `RF_CLASIFICADOR_QUIEBRE` (Random Forest, v175)
> 3. `RF_SOMATOTIPO_POSE` (Random Forest, v14)
> 4. `CART_CROSSSELLING` (Árbol CART, v14)
>
> Fueron entrenados, hiperparametrizados y evaluados exclusivamente sobre los conjuntos analíticos sintéticos generados por el DGP canónico (`data/dataset_historico_erp.csv`, `data/train.csv`, `data/test.csv`).
> **Ningún modelo de IA depende ni se entrena sobre la base viva transaccional de PostgreSQL**.
> En consecuencia, la ejecución de resets de volumen, sembrado de demostración o eliminación de transacciones operativas **NO invalida** los artefactos `.joblib`, las matrices de confusión, las métricas de exactitud (`metric_accuracy`, `metric_rmse`) ni los registros canónicos de `ia.version_modelo_ia`.
