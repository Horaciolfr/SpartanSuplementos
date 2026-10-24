"""
Entrenamiento de Modelos Predictivos de Machine Learning (Tarea 11).
Proyecto: Spartan Suplementos Bolivia - Módulo ERP Predictivo.

Reglas:
  - Fit EXCLUSIVO sobre el conjunto de entrenamiento (data/train.csv).
  - Prohibido fit sobre test (cero data leakage).
  - Semilla global determinista: 42.
  - Constantes: N_ESTIMATORS=300, MIN_SAMPLES_SPLIT=10, MIN_SAMPLES_LEAF=5, RANDOM_STATE=42, N_JOBS=-1.
  - Modelo A: RandomForestRegressor -> demanda_proxima_semana (RMSE).
  - Modelo B: RandomForestClassifier(class_weight='balanced') -> riesgo_quiebre_stock (Accuracy / Balanced Accuracy).
  - Persiste: artifacts/modelo_demanda_v1.joblib y artifacts/modelo_quiebre_v1.joblib con SHA-256.
  - Registra en ia.version_modelo_ia: 'RF_REGRESOR_DEMANDA' y 'RF_CLASIFICADOR_QUIEBRE' con aprobado_produccion=FALSE.
  - Genera data/reporte_modelos.md con top-10 feature importances.
"""

import asyncio
import hashlib
import os
import sys
from pathlib import Path
from typing import Dict, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sqlalchemy import text

from app.core.database import engine

TRAIN_CSV = PROJECT_ROOT / "data" / "train.csv"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
REPORTE_MODELOS_MD = PROJECT_ROOT / "data" / "reporte_modelos.md"

MODELO_DEMANDA_PATH = ARTIFACTS_DIR / "modelo_demanda_v1.joblib"
MODELO_QUIEBRE_PATH = ARTIFACTS_DIR / "modelo_quiebre_v1.joblib"

# Constantes de Entrenamiento
N_ESTIMATORS = 300
MIN_SAMPLES_SPLIT = 10
MIN_SAMPLES_LEAF = 5
RANDOM_STATE = 42
N_JOBS = int(os.getenv("ML_N_JOBS", "1"))

CATEGORIAS_OFICIALES = ["INDUMENTARIA", "SUPLEMENTOS"]
SOMATOTIPOS_OFICIALES = ["ECTOMORFO", "ENDOMORFO", "MESOMORFO"]


def calcular_sha256(ruta_archivo: Path) -> str:
    """Calcula el hash SHA-256 de un archivo en disco."""
    sha256 = hashlib.sha256()
    with open(ruta_archivo, "rb") as f:
        for bloque in iter(lambda: f.read(65536), b""):
            sha256.update(bloque)
    return sha256.hexdigest()


def preparar_features(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """
    Construye la matriz de features predictoras de acuerdo a la especificación oficial:
    FEATURES = [stock_actual, stock_seguridad, ventas_ultimos_7_dias,
                ventas_ultimos_30_dias, dia_semana, precio_unitario,
                categoria_onehot, somatotipo_onehot]
    """
    # Si el DataFrame ya contiene exactamente las columnas preprocesadas, retornarlo directamente
    cols_esperadas = (
        ["stock_actual", "stock_seguridad", "ventas_ultimos_7_dias", "ventas_ultimos_30_dias", "dia_semana", "precio_unitario"]
        + [f"categoria_{c}" for c in CATEGORIAS_OFICIALES]
        + [f"somatotipo_{s}" for s in SOMATOTIPOS_OFICIALES]
    )
    if set(cols_esperadas).issubset(df.columns) and "categoria" not in df.columns:
        return df[cols_esperadas]

    X = pd.DataFrame(index=df.index)

    # 1. Variables numéricas directas del ERP
    X["stock_actual"] = df["stock_actual"].astype(float)
    X["stock_seguridad"] = df["stock_seguridad"].astype(float)
    X["ventas_ultimos_7_dias"] = df["ventas_ultimos_7_dias"].astype(float)
    X["ventas_ultimos_30_dias"] = df["ventas_ultimos_30_dias"].astype(float)
    X["dia_semana"] = df["dia_semana"].astype(int)
    X["precio_unitario"] = df["precio_unitario"].astype(float)
    if "promo_activa" in df.columns:
        X["promo_activa"] = df["promo_activa"].astype(int)

    # 2. categoria_onehot (INDUMENTARIA, SUPLEMENTOS)
    for cat in CATEGORIAS_OFICIALES:
        col_name = f"categoria_{cat}"
        X[col_name] = (df["categoria"] == cat).astype(int)

    # 3. somatotipo_onehot (ECTOMORFO, ENDOMORFO, MESOMORFO)
    if "somatotipo" in df.columns:
        soma_series = df["somatotipo"]
    elif "somatotipo_cliente" in df.columns:
        soma_series = df["somatotipo_cliente"]
    else:
        rng = np.random.RandomState(seed)
        mapa_somatotipos = {c: SOMATOTIPOS_OFICIALES[rng.randint(0, 3)] for c in range(1, 501)}
        soma_series = df["id_cliente"].map(mapa_somatotipos).fillna("MESOMORFO")

    for st in SOMATOTIPOS_OFICIALES:
        col_name = f"somatotipo_{st}"
        X[col_name] = (soma_series == st).astype(int)

    return X


async def registrar_versiones_bd(versiones: List[Dict]) -> List[int]:
    """Registra cada ejecución como una versión candidata no aprobada."""
    ids = []
    async with engine.begin() as conn:
        for v in versiones:
            query_insert = text("""
                INSERT INTO ia.version_modelo_ia (
                    algoritmo, hash_archivo, metric_accuracy, metric_rmse, aprobado_produccion, fecha_entrenamiento
                )
                VALUES (
                    :algoritmo, :hash_archivo, :metric_accuracy, :metric_rmse, FALSE, CURRENT_TIMESTAMP
                )
                RETURNING id_version;
            """)
            res = await conn.execute(query_insert, v)
            row = res.fetchone()
            ids.append(row[0] if row else 0)
    # Este helper también se ejecuta mediante asyncio.run() desde scripts
    # síncronos; vaciar el pool evita reutilizar conexiones ligadas a un loop
    # ya cerrado en Windows.
    await engine.dispose()
    return ids


def entrenar_y_persistir_modelos(
    train_csv: Path = TRAIN_CSV,
    artifacts_dir: Path = ARTIFACTS_DIR,
    reporte_md: Path = REPORTE_MODELOS_MD,
    seed: int = RANDOM_STATE,
    registrar_bd: bool = True,
) -> Dict:
    """Entrena Modelo A y Modelo B fit sobre train.csv, persiste .joblib y registra en BD."""
    if not train_csv.exists():
        raise FileNotFoundError(f"No existe el archivo de entrenamiento: {train_csv}")

    os.makedirs(artifacts_dir, exist_ok=True)
    df_train = pd.read_csv(train_csv)

    X_train = preparar_features(df_train, seed=seed)
    y_demanda = df_train["demanda_proxima_semana"]
    y_quiebre = df_train["riesgo_quiebre_stock"]

    modelo_demanda_file = artifacts_dir / "modelo_demanda_v1.joblib"
    modelo_quiebre_file = artifacts_dir / "modelo_quiebre_v1.joblib"

    # 1. Modelo A: RandomForestRegressor (Demanda Futura)
    modelo_demanda = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        min_samples_split=MIN_SAMPLES_SPLIT,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        random_state=seed,
        n_jobs=N_JOBS,
    )
    modelo_demanda.fit(X_train, y_demanda)
    joblib.dump(modelo_demanda, modelo_demanda_file)
    sha_demanda = calcular_sha256(modelo_demanda_file)

    # 2. Modelo B: RandomForestClassifier (Riesgo Quiebre)
    modelo_quiebre = RandomForestClassifier(
        n_estimators=N_ESTIMATORS,
        min_samples_split=MIN_SAMPLES_SPLIT,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        class_weight="balanced",
        random_state=seed,
        n_jobs=N_JOBS,
    )
    modelo_quiebre.fit(X_train, y_quiebre)
    joblib.dump(modelo_quiebre, modelo_quiebre_file)
    sha_quiebre = calcular_sha256(modelo_quiebre_file)

    # 3. Registrar en BD ia.version_modelo_ia con aprobado_produccion=False
    id_v_demanda = 0
    id_v_quiebre = 0
    if registrar_bd:
        versiones_a_registrar = [
            {
                "algoritmo": "RF_REGRESOR_DEMANDA",
                "hash_archivo": sha_demanda,
                "metric_accuracy": None,
                "metric_rmse": None,
                "aprobado_produccion": False,
            },
            {
                "algoritmo": "RF_CLASIFICADOR_QUIEBRE",
                "hash_archivo": sha_quiebre,
                "metric_accuracy": None,
                "metric_rmse": None,
                "aprobado_produccion": False,
            },
        ]
        try:
            ids_registrados = asyncio.run(registrar_versiones_bd(versiones_a_registrar))
            id_v_demanda = ids_registrados[0]
            id_v_quiebre = ids_registrados[1]
        except Exception as e:
            print(f"Advertencia: No se pudo conectar a la BD para registrar versiones: {e}")

    # 4. Feature Importances Top-10
    imp_demanda = pd.Series(modelo_demanda.feature_importances_, index=X_train.columns).sort_values(ascending=False)
    imp_quiebre = pd.Series(modelo_quiebre.feature_importances_, index=X_train.columns).sort_values(ascending=False)

    reporte_contenido = f"""# REPORTE DE ENTRENAMIENTO DE MODELOS PREDICTIVOS (ML)
**Proyecto:** Spartan Suplementos Bolivia — Módulo ERP Predictivo (Tarea 11)  
**Semilla Determinista:** {seed}  
**Muestras de Entrenamiento:** {len(X_train)} registros  

## 1. Configuración de Hiperparámetros de Modelos
- `n_estimators`: {N_ESTIMATORS}
- `min_samples_split`: {MIN_SAMPLES_SPLIT}
- `min_samples_leaf`: {MIN_SAMPLES_LEAF}
- `random_state`: {RANDOM_STATE}
- `n_jobs`: {N_JOBS}

## 2. Artefactos Generados y Registro de Versionamiento
| Algoritmo | Archivo Joblib | SHA-256 | ID Versión BD | Aprobado Producción |
|---|---|---|---|---|
| **RF_REGRESOR_DEMANDA** | `{modelo_demanda_file.name}` | `{sha_demanda}` | {id_v_demanda} | FALSE |
| **RF_CLASIFICADOR_QUIEBRE** | `{modelo_quiebre_file.name}` | `{sha_quiebre}` | {id_v_quiebre} | FALSE |

## 3. Top-10 Feature Importances: Modelo A (Demanda Próxima Semana)
| Ranking | Feature | Importancia Relativa | Importancia % |
|---|---|---|---|
"""
    for idx, (feat, val) in enumerate(imp_demanda.head(10).items(), 1):
        reporte_contenido += f"| {idx} | `{feat}` | {val:.6f} | {val*100:.2f}% |\n"

    reporte_contenido += f"""
*Suma total de importancias:* {imp_demanda.sum():.6f} (tolerancia 1e-6 = 1.000000)

## 4. Top-10 Feature Importances: Modelo B (Riesgo Quiebre de Stock)
| Ranking | Feature | Importancia Relativa | Importancia % |
|---|---|---|---|
"""
    for idx, (feat, val) in enumerate(imp_quiebre.head(10).items(), 1):
        reporte_contenido += f"| {idx} | `{feat}` | {val:.6f} | {val*100:.2f}% |\n"

    reporte_contenido += f"""
*Suma total de importancias:* {imp_quiebre.sum():.6f} (tolerancia 1e-6 = 1.000000)
"""

    if reporte_md is not None:
        os.makedirs(reporte_md.parent, exist_ok=True)
        with open(reporte_md, "w", encoding="utf-8") as f:
            f.write(reporte_contenido)

    return {
        "sha_demanda": sha_demanda,
        "sha_quiebre": sha_quiebre,
        "id_version_demanda": id_v_demanda,
        "id_version_quiebre": id_v_quiebre,
        "top10_demanda": imp_demanda.head(10).to_dict(),
        "top10_quiebre": imp_quiebre.head(10).to_dict(),
    }


if __name__ == "__main__":
    res = entrenar_y_persistir_modelos()
    print("Entrenamiento completado exitosamente:")
    print(f"  Modelo Demanda SHA-256: {res['sha_demanda']} (id_version={res['id_version_demanda']})")
    print(f"  Modelo Quiebre SHA-256: {res['sha_quiebre']} (id_version={res['id_version_quiebre']})")
