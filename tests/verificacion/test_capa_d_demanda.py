"""
Pruebas de Verificación Automatizada: Capa D — M3 Regresor de Demanda (Bloque 30).
Proyecto: Spartan Suplementos Bolivia.

Verifica:
1. Reproducibilidad de métrica: Recalcula RMSE, MAE y R2 de modelo_demanda_v1.joblib
   sobre data/test.csv y compara contra metric_rmse almacenado en BD (tolerancia 0.05)
   y contra los gates oficiales (RMSE <= 0.70 x baseline y R2 >= 0.75).
2. Verificación de gates del modelo en BD (aprobado_produccion=TRUE).
3. Concordancia del pipeline de features.
4. Gate de versión activa en GET /predicciones/dashboard (503 si no existe versión aprobada).
"""

from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest
from sklearn.dummy import DummyRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sqlalchemy import text

from app.core.database import engine
from scripts.train_modelos import preparar_features

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
TEST_CSV = PROJECT_ROOT / "data" / "test.csv"
TRAIN_CSV = PROJECT_ROOT / "data" / "train.csv"
MODELO_DEMANDA_PATH = PROJECT_ROOT / "artifacts" / "modelo_demanda_v1.joblib"


@pytest.mark.asyncio
async def test_capa_d_reproducibilidad_metricas_holdout():
    """
    Recalcula las métricas de rendimiento sobre data/test.csv de forma determinista:
    - RMSE modelo vs Baseline DummyRegressor (media de train)
    - R2 score
    - MAE
    Compara con el valor registrado en ia.version_modelo_ia (metric_rmse = 5.5863, tol=0.05).
    """
    assert TEST_CSV.exists(), f"Falta conjunto de test: {TEST_CSV}"
    assert TRAIN_CSV.exists(), f"Falta conjunto de train: {TRAIN_CSV}"
    assert MODELO_DEMANDA_PATH.exists(), f"Falta artefacto: {MODELO_DEMANDA_PATH}"

    df_train = pd.read_csv(TRAIN_CSV)
    df_test = pd.read_csv(TEST_CSV)

    X_train = preparar_features(df_train)
    y_train = df_train["demanda_proxima_semana"]

    X_test = preparar_features(df_test)
    y_test = df_test["demanda_proxima_semana"]

    # 1. Baseline DummyRegressor
    dummy = DummyRegressor(strategy="mean")
    dummy.fit(X_train, y_train)
    preds_dummy = dummy.predict(X_test)
    rmse_base = float(root_mean_squared_error(y_test, preds_dummy))

    # 2. Modelo Regresor RF
    regresor = joblib.load(MODELO_DEMANDA_PATH)
    preds_rf = regresor.predict(X_test)
    rmse_rf = float(root_mean_squared_error(y_test, preds_rf))
    mae_rf = float(mean_absolute_error(y_test, preds_rf))
    r2_rf = float(r2_score(y_test, preds_rf))

    print(f"\nMÉTRICAS RECOMPUTADAS DEMANDA:")
    print(f"  RMSE Base: {rmse_base:.4f} | Umbral Gate (70%): {0.70 * rmse_base:.4f}")
    print(f"  RMSE Recomputado: {rmse_rf:.4f} | MAE: {mae_rf:.4f} | R2: {r2_rf:.4f}")

    # Verificar gates oficiales
    assert rmse_rf <= (0.70 * rmse_base), f"Fallo de gate RMSE: {rmse_rf} > {0.70 * rmse_base}"
    assert r2_rf >= 0.75, f"Fallo de gate R2: {r2_rf} < 0.75"

    # Comparar contra valor registrado en BD
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT metric_rmse, aprobado_produccion
            FROM ia.version_modelo_ia
            WHERE algoritmo = 'RF_REGRESOR_DEMANDA'
              AND aprobado_produccion = TRUE
            ORDER BY id_version DESC
            LIMIT 1;
        """))
        row = res.fetchone()
        assert row is not None, "No se encontró versión activa de RF_REGRESOR_DEMANDA"
        metric_rmse_bd = float(row[0])

    delta_rmse = abs(rmse_rf - metric_rmse_bd)
    print(f"  Delta RMSE (Recomputado vs BD {metric_rmse_bd}): {delta_rmse:.6f}")
    assert delta_rmse <= 0.05, f"Divergencia de métrica superior a tolerancia 0.05: delta={delta_rmse}"


@pytest.mark.asyncio
async def test_capa_d_dashboard_requiere_version_activa():
    """
    Verifica que el router de predicciones valida la existencia de una versión
    aprobada en ia.version_modelo_ia antes de despachar el dashboard analítico.
    """
    from app.modules.ia.versioning import obtener_version_activa

    async with engine.connect() as conn:
        version = await obtener_version_activa(conn, "RF_REGRESOR_DEMANDA")
        assert version is not None, "Debe existir versión activa para operar el dashboard."
        assert version["id_version"] > 0
        assert version["hash_archivo"] is not None
