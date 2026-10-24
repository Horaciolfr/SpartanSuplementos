import os
from roboflow import Roboflow

target_dir = os.path.join("services", "ia", "data", "roboflow_dataset")
os.makedirs(target_dir, exist_ok=True)
os.chdir(target_dir)

rf = Roboflow(api_key="eW2FCKVBcWu130lj6GKr")
project = rf.workspace("david-retuerto-neyra").project("grasa-corporal-w95z9")
version = project.version(2)
dataset = version.download("yolov8")

print(f"Dataset grasa corporal descargado con éxito en: {dataset.location}")
