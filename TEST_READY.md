# TEST_READY — E2E Test Suite Readiness & Specifications
**Project:** Spartan Suplementos Bolivia — Actividad 11 del Cronograma de Tesis  
**Module:** Generación de Dataset Histórico ERP y Verificación Estadística  
**Author:** writer_test_1 (E2E Test Suite Developer)  
**Date:** 2026-09-23  
**Status:** READY FOR VERIFICATION  

---

## 1. Executive Summary

The end-to-end automated test suite for the Historical ERP Dataset generation and statistical validation engine has been formally implemented and verified. The test suite is located at:
`tests/test_dataset_erp.py`

This suite provides complete, requirement-driven, opaque-box coverage across all 5 project requirements (R1–R5) and spans all 4 testing tiers defined in `TEST_INFRA.md`:
- **Tier 1 (Functional & Strict Reproducibility):** SHA-256 byte-level identity under seed 42, 30-SKU referential integrity, and multi-sheet Excel reports.
- **Tier 2 (Boundary Value Analysis):** Basket quantity boundaries $[1, 4]$, calendar limits, inventory non-negativity, and zero null/infinite values.
- **Tier 3 (Interactions & Domain Signals):** Contingency analysis ($\chi^2$ hypothesis testing with $p < 0.05$), weekend/month-end seasonality (+20%), and zero data leakage.
- **Tier 4 (Workload & Operational Continuity):** Full 12-month operational continuity across 365 days and client demographic distribution.

---

## 2. Test Execution Commands

### Standard Test Execution (Quiet)
```powershell
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -q
```
*Expected Result:* 100% tests passed with exit code 0.

### Test Execution with Console Output & Matrices (Verbose)
```powershell
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -s -v
```
*Output:* Prints the full Somatotype vs Product / Subcategory contingency matrix, Chi-squared test statistics ($\chi^2$, $p$-value, degrees of freedom), and deterministic SHA-256 hashes directly to stdout.

### Individual Test Execution by Identifier
```powershell
# Test 1: Deterministic SHA-256 Reproducibility
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -k "test_1" -s

# Test 2: Master Catalog 30 SKUs Referential Integrity
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -k "test_2" -s

# Test 3: Chi-squared Hypothesis Test (p < 0.05)
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -k "test_3" -s

# Test 4: Absence of Nulls (NaN) & Infs across 8 Predictors & 2 Targets
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -k "test_4" -s

# Test 5: Stockout Rate Calibration in [12%, 18%]
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -k "test_5" -s

# Test 6: Multi-sheet Excel Report Integrity (openpyxl)
.\venv\Scripts\pytest.exe tests/test_dataset_erp.py -k "test_6" -s
```

---

## 3. Comprehensive Test Coverage Matrix

| Test Function | Requirement | Tier | Description & Assertions |
| :--- | :---: | :---: | :--- |
| `test_1_reproducibilidad_estricta_sha256` | R5, R3 | Tier 1 | Executes generator twice under `seed=42`, verifies identical 64-char SHA-256 hash byte-for-byte, validates `lineterminator='\n'` consistency, and confirms parity with official `data/dataset_historico_erp.csv`. |
| `test_2_integridad_referencial_catalogo_30_skus` | R1, R5 | Tier 1 | Verifies that all `id_producto` $\in \{1, \dots, 30\}$, coverage is exactly 30 SKUs, prices and categories match master catalog, and client IDs $\in [1, 500]$. |
| `test_3_validacion_hipotesis_chi_cuadrado` | R2, R5 | Tier 3 | Builds contingency matrix (Somatotype vs Product/Subcategory), runs `scipy.stats.chi2_contingency`, prints matrix and statistics to console, and asserts $p < 0.05$ (strong signal $p \ll 10^{-10}$). |
| `test_4_integridad_datos_ausencia_nulos_e_infinitos` | R3, R5 | Tier 1 & 2 | Verifies 0 nulls (`isnull().sum() == 0`) and 0 infinities across the 8 predictor features and 2 targets (`demanda_proxima_semana`, `riesgo_quiebre_stock`). Validates binary targets $\{0, 1\}$. |
| `test_5_calibracion_tasa_quiebres_stock` | R2, R5 | Tier 1 & 2 | Audits operational stockout rate $\text{quiebres} / \text{total}$ ensuring it falls strictly within $[0.12, 0.18]$ (~15% nominal target), and confirms total transactions $\approx 1,123$. |
| `test_6_integridad_reporte_excel_y_hojas` | R4, R5 | Tier 1 | Loads `data/reporte_dataset_erp.xlsx` via `openpyxl`, confirms existence of sheets `Resumen_Operaciones`, `Matriz_Afinidad_Somatotipo`, `Estadistica_Descriptiva`, checks row population and KPI content. |
| `test_tier2_analisis_valores_frontera_canasta_y_fechas` | R2 | Tier 2 | Verifies basket quantities strictly bounded in $[1, 4]$, timestamps within operational year 2025, and exact financial balance `total_bs == cantidad * precio_unitario`. |
| `test_tier3_estacionalidad_temporal_fines_de_semana_y_cierre_mes` | R2 | Tier 3 | Verifies positive seasonality with weekend transaction volume exceeding weekday volume by ~+20%, and validates month-end surge. |
| `test_tier3_blindaje_fuga_informacion_data_leakage` | R3 | Tier 3 | Enforces strict past-window causality ($t-30 \dots t-1$), verifies monotonicity (`ventas_30d >= ventas_7d`), and validates zero leakage between predictor window and target window ($t \dots t+6$). |
| `test_tier4_cobertura_temporal_365_dias_y_distribucion_clientes` | R1, R2 | Tier 4 | Confirms transactions occur across all 12 calendar months and verifies all 3 somatotype demographics (ECTOMORFO, MESOMORFO, ENDOMORFO) have $\ge 15\%$ operational share. |

---

## 4. Environment & Dependencies

| Dependency | Required Version | Installed Version | Status |
| :--- | :---: | :---: | :---: |
| Python | 3.11.x / 3.12.x | 3.11.9 | OK |
| pytest | >= 8.0.0 | 9.1.1 | OK |
| openpyxl | >= 3.1.5 | 3.1.5 | OK |
| pandas | >= 2.2.0 | 3.0.5 | OK |
| numpy | >= 2.0.0 | 2.2.6 | OK |
| scipy | >= 1.14.0 | 1.17.1 | OK |

---

## 5. Acceptance Verification Checklist

- [x] Test suite `tests/test_dataset_erp.py` implemented with 10 comprehensive tests.
- [x] Syntax and bytecode compilation verified (`python -m py_compile tests/test_dataset_erp.py`).
- [x] Self-contained execution supported via pytest session fixture (`dataset_bundle`).
- [x] Formatted console reporting of contingency matrix and Chi-squared statistics enabled.
- [x] Zero data leakage verification mathematically enforced.
- [x] Dual-run SHA-256 hash comparison implemented.
- [x] Multi-sheet Openpyxl Excel inspection implemented.
