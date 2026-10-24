"""
Suite de Pruebas Automatizadas para el Entrenamiento de Modelos (Tarea 11).
Proyecto: Spartan Suplementos Bolivia - Modelado Predictivo ERP.

Verifica:
  a) Ambos archivos joblib cargan y predicen sobre 10 filas sin error.
  b) El registro existe en ia.version_modelo_ia con aprobado_produccion=FALSE.
  c) Las feature importances de cada modelo suman 1.0 (con tolerancia 1e-6).
  d) Reentrenar con la misma semilla determinista (42) reproduce el SHA-256 exacto del joblib.
"""

import asyncio
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest
from sqlalchemy import text

from app.core.database import engine
from scripts.train_modelos import (
    MODELO_DEMANDA_PATH,
    MODELO_QUIEBRE_PATH,
    TRAIN_CSV,
    calcular_sha256,
    entrenar_y_persistir_modelos,
    preparar_features,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def modelos_entrenados():
    """Asegura que los modelos estén entrenados y disponibles."""
    if not MODELO_DEMANDA_PATH.exists() or not MODELO_QUIEBRE_PATH.exists():
        entrenar_y_persistir_modelos()

    assert MODELO_DEMANDA_PATH.exists(), f"Falta {MODELO_DEMANDA_PATH}"
    assert MODELO_QUIEBRE_PATH.exists(), f"Falta {MODELO_QUIEBRE_PATH}"

    mod_demanda = joblib.load(MODELO_DEMANDA_PATH)
    mod_quiebre = joblib.load(MODELO_QUIEBRE_PATH)
    df_train = pd.read_csv(TRAIN_CSV)

    return {
        "demanda": mod_demanda,
        "quiebre": mod_quiebre,
        "df_train": df_train,
    }


def test_a_carga_y_prediccion_10_filas(modelos_entrenados):
    """
    a) Ambos joblib cargan y predicen sobre 10 filas sin error.
    """
    demanda = modelos_entrenados["demanda"]
    quiebre = modelos_entrenados["quiebre"]
    df_train = modelos_entrenados["df_train"]

    muestra_raw = df_train.iloc[:10]
    X_prep = preparar_features(muestra_raw)

    preds_demanda = demanda.predict(X_prep)
    preds_quiebre = quiebre.predict(X_prep)

    assert len(preds_demanda) == 10, "El regresor no retornó 10 predicciones"
    assert len(preds_quiebre) == 10, "El clasificador no retornó 10 predicciones"
    assert np.all(np.isfinite(preds_demanda)), "Predicciones de demanda contienen NaNs o infinitos"
    assert set(preds_quiebre).issubset({0, 1}), "Predicciones de quiebre contienen valores fuera de {0, 1}"


def test_b_registro_bd_aprobado_produccion_false():
    """
    b) Registro existe en ia.version_modelo_ia con aprobado_produccion=FALSE
    para 'RF_REGRESOR_DEMANDA' y 'RF_CLASIFICADOR_QUIEBRE'.
    """
    # Si los modelos ya fueron promovidos a producción en una fase posterior,
    # re-sincronizamos el estado de entrenamiento para verificar que el entrenamiento
    # registra estrictamente con aprobado_produccion=False
    entrenar_y_persistir_modelos()

    async def verificar():
        query = text("""
            SELECT DISTINCT ON (algoritmo)
                   algoritmo, hash_archivo, metric_accuracy, metric_rmse,
                   aprobado_produccion
            FROM ia.version_modelo_ia
            WHERE algoritmo IN ('RF_REGRESOR_DEMANDA', 'RF_CLASIFICADOR_QUIEBRE')
            ORDER BY algoritmo, id_version DESC;
        """)
        async with engine.connect() as conn:
            res = await conn.execute(query)
            return res.fetchall()

    filas = asyncio.run(verificar())
    assert len(filas) >= 2, f"Se esperaban al menos 2 registros en ia.version_modelo_ia, encontrados {len(filas)}"

    algoritmos = {r[0]: {"hash": r[1], "aprobado": r[4]} for r in filas}

    assert "RF_REGRESOR_DEMANDA" in algoritmos, "No se encontró registro para RF_REGRESOR_DEMANDA"
    assert "RF_CLASIFICADOR_QUIEBRE" in algoritmos, "No se encontró registro para RF_CLASIFICADOR_QUIEBRE"

    assert algoritmos["RF_REGRESOR_DEMANDA"]["aprobado"] is False, "RF_REGRESOR_DEMANDA tiene aprobado_produccion != False"
    assert algoritmos["RF_CLASIFICADOR_QUIEBRE"]["aprobado"] is False, "RF_CLASIFICADOR_QUIEBRE tiene aprobado_produccion != False"

    # Verificar que el hash coincida con el joblib actual
    hash_actual_demanda = calcular_sha256(MODELO_DEMANDA_PATH)
    hash_actual_quiebre = calcular_sha256(MODELO_QUIEBRE_PATH)

    assert algoritmos["RF_REGRESOR_DEMANDA"]["hash"] == hash_actual_demanda, "El hash en BD difiere del archivo joblib demanda"
    assert algoritmos["RF_CLASIFICADOR_QUIEBRE"]["hash"] == hash_actual_quiebre, "El hash en BD difiere del archivo joblib quiebre"


def test_c_feature_importances_suman_uno(modelos_entrenados):
    """
    c) Importances de cada modelo suman 1.0 (tol 1e-6).
    """
    demanda = modelos_entrenados["demanda"]
    quiebre = modelos_entrenados["quiebre"]

    assert hasattr(demanda, "feature_importances_"), "El modelo demanda no tiene feature_importances_"
    assert hasattr(quiebre, "feature_importances_"), "El modelo quiebre no tiene feature_importances_"

    suma_demanda = float(demanda.feature_importances_.sum())
    suma_quiebre = float(quiebre.feature_importances_.sum())

    assert np.isclose(suma_demanda, 1.0, atol=1e-6), f"Suma importances demanda={suma_demanda} difiere de 1.0"
    assert np.isclose(suma_quiebre, 1.0, atol=1e-6), f"Suma importances quiebre={suma_quiebre} difiere de 1.0"

    # Verificar que todas las importancias individuales sean no negativas
    assert np.all(demanda.feature_importances_ >= 0.0)
    assert np.all(quiebre.feature_importances_ >= 0.0)


def test_d_reproducibilidad_sha256_joblib(tmp_path):
    """
    d) Reentrenar con la misma semilla reproduce exactamente el SHA-256 del joblib byte a byte.
    """
    dir_run1 = tmp_path / "run1"
    dir_run2 = tmp_path / "run2"

    res1 = entrenar_y_persistir_modelos(artifacts_dir=dir_run1, seed=42, registrar_bd=False, reporte_md=None)
    res2 = entrenar_y_persistir_modelos(artifacts_dir=dir_run2, seed=42, registrar_bd=False, reporte_md=None)

    hash_demanda_1 = calcular_sha256(dir_run1 / "modelo_demanda_v1.joblib")
    hash_demanda_2 = calcular_sha256(dir_run2 / "modelo_demanda_v1.joblib")

    hash_quiebre_1 = calcular_sha256(dir_run1 / "modelo_quiebre_v1.joblib")
    hash_quiebre_2 = calcular_sha256(dir_run2 / "modelo_quiebre_v1.joblib")

    assert hash_demanda_1 == hash_demanda_2, f"Discrepancia en SHA-256 de modelo demanda: {hash_demanda_1} != {hash_demanda_2}"
    assert hash_quiebre_1 == hash_quiebre_2, f"Discrepancia en SHA-256 de modelo quiebre: {hash_quiebre_1} != {hash_quiebre_2}"
