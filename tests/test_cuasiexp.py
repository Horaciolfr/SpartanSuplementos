"""
Suite de Pruebas Automatizadas para el Experimento Cuasiexperimental (Tarea 12).
Proyecto: Spartan Suplementos Bolivia - Validación Pretest-Postest.

Verifica:
  - Reducción porcentual de quiebres es estrictamente positiva (% reducción > 0).
  - El Intervalo de Confianza al 95% obtenido por bootstrap semanal NO cruza cero (IC_inf > 0).
  - Si el IC cruzara cero, el experimento no sería estadísticamente concluyente y la prueba fallaría.
"""

from pathlib import Path
import pandas as pd
import pytest

from scripts.experimento_cuasiexperimental import (
    RESULTADOS_CSV,
    ejecutar_experimento_cuasiexperimental,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def resultados_experimento():
    """Asegura que el experimento cuasiexperimental se haya ejecutado."""
    if not RESULTADOS_CSV.exists():
        ejecutar_experimento_cuasiexperimental()

    assert RESULTADOS_CSV.exists(), f"Falta archivo de resultados {RESULTADOS_CSV}"
    df_res = pd.read_csv(RESULTADOS_CSV)
    assert len(df_res) == 1, "El CSV de resultados debe tener exactamente una fila de resumen"
    return df_res.iloc[0].to_dict()


def test_a_reduccion_porcentual_estrictamente_positiva(resultados_experimento):
    """Verifica que la reducción porcentual de quiebres sea estrictamente mayor a 0%."""
    reduccion_pct = resultados_experimento["reduccion_relativa_pct"]
    assert reduccion_pct > 0.0, f"La reducción de quiebres ({reduccion_pct}%) no es estrictamente positiva"


def test_b_intervalo_confianza_95_no_cruza_cero(resultados_experimento):
    """
    Verifica que el IC 95% no cruza cero:
    El límite inferior del IC debe ser estrictamente mayor a 0% para confirmar significancia estadística.
    """
    ic_inf = resultados_experimento["ic_95_inferior_pct"]
    ic_sup = resultados_experimento["ic_95_superior_pct"]

    assert ic_inf > 0.0, (
        f"EXPERIMENTO NO CONCLUYENTE: El límite inferior del IC 95% ({ic_inf}%) es <= 0%. "
        "El experimento cruza cero y no demuestra efectividad concluyente."
    )
    assert ic_sup >= ic_inf, f"Inconsistencia en IC 95%: inferior ({ic_inf}%) > superior ({ic_sup}%)"


def test_c_tasas_pretest_y_postest_consistentes(resultados_experimento):
    """Verifica la consistencia interna entre pretest y postest."""
    tasa_pre = resultados_experimento["tasa_pretest"]
    tasa_post = resultados_experimento["tasa_postest"]

    assert 0.0 <= tasa_pre <= 1.0, f"Tasa pretest inválida: {tasa_pre}"
    assert 0.0 <= tasa_post <= 1.0, f"Tasa postest inválida: {tasa_post}"
    assert tasa_post < tasa_pre, f"La tasa postest ({tasa_post}) no es menor que la pretest ({tasa_pre})"


def test_d_holdout_contiene_tres_shocks_no_anticipados_verificables():
    """El holdout DGP v3 contiene al menos tres eventos sin señal promocional."""
    test_csv = PROJECT_ROOT / "data" / "test.csv"
    df_test = pd.read_csv(test_csv)

    columnas = {
        "es_shock_no_anticipado",
        "id_evento_shock",
        "es_cambio_regimen",
        "promo_activa",
    }
    assert columnas.issubset(df_test.columns), columnas - set(df_test.columns)

    shocks = df_test[df_test["es_shock_no_anticipado"] == 1]
    assert shocks["id_evento_shock"].nunique() >= 3
    assert (shocks["promo_activa"] == 0).all()
    assert int(df_test["es_cambio_regimen"].sum()) > 0
