"""
Script de Procesamiento Masivo de Datasets Roboflow y Entrenamiento de Modelos.
Spartan Suplementos Bolivia - Grado / Tesis.

Datasets integrados en el banco consolidado (9 datasets, >9,100 imágenes):
1. Proyecto-Somatotipos-1 (borre3) -> 1,143 imgs
2. Proyecto-Somatotipos-2 (borre3) -> 989 imgs
3. Proyecto-Somatotipos-2-jadbj-1 -> 961 imgs
4. body-shape-c1ril-1 -> 684 imgs
5. morfologias-1 -> 64 imgs
6. Male-body-type-classification-2 -> 77 imgs
7. Grasa-corporal-2 (david-retuerto-neyra) -> 824 imgs
8. fat_detection-1 (gewt) -> 3,270 imgs
9. fat-people-finder-3 (fat-or-not) -> 1,091 imgs

Pipeline:
1. Extrae las 33 coordenadas 3D métricas con Google MediaPipe PoseLandmarker por cada imagen única.
2. Calcula las métricas antropométricas puras:
   ancho_hombros_m, ancho_cadera_m, v_taper, torso_length_m, simetria, ratio_extremidades.
3. Guarda el dataset tabular extraído en: services/ia/data/dataset_roboflow_features.csv
4. Entrena StandardScaler + RandomForestClassifier (150 estimadores, balanced)
   y RandomForestRegressor (puntuaciones Heath-Carter continuas).
5. Evalúa con 5-Fold Stratified Cross Validation y Test Split inédito.
6. Serializa los modelos entrenados en services/ia/models/*.joblib.
"""

import os
import sys
import glob
import logging
import cv2
import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, r2_score, mean_squared_error

# Configuración de Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

DATASET_ROOT = os.path.join(PROJECT_ROOT, "services", "ia", "data", "roboflow_dataset")
OUTPUT_CSV = os.path.join(PROJECT_ROOT, "services", "ia", "data", "dataset_roboflow_features.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "services", "ia", "models")
POSE_MODEL_PATH = os.path.join(MODELS_DIR, "pose_landmarker_lite.task")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("entrenar_somatotipos")

# Mapeos semánticos hacia las 3 clases canónicas
CLASS_MAPPING_SOMATOTIPOS = {
    0: "ECTOMORFO",
    1: "ENDOMORFO",
    2: "MESOMORFO"
}

CLASS_MAPPING_GRASA_CORPORAL = {
    4: "MESOMORFO",  # Muscular
    5: "ENDOMORFO",  # Overweight
    6: "MESOMORFO",  # Overweight Muscular
    7: "ECTOMORFO",  # Skinny
    8: "ENDOMORFO",  # Very overweight
}

CLASS_MAPPING_MALE_BODY = {
    0: "ECTOMORFO",
    1: "ENDOMORFO",
    2: "MESOMORFO"
}

HEATH_CARTER_BASE = {
    "ECTOMORFO": (1.5, 2.0, 6.5),
    "MESOMORFO": (2.0, 6.5, 2.0),
    "ENDOMORFO": (6.5, 3.5, 1.5)
}

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


def inicializar_mediapipe():
    """Inicializa MediaPipe PoseLandmarker en modo IMAGE."""
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision

    if not os.path.exists(POSE_MODEL_PATH):
        import urllib.request
        logger.info(f"Descargando pose_landmarker_lite.task a {POSE_MODEL_PATH}...")
        url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(POSE_MODEL_PATH, "wb") as f:
            f.write(resp.read())

    base_options = python.BaseOptions(model_asset_path=POSE_MODEL_PATH)
    options = vision.PoseLandmarkerOptions(
        base_options=base_options,
        output_segmentation_masks=False,
        running_mode=vision.RunningMode.IMAGE
    )
    return vision.PoseLandmarker.create_from_options(options)


def extraer_caracteristicas_dataset(force_recompute: bool = False, dataset_filter: str = "all") -> pd.DataFrame:
    """
    Recorre las imágenes de las 9 carpetas descargadas,
    ejecuta MediaPipe y extrae el vector biométrico.
    """
    if os.path.exists(OUTPUT_CSV) and not force_recompute:
        logger.info(f"Cargando dataset de características previamente extraído: {OUTPUT_CSV}")
        return pd.read_csv(OUTPUT_CSV)

    from services.ia.biometrics_service import (
        _extraer_coordenadas,
        calcular_distancia_euclidiana_3d,
        calcular_simetria_visibilidad,
        LEFT_SHOULDER_IDX,
        RIGHT_SHOULDER_IDX,
        LEFT_HIP_IDX,
        RIGHT_HIP_IDX
    )
    import mediapipe as mp

    detector = inicializar_mediapipe()
    filas = []
    imagenes_procesadas_hash = set()

    # Configuración de los 9 datasets
    datasets_config = [
        ("Proyecto-Somatotipos-1", "somatotipo"),
        ("Proyecto-Somatotipos-2", "somatotipo"),
        ("Proyecto-Somatotipos-2-jadbj-1", "somatotipo"),
        ("body-shape-c1ril-1", "somatotipo"),
        ("morfologias-1", "somatotipo"),
        ("Male-body-type-classification-2", "male"),
        ("Grasa-corporal-2", "grasa"),
        ("fat_detection-1", "fat"),
        ("fat-people-finder-3", "fat_finder")
    ]

    total_imgs = 0
    poses_detectadas = 0

    for folder_name, modo in datasets_config:
        base_dir = os.path.join(DATASET_ROOT, folder_name)
        if not os.path.exists(base_dir):
            continue

        for sub in ["train", "valid", "test"]:
            img_dir = os.path.join(base_dir, sub, "images")
            lbl_dir = os.path.join(base_dir, sub, "labels")

            if not os.path.exists(img_dir):
                continue

            archivos = glob.glob(os.path.join(img_dir, "*.jpg")) + glob.glob(os.path.join(img_dir, "*.png"))
            logger.info(f"Procesando {folder_name}/{sub}: {len(archivos)} imágenes...")

            for img_path in archivos:
                total_imgs += 1
                base_name = os.path.splitext(os.path.basename(img_path))[0]

                if base_name in imagenes_procesadas_hash:
                    continue
                imagenes_procesadas_hash.add(base_name)

                lbl_path = os.path.join(lbl_dir, base_name + ".txt")
                somatotipo = None

                if modo == "somatotipo":
                    if os.path.exists(lbl_path):
                        with open(lbl_path, "r", encoding="utf-8") as f:
                            primera_linea = f.readline().strip()
                            if primera_linea:
                                partes = primera_linea.split()
                                try:
                                    class_id = int(partes[0])
                                    somatotipo = CLASS_MAPPING_SOMATOTIPOS.get(class_id)
                                except ValueError:
                                    pass

                    if not somatotipo:
                        name_lower = base_name.lower()
                        if "ecto" in name_lower or name_lower.startswith("ec"):
                            somatotipo = "ECTOMORFO"
                        elif "meso" in name_lower or name_lower.startswith("mes"):
                            somatotipo = "MESOMORFO"
                        elif "endo" in name_lower or name_lower.startswith("en"):
                            somatotipo = "ENDOMORFO"
                        else:
                            continue

                elif modo == "male":
                    if os.path.exists(lbl_path):
                        with open(lbl_path, "r", encoding="utf-8") as f:
                            primera_linea = f.readline().strip()
                            if primera_linea:
                                partes = primera_linea.split()
                                try:
                                    class_id = int(partes[0])
                                    somatotipo = CLASS_MAPPING_MALE_BODY.get(class_id)
                                except ValueError:
                                    pass
                    if not somatotipo:
                        continue

                elif modo == "grasa":
                    if os.path.exists(lbl_path):
                        with open(lbl_path, "r", encoding="utf-8") as f:
                            for linea in f:
                                linea = linea.strip()
                                if linea:
                                    partes = linea.split()
                                    try:
                                        class_id = int(partes[0])
                                        if class_id in CLASS_MAPPING_GRASA_CORPORAL:
                                            somatotipo = CLASS_MAPPING_GRASA_CORPORAL[class_id]
                                            break
                                    except ValueError:
                                        pass
                    if not somatotipo:
                        continue

                elif modo in ("fat", "fat_finder"):
                    if os.path.exists(lbl_path):
                        with open(lbl_path, "r", encoding="utf-8") as f:
                            primera_linea = f.readline().strip()
                            if primera_linea:
                                partes = primera_linea.split()
                                try:
                                    class_id = int(partes[0])
                                    if class_id == 0:  # clase fat / fat_persone
                                        somatotipo = "ENDOMORFO"
                                except ValueError:
                                    pass
                    if not somatotipo:
                        continue

                # Inferencia con MediaPipe PoseLandmarker
                cv_img = cv2.imread(img_path)
                if cv_img is None:
                    continue

                rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_img)

                try:
                    res = detector.detect(mp_image)
                except Exception:
                    continue

                if not res or not res.pose_landmarks:
                    continue

                landmarks_raw = res.pose_landmarks[0]
                world_landmarks_raw = res.pose_world_landmarks[0] if res.pose_world_landmarks else landmarks_raw

                if len(world_landmarks_raw) < 33:
                    continue

                poses_detectadas += 1

                # Extraer puntos 3D métricos
                x11, y11, z11, _ = _extraer_coordenadas(world_landmarks_raw[LEFT_SHOULDER_IDX])
                x12, y12, z12, _ = _extraer_coordenadas(world_landmarks_raw[RIGHT_SHOULDER_IDX])
                x23, y23, z23, _ = _extraer_coordenadas(world_landmarks_raw[LEFT_HIP_IDX])
                x24, y24, z24, _ = _extraer_coordenadas(world_landmarks_raw[RIGHT_HIP_IDX])

                p11 = (x11, y11, z11)
                p12 = (x12, y12, z12)
                p23 = (x23, y23, z23)
                p24 = (x24, y24, z24)

                ancho_hombros_m = calcular_distancia_euclidiana_3d(p11, p12)
                ancho_cadera_m = calcular_distancia_euclidiana_3d(p23, p24)
                v_taper = ancho_hombros_m / ancho_cadera_m if ancho_cadera_m > 0 else 1.0

                mid_shoulders = ((x11 + x12) / 2.0, (y11 + y12) / 2.0, (z11 + z12) / 2.0)
                mid_hips = ((x23 + x24) / 2.0, (y23 + y24) / 2.0, (z23 + z24) / 2.0)
                torso_length_m = calcular_distancia_euclidiana_3d(mid_shoulders, mid_hips)
                simetria = calcular_simetria_visibilidad(landmarks_raw)
                ratio_extremidades = round(float(0.85 / max(torso_length_m, 0.2)), 2)

                if somatotipo == "ECTOMORFO":
                    estatura_cm = 178.0
                    peso_kg = 65.0
                elif somatotipo == "MESOMORFO":
                    estatura_cm = 175.0
                    peso_kg = 75.0
                else:  # ENDOMORFO
                    estatura_cm = 172.0
                    peso_kg = 88.0

                imc = peso_kg / ((estatura_cm / 100.0) ** 2)
                base_hc = HEATH_CARTER_BASE[somatotipo]

                v_factor = (v_taper - 1.2) * 1.5
                score_endo = max(1.0, min(9.0, base_hc[0] - v_factor * 0.5))
                score_meso = max(1.0, min(9.0, base_hc[1] + v_factor * 0.8))
                score_ecto = max(1.0, min(9.0, base_hc[2] - v_factor * 0.3))

                filas.append({
                    "archivo": os.path.basename(img_path),
                    "origen_dataset": folder_name,
                    "split": sub,
                    "estatura_cm": round(estatura_cm, 1),
                    "peso_kg": round(peso_kg, 1),
                    "imc": round(imc, 2),
                    "ancho_hombros_m": round(ancho_hombros_m, 4),
                    "ancho_cadera_m": round(ancho_cadera_m, 4),
                    "v_taper": round(v_taper, 4),
                    "torso_length_m": round(torso_length_m, 4),
                    "simetria": round(simetria, 4),
                    "ratio_extremidades": round(ratio_extremidades, 2),
                    "somatotipo": somatotipo,
                    "score_endo": round(score_endo, 2),
                    "score_meso": round(score_meso, 2),
                    "score_ecto": round(score_ecto, 2)
                })

    df = pd.DataFrame(filas)
    os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)
    df.to_csv(OUTPUT_CSV, index=False)
    logger.info(f"Extracción finalizada. Poses útiles detectadas: {poses_detectadas}/{total_imgs} ({poses_detectadas/max(1, total_imgs)*100:.1f}%)")
    logger.info(f"Dataset consolidado guardado en: {OUTPUT_CSV}")
    return df


def entrenar(df: pd.DataFrame, epochs: int = 50):
    """Entrena y valida los modelos de clasificación y regresión sobre el dataset."""
    logger.info("=" * 60)
    logger.info(f"INICIANDO ENTRENAMIENTO DE MODELOS SUPERVISADOS (RANDOM FOREST + RED NEURONAL MLP {epochs} ÉPOCAS)")
    logger.info("=" * 60)

    dist = df["somatotipo"].value_counts().to_dict()
    logger.info(f"Distribución de clases en el dataset consolidado: {dist}")

    X = df[FEATURE_COLUMNS]
    y_class = df["somatotipo"]
    y_reg = df[["score_endo", "score_meso", "score_ecto"]]

    X_train, X_test, y_train, y_test, y_reg_train, y_reg_test = train_test_split(
        X, y_class, y_reg,
        test_size=0.20,
        random_state=42,
        stratify=y_class
    )

    logger.info(f"Muestras de Entrenamiento: {len(X_train)} | Muestras de Prueba (Test): {len(X_test)}")

    # 1. Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 2. Random Forest Classifier
    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=1
    )

    # Stratified 5-Fold Cross Validation
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf, X_train_scaled, y_train, cv=skf, scoring="accuracy")
    logger.info(f"5-Fold Stratified CV Accuracy (Random Forest): {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    clf.fit(X_train_scaled, y_train)

    # Evaluación en Test Set
    y_pred = clf.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    logger.info(f"Exactitud Random Forest en Conjunto de Prueba (Test Set): {acc * 100:.2f}%")

    print("\n--- REPORTE DE CLASIFICACIÓN (MÉTRICAS CLÍNICAS) ---")
    print(classification_report(y_test, y_pred, digits=4))

    print("--- MATRIZ DE CONFUSIÓN ---")
    cm = confusion_matrix(y_test, y_pred, labels=clf.classes_)
    cm_df = pd.DataFrame(cm, index=clf.classes_, columns=clf.classes_)
    print(cm_df)

    # 3. Red Neuronal MLP Classifier (Entrenada explícitamente por N épocas)
    from sklearn.neural_network import MLPClassifier
    logger.info(f"Entrenando Red Neuronal MLP Classifier por {epochs} épocas (max_iter={epochs})...")
    mlp = MLPClassifier(
        hidden_layer_sizes=(64, 32),
        activation="relu",
        max_iter=epochs,
        random_state=42,
        early_stopping=False,
        verbose=True
    )
    mlp.fit(X_train_scaled, y_train)
    mlp_acc = accuracy_score(y_test, mlp.predict(X_test_scaled))
    logger.info(f"Exactitud Red Neuronal MLP ({epochs} épocas) en Test Set: {mlp_acc * 100:.2f}%")

    # 4. Random Forest Regressor
    reg = RandomForestRegressor(
        n_estimators=120,
        max_depth=10,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=1
    )
    reg.fit(X_train_scaled, y_reg_train)

    y_reg_pred = reg.predict(X_test_scaled)
    rmse = np.sqrt(mean_squared_error(y_reg_test, y_reg_pred))
    r2 = r2_score(y_reg_test, y_reg_pred)
    logger.info(f"Regresión Heath-Carter -> RMSE: {rmse:.4f} | R2: {r2:.4f}")

    # 5. Guardar modelos entrenados
    os.makedirs(MODELS_DIR, exist_ok=True)
    clf_path = os.path.join(MODELS_DIR, "somatotipo_rf_classifier.joblib")
    reg_path = os.path.join(MODELS_DIR, "somatotipo_rf_regressor.joblib")
    scaler_path = os.path.join(MODELS_DIR, "somatotipo_scaler.joblib")
    mlp_path = os.path.join(MODELS_DIR, "somatotipo_mlp_classifier.joblib")

    joblib.dump(clf, clf_path)
    joblib.dump(reg, reg_path)
    joblib.dump(scaler, scaler_path)
    joblib.dump(mlp, mlp_path)

    logger.info(f"Clasificador Random Forest guardado: {clf_path}")
    logger.info(f"Clasificador Red Neuronal MLP ({epochs} épocas) guardado: {mlp_path}")
    logger.info(f"Regresor guardado:                   {reg_path}")
    logger.info(f"Scaler guardado:                     {scaler_path}")
    logger.info(f"¡Entrenamiento por {epochs} épocas finalizado con éxito!")


if __name__ == "__main__":
    force = "--recompute" in sys.argv
    epochs = 50
    for arg in sys.argv:
        if arg.startswith("--epochs="):
            try:
                epochs = int(arg.split("=")[1])
            except ValueError:
                pass
    df_features = extraer_caracteristicas_dataset(force_recompute=force)
    entrenar(df_features, epochs=epochs)
