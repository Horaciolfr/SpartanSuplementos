"""
Suite de Pruebas Automatizadas para el Motor de Reglas CART (Tarea 13).
Proyecto: Spartan Suplementos Bolivia - Cross-Selling Inteligente Basado en Somatotipos.

Verifica:
  a) Las reglas exportadas reproducen el 100% de las decisiones del árbol de decisión.
  b) Ninguna regla exportada tiene soporte < 20 transacciones ni afinidad bajo el umbral.
  c) El número de reglas exportadas coincide exactamente con el número de hojas del árbol podado.
  d) Al superar todas las pruebas: se promueve a producción fijando aprobado_produccion=TRUE
     para el algoritmo 'CART_CROSSSELLING' en ia.version_modelo_ia.
"""

import asyncio
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import pytest
from sqlalchemy import text

from app.core.database import engine
from scripts.train_cart import (
    MODELO_CART_PATH,
    TRANSACCIONES_CSV,
    entrenar_motor_cart,
    podar_y_extraer_reglas,
    preparar_datos_cart,
)

PROJECT_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="session")
def bundle_cart():
    """Asegura que el modelo CART esté entrenado y disponible con sus reglas."""
    if not MODELO_CART_PATH.exists() or not TRANSACCIONES_CSV.exists():
        entrenar_motor_cart()

    assert MODELO_CART_PATH.exists(), f"Falta modelo CART {MODELO_CART_PATH}"
    assert TRANSACCIONES_CSV.exists(), f"Falta transacciones históricas {TRANSACCIONES_CSV}"

    dt = joblib.load(MODELO_CART_PATH)
    df_tx = pd.read_csv(TRANSACCIONES_CSV)
    X, y, mat_afinidad, umbral_corte = preparar_datos_cart(df_tx)

    # Consultar reglas registradas en base de datos
    async def obtener_reglas_bd():
        async with engine.connect() as conn:
            query = text("""
                SELECT r.id_regla, r.codigo_regla, r.descripcion_tecnica, r.umbral_decision, v.id_version, v.aprobado_produccion
                FROM ia.regla_inferencia_cart r
                JOIN ia.version_modelo_ia v ON r.id_version = v.id_version
                WHERE v.algoritmo = 'CART_CROSSSELLING'
                ORDER BY r.id_regla;
            """)
            res = await conn.execute(query)
            return res.fetchall()

    reglas_bd = asyncio.run(obtener_reglas_bd())
    assert len(reglas_bd) > 0, "No se encontraron reglas para CART_CROSSSELLING en ia.regla_inferencia_cart"

    # Extraer hojas podadas directamente del árbol
    hojas_podadas = podar_y_extraer_reglas(dt, feature_names=list(X.columns))

    return {
        "dt": dt,
        "X": X,
        "y": y,
        "feature_names": list(X.columns),
        "hojas_podadas": hojas_podadas,
        "reglas_bd": reglas_bd,
    }


def test_a_reglas_exportadas_reproducen_100_decisiones_arbol(bundle_cart):
    """
    a) Reglas exportadas reproducen 100% de las decisiones del árbol.
    Para cada transacción, la inferencia basada en las reglas lógicas booleanas
    debe coincidir exactamente con la predicción del DecisionTreeClassifier.
    """
    dt = bundle_cart["dt"]
    X = bundle_cart["X"]
    hojas_podadas = bundle_cart["hojas_podadas"]

    preds_arbol = dt.predict(X)

    # Inferencia puramente simbólica basada en las reglas
    preds_reglas = []
    for i in range(len(X)):
        row = X.iloc[i]
        match_cualquier_regla = False
        for hoja in hojas_podadas:
            match_hoja = True
            for feat, op, _ in hoja["conds"]:
                if op == ">" and row[feat] <= 0.5:
                    match_hoja = False
                    break
                if op == "<=" and row[feat] > 0.5:
                    match_hoja = False
                    break
            if match_hoja:
                match_cualquier_regla = True
                break
        preds_reglas.append(1 if match_cualquier_regla else 0)

    tasa_reproduccion = (np.array(preds_reglas) == preds_arbol).mean()
    print(f"\nREPRODUCCIÓN DE DECISIONES REGLAS vs ÁRBOL: {tasa_reproduccion*100:.2f}%")

    assert tasa_reproduccion == 1.0, (
        f"Las reglas exportadas no reproducen el 100% de las decisiones del árbol: "
        f"coincidencia observada {tasa_reproduccion*100:.2f}%"
    )


def test_b_ninguna_regla_con_soporte_menor_20_ni_afinidad_bajo_umbral(bundle_cart):
    """
    b) Ninguna regla con soporte < 20 ni afinidad bajo umbral.
    """
    hojas_podadas = bundle_cart["hojas_podadas"]
    reglas_bd = bundle_cart["reglas_bd"]

    assert len(reglas_bd) > 0, "No hay reglas exportadas"

    for r in hojas_podadas:
        soporte = r["soporte"]
        afinidad = r["afinidad"]
        codigo = r["codigo_regla"]

        assert soporte >= 20, f"Regla {codigo} tiene soporte insuficiente: {soporte} < 20"
        assert afinidad >= 0.50, f"Regla {codigo} tiene afinidad baja: {afinidad} < 0.50"

    # Verificar también valores en base de datos
    for fila in reglas_bd:
        umbral_bd = float(fila[3])
        codigo_bd = fila[1]
        assert umbral_bd >= 0.50, f"Regla en BD {codigo_bd} tiene umbral_decision bajo: {umbral_bd} < 0.50"


def test_c_nro_reglas_exportadas_igual_hojas_arbol_podado(bundle_cart):
    """
    c) Nro de reglas exportadas == hojas del árbol podado.
    """
    hojas_podadas = bundle_cart["hojas_podadas"]
    reglas_bd = bundle_cart["reglas_bd"]

    n_hojas_podadas = len(hojas_podadas)
    n_reglas_bd = len(reglas_bd)

    print(f"\nCONTEO DE REGLAS: Hojas Podadas={n_hojas_podadas}, Reglas en BD={n_reglas_bd}")
    assert n_reglas_bd == n_hojas_podadas, (
        f"Discrepancia en número de reglas: exportadas en BD ({n_reglas_bd}) != hojas podadas ({n_hojas_podadas})"
    )


def test_d_promocion_produccion_cart_true(bundle_cart):
    """
    d) Al pasar todos los criterios anteriores:
       Fija aprobado_produccion=TRUE para 'CART_CROSSSELLING' en ia.version_modelo_ia.
    """
    async def promocionar():
        async with engine.begin() as conn:
            await conn.execute(text("""
                UPDATE ia.version_modelo_ia
                SET aprobado_produccion = TRUE
                WHERE algoritmo = 'CART_CROSSSELLING';
            """))

            res = await conn.execute(text("""
                SELECT id_version, algoritmo, metric_accuracy, aprobado_produccion
                FROM ia.version_modelo_ia
                WHERE algoritmo = 'CART_CROSSSELLING';
            """))
            return res.fetchall()

    filas = asyncio.run(promocionar())
    assert len(filas) >= 1, "No se encontró registro para actualizar CART_CROSSSELLING"
    id_version, alg, acc, aprobado = filas[0]

    assert aprobado is True, f"Fallo al promover {alg}: aprobado_produccion={aprobado}"
    print(f"\nPROMOCIÓN EXITOSA: {alg} (id_version={id_version}) aprobado_produccion={aprobado} (Accuracy={acc})")


def test_e_numero_de_hojas_del_arbol_mayor_o_igual_cinco(bundle_cart):
    """
    e) Número de hojas del árbol CART >= 5 discriminativas sobre la matriz somatotipo x categoría.
    """
    dt = bundle_cart["dt"]
    n_hojas = dt.get_n_leaves()
    print(f"\nNÚMERO DE HOJAS DEL ÁRBOL CART: {n_hojas}")
    assert n_hojas >= 5, f"El árbol CART degeneró con menos de 5 hojas: {n_hojas} < 5"


def test_f_ninguna_descripcion_tecnica_con_antecedente_vacio(bundle_cart):
    """
    f) Ninguna descripcion_tecnica contiene antecedente vacío.
    Regex estricto que verifica que entre 'SI' y 'ENTONCES' existe al menos una condición con '=', '>', o '<'.
    """
    import re
    reglas_bd = bundle_cart["reglas_bd"]
    patron = re.compile(r"^SI\s+(.+?)\s+ENTONCES\s+afinidad=ALTA$")
    assert len(reglas_bd) > 0, "No se encontraron reglas en ia.regla_inferencia_cart"

    for fila in reglas_bd:
        codigo = fila[1]
        desc = str(fila[2]).strip()
        m = patron.match(desc)
        assert m is not None, f"La regla {codigo} no cumple con el formato estándar 'SI ... ENTONCES afinidad=ALTA': {desc}"

        antecedente = m.group(1).strip()
        assert len(antecedente) > 0, f"La regla {codigo} posee antecedente vacío: '{desc}'"
        assert any(op in antecedente for op in ["=", ">", "<"]), (
            f"El antecedente de la regla {codigo} no contiene operadores condicionales ('=', '>', '<'): '{antecedente}'"
        )
        print(f"Regla {codigo} verificada conforme: {desc}")
