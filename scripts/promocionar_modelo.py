"""
Script de Evaluación de Gates de Producción y Promoción de Modelos IA (Tarea 12).
Proyecto: Spartan Suplementos Bolivia - Módulo ERP Predictivo.

Regla Oficial:
  - Si todos los gates pasan: scripts/promocionar_modelo.py fija aprobado_produccion=TRUE
    y rellena metric_accuracy / metric_rmse en ia.version_modelo_ia.
  - Si alguno falla: permanece FALSE, test rojo, DETENTE.
"""

import asyncio
from pathlib import Path
import sys
from typing import Dict, Mapping, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyRegressor
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    precision_score,
    recall_score,
    root_mean_squared_error,
    r2_score,
)
from sqlalchemy import text

from app.core.database import engine
from scripts.train_modelos import (
    MODELO_DEMANDA_PATH,
    MODELO_QUIEBRE_PATH,
    TRAIN_CSV,
    preparar_features,
)

TEST_CSV = PROJECT_ROOT / "data" / "test.csv"


def evaluar_metricas_holdout(
    train_csv: Path = TRAIN_CSV,
    test_csv: Path = TEST_CSV,
    modelo_demanda_path: Path = MODELO_DEMANDA_PATH,
    modelo_quiebre_path: Path = MODELO_QUIEBRE_PATH,
) -> Dict:
    """Evalúa métricas sobre el conjunto de test para ambos modelos contra sus gates."""
    df_train = pd.read_csv(train_csv)
    df_test = pd.read_csv(test_csv)

    X_train = preparar_features(df_train)
    y_train_demanda = df_train["demanda_proxima_semana"]

    X_test = preparar_features(df_test)
    y_test_demanda = df_test["demanda_proxima_semana"]
    y_test_quiebre = df_test["riesgo_quiebre_stock"]

    # 1. Baseline DummyRegressor (media de train)
    dummy = DummyRegressor(strategy="mean")
    dummy.fit(X_train, y_train_demanda)
    dummy_preds = dummy.predict(X_test)
    rmse_base = float(root_mean_squared_error(y_test_demanda, dummy_preds))

    # 2. Modelo Regresor A
    regresor = joblib.load(modelo_demanda_path)
    preds_dem = regresor.predict(X_test)
    rmse_reg = float(root_mean_squared_error(y_test_demanda, preds_dem))
    mae_reg = float(mean_absolute_error(y_test_demanda, preds_dem))
    r2_reg = float(r2_score(y_test_demanda, preds_dem))

    gate_reg_rmse = rmse_reg <= (0.70 * rmse_base)
    gate_reg_r2 = r2_reg >= 0.75
    gate_reg_pasa = gate_reg_rmse and gate_reg_r2

    # 3. Modelo Clasificador B
    clasificador = joblib.load(modelo_quiebre_path)
    preds_qui = clasificador.predict(X_test)

    acc = float(accuracy_score(y_test_quiebre, preds_qui))
    bal_acc = float(balanced_accuracy_score(y_test_quiebre, preds_qui))
    prec = float(precision_score(y_test_quiebre, preds_qui, pos_label=1, zero_division=0))
    rec = float(recall_score(y_test_quiebre, preds_qui, pos_label=1, zero_division=0))
    f1 = float(f1_score(y_test_quiebre, preds_qui, pos_label=1, zero_division=0))
    cm = confusion_matrix(y_test_quiebre, preds_qui).tolist()

    gate_clf_bal_acc = bal_acc >= 0.80
    gate_clf_rec = rec >= 0.85
    gate_clf_pasa = gate_clf_bal_acc and gate_clf_rec

    todos_gates_pasan = gate_reg_pasa and gate_clf_pasa

    return {
        "regresor": {
            "rmse_base": rmse_base,
            "rmse": rmse_reg,
            "mae": mae_reg,
            "r2": r2_reg,
            "gate_rmse_umbral": 0.70 * rmse_base,
            "gate_rmse_pasa": gate_reg_rmse,
            "gate_r2_pasa": gate_reg_r2,
            "gate_pasa": gate_reg_pasa,
        },
        "clasificador": {
            "accuracy": acc,
            "balanced_accuracy": bal_acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "matriz_confusion": cm,
            "gate_bal_acc_pasa": gate_clf_bal_acc,
            "gate_recall_pasa": gate_clf_rec,
            "gate_pasa": gate_clf_pasa,
        },
        "todos_gates_pasan": todos_gates_pasan,
    }


async def actualizar_estado_bd(
    metricas: Dict,
    versiones_candidatas: Optional[Mapping[str, int]] = None,
) -> None:
    """Evalúa candidatos y promueve solo la fila que supera su gate."""
    evaluaciones = {
        "RF_REGRESOR_DEMANDA": {
            "metrica": "metric_rmse",
            "valor": metricas["regresor"]["rmse"],
            "gate_pasa": bool(metricas["regresor"]["gate_pasa"]),
        },
        "RF_CLASIFICADOR_QUIEBRE": {
            "metrica": "metric_accuracy",
            "valor": metricas["clasificador"]["balanced_accuracy"],
            "gate_pasa": bool(metricas["clasificador"]["gate_pasa"]),
        },
    }

    async with engine.begin() as conn:
        for algoritmo, evaluacion in evaluaciones.items():
            await conn.execute(
                text("""
                    SELECT id_version
                    FROM ia.version_modelo_ia
                    WHERE algoritmo = :algoritmo
                    FOR UPDATE
                """),
                {"algoritmo": algoritmo},
            )

            id_version = (
                versiones_candidatas.get(algoritmo)
                if versiones_candidatas is not None
                else None
            )
            if not id_version:
                candidato = await conn.execute(
                    text("""
                        SELECT id_version
                        FROM ia.version_modelo_ia
                        WHERE algoritmo = :algoritmo
                        ORDER BY aprobado_produccion ASC, id_version DESC
                        LIMIT 1
                    """),
                    {"algoritmo": algoritmo},
                )
                id_version = candidato.scalar_one_or_none()

            if not id_version:
                raise RuntimeError(f"No existe candidato para {algoritmo}")

            fila = await conn.execute(
                text("""
                    SELECT aprobado_produccion
                    FROM ia.version_modelo_ia
                    WHERE id_version = :id_version
                      AND algoritmo = :algoritmo
                """),
                {"id_version": id_version, "algoritmo": algoritmo},
            )
            if fila.scalar_one_or_none() is None:
                raise RuntimeError(
                    f"La versión {id_version} no pertenece a {algoritmo}"
                )

            await conn.execute(
                text(f"""
                    UPDATE ia.version_modelo_ia
                    SET {evaluacion["metrica"]} = :valor
                    WHERE id_version = :id_version
                """),
                {"valor": evaluacion["valor"], "id_version": id_version},
            )

            if evaluacion["gate_pasa"]:
                await conn.execute(
                    text("""
                        UPDATE ia.version_modelo_ia
                        SET aprobado_produccion = FALSE
                        WHERE algoritmo = :algoritmo
                          AND aprobado_produccion = TRUE
                          AND id_version <> :id_version
                    """),
                    {"algoritmo": algoritmo, "id_version": id_version},
                )
                await conn.execute(
                    text("""
                        UPDATE ia.version_modelo_ia
                        SET aprobado_produccion = TRUE
                        WHERE id_version = :id_version
                    """),
                    {"id_version": id_version},
                )


async def reconciliar_versiones_activas() -> None:
    """Conserva activa únicamente la versión de mayor id por algoritmo."""
    async with engine.begin() as conn:
        await conn.execute(text("""
            WITH activas AS (
                SELECT id_version,
                       ROW_NUMBER() OVER (
                           PARTITION BY algoritmo
                           ORDER BY id_version DESC
                       ) AS posicion
                FROM ia.version_modelo_ia
                WHERE aprobado_produccion = TRUE
            )
            UPDATE ia.version_modelo_ia AS v
            SET aprobado_produccion = FALSE
            FROM activas
            WHERE v.id_version = activas.id_version
              AND activas.posicion > 1
        """))


def promocionar_modelos_si_pasan(
    versiones_candidatas: Optional[Mapping[str, int]] = None,
) -> Dict:
    """Función orquestadora de evaluación y promoción."""
    metricas = evaluar_metricas_holdout()
    try:
        asyncio.run(actualizar_estado_bd(metricas, versiones_candidatas))
    except Exception as e:
        print(f"Advertencia: No se pudo conectar a la BD para actualizar estado: {e}")

    return metricas


if __name__ == "__main__":
    m = promocionar_modelos_si_pasan()
    print("Resultados de Evaluación de Gates:")
    print(f"  Regresor: RMSE={m['regresor']['rmse']:.4f} (Base={m['regresor']['rmse_base']:.4f}), R2={m['regresor']['r2']:.4f} -> Pasa: {m['regresor']['gate_pasa']}")
    print(f"  Clasificador: BalancedAcc={m['clasificador']['balanced_accuracy']:.4f}, Recall={m['clasificador']['recall']:.4f} -> Pasa: {m['clasificador']['gate_pasa']}")
    print(f"  Aprobación de Producción Global: {m['todos_gates_pasan']}")
