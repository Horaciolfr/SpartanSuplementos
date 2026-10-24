"""
Construcción y Entrenamiento del Motor de Reglas Explicables CART (Tarea 13).
Proyecto: Spartan Suplementos Bolivia - Módulo de Cross-Selling Inteligente.

Metodología:
  - Carga transacciones históricas (data/transacciones_historicas.csv).
  - Calcula matriz de afinidad somatotipo-categoría normalizada.
  - Target binario: afinidad_alta = afinidad mayor o igual a la mediana.
  - DecisionTreeClassifier(max_depth=3, min_samples_leaf=20, random_state=42)
    sobre [somatotipo_onehot, categoria_onehot].
  - Poda de reglas con soporte < 20 transacciones o afinidad bajo el umbral de decisión.
  - Exportación de rutas podadas a ia.regla_inferencia_cart con descripciones en lenguaje natural:
    "SI somatotipo=<SOMATOTIPO> Y categoria=<CATEGORIA> ENTONCES afinidad=ALTA".
  - Registro de versión en ia.version_modelo_ia ('CART_CROSSSELLING', aprobado_produccion=FALSE).
"""

import asyncio
import hashlib
import os
from pathlib import Path
import sys
from typing import Dict, List, Tuple

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.tree import DecisionTreeClassifier, export_text, _tree
from sqlalchemy import text

from app.core.database import engine
from scripts.generar_dataset_erp import generar_transacciones_historicas

TRANSACCIONES_CSV = PROJECT_ROOT / "data" / "transacciones_historicas.csv"
ARTIFACTS_DIR = PROJECT_ROOT / "artifacts"
MODELO_CART_PATH = ARTIFACTS_DIR / "modelo_cart_v1.joblib"
REPORTE_CART_MD = PROJECT_ROOT / "data" / "reporte_cart.md"

MAX_DEPTH = 4
MIN_SAMPLES_LEAF = 20
RANDOM_STATE = 42


def calcular_sha256(ruta_archivo: Path) -> str:
    """Calcula el hash SHA-256 de un archivo en disco."""
    sha = hashlib.sha256()
    with open(ruta_archivo, "rb") as f:
        for bloque in iter(lambda: f.read(65536), b""):
            sha.update(bloque)
    return sha.hexdigest()


def preparar_datos_cart(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.DataFrame, float]:
    """Calcula matriz de afinidad, target binario y matriz one-hot de features."""
    # 1. Matriz de afinidad somatotipo x categoria normalizada por fila
    matriz_afinidad = pd.crosstab(df["somatotipo_cliente"], df["categoria"], normalize="index")

    # 2. Afinidad individual por transacción
    df["afinidad"] = df.apply(lambda r: matriz_afinidad.loc[r["somatotipo_cliente"], r["categoria"]], axis=1)

    # 3. Target binario: umbral de mediana de afinidad para discriminar afinidad alta
    umbral_corte = float(df["afinidad"].median())
    df["afinidad_alta"] = (df["afinidad"] >= umbral_corte).astype(int)

    # 4. One-hot encoding de features
    cols_soma = sorted(df["somatotipo_cliente"].unique())
    cols_cat = sorted(df["categoria"].unique())

    X_soma = pd.get_dummies(df["somatotipo_cliente"], prefix="somatotipo")[[f"somatotipo_{s}" for s in cols_soma]]
    X_cat = pd.get_dummies(df["categoria"], prefix="categoria")[[f"categoria_{c}" for c in cols_cat]]
    X = pd.concat([X_soma, X_cat], axis=1).astype(int)

    y = df["afinidad_alta"]
    return X, y, matriz_afinidad, umbral_corte


def podar_y_extraer_reglas(
    dt: DecisionTreeClassifier,
    feature_names: List[str],
    min_soporte: int = MIN_SAMPLES_LEAF,
    umbral_corte: float = 0.5,
) -> List[Dict]:
    """
    Recorre el árbol CART y extrae las rutas hojas podadas.
    Poda hojas con soporte < min_soporte o probabilidad de afinidad alta < umbral_corte.
    Cada regla incluye el antecedente completo garantizando cero antecedentes vacíos.
    """
    tree_ = dt.tree_
    hojas_podadas = []

    def traverse(node: int, conds: List[Tuple[str, str, float]]):
        if tree_.feature[node] != _tree.TREE_UNDEFINED:
            feat = feature_names[tree_.feature[node]]
            # Izquierda: <= 0.5 (ausente)
            traverse(tree_.children_left[node], conds + [(feat, "<=", 0.5)])
            # Derecha: > 0.5 (presente)
            traverse(tree_.children_right[node], conds + [(feat, ">", 0.5)])
        else:
            # Nodo hoja
            soporte = int(tree_.n_node_samples[node])
            val = tree_.value[node][0]
            prob_alta = float(val[1] / val.sum()) if len(val) > 1 else 0.0

            # Criterio de Poda: soporte >= min_soporte y afinidad alta (prob_alta >= umbral_corte)
            if soporte >= min_soporte and prob_alta >= umbral_corte:
                # Construir descripción técnica con antecedente completo en lenguaje natural
                partes = []
                for feat, op, _ in conds:
                    entidad, valor = feat.split("_", 1)
                    if op == ">":
                        partes.append(f"{entidad}={valor}")
                    else:
                        partes.append(f"{entidad}!={valor}")

                if not partes:
                    raise ValueError(f"Nodo hoja {node} no posee condiciones en antecedente.")

                desc = "SI " + " Y ".join(partes) + " ENTONCES afinidad=ALTA"
                hojas_podadas.append({
                    "node_id": node,
                    "conds": conds,
                    "soporte": soporte,
                    "afinidad": round(prob_alta, 4),
                    "descripcion": desc,
                })

    traverse(0, [])

    # Asignar códigos CART-<n>
    for idx, regla in enumerate(hojas_podadas, 1):
        regla["codigo_regla"] = f"CART-{idx}"

    return hojas_podadas


async def registrar_en_base_datos(
    hash_archivo: str,
    accuracy_arbol: float,
    reglas: List[Dict],
) -> int:
    """Registra la versión en ia.version_modelo_ia y las reglas en ia.regla_inferencia_cart."""
    async with engine.begin() as conn:
        # Limpiar versiones y reglas previas de CART_CROSSSELLING para mantener unicidad activa
        await conn.execute(
            text("""
                DELETE FROM ia.regla_inferencia_cart 
                WHERE id_version IN (SELECT id_version FROM ia.version_modelo_ia WHERE algoritmo = 'CART_CROSSSELLING')
            """)
        )
        await conn.execute(
            text("DELETE FROM ia.version_modelo_ia WHERE algoritmo = 'CART_CROSSSELLING'")
        )

        query_version = text("""
            INSERT INTO ia.version_modelo_ia (
                algoritmo, hash_archivo, metric_accuracy, metric_rmse, aprobado_produccion, fecha_entrenamiento
            )
            VALUES (
                'CART_CROSSSELLING', :hash, :acc, NULL, FALSE, CURRENT_TIMESTAMP
            )
            RETURNING id_version;
        """)
        res_v = await conn.execute(query_version, {"hash": hash_archivo, "acc": accuracy_arbol})
        row_v = res_v.fetchone()
        id_version = row_v[0] if row_v else 0

        # Insertar reglas de inferencia podadas
        query_regla = text("""
            INSERT INTO ia.regla_inferencia_cart (
                id_version, codigo_regla, descripcion_tecnica, umbral_decision
            )
            VALUES (
                :id_version, :codigo_regla, :descripcion_tecnica, :umbral_decision
            );
        """)
        for r in reglas:
            await conn.execute(query_regla, {
                "id_version": id_version,
                "codigo_regla": r["codigo_regla"],
                "descripcion_tecnica": r["descripcion"],
                "umbral_decision": r["afinidad"],
            })

    await engine.dispose()
    return id_version


def entrenar_motor_cart(
    csv_path: Path = TRANSACCIONES_CSV,
    artifacts_dir: Path = ARTIFACTS_DIR,
    reporte_md: Path = REPORTE_CART_MD,
    registrar_bd: bool = True,
    seed: int = RANDOM_STATE,
) -> Dict:
    """Entrena el clasificador CART, poda las reglas, persiste el modelo y las registra."""
    if not csv_path.exists():
        generar_transacciones_historicas(seed=seed, ruta_salida_csv=str(csv_path))

    df_tx = pd.read_csv(csv_path)
    X, y, mat_afinidad, umbral_corte = preparar_datos_cart(df_tx)

    # Entrenamiento del árbol CART
    dt = DecisionTreeClassifier(
        max_depth=MAX_DEPTH,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        random_state=seed,
    )
    dt.fit(X, y)
    acc = float(accuracy_score(y, dt.predict(X)))

    # Persistencia del artefacto joblib
    os.makedirs(artifacts_dir, exist_ok=True)
    modelo_file = artifacts_dir / "modelo_cart_v1.joblib"
    joblib.dump(dt, modelo_file)
    sha256_joblib = calcular_sha256(modelo_file)

    # Extracción y poda de reglas
    reglas_podadas = podar_y_extraer_reglas(dt, feature_names=list(X.columns))

    # Registro en base de datos PostgreSQL
    id_version = 0
    if registrar_bd:
        try:
            id_version = asyncio.run(registrar_en_base_datos(sha256_joblib, acc, reglas_podadas))
        except Exception as e:
            print(f"Advertencia: No se pudo registrar CART en base de datos: {e}")

    # Exportación textual del árbol
    arbol_texto = export_text(dt, feature_names=list(X.columns))

    # Generación de Reporte Markdown
    reporte_contenido = f"""# REPORTE DE CONSTRUCCIÓN DEL MOTOR DE REGLAS (CART)
**Proyecto:** Spartan Suplementos Bolivia — Motor de Cross-Selling Inteligente (Tarea 13)  
**Algoritmo:** `DecisionTreeClassifier` (Profundidad Máxima = {MAX_DEPTH}, Min Samples Leaf = {MIN_SAMPLES_LEAF})  
**Semilla Determinista:** {seed} | **Accuracy del Árbol:** {acc*100:.2f}%  
**Artefacto Persistido:** `{modelo_file.name}` (SHA-256: `{sha256_joblib}`)  
**ID Versión Registrada en BD:** {id_version} (aprobado_produccion = FALSE)  

---

## 1. Matriz de Afinidad (Somatotipo x Categoría) Normalizada
```text
{mat_afinidad.round(4).to_string()}
```
*Umbral de corte (mediana):* {umbral_corte:.4f}

---

## 2. Árbol de Decisión CART en Texto (`export_text`)
```text
{arbol_texto}
```

---

## 3. Tabla de Reglas de Inferencia Podadas y Exportadas
| Código Regla | Descripción Técnica (Lenguaje Natural) | Soporte (Transacciones) | Afinidad (Umbral Hoja) |
|---|---|---|---|
"""
    for r in reglas_podadas:
        reporte_contenido += f"| **{r['codigo_regla']}** | `{r['descripcion']}` | {r['soporte']} | {r['afinidad']:.4f} |\n"

    reporte_contenido += f"""
*Criterios de Poda Aplicados:* Reglas con soporte < {MIN_SAMPLES_LEAF} transacciones o afinidad bajo el umbral de decisión fueron podadas y no exportadas.
"""

    if reporte_md is not None:
        os.makedirs(reporte_md.parent, exist_ok=True)
        with open(reporte_md, "w", encoding="utf-8") as f:
            f.write(reporte_contenido)

    return {
        "dt": dt,
        "feature_names": list(X.columns),
        "X": X,
        "y": y,
        "accuracy": acc,
        "sha256": sha256_joblib,
        "id_version": id_version,
        "reglas": reglas_podadas,
        "arbol_texto": arbol_texto,
        "matriz_afinidad": mat_afinidad,
        "umbral_corte": umbral_corte,
    }


if __name__ == "__main__":
    res = entrenar_motor_cart()
    print("Entrenamiento CART completado:")
    print(f"  SHA-256: {res['sha256']} (ID Versión={res['id_version']})")
    print(f"  Reglas podadas exportadas: {len(res['reglas'])}")
    print(res["arbol_texto"])
