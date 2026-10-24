"""
Suite de Pruebas Automatizadas para la Partición de Datos (Tarea 10).
Proyecto: Spartan Suplementos Bolivia - Modelado Predictivo ERP.

Verifica:
  a) max(fecha train) < min(fecha test): cero solapamiento (ausencia de fuga temporal).
  b) Reproducibilidad: dos ejecuciones consecutivas producen SHA-256 idénticos.
  c) Test contiene ambas clases de riesgo_quiebre_stock con n >= 30 cada una.
  d) Cero valores NULL en features y targets de train y test.
"""

from pathlib import Path
import hashlib
import pandas as pd
import pytest

from scripts.split_dataset import ejecutar_split_dataset, calcular_sha256

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
TRAIN_CSV = DATA_DIR / "train.csv"
TEST_CSV = DATA_DIR / "test.csv"
REPORTE_MD = DATA_DIR / "reporte_split.md"


@pytest.fixture(scope="session")
def split_datasets():
    """Asegura que los archivos train y test existan y los carga en memoria."""
    if not TRAIN_CSV.exists() or not TEST_CSV.exists() or not REPORTE_MD.exists():
        ejecutar_split_dataset()

    assert TRAIN_CSV.exists(), f"Falta el archivo {TRAIN_CSV}"
    assert TEST_CSV.exists(), f"Falta el archivo {TEST_CSV}"
    assert REPORTE_MD.exists(), f"Falta el archivo {REPORTE_MD}"

    df_train = pd.read_csv(TRAIN_CSV)
    df_test = pd.read_csv(TEST_CSV)
    return {
        "train": df_train,
        "test": df_test,
    }


def test_a_cero_solapamiento_temporal(split_datasets):
    """
    a) max(fecha train) < min(fecha test): cero solapamiento temporal.
    Garantiza causalidad cronológica estricta y previene data leakage.
    """
    df_train = split_datasets["train"]
    df_test = split_datasets["test"]

    max_fecha_train = pd.to_datetime(df_train["fecha"]).max()
    min_fecha_test = pd.to_datetime(df_test["fecha"]).min()

    assert max_fecha_train < min_fecha_test, (
        f"Fuga temporal detectada: max(train)={max_fecha_train} no es estrictamente menor a min(test)={min_fecha_test}"
    )
    # Verificación de meses
    meses_train = set(pd.to_datetime(df_train["fecha"]).dt.month.unique())
    meses_test = set(pd.to_datetime(df_test["fecha"]).dt.month.unique())

    assert meses_train.issubset(set(range(1, 11))), f"Meses inválidos en train: {meses_train}"
    assert meses_test.issubset({11, 12}), f"Meses inválidos en test: {meses_test}"
    assert len(meses_train.intersection(meses_test)) == 0, "Hay meses solapados entre train y test"


def test_b_reproducibilidad_sha256(tmp_path):
    """
    b) Reproducibilidad determinista: dos ejecuciones consecutivas generan
    exactamente los mismos hashes SHA-256 byte a byte.
    """
    tmp_train_1 = tmp_path / "train_1.csv"
    tmp_test_1 = tmp_path / "test_1.csv"
    tmp_rep_1 = tmp_path / "reporte_1.md"

    tmp_train_2 = tmp_path / "train_2.csv"
    tmp_test_2 = tmp_path / "test_2.csv"
    tmp_rep_2 = tmp_path / "reporte_2.md"

    ejecutar_split_dataset(train_csv=tmp_train_1, test_csv=tmp_test_1, reporte_md=tmp_rep_1, seed=42)
    ejecutar_split_dataset(train_csv=tmp_train_2, test_csv=tmp_test_2, reporte_md=tmp_rep_2, seed=42)

    hash_train_1 = calcular_sha256(tmp_train_1)
    hash_train_2 = calcular_sha256(tmp_train_2)
    hash_test_1 = calcular_sha256(tmp_test_1)
    hash_test_2 = calcular_sha256(tmp_test_2)

    assert hash_train_1 == hash_train_2, f"Discrepancia en hash SHA-256 de train: {hash_train_1} != {hash_train_2}"
    assert hash_test_1 == hash_test_2, f"Discrepancia en hash SHA-256 de test: {hash_test_1} != {hash_test_2}"


def test_c_representatividad_clases_test(split_datasets):
    """
    c) Test contiene ambas clases de riesgo_quiebre_stock con n >= 30 cada una.
    Garantiza suficiente potencia estadística para evaluación de clasificadores.
    """
    df_test = split_datasets["test"]
    assert "riesgo_quiebre_stock" in df_test.columns, "Columna objetivo riesgo_quiebre_stock no encontrada en test"

    conteos = df_test["riesgo_quiebre_stock"].value_counts()
    assert 0 in conteos.index, "Clase 0 ausente en test"
    assert 1 in conteos.index, "Clase 1 ausente en test"

    assert conteos[0] >= 30, f"Clase 0 tiene {conteos[0]} muestras (< 30) en test"
    assert conteos[1] >= 30, f"Clase 1 tiene {conteos[1]} muestras (< 30) en test"


def test_d_cero_nulos_features_y_targets(split_datasets):
    """
    d) Cero valores NULL en features y variables objetivo de train y test.
    """
    df_train = split_datasets["train"]
    df_test = split_datasets["test"]

    features_criticos = [
        "stock_actual",
        "stock_seguridad",
        "ventas_ultimos_7_dias",
        "ventas_ultimos_30_dias",
        "dia_semana",
        "precio_unitario",
        "categoria",
        "demanda_proxima_semana",
        "riesgo_quiebre_stock",
    ]

    for col in features_criticos:
        assert col in df_train.columns, f"Columna '{col}' ausente en train"
        assert col in df_test.columns, f"Columna '{col}' ausente en test"

        nulos_train = df_train[col].isnull().sum()
        nulos_test = df_test[col].isnull().sum()

        assert nulos_train == 0, f"Columna '{col}' tiene {nulos_train} nulos en train"
        assert nulos_test == 0, f"Columna '{col}' tiene {nulos_test} nulos en test"
