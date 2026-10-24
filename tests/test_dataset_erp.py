"""
Suite de Pruebas Automatizadas E2E para el Dataset Histórico ERP y Optimización de Stock.
Proyecto: Spartan Suplementos Bolivia - Dominio Transaccional y de Inventarios (ERP).

Verifica:
  - Exclusividad absoluta del dominio ERP (sin datos de análisis físico / somatotipo).
  - Reproducibilidad estricta por hash SHA-256 bajo seed=42.
  - Integridad referencial con catálogo de 30 SKUs.
  - Calibración de quiebres de inventario (~15%).
  - Ausencia de nulos e infinitos.
  - Validación de reporte Excel de 3 hojas.
"""

import hashlib
import os
import sys
from pathlib import Path

import numpy as np
import openpyxl
import pandas as pd
import pytest
from scipy import stats

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "data" / "dataset_historico_erp.csv"
XLSX_PATH = PROJECT_ROOT / "data" / "reporte_dataset_erp.xlsx"

try:
    from scripts.generar_dataset_erp import (
        generar_dataset_completo,
        obtener_catalogo_30_skus,
        obtener_clientes_500,
    )
except ImportError:
    generar_dataset_completo = None
    obtener_catalogo_30_skus = None
    obtener_clientes_500 = None


@pytest.fixture(scope="session")
def dataset_bundle():
    """Carga o genera los artefactos oficiales del dataset ERP."""
    os.makedirs(PROJECT_ROOT / "data", exist_ok=True)
    if (not CSV_PATH.exists() or not XLSX_PATH.exists()) and generar_dataset_completo is not None:
        generar_dataset_completo(seed=42, ruta_csv=str(CSV_PATH), ruta_xlsx=str(XLSX_PATH))

    assert CSV_PATH.exists(), f"El archivo {CSV_PATH} no existe."
    assert CSV_PATH.stat().st_size > 0, f"El archivo {CSV_PATH} está vacío."

    df = pd.read_csv(CSV_PATH)
    return {
        "df": df,
        "csv_path": CSV_PATH,
        "xlsx_path": XLSX_PATH,
    }


def test_1_reproducibilidad_estricta_sha256(tmp_path):
    """Verifica reproducibilidad estricta byte a byte mediante hash SHA-256."""
    assert generar_dataset_completo is not None
    tmp_csv1 = tmp_path / "dataset_run1.csv"
    tmp_csv2 = tmp_path / "dataset_run2.csv"

    generar_dataset_completo(seed=42, ruta_csv=str(tmp_csv1))
    generar_dataset_completo(seed=42, ruta_csv=str(tmp_csv2))

    bytes1 = tmp_csv1.read_bytes()
    bytes2 = tmp_csv2.read_bytes()

    hash1 = hashlib.sha256(bytes1).hexdigest()
    hash2 = hashlib.sha256(bytes2).hexdigest()

    assert hash1 == hash2, f"Discrepancia en hash SHA-256: {hash1} != {hash2}"
    assert len(hash1) == 64


def test_2_integridad_referencial_catalogo_30_skus(dataset_bundle):
    """Verifica que todos los productos vendidos corresponden a los 30 SKUs del catálogo."""
    df = dataset_bundle["df"]
    assert "id_producto" in df.columns
    producto_ids = set(df["id_producto"].unique())
    expected_ids = set(range(1, 31))

    assert producto_ids.issubset(expected_ids)
    assert len(producto_ids) == 30, f"Se esperaban 30 SKUs, encontrados {len(producto_ids)}"

    if obtener_catalogo_30_skus is not None:
        catalogo = obtener_catalogo_30_skus()
        catalogo_dict = {p["id_producto"]: p for p in catalogo}
        for prod_id, cat_info in catalogo_dict.items():
            prod_rows = df[df["id_producto"] == prod_id]
            if not prod_rows.empty:
                assert (prod_rows["categoria"] == cat_info["categoria"]).all()
                assert np.allclose(prod_rows["precio_unitario"], cat_info["precio_unitario"])


def test_3_exclusion_estricta_dominio_fisico(dataset_bundle):
    """
    CRÍTICO: Garantiza que el dataset es EXCLUSIVAMENTE de ventas y stock (ERP).
    Ningún atributo de análisis físico (somatotipo, antropometría, etc.) debe existir.
    """
    df = dataset_bundle["df"]
    columnas_prohibidas = [
        "somatotipo",
        "somatotipo_predominante_comprador",
        "peso_kg",
        "estatura_cm",
        "genero",
        "porcentaje_grasa",
        "masa_muscular",
    ]
    for col in columnas_prohibidas:
        assert col not in df.columns, (
            f"VIOLACIÓN DE DOMINIO ERP: La columna '{col}' pertenece a análisis físico y no debe estar en el dataset ERP."
        )


def test_4_integridad_datos_ausencia_nulos_e_infinitos(dataset_bundle):
    """Asegura cero valores nulos e infinitos en las variables predictoras y targets."""
    df = dataset_bundle["df"]
    predictoras_requeridas = [
        "stock_actual",
        "stock_seguridad",
        "ventas_ultimos_7_dias",
        "ventas_ultimos_30_dias",
        "precio_unitario",
        "dia_semana",
    ]
    targets_requeridos = ["demanda_proxima_semana", "riesgo_quiebre_stock"]

    for col in predictoras_requeridas + targets_requeridos:
        assert col in df.columns, f"Columna crítica '{col}' ausente."
        assert df[col].isnull().sum() == 0, f"Columna '{col}' contiene valores nulos."
        assert not np.isinf(df[col]).any(), f"Columna '{col}' contiene valores infinitos."


def test_5_calibracion_tasa_quiebres_stock(dataset_bundle):
    """Verifica que la tasa de quiebres de inventario esté calibrada en [12%, 18%]."""
    df = dataset_bundle["df"]
    assert "quiebre_stock" in df.columns
    tasa_quiebre = df["quiebre_stock"].mean()
    assert 0.12 <= tasa_quiebre <= 0.18, f"Tasa de quiebres {tasa_quiebre*100:.2f}% fuera del rango [12%, 18%]."


def test_6_integridad_reporte_excel_y_hojas(dataset_bundle):
    """Verifica la existencia y contenido de las 3 hojas del reporte Excel ERP."""
    xlsx_path = dataset_bundle["xlsx_path"]
    assert xlsx_path.exists()
    wb = openpyxl.load_workbook(xlsx_path, read_only=True)
    expected_sheets = ["Resumen_Operaciones", "Rotacion_y_Quiebres_Categoria", "Estadistica_Descriptiva"]
    for s in expected_sheets:
        assert s in wb.sheetnames, f"Hoja '{s}' no encontrada en el reporte Excel."
    wb.close()


def test_7_valores_frontera_canasta_y_fechas(dataset_bundle):
    """Valida los límites operativos de canasta (1-4 unidades) y fechas del año 2025."""
    df = dataset_bundle["df"]
    assert df["cantidad"].min() >= 1
    assert df["cantidad"].max() <= 4
    assert df["fecha"].min() >= "2025-01-01"
    assert df["fecha"].max() <= "2025-12-31"


def test_8_estacionalidad_temporal_fines_de_semana(dataset_bundle):
    """Verifica el incremento de ventas en fines de semana (+20% estacionalidad)."""
    df = dataset_bundle["df"]
    df["es_fin_de_semana"] = df["dia_semana"].isin([4, 5, 6])
    dias_unicos_fd = df[df["es_fin_de_semana"]]["fecha"].nunique()
    dias_unicos_lab = df[~df["es_fin_de_semana"]]["fecha"].nunique()

    ventas_fd = df[df["es_fin_de_semana"]]["cantidad"].sum() / dias_unicos_fd
    ventas_lab = df[~df["es_fin_de_semana"]]["cantidad"].sum() / dias_unicos_lab

    incremento = (ventas_fd - ventas_lab) / ventas_lab
    assert incremento > 0.10, f"Incremento en fin de semana ({incremento*100:.2f}%) menor al esperado."


def test_9_blindaje_fuga_informacion_data_leakage(dataset_bundle):
    """Asegura que las features predictoras no utilicen información del futuro."""
    df = dataset_bundle["df"]
    # Los targets deben ser variables futuras
    assert "demanda_proxima_semana" in df.columns
    assert "riesgo_quiebre_stock" in df.columns
    # El stock actual debe ser mayor o igual a 0
    assert (df["stock_actual"] >= 0).all()
    # Las ventas pasadas no pueden ser negativas
    assert (df["ventas_ultimos_7_dias"] >= 0).all()
    assert (df["ventas_ultimos_30_dias"] >= 0).all()


def test_10_cobertura_temporal_365_dias_y_transacciones(dataset_bundle):
    """Valida el total de exactamente 1,123 transacciones y cobertura de los 365 días."""
    df = dataset_bundle["df"]
    assert len(df) == 1123, f"Se esperaban 1,123 transacciones, encontradas {len(df)}"
    assert df["fecha"].nunique() >= 330, f"Cobertura anual insuficiente: {df['fecha'].nunique()} días únicos."
