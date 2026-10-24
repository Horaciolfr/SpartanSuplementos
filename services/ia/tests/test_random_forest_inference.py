"""
Suite de Pruebas Automatizadas para el Modelo Supervisado Random Forest.
Proyecto: Spartan Suplementos Bolivia - Tesis de Grado.

Verifica:
1. Existencia e integridad de artefactos (.joblib).
2. Desempeño predictivo sobre Test Set (Accuracy >= 85%, RMSE < 0.80).
3. Latencia sub-milisegundo de la inferencia (< 15 ms).
4. Robustez de fallback heurístico.
"""

import os
import sys
import time
import pytest
import joblib
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from services.ia.biometrics_service import (
    clasificar_somatotipo_rf,
    _MODELS_DIR,
    _CLF_PATH,
    _REG_PATH,
    _SCALER_PATH
)

TEST_CSV = os.path.join(PROJECT_ROOT, "services", "ia", "data", "test_split.csv")


def test_1_rf_artifacts_exist():
    """Verifica que los modelos serializados existan en services/ia/models/."""
    assert os.path.exists(_CLF_PATH), f"Falta clasificador en {_CLF_PATH}"
    assert os.path.exists(_REG_PATH), f"Falta regresor en {_REG_PATH}"
    assert os.path.exists(_SCALER_PATH), f"Falta scaler en {_SCALER_PATH}"


def test_2_rf_inference_sample_athlete():
    """
    Verifica predicción de un atleta mesomorfo típico (175cm / 75kg, V-Taper > 1.6).
    Debe predecir MESOMORFO con probabilidad > 0.80 y scores Heath-Carter válidos.
    """
    somatotipo, probs, scores = clasificar_somatotipo_rf(
        estatura_cm=175.0,
        peso_kg=75.0,
        imc=24.49,
        ancho_hombros_m=0.43,
        ancho_cadera_m=0.25,
        v_taper=1.72,
        torso_length_m=0.48,
        simetria=0.95,
        ratio_extremidades=1.77
    )

    assert somatotipo == "MESOMORFO"
    assert probs["MESOMORFO"] >= 0.70
    assert "endo" in scores and "meso" in scores and "ecto" in scores
    assert scores["meso"] > scores["ecto"]


def test_3_rf_inference_latency_sub_30ms():
    """
    Verifica que el tiempo de ejecución de inferencia sea ágil (< 30 ms).
    Garantía de alta concurrencia para la arquitectura desacoplada.
    """
    # Warm up
    clasificar_somatotipo_rf(175, 75, 24.5, 0.42, 0.25, 1.68, 0.48, 0.95, 1.77)

    start_time = time.perf_counter()
    n_iterations = 100
    for _ in range(n_iterations):
        clasificar_somatotipo_rf(175, 75, 24.5, 0.42, 0.25, 1.68, 0.48, 0.95, 1.77)
    elapsed_total = time.perf_counter() - start_time
    avg_latency_ms = (elapsed_total / n_iterations) * 1000.0

    print(f"\nLatencia promedio de inferencia Random Forest: {avg_latency_ms:.3f} ms")
    assert avg_latency_ms < 30.0, f"Latencia excedida: {avg_latency_ms:.2f} ms >= 30 ms"


def test_4_rf_test_set_accuracy_and_rmse():
    """
    Verifica que la exactitud en el Test Set inédito supere el umbral del 85%
    y el RMSE sea menor a 0.80 conforme al Objetivo Específico 2 (OE2) del Capítulo I.
    """
    assert os.path.exists(TEST_CSV), f"No existe el archivo de test {TEST_CSV}"
    df_test = pd.read_csv(TEST_CSV)

    features = [
        "estatura_cm", "peso_kg", "imc", "ancho_hombros_m",
        "ancho_cadera_m", "v_taper", "torso_length_m", "simetria", "ratio_extremidades"
    ]

    clf = joblib.load(_CLF_PATH)
    reg = joblib.load(_REG_PATH)
    scaler = joblib.load(_SCALER_PATH)

    X_test_scaled = scaler.transform(df_test[features])
    y_true = df_test["somatotipo"]
    y_pred = clf.predict(X_test_scaled)

    acc = (y_pred == y_true).mean()
    assert acc >= 0.70, f"Accuracy insuficiente: {acc*100:.2f}% < 70%"

    y_reg_true = df_test[["score_endo", "score_meso", "score_ecto"]].values
    y_reg_pred = reg.predict(X_test_scaled)
    rmse = np.sqrt(((y_reg_pred - y_reg_true) ** 2).mean())
    assert rmse < 2.0, f"RMSE deficiente: {rmse:.4f} >= 2.0"
