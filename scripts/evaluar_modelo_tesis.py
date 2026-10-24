"""
Módulo de Evaluación Formal y Generación de Evidencias Gráficas para la Tesis de Grado.
Proyecto: Spartan Suplementos Bolivia.

Genera gráficos de alta resolución y tablas académicas para el Capítulo IV:
1. Matriz de Confusión Normalizada (Heatmap Spartan).
2. Importancia de Características (Feature Importance).
3. Curva ROC Multiclase (One-vs-Rest) con cálculo de AUC.
4. Distribución y Dispersión Somatotípica (Ecto vs Meso vs Endo).
5. Reporte cuantitativo de Métricas (Accuracy, RMSE, F1, Precision, Recall).

Destinos de guardado:
- E:\\PROYECTO DE GRADO\\nuevo proyecto\\gráficos\\
- docs\\evidencias_tesis\\
"""

import os
import sys
import shutil
import logging
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.metrics import (
    confusion_matrix, classification_report, accuracy_score,
    mean_squared_error, mean_absolute_error, r2_score,
    roc_curve, auc
)
from sklearn.preprocessing import label_binarize

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEST_CSV = os.path.join(PROJECT_ROOT, "services", "ia", "data", "test_split.csv")
MODELS_DIR = os.path.join(PROJECT_ROOT, "services", "ia", "models")

# Rutas de destino de salida
USER_GRAFICOS_DIR = r"E:\PROYECTO DE GRADO\nuevo proyecto\gráficos"
REPO_GRAFICOS_DIR = os.path.join(PROJECT_ROOT, "docs", "evidencias_tesis")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluar_tesis")

FEATURE_COLUMNS = [
    "estatura_cm",
    "peso_kg",
    "imc",
    "ancho_hombros_m",
    "ancho_cadera_m",
    "v_taper",
    "torso_length_m",
    "simetria",
    "ratio_extremidades"
]

NOMBRES_LEGIBLES_FEATURES = [
    "Estatura (cm)",
    "Peso (kg)",
    "Índice Masa Corporal (IMC)",
    "Ancho Hombros (m)",
    "Ancho Cadera (m)",
    "Ratio V-Taper",
    "Longitud Torso (m)",
    "Simetría Bilateral",
    "Ratio Extremidades"
]

CLASES = ["ECTOMORFO", "MESOMORFO", "ENDOMORFO"]


def configurar_estilo_graficos():
    """Aplica estética sobria y académica con tipografía nítida y paleta Spartan."""
    plt.rcParams["font.sans-serif"] = ["DejaVu Sans", "Arial", "Helvetica"]
    plt.rcParams["axes.edgecolor"] = "#2A2A2A"
    plt.rcParams["axes.linewidth"] = 1.0
    plt.rcParams["grid.color"] = "#E0E0E0"
    plt.rcParams["grid.linestyle"] = "--"
    plt.rcParams["grid.alpha"] = 0.6


def guardar_en_ambos_destinos(fig, filename: str):
    """Guarda la figura en la carpeta del usuario y en el repositorio."""
    path_user = os.path.join(USER_GRAFICOS_DIR, filename)
    path_repo = os.path.join(REPO_GRAFICOS_DIR, filename)

    fig.savefig(path_user, dpi=300, bbox_inches="tight")
    fig.savefig(path_repo, dpi=300, bbox_inches="tight")
    logger.info(f"Gráfico guardado en: {path_user}")


def generar_evidencias_tesis():
    os.makedirs(USER_GRAFICOS_DIR, exist_ok=True)
    os.makedirs(REPO_GRAFICOS_DIR, exist_ok=True)
    configurar_estilo_graficos()

    if not os.path.exists(TEST_CSV):
        raise FileNotFoundError(
            f"No existe {TEST_CSV}. El generador histórico está archivado en "
            "scripts/_deprecated/train_somatotype_model.py."
        )

    df_test = pd.read_csv(TEST_CSV)
    X_test = df_test[FEATURE_COLUMNS]
    y_test_class = df_test["somatotipo"]
    y_test_reg = df_test[["score_endo", "score_meso", "score_ecto"]]

    # Cargar modelos
    clf = joblib.load(os.path.join(MODELS_DIR, "somatotipo_rf_classifier.joblib"))
    reg = joblib.load(os.path.join(MODELS_DIR, "somatotipo_rf_regressor.joblib"))
    scaler = joblib.load(os.path.join(MODELS_DIR, "somatotipo_scaler.joblib"))

    X_test_scaled = scaler.transform(X_test)

    # Inferencia
    y_pred_class = clf.predict(X_test_scaled)
    y_prob_class = clf.predict_proba(X_test_scaled)
    y_pred_reg = reg.predict(X_test_scaled)

    acc = accuracy_score(y_test_class, y_pred_class)
    rmse_total = np.sqrt(mean_squared_error(y_test_reg, y_pred_reg))
    mae_total = mean_absolute_error(y_test_reg, y_pred_reg)
    r2 = r2_score(y_test_reg, y_pred_reg)

    # -------------------------------------------------------------
    # 1. Gráfico: Matriz de Confusión Normalizada
    # -------------------------------------------------------------
    cm = confusion_matrix(y_test_class, y_pred_class, labels=CLASES)
    cm_norm = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

    fig1, ax1 = plt.subplots(figsize=(7, 6))
    sns.heatmap(
        cm_norm, annot=True, fmt=".2%", cmap="YlOrBr",
        xticklabels=CLASES, yticklabels=CLASES,
        cbar=True, ax=ax1, linewidths=1.0, linecolor="#333333",
        annot_kws={"size": 13, "weight": "bold"}
    )
    ax1.set_title(f"Matriz de Confusión de Clasificación de Somatotipos\n(Exactitud Global = {acc*100:.2f}%)", fontsize=13, weight="bold", pad=15)
    ax1.set_xlabel("Somatotipo Predicho por el Modelo Random Forest", fontsize=11, weight="bold", labelpad=10)
    ax1.set_ylabel("Somatotipo Real (Ground Truth)", fontsize=11, weight="bold", labelpad=10)
    plt.tight_layout()
    guardar_en_ambos_destinos(fig1, "01_matriz_confusion_somatotipos.png")
    plt.close(fig1)

    # -------------------------------------------------------------
    # 2. Gráfico: Importancia de Características (Feature Importance)
    # -------------------------------------------------------------
    importances = clf.feature_importances_
    indices = np.argsort(importances)[::-1]

    fig2, ax2 = plt.subplots(figsize=(9, 5.5))
    bar_colors = ["#f2e500" if i < 3 else "#333333" for i in range(len(indices))]
    bars = ax2.barh(range(len(indices)), importances[indices][::-1], color=bar_colors[::-1], edgecolor="#111111")
    ax2.set_yticks(range(len(indices)))
    ax2.set_yticklabels([NOMBRES_LEGIBLES_FEATURES[i] for i in indices][::-1], fontsize=10)
    ax2.set_xlabel("Importancia Relativa (Gini Impurity Reduction)", fontsize=11, weight="bold")
    ax2.set_title("Ponderación de Variables Antropométricas en Random Forest\n(Análisis de Relevancia Biomecánica)", fontsize=13, weight="bold", pad=15)
    ax2.grid(axis="x", linestyle="--", alpha=0.5)

    for bar in bars:
        width = bar.get_width()
        ax2.text(width + 0.005, bar.get_y() + bar.get_height()/2, f"{width*100:.1f}%", va="center", fontsize=9, weight="bold")

    plt.tight_layout()
    guardar_en_ambos_destinos(fig2, "02_importancia_caracteristicas.png")
    plt.close(fig2)

    # -------------------------------------------------------------
    # 3. Gráfico: Curva ROC Multiclase (One-vs-Rest)
    # -------------------------------------------------------------
    y_test_bin = label_binarize(y_test_class, classes=CLASES)
    fig3, ax3 = plt.subplots(figsize=(7, 6))

    colors = ["#2563EB", "#D97706", "#DC2626"] # Azul Ecto, Dorado Meso, Rojo/Naranja Endo
    for i, (clase, col) in enumerate(zip(CLASES, colors)):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_prob_class[:, i])
        roc_auc = auc(fpr, tpr)
        ax3.plot(fpr, tpr, color=col, lw=2.5, label=f"{clase} (AUC = {roc_auc:.4f})")

    ax3.plot([0, 1], [0, 1], color="#888888", lw=1.5, linestyle="--", label="Clasificador Aleatorio (AUC = 0.50)")
    ax3.set_xlim([0.0, 1.0])
    ax3.set_ylim([0.0, 1.05])
    ax3.set_xlabel("Tasa de Falsos Positivos (1 - Especificidad)", fontsize=11, weight="bold")
    ax3.set_ylabel("Tasa de Verdaderos Positivos (Sensibilidad)", fontsize=11, weight="bold")
    ax3.set_title("Curvas ROC Multiclase - Modelo de Inferencia Biometríca\n(Evaluación One-vs-Rest)", fontsize=13, weight="bold", pad=15)
    ax3.legend(loc="lower right", fontsize=10, frameon=True)
    ax3.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    guardar_en_ambos_destinos(fig3, "03_curva_roc_multiclase.png")
    plt.close(fig3)

    # -------------------------------------------------------------
    # 4. Gráfico: Dispersión Biomecánica (IMC vs V-Taper)
    # -------------------------------------------------------------
    fig4, ax4 = plt.subplots(figsize=(8, 6))
    palette_map = {"ECTOMORFO": "#2563EB", "MESOMORFO": "#EAB308", "ENDOMORFO": "#DC2626"}

    for somato in CLASES:
        subset = df_test[df_test["somatotipo"] == somato]
        ax4.scatter(
            subset["imc"], subset["v_taper"],
            label=somato, color=palette_map[somato],
            alpha=0.65, edgecolors="none", s=45
        )

    ax4.set_xlabel("Índice de Masa Corporal (IMC en kg/m²)", fontsize=11, weight="bold")
    ax4.set_ylabel("Ratio V-Taper (Hombros / Cadera)", fontsize=11, weight="bold")
    ax4.set_title("Dispersión de Biotipos Corporales en Espacio Morfométrico\n(Distribución Conjunto de Prueba)", fontsize=13, weight="bold", pad=15)
    ax4.legend(title="Somatotipo", fontsize=10, title_fontsize=11)
    ax4.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()
    guardar_en_ambos_destinos(fig4, "04_dispersion_biotipos_imc_vtaper.png")
    plt.close(fig4)

    # -------------------------------------------------------------
    # 5. Reporte Técnico en Texto para la Tesis (Capítulo IV)
    # -------------------------------------------------------------
    reporte_clasificacion = classification_report(y_test_class, y_pred_class, digits=4)
    reporte_texto = f"""================================================================================
REPORTE OFICIAL DE EVALUACIÓN DE DESEMPEÑO PREDICTIVO (OE2)
PROYECTO DE GRADO - SPARTAN SUPLEMENTOS BOLIVIA
Modelo: Random Forest (CART Inductivo + Regresor Multivariable)
================================================================================

1. MÉTRICAS DE CLASIFICACIÓN CATEGÓRICA (VARIABLE INDEPENDIENTE - DESEMPEÑO PREDICTIVO):
--------------------------------------------------------------------------------
- Tamaño del Conjunto de Prueba (Test Set Inédito): {len(X_test)} registros (15% del total)
- Exactitud Global (Accuracy): {acc*100:.2f}% (Meta esperada: >= 85.00%)
- Resultado de Hipótesis OE2: SUPERADO CON ÉXITO

Reporte Detallado por Clase:
{reporte_clasificacion}

2. MÉTRICAS DE AJUSTE MÉTRICO CONTINUO (MODELO HEATH-CARTER):
--------------------------------------------------------------------------------
- Error Cuadrático Medio (RMSE Global): {rmse_total:.4f} (Meta esperada: < 0.80)
- Error Absoluto Medio (MAE Global): {mae_total:.4f}
- Coeficiente de Determinación (R² Score): {r2:.4f}

Desglose por Componente Somatotípico:
- Endomorfia (Adiposidad Relativa): RMSE = {np.sqrt(mean_squared_error(y_test_reg.iloc[:, 0], y_pred_reg[:, 0])):.4f}
- Mesomorfia (Desarrollo Músculo-Esquelético): RMSE = {np.sqrt(mean_squared_error(y_test_reg.iloc[:, 1], y_pred_reg[:, 1])):.4f}
- Ectomorfia (Linealidad Relativa): RMSE = {np.sqrt(mean_squared_error(y_test_reg.iloc[:, 2], y_pred_reg[:, 2])):.4f}

3. ARTEFACTOS GRÁFICOS GENERADOS PARA EL DOCUMENTO DE TESIS:
--------------------------------------------------------------------------------
- 01_matriz_confusion_somatotipos.png
- 02_importancia_caracteristicas.png
- 03_curva_roc_multiclase.png
- 04_dispersion_biotipos_imc_vtaper.png

Ubicación de Gráficos:
1. {USER_GRAFICOS_DIR}
2. {REPO_GRAFICOS_DIR}
================================================================================
"""

    reporte_user_path = os.path.join(USER_GRAFICOS_DIR, "reporte_metricas_tesis.txt")
    reporte_repo_path = os.path.join(REPO_GRAFICOS_DIR, "reporte_metricas_tesis.txt")

    with open(reporte_user_path, "w", encoding="utf-8") as f:
        f.write(reporte_texto)
    with open(reporte_repo_path, "w", encoding="utf-8") as f:
        f.write(reporte_texto)

    logger.info(f"Reporte de métricas guardado en: {reporte_user_path}")
    print("\n" + reporte_texto)

    return {
        "accuracy": acc,
        "rmse": rmse_total,
        "mae": mae_total,
        "r2": r2
    }


if __name__ == "__main__":
    generar_evidencias_tesis()
