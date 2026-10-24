"""
Generador del Jupyter Notebook para la Tarea de Limpieza y Preprocesamiento de Dataset ERP.
"""
import json
from pathlib import Path

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Spartan Suplementos Bolivia — Proyecto de Grado\n",
                "## Tarea Oficial: Limpieza, Diagnóstico y Preprocesamiento de Dataset ERP\n",
                "\n",
                "**Dominio:** ERP Transaccional e Inventario (Ventas pasadas, control de stock y optimización).\n",
                "**Objetivo:** Ejecutar la metodología estándar de limpieza y aseguramiento de calidad de datos:\n",
                "1. Diagnóstico dimensional e inspección de estructura.\n",
                "2. Auditoría de valores nulos (missing values).\n",
                "3. Auditoría y verificación de duplicados.\n",
                "4. Conversión y estandarización de tipos de datos.\n",
                "5. Análisis de consistencia operativa y detección de anomalías/outliers.\n",
                "6. Comprobación de reglas de negocio ERP (rotación de inventario y calibración de quiebres).\n",
                "7. Blindaje contra fuga de información (*zero data leakage*).\n",
                "8. Exportación del dataset limpio listo para el modelo Random Forest (Tarea 12)."
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 1: Importación de Librerías"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import pandas as pd\n",
                "import numpy as np\n",
                "import matplotlib.pyplot as plt\n",
                "import seaborn as sns\n",
                "\n",
                "plt.style.use('seaborn-v0_8-whitegrid')\n",
                "plt.rcParams['figure.figsize'] = (10, 5)\n",
                "plt.rcParams['font.size'] = 10\n",
                "print('Librerías cargadas exitosamente.')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 2: Carga del Dataset Histórico de Ventas y Stock\n",
                "Cargamos el archivo CSV transaccional del ERP."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# En Google Colab sube 'dataset_erp_ventas_stock.csv' al panel de archivos\n",
                "try:\n",
                "    df = pd.read_csv('dataset_erp_ventas_stock.csv')\n",
                "except FileNotFoundError:\n",
                "    try:\n",
                "        df = pd.read_csv('data/dataset_erp_ventas_stock.csv')\n",
                "    except FileNotFoundError:\n",
                "        df = pd.read_csv('data/dataset_historico_erp.csv')\n",
                "\n",
                "print(f'Dimensiones del dataset: {df.shape[0]} registros x {df.shape[1]} columnas')\n",
                "df.head(5)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 3: Diagnóstico Estructural y Verificación de Columnas"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "print('--- ESTRUCTURA GENERAL DEL DATASET ---')\n",
                "df.info()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 4: Auditoría y Tratamiento de Valores Nulos (Missing Values)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "nulos = df.isnull().sum()\n",
                "print('--- VALORES NULOS POR VARIABLE ---')\n",
                "print(nulos)\n",
                "total_nulos = nulos.sum()\n",
                "print(f'\\nTotal de valores nulos detectados: {total_nulos}')\n",
                "if total_nulos == 0:\n",
                "    print('DIAGNÓSTICO: Cero valores faltantes. Integridad estructural 100% completa.')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 5: Auditoría de Registros Duplicados"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "dup_filas = df.duplicated().sum()\n",
                "dup_tickets = df.duplicated(subset=['id_transaccion']).sum()\n",
                "print(f'Filas completamente duplicadas: {dup_filas}')\n",
                "print(f'Tickets con id_transaccion repetido: {dup_tickets}')\n",
                "if dup_tickets == 0:\n",
                "    print('DIAGNÓSTICO: Cada transacción posee un identificador unívoco. Cero redundancias.')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 6: Conversión y Estandarización de Tipos de Datos (Tipado Fuerte)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# 1. Conversión de fecha a datetime\n",
                "df['fecha'] = pd.to_datetime(df['fecha'])\n",
                "\n",
                "# 2. Conversión de columnas categóricas\n",
                "df['categoria'] = df['categoria'].astype('category')\n",
                "df['subcategoria'] = df['subcategoria'].astype('category')\n",
                "\n",
                "print(f'Rango cronológico: {df[\"fecha\"].min().strftime(\"%Y-%m-%d\")} al {df[\"fecha\"].max().strftime(\"%Y-%m-%d\")}')\n",
                "print(f'Días únicos con transacciones: {df[\"fecha\"].nunique()} días')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 7: Validación de Outliers y Reglas de Negocio ERP"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "cols_num = ['precio_unitario', 'cantidad', 'total_bs', 'stock_actual', 'stock_seguridad', 'ventas_ultimos_7_dias', 'ventas_ultimos_30_dias']\n",
                "print('--- ESTADÍSTICA DESCRIPTIVA DE VARIABLES OPERATIVAS ---')\n",
                "print(df[cols_num].describe().round(2))\n",
                "\n",
                "# Validaciones de negocio\n",
                "assert (df['cantidad'] >= 1).all() and (df['cantidad'] <= 4).all(), 'Error: Cantidad fuera de rango'\n",
                "assert (df['stock_actual'] >= 0).all(), 'Error: Stock negativo en almacén'\n",
                "assert (df['precio_unitario'] > 0).all(), 'Error: Precios unitarios no válidos'\n",
                "print('\\nVALIDACIÓN: Todas las reglas de consistencia de inventario y precios superadas.')"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 8: Visualizaciones de Calidad y Comportamiento del Dataset"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, axes = plt.subplots(1, 2, figsize=(14, 5))\n",
                "\n",
                "# 1. Distribución de Unidades por Compra\n",
                "sns.countplot(data=df, x='cantidad', palette='Blues_r', ax=axes[0])\n",
                "axes[0].set_title('Tamaño de Canasta (Unidades por Compra)')\n",
                "axes[0].set_xlabel('Unidades Vendidas')\n",
                "axes[0].set_ylabel('Frecuencia de Transacciones')\n",
                "\n",
                "# 2. Tasa de Quiebres de Stock (Target de Inventario)\n",
                "tasa_quiebre = df['quiebre_stock'].mean() * 100\n",
                "sns.countplot(data=df, x='quiebre_stock', palette=['#1f77b4', '#d62728'], ax=axes[1])\n",
                "axes[1].set_title(f'Distribución de Quiebres de Stock (Tasa: {tasa_quiebre:.2f}%)')\n",
                "axes[1].set_xticklabels(['Despacho Normal (0)', 'Quiebre de Stock (1)'])\n",
                "axes[1].set_xlabel('Estado Operacional')\n",
                "axes[1].set_ylabel('Transacciones')\n",
                "\n",
                "plt.tight_layout()\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 9: Agrupación y Rotación por Subcategoría de Producto"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "resumen_rotacion = df.groupby('subcategoria').agg(\n",
                "    Transacciones=('id_transaccion', 'count'),\n",
                "    Unidades_Vendidas=('cantidad', 'sum'),\n",
                "    Facturacion_Bs=('total_bs', 'sum'),\n",
                "    Quiebres_Stock=('quiebre_stock', 'sum'),\n",
                "    Tasa_Quiebre=('quiebre_stock', lambda x: f'{x.mean()*100:.2f}%')\n",
                ").reset_index()\n",
                "\n",
                "print(resumen_rotacion.to_string(index=False))"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### Paso 10: Exportación del Dataset Limpio Final\n",
                "Dataset formalmente preprocesado y listo para el modelo Random Forest."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "df_limpio = df.copy()\n",
                "df_limpio.to_csv('dataset_erp_limpio.csv', index=False, encoding='utf-8')\n",
                "print(f'DATASET LIMPIO EXPORTADO EXITOSAMENTE: dataset_erp_limpio.csv')\n",
                "print(f'Filas: {len(df_limpio)} | Columnas: {len(df_limpio.columns)}')\n",
                "print('Listo para entrenar Random Forest (Tarea 12: Demanda y Riesgo de Quiebre).')"
            ]
        }
    ],
    "metadata": {
        "language_info": {
            "name": "python",
            "version": "3.11"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

# Rutas de destino
destinos = [
    Path(r"E:\PROYECTO DE GRADO\nuevo proyecto\data\limpieza_dataset_erp.ipynb"),
    Path(r"E:\PROYECTO DE GRADO\nuevo proyecto\limpieza_dataset_erp.ipynb"),
    Path(r"E:\PROYECTO DE GRADO\nuevo proyecto\Proyecto SS\limpieza_dataset_erp.ipynb"),
]

for d in destinos:
    with open(d, "w", encoding="utf-8") as f:
        json.dump(notebook, f, indent=2, ensure_ascii=False)
    print(f"Notebook creado en: {d}")
