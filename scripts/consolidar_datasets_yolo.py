"""
Script de Consolidación Universal de Datasets para YOLOv8.
Spartan Suplementos Bolivia.

Unifica las más de 9,100 imágenes y etiquetas de los 9 datasets en una única
carpeta estructurada para YOLO:
services/ia/data/roboflow_dataset/yolo_dataset_master/
├── data.yaml
├── train/images, train/labels
├── valid/images, valid/labels
└── test/images, test/labels
"""

import os
import glob
import shutil
import yaml

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROBOFLOW_DIR = os.path.join(PROJECT_ROOT, "services", "ia", "data", "roboflow_dataset")
MASTER_DIR = os.path.join(ROBOFLOW_DIR, "yolo_dataset_master")

DATASETS_CONFIG = [
    # (nombre_carpeta, tipo_mapeo)
    ("Proyecto-Somatotipos-1", "directo_3"),
    ("Proyecto-Somatotipos-2", "directo_3"),
    ("Proyecto-Somatotipos-2-jadbj-1", "directo_3"),
    ("body-shape-c1ril-1", "directo_3"),
    ("morfologias-1", "directo_3"),
    ("Male-body-type-classification-2", "male_obb"),
    ("Grasa-corporal-2", "grasa"),
    ("fat_detection-1", "fat"),
    ("fat-people-finder-3", "fat_finder")
]

# Clases canónicas de salida para YOLO:
# 0: ectomorfo
# 1: endomorfo
# 2: mesomorfo

GRASA_TO_CANONICAL = {
    4: 2,  # Muscular -> mesomorfo
    5: 1,  # Overweight -> endomorfo
    6: 2,  # Overweight Muscular -> mesomorfo
    7: 0,  # Skinny -> ectomorfo
    8: 1   # Very overweight -> endomorfo
}

def crear_dataset_master():
    print("=" * 65)
    print("CONSOLIDANDO LOS 9 DATASETS EN UN ÚNICO DATASET MAESTRO YOLOv8")
    print("=" * 65)

    for split in ["train", "valid"]:
        os.makedirs(os.path.join(MASTER_DIR, split, "images"), exist_ok=True)
        os.makedirs(os.path.join(MASTER_DIR, split, "labels"), exist_ok=True)

    copiadas_train = 0
    copiadas_val = 0
    hashes_vistos = set()

    for folder_name, tipo in DATASETS_CONFIG:
        src_base = os.path.join(ROBOFLOW_DIR, folder_name)
        if not os.path.exists(src_base):
            continue

        print(f"-> Procesando: {folder_name} ({tipo})")

        for sub in ["train", "valid", "test"]:
            dest_split = "train" if sub in ("train", "test") else "valid"
            img_dir = os.path.join(src_base, sub, "images")
            lbl_dir = os.path.join(src_base, sub, "labels")

            if not os.path.exists(img_dir):
                continue

            images = glob.glob(os.path.join(img_dir, "*.jpg")) + glob.glob(os.path.join(img_dir, "*.png"))
            for img_path in images:
                base_name = os.path.splitext(os.path.basename(img_path))[0]
                if base_name in hashes_vistos:
                    continue
                hashes_vistos.add(base_name)

                lbl_path = os.path.join(lbl_dir, base_name + ".txt")
                new_lines = []

                if os.path.exists(lbl_path):
                    with open(lbl_path, "r", encoding="utf-8") as f:
                        for linea in f:
                            partes = linea.strip().split()
                            if not partes:
                                continue
                            try:
                                original_class = int(partes[0])
                            except ValueError:
                                continue

                            new_class = None
                            if tipo == "directo_3":
                                if original_class in (0, 1, 2):
                                    new_class = original_class
                            elif tipo == "male_obb":
                                if original_class in (0, 1, 2):
                                    new_class = original_class
                            elif tipo == "grasa":
                                if original_class in GRASA_TO_CANONICAL:
                                    new_class = GRASA_TO_CANONICAL[original_class]
                            elif tipo in ("fat", "fat_finder"):
                                if original_class == 0:  # clase con sobrepeso
                                    new_class = 1  # endomorfo

                            if new_class is not None:
                                new_line = f"{new_class} " + " ".join(partes[1:]) + "\n"
                                new_lines.append(new_line)

                # Si no tiene etiquetas válidas que correspondan a los somatotipos, omitir
                if not new_lines:
                    continue

                # Copiar imagen con enlace simbólico o copia rápida
                dest_img_path = os.path.join(MASTER_DIR, dest_split, "images", os.path.basename(img_path))
                dest_lbl_path = os.path.join(MASTER_DIR, dest_split, "labels", base_name + ".txt")

                try:
                    shutil.copy2(img_path, dest_img_path)
                    with open(dest_lbl_path, "w", encoding="utf-8") as f:
                        f.writelines(new_lines)

                    if dest_split == "train":
                        copiadas_train += 1
                    else:
                        copiadas_val += 1
                except Exception as e:
                    pass

    # Generar data.yaml canónico
    master_yaml = {
        "path": MASTER_DIR.replace("\\", "/"),
        "train": "train/images",
        "val": "valid/images",
        "nc": 3,
        "names": {
            0: "ectomorfo",
            1: "endomorfo",
            2: "mesomorfo"
        }
    }

    yaml_dest = os.path.join(MASTER_DIR, "data.yaml")
    with open(yaml_dest, "w", encoding="utf-8") as f:
        yaml.dump(master_yaml, f, sort_keys=False)

    print("-" * 65)
    print(f"CONSOLIDACIÓN COMPLETADA:")
    print(f"Total imágenes Train: {copiadas_train}")
    print(f"Total imágenes Val:   {copiadas_val}")
    print(f"Total Master:         {copiadas_train + copiadas_val} imágenes")
    print(f"Archivo YAML:         {yaml_dest}")
    print("=" * 65)
    return yaml_dest

if __name__ == "__main__":
    crear_dataset_master()
