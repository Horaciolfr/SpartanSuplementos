import os
from roboflow import Roboflow

target_dir = os.path.join("services", "ia", "data", "roboflow_dataset")
os.makedirs(target_dir, exist_ok=True)
os.chdir(target_dir)

api_key = os.getenv("ROBOFLOW_API_KEY", "")
if not api_key:
    raise ValueError("La variable de entorno ROBOFLOW_API_KEY no está configurada.")

rf = Roboflow(api_key=api_key)
project = rf.workspace("borre3").project("proyecto-somatotipos-yxpqc")
version = project.version(1)
dataset = version.download("yolov8")

print(f"Dataset versión 1 descargado con éxito en: {dataset.location}")
