"""
Módulo Antropométrico y Biométrico 3D (Cálculo Puro y Determinista).

Este módulo no realiza I/O, llamadas de red ni acceso a bases de datos.
Recibe world_landmarks (coordenadas reales métricas 3D en metros) y landmarks normalizados.
Aplica trigonometría y álgebra vectorial para extraer métricas anatómicas reales y clasificar
el somatotipo según la línea base heurística.

NOTA ARQUITECTÓNICA:
La heurística de somatotipo implementada en este módulo representa una línea base determinista
que será sustituida por el modelo supervisado Random Forest en la Tarea 11.
"""

import os
import math
from typing import List, Dict, Any, Tuple

# Umbrales constantes de módulo configurables y testables
SOMATOTIPO_UMBRALES = {
    "imc_bajo": 18.5,
    "imc_alto": 24.9,
    "v_taper_mesomorfo": 1.5,
}

# Índices MediaPipe Pose Topology
# Hombros: 11 (izquierdo), 12 (derecho)
# Caderas: 23 (izquierdo), 24 (derecho)
LEFT_SHOULDER_IDX = 11
RIGHT_SHOULDER_IDX = 12
LEFT_HIP_IDX = 23
RIGHT_HIP_IDX = 24

# Puntos laterales para cálculo de simetría de visibilidad
LEFT_LANDMARK_INDICES = [1, 2, 3, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]
RIGHT_LANDMARK_INDICES = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]


def _extraer_coordenadas(lm: Any) -> Tuple[float, float, float, float]:
    """
    Extrae (x, y, z, visibilidad) soportando tanto objetos MediaPipe Landmark
    como diccionarios serializados.
    """
    if isinstance(lm, dict):
        x = float(lm.get("x", 0.0))
        y = float(lm.get("y", 0.0))
        z = float(lm.get("z", 0.0))
        vis = float(lm.get("visibilidad", lm.get("visibility", 1.0)) or 1.0)
    else:
        x = float(getattr(lm, "x", 0.0))
        y = float(getattr(lm, "y", 0.0))
        z = float(getattr(lm, "z", 0.0))
        vis_val = getattr(lm, "visibility", 1.0)
        vis = float(vis_val if vis_val is not None else 1.0)
    return x, y, z, vis


def calcular_distancia_euclidiana_3d(p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
    """Calcula la distancia euclidiana entre dos puntos en espacio tridimensional."""
    return math.dist(p1, p2)


def calcular_simetria_visibilidad(landmarks: List[Any]) -> float:
    """
    Calcula el coeficiente de simetría corporal basado en la visibilidad de landmarks:
    simetria = 1 - |media(visibility izq) - media(visibility der)|
    Rango acotado en [0.0, 1.0].
    """
    if not landmarks or len(landmarks) < 33:
        return 1.0

    vis_izq = []
    for idx in LEFT_LANDMARK_INDICES:
        if idx < len(landmarks):
            _, _, _, vis = _extraer_coordenadas(landmarks[idx])
            vis_izq.append(vis)

    vis_der = []
    for idx in RIGHT_LANDMARK_INDICES:
        if idx < len(landmarks):
            _, _, _, vis = _extraer_coordenadas(landmarks[idx])
            vis_der.append(vis)

    media_izq = sum(vis_izq) / len(vis_izq) if vis_izq else 1.0
    media_der = sum(vis_der) / len(vis_der) if vis_der else 1.0

    simetria = 1.0 - abs(media_izq - media_der)
    return max(0.0, min(1.0, simetria))


def calcular_postura_torso(
    mid_shoulders: Tuple[float, float, float],
    mid_hips: Tuple[float, float, float]
) -> Tuple[float, str]:
    """
    Calcula el ángulo de inclinación del torso en espacio 3D frente a la vertical:
    Vector torso: cadera -> hombros.
    En coordenadas world de MediaPipe, el eje Y apunta hacia abajo (y de hombros < y de cadera),
    por lo que la vertical hacia arriba está dada por (0, -1, 0).

    Clasificación:
    - < 5°: ALINEADA
    - 5° a 15°: INCLINACION_LEVE
    - > 15°: INCLINADA
    """
    vx = mid_shoulders[0] - mid_hips[0]
    vy = mid_shoulders[1] - mid_hips[1]
    vz = mid_shoulders[2] - mid_hips[2]

    norm = math.sqrt(vx * vx + vy * vy + vz * vz)
    if norm == 0.0:
        return 0.0, "ALINEADA"

    # Producto punto con vertical superior (0, -1, 0)
    cos_theta = (-vy) / norm
    cos_theta = max(-1.0, min(1.0, cos_theta))
    angulo_rad = math.acos(cos_theta)
    angulo_deg = math.degrees(angulo_rad)

    if angulo_deg < 5.0:
        categoria = "ALINEADA"
    elif angulo_deg <= 15.0:
        categoria = "INCLINACION_LEVE"
    else:
        categoria = "INCLINADA"

    return angulo_deg, categoria


# Integración del Modelo Supervisado Random Forest (Breiman 2001 / Carter & Heath 1990)
_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
_CLF_PATH = os.path.join(_MODELS_DIR, "somatotipo_rf_classifier.joblib")
_REG_PATH = os.path.join(_MODELS_DIR, "somatotipo_rf_regressor.joblib")
_SCALER_PATH = os.path.join(_MODELS_DIR, "somatotipo_scaler.joblib")

_RF_CLASSIFIER = None
_RF_REGRESSOR = None
_RF_SCALER = None


def _get_rf_models():
    """Carga perezosa de los modelos Random Forest serializados."""
    global _RF_CLASSIFIER, _RF_REGRESSOR, _RF_SCALER
    if _RF_CLASSIFIER is None and os.path.exists(_CLF_PATH) and os.path.exists(_SCALER_PATH):
        try:
            import joblib
            _RF_CLASSIFIER = joblib.load(_CLF_PATH)
            _RF_CLASSIFIER.n_jobs = 1
            _RF_SCALER = joblib.load(_SCALER_PATH)
            if os.path.exists(_REG_PATH):
                _RF_REGRESSOR = joblib.load(_REG_PATH)
                _RF_REGRESSOR.n_jobs = 1
        except Exception:
            _RF_CLASSIFIER = None
    return _RF_CLASSIFIER, _RF_REGRESSOR, _RF_SCALER


def clasificar_somatotipo(imc: float, v_taper: float) -> str:
    """
    Heurística de somatotipo (línea base determinista de respaldo).
    Reglas de decisión:
    - imc < 18.5 -> ECTOMORFO
    - 18.5 <= imc <= 24.9 y v_taper >= 1.5 -> MESOMORFO
    - 18.5 <= imc <= 24.9 y v_taper < 1.5 -> ECTOMORFO
    - imc >= 25 -> ENDOMORFO
    """
    if imc < SOMATOTIPO_UMBRALES["imc_bajo"]:
        return "ECTOMORFO"
    elif imc <= SOMATOTIPO_UMBRALES["imc_alto"]:
        if v_taper >= SOMATOTIPO_UMBRALES["v_taper_mesomorfo"]:
            return "MESOMORFO"
        else:
            return "ECTOMORFO"
    else:
        return "ENDOMORFO"


def clasificar_somatotipo_rf(
    estatura_cm: float,
    peso_kg: float,
    imc: float,
    ancho_hombros_m: float,
    ancho_cadera_m: float,
    v_taper: float,
    torso_length_m: float,
    simetria: float,
    ratio_extremidades: float = 1.75
) -> Tuple[str, Dict[str, float], Dict[str, float]]:
    """
    Clasificación supervisada mediante Random Forest entrenado con el modelo Heath-Carter.
    Retorna (somatotipo, probabilidades_por_clase, scores_continuos_heath_carter).
    Fallback automático a la heurística si los modelos no están disponibles.
    """
    clf, reg, scaler = _get_rf_models()
    if clf is None or scaler is None:
        fallback_somatotipo = clasificar_somatotipo(imc, v_taper)
        return fallback_somatotipo, {fallback_somatotipo: 1.0}, {"endo": 0.0, "meso": 0.0, "ecto": 0.0}

    try:
        import numpy as np
        features = np.array([[
            float(estatura_cm),
            float(peso_kg),
            float(imc),
            float(ancho_hombros_m),
            float(ancho_cadera_m),
            float(v_taper),
            float(torso_length_m),
            float(simetria),
            float(ratio_extremidades)
        ]], dtype=np.float64)

        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            features_scaled = scaler.transform(features)
            probs = clf.predict_proba(features_scaled)[0]
            max_idx = int(np.argmax(probs))
            pred_class = str(clf.classes_[max_idx])
            prob_dict = {str(c): round(float(p), 4) for c, p in zip(clf.classes_, probs)}

            scores_dict = {"endo": 0.0, "meso": 0.0, "ecto": 0.0}
            if reg is not None:
                reg_scores = reg.predict(features_scaled)[0]
                scores_dict = {
                    "endo": round(float(reg_scores[0]), 2),
                    "meso": round(float(reg_scores[1]), 2),
                    "ecto": round(float(reg_scores[2]), 2)
                }

        return pred_class, prob_dict, scores_dict
    except Exception as err:
        fallback_somatotipo = clasificar_somatotipo(imc, v_taper)
        return fallback_somatotipo, {fallback_somatotipo: 1.0}, {"endo": 0.0, "meso": 0.0, "ecto": 0.0}


def procesar_biometria_3d(
    world_landmarks: List[Any],
    normalized_landmarks: List[Any],
    estatura_cm: float,
    peso_kg: float
) -> Dict[str, Any]:
    """
    Función principal: procesa los landmarks 3D métricos y normalizados
    para calcular métricas antropométricas reales y predecir somatotipo
    usando el modelo supervisado Random Forest.
    """
    if len(world_landmarks) < 33 or len(normalized_landmarks) < 33:
        raise ValueError("Se requieren exactamente 33 landmarks para el procesamiento biométrico.")

    # 1. Extraer puntos 3D métricos
    x11, y11, z11, _ = _extraer_coordenadas(world_landmarks[LEFT_SHOULDER_IDX])
    x12, y12, z12, _ = _extraer_coordenadas(world_landmarks[RIGHT_SHOULDER_IDX])
    x23, y23, z23, _ = _extraer_coordenadas(world_landmarks[LEFT_HIP_IDX])
    x24, y24, z24, _ = _extraer_coordenadas(world_landmarks[RIGHT_HIP_IDX])

    p11 = (x11, y11, z11)
    p12 = (x12, y12, z12)
    p23 = (x23, y23, z23)
    p24 = (x24, y24, z24)

    # 2. Distancias métricas en metros
    ancho_hombros_m = calcular_distancia_euclidiana_3d(p11, p12)
    ancho_cadera_m = calcular_distancia_euclidiana_3d(p23, p24)

    v_taper = ancho_hombros_m / ancho_cadera_m if ancho_cadera_m > 0.0 else 1.0

    # 3. Torso length métrico en metros
    mid_shoulders = ((x11 + x12) / 2.0, (y11 + y12) / 2.0, (z11 + z12) / 2.0)
    mid_hips = ((x23 + x24) / 2.0, (y23 + y24) / 2.0, (z23 + z24) / 2.0)
    torso_length_m = calcular_distancia_euclidiana_3d(mid_shoulders, mid_hips)

    # 4. Simetría de visibilidad (0.0 a 1.0)
    simetria = calcular_simetria_visibilidad(normalized_landmarks)

    # 5. Ángulo de inclinación y postura
    angulo_inclinacion_deg, postura = calcular_postura_torso(mid_shoulders, mid_hips)

    # 6. Precisión media de captura (media de visibility de los 33 landmarks)
    visibilidades = [_extraer_coordenadas(lm)[3] for lm in normalized_landmarks]
    precision_captura = sum(visibilidades) / len(visibilidades) if visibilidades else 1.0

    # 7. Cálculo de IMC y Somatotipo Supervisado (Random Forest)
    estatura_m = estatura_cm / 100.0
    imc = peso_kg / (estatura_m ** 2) if estatura_m > 0 else 0.0
    ratio_extremidades = round(float(0.85 / max(torso_length_m, 0.2)), 2)

    somatotipo, probabilidades, scores_hc = clasificar_somatotipo_rf(
        estatura_cm=estatura_cm,
        peso_kg=peso_kg,
        imc=imc,
        ancho_hombros_m=ancho_hombros_m,
        ancho_cadera_m=ancho_cadera_m,
        v_taper=v_taper,
        torso_length_m=torso_length_m,
        simetria=simetria,
        ratio_extremidades=ratio_extremidades
    )

    return {
        "ancho_hombros_m": float(ancho_hombros_m),
        "ancho_cadera_m": float(ancho_cadera_m),
        "v_taper": float(v_taper),
        "torso_length_m": float(torso_length_m),
        "simetria": float(simetria),
        "angulo_inclinacion_deg": float(angulo_inclinacion_deg),
        "postura": postura,
        "imc": float(imc),
        "somatotipo_estimado": somatotipo,
        "precision_captura": float(precision_captura),
        "probabilidades_somatotipo": probabilidades,
        "scores_heath_carter": scores_hc
    }

