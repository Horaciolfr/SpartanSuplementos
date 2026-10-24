import os
from roboflow import Roboflow

target_dir = os.path.join("services", "ia", "data", "roboflow_dataset")
os.makedirs(target_dir, exist_ok=True)
os.chdir(target_dir)

api_key = os.getenv("ROBOFLOW_API_KEY", "")
if not api_key:
    raise ValueError("La variable de entorno ROBOFLOW_API_KEY no está configurada.")

rf = Roboflow(api_key=api_key)
project = rf.workspace("david-retuerto-neyra").project("grasa-corporal-w95z9")
version = project.version(2)
dataset = version.download("yolov8")

print(f"Dataset grasa corporal descargado con éxito en: {dataset.location}")
