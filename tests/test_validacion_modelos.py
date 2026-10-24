"""
Suite de Validación Cuantitativa de Algoritmos de Machine Learning (Tarea 12).
Proyecto: Spartan Suplementos Bolivia - Validación contra Gates de Producción (Regla 3.3).

Especificación:
  1. REGRESOR sobre test (data/test.csv):
     - Métricas: RMSE, MAE, R2.
     - Baseline: DummyRegressor (estrategia media de train).
     - GATE DE PRODUCCIÓN: RMSE <= 0.70 * RMSE_baseline Y R2 >= 0.75.
  2. CLASIFICADOR sobre test (data/test.csv):
     - Métricas: Accuracy, Balanced Accuracy, Precision, Recall, F1, Matriz de Confusión.
     - GATE DE PRODUCCIÓN: Balanced Accuracy >= 0.80 Y Recall (clase quiebre=1) >= 0.85.
     - Justificación documentada: Asimetría de costo: un quiebre no detectado (falso negativo)
       conlleva lucro cesante, penalización de ventas perdidas e insatisfacción del cliente,
       lo cual resulta sustancialmente más oneroso que una reposición anticipada (falso positivo).
  3. Cross-Validation 5-fold estratificada por mes sobre train:
     - Media ± Desviación Estándar de métricas de generalización temporal.
  4. Estado de Producción:
     - Si todos los gates pasan: aprobado_produccion=TRUE.
     - Si alguno falla: aprobado_produccion permanece FALSE y el test se detiene en rojo.
"""

import asyncio
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    balanced_accuracy_score,
    recall_score,
    root_mean_squared_error,
)
from sklearn.model_selection import StratifiedKFold
from sqlalchemy import text

from app.core.database import engine
from scripts.promocionar_modelo import evaluar_metricas_holdout, promocionar_modelos_si_pasan
from scripts.train_modelos import TRAIN_CSV, preparar_features

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def evaluacion_modelos():
    """Ejecuta la evaluación cuantitativa completa y actualización en base de datos."""
    return promocionar_modelos_si_pasan()


def test_a_clasificador_metricas_y_gates(evaluacion_modelos):
    """
    Validación Cuantitativa del Clasificador de Quiebre de Stock contra Gates:
      GATE: Balanced Accuracy >= 0.80 Y Recall (clase quiebre=1) >= 0.85.

    Justificación Documentada de Asimetría de Costo:
      En la cadena de suministro de Spartan Suplementos Bolivia, el costo de un Falso Negativo
      (quiebre de inventario no detectado a tiempo) es significativamente superior al costo
      de un Falso Positivo (orden de compra anticipada). El quiebre produce rotura de stock,
      pérdida directa de facturación (lucro cesante) y deterioro del nivel de servicio al cliente,
      mientras que una orden anticipada solo acarrea un costo marginal de almacenamiento temporal.
      Por tanto, se impone un umbral crítico de Recall >= 0.85 sobre la clase minoritaria (quiebre).
    """
    clf = evaluacion_modelos["clasificador"]

    acc = clf["accuracy"]
    bal_acc = clf["balanced_accuracy"]
    prec = clf["precision"]
    rec = clf["recall"]
    f1 = clf["f1"]
    cm = np.array(clf["matriz_confusion"])

    # Imprimir resumen de métricas para reporte y trazabilidad
    print(f"\nMÉTRICAS CLASIFICADOR (TEST HOLDOUT, N={cm.sum()}):")
    print(f"  Accuracy:          {acc:.4f} ({acc*100:.2f}%)")
    print(f"  Balanced Accuracy: {bal_acc:.4f} ({bal_acc*100:.2f}%) [Gate >= 0.80]")
    print(f"  Precision (q=1):   {prec:.4f} ({prec*100:.2f}%)")
    print(f"  Recall (q=1):      {rec:.4f} ({rec*100:.2f}%) [Gate >= 0.85]")
    print(f"  F1-Score:          {f1:.4f}")
    print(f"  Matriz de Confusión:\n{cm}")

    assert bal_acc >= 0.80, (
        f"GATE FALLIDO CLASIFICADOR: Balanced Accuracy={bal_acc:.4f} es inferior al umbral mínimo de 0.80"
    )
    assert rec >= 0.85, (
        f"GATE FALLIDO CLASIFICADOR: Recall={rec:.4f} es inferior al umbral crítico de 0.85 para clase quiebre=1"
    )


def test_b_cross_validation_5fold_estratificada_por_mes():
    """
    Cross-validation 5-fold estratificada por mes sobre el conjunto de entrenamiento (train.csv).
    Calcula Media ± Desviación Estándar para validar consistencia temporal intermensual.
    """
    df_train = pd.read_csv(TRAIN_CSV)
    X_train = preparar_features(df_train, seed=42)
    y_demanda = df_train["demanda_proxima_semana"]
    y_quiebre = df_train["riesgo_quiebre_stock"]

    # Estratificación por mes calendario
    meses = pd.to_datetime(df_train["fecha"]).dt.month.values
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    cv_rmse_reg = []
    cv_bal_acc_clf = []
    cv_recall_clf = []

    for train_idx, val_idx in skf.split(X_train, meses):
        X_tr, X_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
        y_dem_tr, y_dem_val = y_demanda.iloc[train_idx], y_demanda.iloc[val_idx]
        y_qui_tr, y_qui_val = y_quiebre.iloc[train_idx], y_quiebre.iloc[val_idx]

        # Regresor
        rf_reg = RandomForestRegressor(
            n_estimators=300, min_samples_split=10, min_samples_leaf=5, random_state=42, n_jobs=1
        )
        rf_reg.fit(X_tr, y_dem_tr)
        preds_dem = rf_reg.predict(X_val)
        cv_rmse_reg.append(float(root_mean_squared_error(y_dem_val, preds_dem)))

        # Clasificador
        rf_clf = RandomForestClassifier(
            n_estimators=300, min_samples_split=10, min_samples_leaf=5, class_weight="balanced", random_state=42, n_jobs=1
        )
        rf_clf.fit(X_tr, y_qui_tr)
        preds_qui = rf_clf.predict(X_val)
        cv_bal_acc_clf.append(float(balanced_accuracy_score(y_qui_val, preds_qui)))
        cv_recall_clf.append(float(recall_score(y_qui_val, preds_qui, pos_label=1, zero_division=0)))

    mean_rmse = np.mean(cv_rmse_reg)
    std_rmse = np.std(cv_rmse_reg)

    mean_bal_acc = np.mean(cv_bal_acc_clf)
    std_bal_acc = np.std(cv_bal_acc_clf)

    mean_recall = np.mean(cv_recall_clf)
    std_recall = np.std(cv_recall_clf)

    print(f"\nCROSS-VALIDATION 5-FOLD ESTRATIFICADA POR MES (TRAIN):")
    print(f"  Regresor RMSE:           {mean_rmse:.4f} ± {std_rmse:.4f}")
    print(f"  Clasificador Bal. Acc.:  {mean_bal_acc:.4f} ± {std_bal_acc:.4f}")
    print(f"  Clasificador Recall q=1: {mean_recall:.4f} ± {std_recall:.4f}")

    assert mean_bal_acc >= 0.80, f"CV Clasificador Balanced Acc promedio {mean_bal_acc:.4f} < 0.80"
    assert mean_recall >= 0.80, f"CV Clasificador Recall promedio {mean_recall:.4f} < 0.80"


def test_c_regresor_metricas_y_gate(evaluacion_modelos):
    """
    Validación Cuantitativa del Regresor de Demanda contra Gates:
      GATE: RMSE <= 0.70 * RMSE_baseline Y R2 >= 0.75.
    """
    reg = evaluacion_modelos["regresor"]

    rmse_base = reg["rmse_base"]
    rmse = reg["rmse"]
    mae = reg["mae"]
    r2 = reg["r2"]
    umbral_rmse = reg["gate_rmse_umbral"]

    print(f"\nMÉTRICAS REGRESOR DEMANDA (TEST HOLDOUT):")
    print(f"  RMSE Baseline (Dummy): {rmse_base:.4f}")
    print(f"  RMSE Modelo:           {rmse:.4f} [Gate <= {umbral_rmse:.4f} (0.70 * Base)]")
    print(f"  MAE Modelo:            {mae:.4f}")
    print(f"  R2 Modelo:             {r2:.4f} [Gate >= 0.75]")

    # Evaluación estricta de los Gates de Producción (Regla 3.3)
    assert rmse <= umbral_rmse, (
        f"GATE FALLIDO REGRESOR: RMSE={rmse:.4f} supera el umbral máximo de 0.70*RMSE_base ({umbral_rmse:.4f})"
    )
    assert r2 >= 0.75, (
        f"GATE FALLIDO REGRESOR: Coeficiente de determinación R2={r2:.4f} es inferior al umbral mínimo exigido de 0.75"
    )
