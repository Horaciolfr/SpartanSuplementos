"""
Script para entrenar YOLOv8 por 50 Épocas acelerado por GPU (NVIDIA RTX 3050 con CUDA)
sobre el dataset MAESTRO CONSOLIDADO (7,314 imágenes de los 9 datasets).
Spartan Suplementos Bolivia.
"""

import os
import sys
import torch
from ultralytics import YOLO

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_YAML = os.path.join(
    PROJECT_ROOT,
    "services",
    "ia",
    "data",
    "roboflow_dataset",
    "yolo_dataset_master",
    "data.yaml"
)

def entrenar_yolo_gpu(epochs=50, imgsz=640, batch=16):
    print("=" * 65)
    print("INICIANDO ENTRENAMIENTO DEEP LEARNING (YOLOv8) CON ACELERACIÓN GPU")
    print("DATASET: 9 DATASETS CONSOLIDADOS (7,314 IMÁGENES ÚNICAS)")
    print("=" * 65)
    
    cuda_disponible = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_disponible else "CPU"
    device_id = 0 if cuda_disponible else "cpu"
    
    print(f"CUDA Activo:     {cuda_disponible}")
    print(f"GPU Detectada:   {device_name}")
    print(f"Dispositivo:     device={device_id}")
    print(f"Épocas:          {epochs}")
    print(f"Batch Size:      {batch}")
    print(f"Dataset YAML:    {DATASET_YAML}")
    print("=" * 65)

    # Cargar modelo base YOLOv8 nano
    model = YOLO("yolov8n.pt")

    # Iniciar entrenamiento en GPU RTX 3050 sobre el dataset maestro completo
    results = model.train(
        data=DATASET_YAML,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device_id,
        project=os.path.join(PROJECT_ROOT, "services", "ia", "models", "yolo_somatotipos"),
        name=f"run_rtx3050_consolidado_{epochs}ep",
        exist_ok=True,
        verbose=True
    )

    print("\n" + "=" * 65)
    print(f"¡Entrenamiento en GPU ({device_name}) de {epochs} épocas completado con éxito!")
    print(f"Pesos guardados en: {os.path.join(PROJECT_ROOT, 'services', 'ia', 'models', 'yolo_somatotipos', f'run_rtx3050_consolidado_{epochs}ep')}")
    print("=" * 65)
    return results

if __name__ == "__main__":
    epochs = 50
    batch = 16
    for arg in sys.argv:
        if arg.startswith("--epochs="):
            epochs = int(arg.split("=")[1])
        elif arg.startswith("--batch="):
            batch = int(arg.split("=")[1])
    entrenar_yolo_gpu(epochs=epochs, batch=batch)
