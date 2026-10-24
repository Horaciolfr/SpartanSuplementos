import os
from pathlib import Path
from roboflow import Roboflow

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TARGET_DIR = PROJECT_ROOT / "services" / "ia" / "data" / "roboflow_dataset"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

print(f"Iniciando descarga de dataset Roboflow en: {TARGET_DIR}")

# Cambiar directorio actual al destino para que Roboflow descargue allí
os.chdir(str(TARGET_DIR))

rf = Roboflow(api_key="eW2FCKVBcWu130lj6GKr")
project = rf.workspace("borre3").project("proyecto-somatotipos-yxpqc")
version = project.version(2)
dataset = version.download("yolov8")

print(f"Descarga completada exitosamente en: {dataset.location}")
