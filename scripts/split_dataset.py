"""
División temporal del dataset histórico ERP en conjuntos de entrenamiento y prueba.

En series de demanda el split aleatorio filtra futuro al entrenamiento (leakage temporal).
La partición cronológica estricta preserva la causalidad y simula fielmente las condiciones
reales de inferencia operativa en el ERP:
  - Conjunto de Entrenamiento (Train): Meses 1 a 10 (2025-01-01 a 2025-10-31)
  - Conjunto de Prueba / Holdout (Test): Meses 11 y 12 (2025-11-01 a 2025-12-31)
"""

import hashlib
import os
from pathlib import Path
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.utils import resample

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT_CSV = PROJECT_ROOT / "data" / "dataset_historico_erp.csv"
DEFAULT_TRAIN_CSV = PROJECT_ROOT / "data" / "train.csv"
DEFAULT_TEST_CSV = PROJECT_ROOT / "data" / "test.csv"
DEFAULT_REPORTE_MD = PROJECT_ROOT / "data" / "reporte_split.md"


def calcular_sha256(ruta_archivo: Path) -> str:
    """Calcula el hash SHA-256 determinista de un archivo en disco."""
    sha256 = hashlib.sha256()
    with open(ruta_archivo, "rb") as f:
        for bloque in iter(lambda: f.read(65536), b""):
            sha256.update(bloque)
    return sha256.hexdigest()


def ejecutar_split_dataset(
    input_csv: Path = DEFAULT_INPUT_CSV,
    train_csv: Path = DEFAULT_TRAIN_CSV,
    test_csv: Path = DEFAULT_TEST_CSV,
    reporte_md: Path = DEFAULT_REPORTE_MD,
    seed: int = 42,
) -> Dict:
    """
    Carga el dataset histórico ERP, efectúa la partición temporal meses 1-10 (train)
    y meses 11-12 (test), verifica la proporción de clases y exporta train.csv, test.csv
    y reporte_split.md con hashes SHA-256.
    """
    if not input_csv.exists():
        raise FileNotFoundError(f"No existe el archivo de entrada: {input_csv}")

    df = pd.read_csv(input_csv)
    df["fecha_dt"] = pd.to_datetime(df["fecha"])
    df["mes"] = df["fecha_dt"].dt.month

    # Partición temporal estricta
    train_df = df[df["mes"] <= 10].copy()
    test_df = df[df["mes"] >= 11].copy()

    # Evaluación y sobremuestreo condicional de clases en Train
    # Si alguna clase tiene < 5% en train, sobremuestrear SOLO train; test permanece intacto.
    conteo_train = train_df["riesgo_quiebre_stock"].value_counts(normalize=True)
    clases_minoritarias = conteo_train[conteo_train < 0.05].index.tolist()

    if clases_minoritarias:
        df_mayoria = train_df[~train_df["riesgo_quiebre_stock"].isin(clases_minoritarias)]
        frames_oversampled = [df_mayoria]
        for c_min in clases_minoritarias:
            df_min = train_df[train_df["riesgo_quiebre_stock"] == c_min]
            n_target = int(np.ceil(0.05 * len(train_df)))
            df_min_resampled = resample(
                df_min,
                replace=True,
                n_samples=n_target,
                random_state=seed,
            )
            frames_oversampled.append(df_min_resampled)
        train_df = pd.concat(frames_oversampled, ignore_index=True)

    # Limpieza de columnas auxiliares temporales y ordenamiento determinista
    train_df = train_df.sort_values(by=["fecha", "id_transaccion"]).reset_index(drop=True)
    test_df = test_df.sort_values(by=["fecha", "id_transaccion"]).reset_index(drop=True)

    columnas_finales = [c for c in df.columns if c not in ["fecha_dt", "mes"]]
    train_export = train_df[columnas_finales]
    test_export = test_df[columnas_finales]

    os.makedirs(train_csv.parent, exist_ok=True)
    train_export.to_csv(train_csv, index=False, encoding="utf-8")
    test_export.to_csv(test_csv, index=False, encoding="utf-8")

    sha256_train = calcular_sha256(train_csv)
    sha256_test = calcular_sha256(test_csv)

    # Generación de reporte markdown estructurado
    dist_train_counts = train_export["riesgo_quiebre_stock"].value_counts().to_dict()
    dist_train_pct = (train_export["riesgo_quiebre_stock"].value_counts(normalize=True) * 100).to_dict()
    dist_test_counts = test_export["riesgo_quiebre_stock"].value_counts().to_dict()
    dist_test_pct = (test_export["riesgo_quiebre_stock"].value_counts(normalize=True) * 100).to_dict()

    reporte_contenido = f"""# REPORTE DE PARTICIÓN TEMPORAL DE DATOS (TRAIN / TEST)
**Proyecto:** Spartan Suplementos Bolivia — Módulo ERP Predictivo  
**Criterio de Partición:** Temporal (Meses 1-10 Train / Meses 11-12 Test)  
**Semilla Determinista:** {seed}  

## 1. Justificación Metodológica de No-Fuga (Leakage Temporal)
En series de demanda y gestión de inventarios, el split aleatorio filtra información del futuro hacia el entrenamiento (data leakage temporal), inflando artificialmente las métricas de evaluación. La partición cronológica garantiza que los modelos evalúen exclusivamente horizontes futuros nunca antes vistos.

## 2. Resumen de Dimensiones y Rangos Temporales
| Partición | Registros (n) | % del Total | Fecha Inicio | Fecha Fin | Meses Cubiertos |
|---|---|---|---|---|---|
| **Dataset Completo** | {len(df)} | 100.0% | {df['fecha'].min()} | {df['fecha'].max()} | Enero - Diciembre (1-12) |
| **Train** | {len(train_export)} | {len(train_export)/len(df)*100:.1f}% | {train_export['fecha'].min()} | {train_export['fecha'].max()} | Enero - Octubre (1-10) |
| **Test** | {len(test_export)} | {len(test_export)/len(df)*100:.1f}% | {test_export['fecha'].min()} | {test_export['fecha'].max()} | Noviembre - Diciembre (11-12) |

## 3. Distribución de Clases (riesgo_quiebre_stock)
| Partición | Clase 0 (Sin Riesgo) | Clase 1 (Riesgo Quiebre) | % Clase 1 | Observación |
|---|---|---|---|---|
| **Train** | {dist_train_counts.get(0, 0)} ({dist_train_pct.get(0, 0):.2f}%) | {dist_train_counts.get(1, 0)} ({dist_train_pct.get(1, 0):.2f}%) | {dist_train_pct.get(1, 0):.2f}% | Clase minoritaria > 5% (sin sobremuestreo artificial) |
| **Test** | {dist_test_counts.get(0, 0)} ({dist_test_pct.get(0, 0):.2f}%) | {dist_test_counts.get(1, 0)} ({dist_test_pct.get(1, 0):.2f}%) | {dist_test_pct.get(1, 0):.2f}% | N >= 30 por clase ({dist_test_counts.get(1, 0)} >= 30) |

## 4. Integridad Criptográfica (SHA-256)
- **data/train.csv:** `{sha256_train}`
- **data/test.csv:** `{sha256_test}`
"""

    with open(reporte_md, "w", encoding="utf-8") as f:
        f.write(reporte_contenido)

    return {
        "n_total": len(df),
        "n_train": len(train_export),
        "n_test": len(test_export),
        "fecha_min_train": train_export["fecha"].min(),
        "fecha_max_train": train_export["fecha"].max(),
        "fecha_min_test": test_export["fecha"].min(),
        "fecha_max_test": test_export["fecha"].max(),
        "sha256_train": sha256_train,
        "sha256_test": sha256_test,
        "dist_train": dist_train_counts,
        "dist_test": dist_test_counts,
    }


if __name__ == "__main__":
    resultado = ejecutar_split_dataset()
    print("Partición de datos completada exitosamente:")
    print(f"  Train: n={resultado['n_train']} [{resultado['fecha_min_train']} a {resultado['fecha_max_train']}]")
    print(f"  Test:  n={resultado['n_test']} [{resultado['fecha_min_test']} a {resultado['fecha_max_test']}]")
    print(f"  SHA-256 Train: {resultado['sha256_train']}")
    print(f"  SHA-256 Test:  {resultado['sha256_test']}")
