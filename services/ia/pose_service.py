import os
import math
import asyncio
import urllib.request
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Landmark names according to MediaPipe Pose 33 Topology
LANDMARK_NAMES = [
    "NOSE", "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER",
    "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
    "LEFT_EAR", "RIGHT_EAR", "MOUTH_LEFT", "MOUTH_RIGHT",
    "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW",
    "LEFT_WRIST", "RIGHT_WRIST", "LEFT_PINKY", "RIGHT_PINKY",
    "LEFT_INDEX", "RIGHT_INDEX", "LEFT_THUMB", "RIGHT_THUMB",
    "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE",
    "LEFT_ANKLE", "RIGHT_ANKLE", "LEFT_HEEL", "RIGHT_HEEL",
    "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX"
]

class PoseInferenceService:
    """
    Servicio de Visión Artificial para Detección de Postura y Somatotipos
    utilizando Google MediaPipe Pose Landmarker (33 coordenadas 3D).
    
    REGLA ARQUITECTÓNICA 2.1:
    La inferencia sobre tensores de imagen es intensiva en CPU (CPU-bound).
    Para no saturar ni bloquear el Event Loop ASGI transaccional, la ejecución
    síncrona de MediaPipe se delega mediante asyncio.to_thread al pool de hilos.
    """

    def __init__(self):
        self._detector = None
        self._model_path = self._ensure_model_exists()

    def _ensure_model_exists(self) -> str:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(current_dir, "models")
        os.makedirs(models_dir, exist_ok=True)
        model_path = os.path.join(models_dir, "pose_landmarker_lite.task")

        if not os.path.exists(model_path):
            url = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp, open(model_path, "wb") as f:
                f.write(resp.read())

        return model_path

    def _get_detector(self):
        if self._detector is None:
            base_options = python.BaseOptions(model_asset_path=self._model_path)
            options = vision.PoseLandmarkerOptions(
                base_options=base_options,
                output_segmentation_masks=False
            )
            self._detector = vision.PoseLandmarker.create_from_options(options)
        return self._detector

    def _build_inference_result(
        self,
        detection_result,
        estatura_cm: float = None,
        peso_kg: float = None
    ) -> dict:
        # Extraer los 33 puntos clave de la primera pose detectada
        landmarks_raw = detection_result.pose_landmarks[0]
        world_landmarks_raw = (
            detection_result.pose_world_landmarks[0]
            if detection_result.pose_world_landmarks
            else landmarks_raw
        )

        landmarks_out = []
        world_landmarks_out = []
        total_visibility = 0.0

        for idx, lm in enumerate(landmarks_raw):
            name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"LANDMARK_{idx}"
            vis = getattr(lm, "visibility", 1.0)
            if vis is None:
                vis = 1.0
            total_visibility += vis

            landmarks_out.append({
                "id": idx,
                "nombre": name,
                "x": round(float(lm.x), 4),
                "y": round(float(lm.y), 4),
                "z": round(float(lm.z), 4),
                "visibilidad": round(float(vis), 4)
            })

        for idx, wlm in enumerate(world_landmarks_raw):
            name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"LANDMARK_{idx}"
            w_vis = getattr(wlm, "visibility", 1.0)
            if w_vis is None:
                w_vis = 1.0

            world_landmarks_out.append({
                "id": idx,
                "nombre": name,
                "x": round(float(wlm.x), 4),
                "y": round(float(wlm.y), 4),
                "z": round(float(wlm.z), 4),
                "visibilidad": round(float(w_vis), 4)
            })

        avg_precision = total_visibility / len(landmarks_raw)

        # Cálculo determinista antropométrico y somatotipo con biometrics_service
        from .biometrics_service import procesar_biometria_3d

        # Si no se proporcionan estatura y peso, usar valores base antropométricos estándar (175cm / 75kg)
        eff_estatura = float(estatura_cm) if estatura_cm is not None else 175.0
        eff_peso = float(peso_kg) if peso_kg is not None else 75.0

        bio = procesar_biometria_3d(
            world_landmarks=world_landmarks_raw,
            normalized_landmarks=landmarks_raw,
            estatura_cm=eff_estatura,
            peso_kg=eff_peso
        )

        return {
            "status": "success",
            "landmarks_count": len(landmarks_out),
            "precision": round(avg_precision, 4),
            "precision_captura": float(avg_precision),
            "somatotipo_estimado": bio["somatotipo_estimado"],
            "probabilidades_somatotipo": bio.get("probabilidades_somatotipo", {}),
            "scores_heath_carter": bio.get("scores_heath_carter", {}),
            "metricas_biometricas": {
                "v_taper": round(bio["v_taper"], 2),
                "ancho_hombros_m": round(bio["ancho_hombros_m"], 4),
                "ancho_cadera_m": round(bio["ancho_cadera_m"], 4),
                "torso_length_m": round(bio["torso_length_m"], 4),
                "simetria": round(bio["simetria"], 4),
                "postura": bio["postura"],
                "angulo_inclinacion_deg": round(bio["angulo_inclinacion_deg"], 2),
                "imc": round(bio["imc"], 2),
                "relacion_hombro_cadera": round(bio["v_taper"], 2),
                "ancho_hombros_norm": round(bio["ancho_hombros_m"], 3),
                "ancho_cadera_norm": round(bio["ancho_cadera_m"], 3),
            },
            "landmarks": landmarks_out,
            "world_landmarks": world_landmarks_out
        }

    def _detect_pose_sync(self, image_bytes: bytes, estatura_cm: float = None, peso_kg: float = None) -> dict:
        """
        Función síncrona CPU-bound que procesa la imagen y ejecuta MediaPipe Pose.
        Esta función NUNCA debe llamarse directamente en el Event Loop principal.
        """
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            return {
                "status": "error",
                "detail": "No se pudo decodificar el archivo como imagen válida."
            }

        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)

        detector = self._get_detector()
        detection_result = detector.detect(mp_image)

        if not detection_result.pose_landmarks:
            return {
                "status": "warning",
                "message": "No se detectó ninguna figura humana con pose anatómica visible en la imagen.",
                "landmarks_count": 0,
                "precision": 0.0,
                "landmarks": []
            }

        return self._build_inference_result(detection_result, estatura_cm=estatura_cm, peso_kg=peso_kg)

    async def analizar_postura_async(
        self,
        image_bytes: bytes,
        estatura_cm: float = None,
        peso_kg: float = None
    ) -> dict:
        """
        Ejecuta la inferencia CPU-bound de MediaPipe en un hilo de trabajo separado
        mediante asyncio.to_thread para mantener el Event Loop asíncrono libre y responsivo.
        """
        return await asyncio.to_thread(self._detect_pose_sync, image_bytes, estatura_cm, peso_kg)

# Instancia singleton para evitar recargar el grafo tflite en cada solicitud
pose_inference_service = PoseInferenceService()

