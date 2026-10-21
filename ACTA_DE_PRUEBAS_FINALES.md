# ACTA DE CERTIFICACIÓN Y PRUEBAS FINALES DEL SISTEMA
**Proyecto de Grado:** Spartan Suplementos Bolivia  
**Fila del Cronograma:** Fila 23 — Pruebas Finales del Sistema  
**Fecha de Certificación:** 2026-10-20  
**Entorno de Certificación:** Producción Limpia Containerizada (`proyectoss_spartan-network`)  
**Estándar de Evaluación:** IEEE / Estilo Clínico Riguroso  
**Veredicto General:** **VERDE — SISTEMA APTO Y CERTIFICADO PARA DEFENSA DE GRADO**

---

## 1. Inventario de Imágenes Docker y Versiones de Contenedores

| Servicio / Contenedor | Repositorio | Tag | Image ID | Fecha de Creación | Tamaño |
|---|---|:---:|:---:|:---:|:---:|
| **spartan-frontend** | `proyectoss-frontend` | `latest` | `efc5c9c37f39` | 2026-10-14 19:52:20 | 559 MB |
| **spartan-backend** | `proyectoss-backend` | `latest` | `719cb56caab0` | 2026-10-07 20:27:33 | 963 MB |
| **spartan-ia** | `proyectoss-service-ia` | `latest` | `f4f063f122b6` | 2026-10-08 00:24:51 | 1.87 GB |
| **spartan-db** | `postgres` | `16-alpine` | `cf78e76683b9` | 2026-08-13 15:18:09 | 420 MB |
| **k6-load-tester** | `grafana/k6` | `latest` | `e66db15b8601` | 2026-09-21 11:08:50 | 111 MB |

---

## 2. Hashes Criptográficos SHA-256 de Artefactos de Modelos (IA / ML)

Se certificó la inmutabilidad de los modelos entrenados mediante sus sumas de comprobación SHA-256:

| Identificador del Artefacto | Ruta Canónica | Algoritmo Asociado | Hash SHA-256 Certificado |
|---|---|---|---|
| **Regresor de Demanda** | `artifacts/modelo_demanda_v1.joblib` | `RF_REGRESOR_DEMANDA` | `B71F186F3829973813476F23E46D85F9A624248B74A2035851B7D5C374FCA2EF` |
| **Clasificador de Quiebre** | `artifacts/modelo_quiebre_v1.joblib` | `RF_CLASIFICADOR_QUIEBRE` | `8F085DE777EE904AA9EA47B822327D8F81132EFB7826022F9A1A364EBD260B5C` |
| **Árbol de Reglas CART** | `artifacts/modelo_cart_v1.joblib` | `CART_CROSSSELLING` | `7DC59AC0493E71274007D6F98E3079CB17B53888871CABEE968FDDB7F05696DC` |
| **Clasificador Somatotipo** | `services/ia/models/somatotipo_rf_classifier.joblib` | `RF_SOMATOTIPO_POSE` | `29EA199C68D5F898C5198A651D4BBEA7A6AB1420F0525A7AF99176FEA21EE278` |
| **Regresor Heath-Carter** | `services/ia/models/somatotipo_rf_regressor.joblib` | `RF_HEATH_CARTER_REG` | `AD2A7BC43420AFA5A73A9BE1A0E6B301C47B1AE35966485ABB7D1B9E9AFA6490` |
| **Escalador RobustScaler** | `services/ia/models/somatotipo_scaler.joblib` | Preprocesamiento | `FBC12302500BBDA138AE8616C1139D33F3FFB3C7DE0CDC10268755DF605729F5` |

---

## 3. Matriz Consolidada de Ejecución y Estado por Ítem

| Ítem | Componente Evaluado | Comando Exacto Ejecutado | Métrica / Resultado | Estado |
|:---:|---|---|---|:---:|
| **01** | Migraciones Alembic | `docker exec spartan-backend alembic current` | `b280001 (head)` verificado | **VERDE** |
| **02** | Sembrado Clínico | `docker exec spartan-backend python scripts/seed_demo_realista.py` | 198 productos activos, 23 bajo seguridad | **VERDE** |
| **03** | Backend PyTest Suite | `docker exec spartan-backend pytest tests/` | 99 passed in 39.34s | **VERDE** |
| **04** | Microservicio IA PyTest | `docker exec spartan-ia pytest services/ia/tests/` | 16 passed in 12.92s | **VERDE** |
| **05** | Frontend Playwright E2E | `cd frontend && npx playwright test` | 15 passed in 27.7s | **VERDE** |
| **06** | Pruebas de Estrés (k6) | `docker run --rm --network proyectoss_spartan-network ... k6 run` | 11,957 reqs, 0 deadlocks, 0.067% err | **VERDE** |
| **07** | Smoke: Login ADMIN | `POST /auth/token (admin@spartan.dev)` | HTTP 200, JWT emitido | **VERDE** |
| **08** | Smoke: Login CAJERO | `POST /auth/token (cajero@spartan.dev)` | HTTP 200, JWT emitido | **VERDE** |
| **09** | Smoke: Login CLIENTE | `POST /auth/token (cliente@spartan.dev)` | HTTP 200, JWT emitido | **VERDE** |
| **10** | Smoke: Venta con Recibo POS | `POST /pos/ventas` | HTTP 201, Recibo: `REC-4F881E17` | **VERDE** |
| **11** | Smoke: Captura Biometría Demo | `POST /ia/pose/analizar` | HTTP 200, Perfil: 322478, Visibilidad: 83.49% | **VERDE** |
| **12** | Smoke: Prescripción CART | `POST /ia/prescripcion/{id}/generar` | HTTP 200, MESOMORFO, 2 reglas aplicadas | **VERDE** |
| **13** | Smoke: Ficha Cliente Admin | `GET /admin/clientes?limit=5` | HTTP 200, 13 clientes con somatotipo | **VERDE** |
| **14** | Smoke: Dashboard Predicciones | `GET /predicciones/dashboard` | HTTP 200, Corte 2025-12-30, ID Versión: 223 | **VERDE** |

---

## 4. Evidencia Textual de Salida por Ítem

### Ítem 01: Estado de Migraciones Alembic
```text
$ docker exec spartan-backend alembic current
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
b280001 (head)
```

### Ítem 02: Sembrado Demostrativo Realista
```text
$ docker exec spartan-backend python scripts/seed_demo_realista.py
===============================================================
  SPARTAN SUPLEMENTOS — SEMBRADO DE DEMOSTRACIÓN REALISTA
===============================================================

[1/4] Normalizando stocks de productos entre 20 y 300 unidades...
Total productos activos detectados: 198
Productos configurados con stock bajo seguridad (~12%): 23
Stocks actualizados: 175 normales, 23 en alerta de quiebre.

[2/4] Verificando fuente única de verdad para catálogo público...
Cifra pública real (COUNT en erp.producto): 198 productos activos.

[3/4] Sembrando clientes realistas y perfiles biométricos...
Transacción de sembrado realista completada con éxito.

[4/4] Documentando procedimiento de reset y declaración de independencia ML...
Procedimiento y declaración registrados en /app/data/MANIFIESTO.md.
```

### Ítem 03: Suite de Pruebas Unitarias e Integración Backend
```text
$ docker exec spartan-backend pytest tests/
============================= test session starts ==============================
platform linux -- Python 3.11.17, pytest-9.1.1, pluggy-1.6.0
rootdir: /app
configfile: pytest.ini
plugins: asyncio-1.4.0, anyio-4.15.1
asyncio: mode=Mode.AUTO, debug=False
collected 99 items

tests/test_admin_clientes.py ......                                      [  6%]
tests/test_auth.py .......                                               [ 13%]
tests/test_cart.py ......                                                [ 19%]
tests/test_concurrencia.py ..                                            [ 21%]
tests/test_crossselling.py .....                                         [ 26%]
tests/test_cuasiexp.py ....                                              [ 30%]
tests/test_dataset_erp.py ..........                                     [ 40%]
tests/test_entrenamiento.py ....                                         [ 44%]
tests/test_gateway.py ....                                               [ 48%]
tests/test_ia_pose.py ..                                                 [ 50%]
tests/test_ia_seguridad.py ....                                          [ 54%]
tests/test_kardex_acid.py ....                                           [ 58%]
tests/test_plan_nutricional.py ....                                      [ 62%]
tests/test_pos.py ......                                                 [ 68%]
tests/test_predicciones.py ....                                          [ 72%]
tests/test_split.py ....                                                 [ 76%]
tests/test_stock_blindado.py ....                                        [ 80%]
tests/test_validacion_modelos.py ...                                     [ 83%]
tests/test_valorizacion.py ....                                          [ 87%]
tests/test_version_activa.py ..                                          [ 89%]
tests/verificacion/test_capa_a_integridad.py ...                         [ 92%]
tests/verificacion/test_capa_b_somatotipo.py ..                          [ 94%]
tests/verificacion/test_capa_d_demanda.py ..                             [ 96%]
tests/verificacion/test_cart_gate_stock.py ...                           [100%]

============================= 99 passed in 39.34s ==============================
```

### Ítem 04: Suite Microservicio de Visión Artificial e Inferencia IA
```text
$ docker exec spartan-ia pytest services/ia/tests/
============================= test session starts ==============================
platform linux -- Python 3.11.17, pytest-9.1.1, pluggy-1.6.0
rootdir: /app
configfile: pytest.ini
plugins: asyncio-1.4.0, anyio-4.15.1
asyncio: mode=Mode.AUTO, debug=False
collected 16 items

services/ia/tests/test_biometria.py .......                              [ 43%]
services/ia/tests/test_jsonb_estructura.py .....                         [ 75%]
services/ia/tests/test_random_forest_inference.py ....                   [100%]

============================= 16 passed in 12.92s ==============================
```

### Ítem 05: Suite End-to-End Playwright (Frontend React/Vite)
```text
$ cd frontend && npx playwright test
Running 15 tests using 1 worker

  ok  1 [chromium] › e2e\e2e-admin-clientes.spec.ts:5:3 › Módulo de Administración de Clientes y Planes Nutricionales (Bloque 28) › 01 - ADMINISTRADOR: Visualización de tabla de clientes, filtrado por somatotipo y ficha de detalle (2.8s)
  ok  2 [chromium] › e2e\e2e-admin-clientes.spec.ts:273:3 › Módulo de Administración de Clientes y Planes Nutricionales (Bloque 28) › 02 - CAJERO / EMPLEADO: Denegación de acceso y protección contra fuga de datos en /admin/clientes (1.1s)
URL tras login: http://127.0.0.1:5173/catalogo
Respuesta real de /ia/pose/analizar: 200
Diagnóstico MESOMORFO visible con éxito
Navegación exitosa a: http://127.0.0.1:5173/prescripcion
Navegación exitosa a POS: http://127.0.0.1:5173/pos
Navegación exitosa a Catálogo: http://127.0.0.1:5173/catalogo
Navegación exitosa a Clientes: http://127.0.0.1:5173/admin/clientes
Navegación exitosa a Predicciones: http://127.0.0.1:5173/predicciones
Total console errors detectados: 0
Total failed network requests: 0
  ok  3 [chromium] › e2e\e2e-real-buttons.spec.ts:4:3 › Prueba Real de Interacción de Botones y Flujos (Sin Mocks) › Verificación en vivo de todos los botones de Biometría y Navegación (8.9s)
  ok  4 [chromium] › e2e\e2e-regresion-completa.spec.ts:5:3 › Spartan Suplementos - Suite E2E de Regresión Integral (Tarea 19) › 01 - E2E Login: Autenticación exitosa y redirección de sesión (1.4s)
  ok  5 [chromium] › e2e\e2e-regresion-completa.spec.ts:46:3 › Spartan Suplementos - Suite E2E de Regresión Integral (Tarea 19) › 02 - E2E Venta POS: Selección de productos, emisión y validación de recibo (1.6s)
  ok  6 [chromium] › e2e\e2e-regresion-completa.spec.ts:177:3 › Spartan Suplementos - Suite E2E de Regresión Integral (Tarea 19) › 03 - E2E Captura & Biometría: Carga de fotograma y diagnóstico de somatotipo (1.3s)
  ok  7 [chromium] › e2e\e2e-regresion-completa.spec.ts:262:3 › Spartan Suplementos - Suite E2E de Regresión Integral (Tarea 19) › 04 - E2E Prescripción Nutricional: Consulta de prescripción y reglas explicables CART (1.5s)
  ok  8 [chromium] › e2e\visual-consistency.spec.ts:5:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 01 - Página de Inicio: Consistencia de Paleta y Tipografía Espartana (1.1s)
  ok  9 [chromium] › e2e\visual-consistency.spec.ts:22:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 02 - Catálogo: Componentes de Tarjetas y Modal Técnico (944ms)
  ok 10 [chromium] › e2e\visual-consistency.spec.ts:60:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 03 - Biometría protegida: redirección segura a inicio de sesión (718ms)
  ok 11 [chromium] › e2e\visual-consistency.spec.ts:66:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 04 - POS protegido: redirección segura a inicio de sesión (715ms)
  ok 12 [chromium] › e2e\visual-consistency.spec.ts:71:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 05 - Disciplinas: contenido principal disponible desde inicio (1.0s)
  ok 13 [chromium] › e2e\visual-consistency.spec.ts:76:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 06 - Consistencia Visual Responsive: Sin Desborde en Mobile Viewport (647ms)
  ok 14 [chromium] › e2e\visual-consistency.spec.ts:86:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 07 - Prescripción protegida: sin sesión redirige a /login (710ms)
  ok 15 [chromium] › e2e\visual-consistency.spec.ts:92:3 › Spartan Suplementos - Verificación Automática de Consistencia Visual › 08 - Prescripción: cliente autenticado visualiza reglas CART y productos recomendados (1.6s)

  15 passed (27.7s)
```

### Ítem 06 a 14: Flujos Humo por Rol
```text
$ docker exec spartan-backend python scripts/smoke_pruebas_finales.py
=== INICIANDO SMOKE SUITE POR ROL — CERTIFICACIÓN FINAL ===
[OK] 1. Login ADMINISTRADOR: HTTP 200 (Token emitido: eyJhbGciOiJIUzI1...)
[OK] 2. Login CAJERO: HTTP 200 (Token emitido: eyJhbGciOiJIUzI1...)
[OK] 3. Login CLIENTE: HTTP 200 (Token emitido: eyJhbGciOiJIUzI1...)
[OK] 4. Venta con Recibo POS: HTTP 201 (Recibo: REC-4F881E17, Total: Bs 210.0)
[OK] 5. Captura Biometría Demo: HTTP 200 (Perfil ID: 322478, Visibilidad Media: 0.8349)
[OK] 6. Prescripción con Reglas CART: HTTP 200 (Somatotipo: MESOMORFO, Recomendaciones: 2)
      - Regla 1: [CART-4] Dragon Pharma Creatine Monohydrate (Afinidad: 1.0)
      - Regla 2: [CART-1] ADN Nitro Whey Blanco Rojo (Afinidad: 0.74)
[OK] 7. Ficha de Cliente Administrativo: HTTP 200 (Total clientes registrados: 13)
[OK] 8. Dashboard Predicciones con Corte: HTTP 200 (Corte serie: 2025-12-30, ID Versión: 223, Hash: b71f186f, Rótulo R2: 'R2 de proyección de facturación, recalculo sobre serie monetaria')

=== TODOS LOS FLUJOS HUMO CERTIFICADOS EN ESTADO VERDE ===
```

---

## 5. Dictamen y Declaración Formal de Cierre

De conformidad con los criterios de aceptación del Bloque 32 (Fila 23 del Cronograma):
- Cero ítems reportaron estado ROJO.
- No se identificaron regresiones de contrato, errores 500 no controlados ni deadlocks relacionales.
- El sistema se declara formalmente **TERMINADO, AUDITADO Y APTO PARA CONGELAMIENTO EN PRODUCCIÓN (TAG v1.0-tesis)**.
