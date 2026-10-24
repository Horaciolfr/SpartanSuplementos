"""
Módulo de Entrenamiento Supervisado de Random Forest (Clasificador y Regresor).
Proyecto: Spartan Suplementos Bolivia - Tesis de Grado.

Cumplimiento Normativo:
- Objetivo Específico 2 (OE2): Clasificación de somatotipos y ajuste métrico.
- Algoritmo: Breiman, L. (2001). Random Forests / CART.
- Validación Cruzada: 5-Fold Stratified Cross Validation.
- Serialización: Modelos exportados a services/ia/models/*.joblib.
"""

import os
import sys
import logging
import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, accuracy_score, mean_squared_error, r2_score

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER_CSV = os.path.join(PROJECT_ROOT, "services", "ia", "data", "dataset_somatotipo_master.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "services", "ia", "models")
TEST_SPLIT_CSV = os.path.join(PROJECT_ROOT, "services", "ia", "data", "test_split.csv")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_rf")

FEATURE_COLUMNS = [
    "estatura_cm",
    "peso_kg",
    "imc",
    "ancho_hombros_m",
    "ancho_cadera_m",
    "v_taper",
    "torso_length_m",
    "simetria",
    "ratio_extremidades"
]

TARGET_CLASS = "somatotipo"
TARGET_SCORES = ["score_endo", "score_meso", "score_ecto"]


def entrenar_modelos():
    """
    Entrena el clasificador y el regresor de Random Forest sobre el dataset maestro
    y serializa los pesos resultantes.
    """
    if not os.path.exists(MASTER_CSV):
        raise FileNotFoundError(f"No se encontró {MASTER_CSV}. Ejecuta primero los scripts de generación de datos.")

    logger.info(f"Cargando dataset maestro desde: {MASTER_CSV}")
    df = pd.read_csv(MASTER_CSV)
    logger.info(f"Registros totales cargados: {len(df)}")

    X = df[FEATURE_COLUMNS]
    y_class = df[TARGET_CLASS]
    y_reg = df[TARGET_SCORES]

    # 1. División Train / Val / Test (70% Train, 15% Val, 15% Test)
    # Primera división: 85% Train+Val, 15% Test
    X_train_val, X_test, y_class_tv, y_class_test, y_reg_tv, y_reg_test, idx_tv, idx_test = train_test_split(
        X, y_class, y_reg, df.index,
        test_size=0.15,
        random_state=42,
        stratify=y_class
    )

    # Segunda división: Separar Train (70% total) y Validation (15% total)
    val_ratio_of_tv = 0.15 / 0.85 # ~17.65% de train_val equivale al 15% global
    X_train, X_val, y_class_train, y_class_val, y_reg_train, y_reg_val = train_test_split(
        X_train_val, y_class_tv, y_reg_tv,
        test_size=val_ratio_of_tv,
        random_state=42,
        stratify=y_class_tv
    )

    logger.info(f"Splits generados: Train={len(X_train)} | Val={len(X_val)} | Test={len(X_test)}")

    # Guardar el Test Set con todas sus columnas para la fase de evaluación y auditoría de tesis
    df_test = df.loc[idx_test].copy()
    df_test.to_csv(TEST_SPLIT_CSV, index=False)
    logger.info(f"Conjunto de prueba independiente persistido en: {TEST_SPLIT_CSV}")

    # 2. Normalización de Features (StandardScaler)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # 3. Entrenamiento del Clasificador Multiclase (RandomForestClassifier)
    logger.info("Entrenando RandomForestClassifier (150 árboles, balanced)...")
    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=1
    )

    # Validación cruzada 5-Fold sobre el conjunto de entrenamiento
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf, X_train_scaled, y_class_train, cv=skf, scoring="accuracy")
    logger.info(f"Validación Cruzada 5-Fold Accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    clf.fit(X_train_scaled, y_class_train)

    # Evaluación en Conjunto de Validación
    y_val_pred = clf.predict(X_val_scaled)
    acc_val = accuracy_score(y_class_val, y_val_pred)
    logger.info(f"Accuracy en Validación: {acc_val:.4f} ({acc_val*100:.2f}%)")

    # Evaluación preliminar en Conjunto de Prueba
    y_test_pred = clf.predict(X_test_scaled)
    acc_test = accuracy_score(y_class_test, y_test_pred)
    logger.info(f"Accuracy en Test Set (Inédito): {acc_test:.4f} ({acc_test*100:.2f}%)")
    print("\n--- REPORTE DE CLASIFICACIÓN (TEST SET) ---")
    print(classification_report(y_class_test, y_test_pred, digits=4))

    # 4. Entrenamiento del Regresor Multivariable (RandomForestRegressor)
    logger.info("Entrenando RandomForestRegressor para componentes continuos Heath-Carter...")
    reg = RandomForestRegressor(
        n_estimators=120,
        max_depth=10,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1
    )
    reg.fit(X_train_scaled, y_reg_train)

    # Evaluación de Regresión en Test Set
    y_reg_test_pred = reg.predict(X_test_scaled)
    rmse_total = np.sqrt(mean_squared_error(y_reg_test, y_reg_test_pred))
    r2_total = r2_score(y_reg_test, y_reg_test_pred)
    logger.info(f"Regresión Heath-Carter RMSE Total: {rmse_total:.4f} | R2 Score: {r2_total:.4f}")

    for idx, col in enumerate(TARGET_SCORES):
        rmse_col = np.sqrt(mean_squared_error(y_reg_test.iloc[:, idx], y_reg_test_pred[:, idx]))
        logger.info(f"  - Componente {col}: RMSE = {rmse_col:.4f}")

    # 5. Serialización de Modelos y Scaler
    os.makedirs(MODELS_DIR, exist_ok=True)
    clf_path = os.path.join(MODELS_DIR, "somatotipo_rf_classifier.joblib")
    reg_path = os.path.join(MODELS_DIR, "somatotipo_rf_regressor.joblib")
    scaler_path = os.path.join(MODELS_DIR, "somatotipo_scaler.joblib")

    joblib.dump(clf, clf_path)
    joblib.dump(reg, reg_path)
    joblib.dump(scaler, scaler_path)

    logger.info(f"Clasificador serializado en: {clf_path}")
    logger.info(f"Regresor serializado en: {reg_path}")
    logger.info(f"Scaler serializado en: {scaler_path}")
    logger.info("¡Entrenamiento y serialización completados con éxito!")

    return {
        "accuracy_test": acc_test,
        "rmse_test": rmse_total,
        "cv_accuracy_mean": cv_scores.mean(),
        "cv_accuracy_std": cv_scores.std()
    }


if __name__ == "__main__":
    entrenar_modelos()
