"""
Generador del Dataset Histórico ERP y Optimización de Stock.
Spartan Suplementos Bolivia — Dominio Transaccional y de Inventarios (ERP).

Este dataset pertenece EXCLUSIVAMENTE al dominio ERP (Transaccional / Inventario):
  - Ventas históricas de productos (30 SKUs)
  - Dinámica de inventarios, stock de seguridad y quiebres de stock
  - Features temporales para Random Forest (demanda futura y riesgo de desabastecimiento)
  - CERO datos o atributos de análisis físico / antropometría (dominio 100% ERP).

Exporta:
  - data/dataset_historico_erp.csv (datos analíticos para Machine Learning, sin fuga de datos)
  - data/reporte_dataset_erp.xlsx (3 hojas: Resumen_Operaciones, Rotacion_y_Quiebres_Categoria, Estadistica_Descriptiva)

Garantía: Reproducibilidad determinista estricta con seed = 42.

Calibración DGP v3: escenarios de stress con shocks no anticipados en holdout
y un cambio de régimen por inversión de tendencia.
"""

import hashlib
import io
import logging
import os
import random
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
import pandas as pd
from scipy import stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("generar_dataset_erp")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
CSV_PATH_DEFAULT = DATA_DIR / "dataset_historico_erp.csv"
XLSX_PATH_DEFAULT = DATA_DIR / "reporte_dataset_erp.xlsx"


# ==============================================================================
# 1. CATÁLOGO MAESTRO DE 30 SKUS (DOMINIO ERP)
# ==============================================================================

CATALOGO_30_SKUS: List[Dict] = [
    # --- SUPLEMENTOS: Whey Protein Concentrada (4 SKUs) ---
    {
        "id_producto": 1,
        "codigo_sku": "SKU-WPC-001",
        "nombre_producto": "100% Whey Gold Standard 5lb (Optimum Nutrition)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Concentrada",
        "costo_unitario": 250.00,
        "precio_unitario": 390.00,
        "stock_seguridad": 10,
        "stock_inicial": 20,
    },
    {
        "id_producto": 2,
        "codigo_sku": "SKU-WPC-002",
        "nombre_producto": "Nitro-Tech 100% Whey Gold 5.5lb (MuscleTech)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Concentrada",
        "costo_unitario": 260.00,
        "precio_unitario": 410.00,
        "stock_seguridad": 10,
        "stock_inicial": 20,
    },
    {
        "id_producto": 3,
        "codigo_sku": "SKU-WPC-003",
        "nombre_producto": "Prostar 100% Whey 2lb (Ultimate Nutrition)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Concentrada",
        "costo_unitario": 160.00,
        "precio_unitario": 260.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 4,
        "codigo_sku": "SKU-WPC-004",
        "nombre_producto": "ADN Whey Protein Concentrada 2kg",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Concentrada",
        "costo_unitario": 190.00,
        "precio_unitario": 310.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    # --- SUPLEMENTOS: Whey Protein Isolatada (4 SKUs) ---
    {
        "id_producto": 5,
        "codigo_sku": "SKU-WPI-001",
        "nombre_producto": "ISO 100 Hydrolyzed 5lb Gourmet (Dymatize)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Isolatada",
        "costo_unitario": 340.00,
        "precio_unitario": 520.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 6,
        "codigo_sku": "SKU-WPI-002",
        "nombre_producto": "IsoPhorm Hydrolyzed Isolate 2lb (Dragon Pharma)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Isolatada",
        "costo_unitario": 220.00,
        "precio_unitario": 350.00,
        "stock_seguridad": 6,
        "stock_inicial": 15,
    },
    {
        "id_producto": 7,
        "codigo_sku": "SKU-WPI-003",
        "nombre_producto": "IsoFit Pure Whey Isolate 5lb (Nutrex Research)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Isolatada",
        "costo_unitario": 320.00,
        "precio_unitario": 490.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 8,
        "codigo_sku": "SKU-WPI-004",
        "nombre_producto": "IsoJect Premium Cold-Filtered Isolate 4lb (Evogen)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Whey Protein Isolatada",
        "costo_unitario": 330.00,
        "precio_unitario": 510.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    # --- SUPLEMENTOS: Creatina Monohidratada (6 SKUs) ---
    {
        "id_producto": 9,
        "codigo_sku": "SKU-CRE-001",
        "nombre_producto": "Creatina Monohidratada Creapure 300g (Spartan Pure)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Creatina Monohidratada",
        "costo_unitario": 110.00,
        "precio_unitario": 190.00,
        "stock_seguridad": 12,
        "stock_inicial": 25,
    },
    {
        "id_producto": 10,
        "codigo_sku": "SKU-CRE-002",
        "nombre_producto": "Platinum 100% Creatine 400g (MuscleTech)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Creatina Monohidratada",
        "costo_unitario": 130.00,
        "precio_unitario": 220.00,
        "stock_seguridad": 12,
        "stock_inicial": 25,
    },
    {
        "id_producto": 11,
        "codigo_sku": "SKU-CRE-003",
        "nombre_producto": "ADN 100% Micronized Creatine 500g",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Creatina Monohidratada",
        "costo_unitario": 150.00,
        "precio_unitario": 250.00,
        "stock_seguridad": 10,
        "stock_inicial": 22,
    },
    {
        "id_producto": 12,
        "codigo_sku": "SKU-CRE-004",
        "nombre_producto": "Creatine Drive Black 300g (Nutrex Research)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Creatina Monohidratada",
        "costo_unitario": 120.00,
        "precio_unitario": 200.00,
        "stock_seguridad": 10,
        "stock_inicial": 22,
    },
    {
        "id_producto": 13,
        "codigo_sku": "SKU-CRE-005",
        "nombre_producto": "Creatine-XS Micronized 300g (Ronnie Coleman RCSS)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Creatina Monohidratada",
        "costo_unitario": 115.00,
        "precio_unitario": 195.00,
        "stock_seguridad": 10,
        "stock_inicial": 22,
    },
    {
        "id_producto": 14,
        "codigo_sku": "SKU-CRE-006",
        "nombre_producto": "ON Micronized Creatine Powder 600g (Optimum)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Creatina Monohidratada",
        "costo_unitario": 175.00,
        "precio_unitario": 290.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    # --- SUPLEMENTOS: Quemadores Termogénicos (5 SKUs) ---
    {
        "id_producto": 15,
        "codigo_sku": "SKU-QTM-001",
        "nombre_producto": "Lipo-6 Black Ultra Concentrate 60 Caps (Nutrex)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Quemador Termogénico",
        "costo_unitario": 140.00,
        "precio_unitario": 240.00,
        "stock_seguridad": 10,
        "stock_inicial": 20,
    },
    {
        "id_producto": 16,
        "codigo_sku": "SKU-QTM-002",
        "nombre_producto": "Black Viper Termogénico Extremo 90 Caps (Dragon)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Quemador Termogénico",
        "costo_unitario": 170.00,
        "precio_unitario": 280.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 17,
        "codigo_sku": "SKU-QTM-003",
        "nombre_producto": "Hydroxycut Hardcore Elite 110 Caps (MuscleTech)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Quemador Termogénico",
        "costo_unitario": 160.00,
        "precio_unitario": 270.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 18,
        "codigo_sku": "SKU-QTM-004",
        "nombre_producto": "Lipodrene con Ephedra Extract 100 Tabs (Hi-Tech)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Quemador Termogénico",
        "costo_unitario": 180.00,
        "precio_unitario": 300.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 19,
        "codigo_sku": "SKU-QTM-005",
        "nombre_producto": "SuperHD Thermogenic Fat Burner 60 Caps (Cellucor)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Quemador Termogénico",
        "costo_unitario": 150.00,
        "precio_unitario": 250.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    # --- SUPLEMENTOS: Ganadores de Peso / Mass Gainers (5 SKUs) ---
    {
        "id_producto": 20,
        "codigo_sku": "SKU-MGA-001",
        "nombre_producto": "Serious Mass 12lb Chocolate (Optimum Nutrition)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Mass Gainer",
        "costo_unitario": 310.00,
        "precio_unitario": 480.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 21,
        "codigo_sku": "SKU-MGA-002",
        "nombre_producto": "Super Mass Gainer 12lb Vainilla (Dymatize)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Mass Gainer",
        "costo_unitario": 320.00,
        "precio_unitario": 490.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 22,
        "codigo_sku": "SKU-MGA-003",
        "nombre_producto": "Mass-Tech Extreme 2000 7lb (MuscleTech)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Mass Gainer",
        "costo_unitario": 280.00,
        "precio_unitario": 430.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 23,
        "codigo_sku": "SKU-MGA-004",
        "nombre_producto": "King Mass XL 6lb (Ronnie Coleman RCSS)",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Mass Gainer",
        "costo_unitario": 240.00,
        "precio_unitario": 380.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 24,
        "codigo_sku": "SKU-MGA-005",
        "nombre_producto": "ADN Big M Mega Gainer 3kg Chocolate",
        "categoria": "SUPLEMENTOS",
        "subcategoria": "Mass Gainer",
        "costo_unitario": 210.00,
        "precio_unitario": 340.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    # --- INDUMENTARIA: Camisetas Técnicas (3 SKUs) ---
    {
        "id_producto": 25,
        "codigo_sku": "SKU-IND-CAM01",
        "nombre_producto": "Camiseta Técnica Spartan Dry-Fit Talla M Black",
        "categoria": "INDUMENTARIA",
        "subcategoria": "Camiseta Técnica",
        "costo_unitario": 60.00,
        "precio_unitario": 130.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 26,
        "codigo_sku": "SKU-IND-CAM02",
        "nombre_producto": "Camiseta Técnica Spartan Dry-Fit Talla L Gold",
        "categoria": "INDUMENTARIA",
        "subcategoria": "Camiseta Técnica",
        "costo_unitario": 60.00,
        "precio_unitario": 130.00,
        "stock_seguridad": 8,
        "stock_inicial": 18,
    },
    {
        "id_producto": 27,
        "codigo_sku": "SKU-IND-CAM03",
        "nombre_producto": "Camiseta Tirantes Spartan Stringer Pro XL",
        "categoria": "INDUMENTARIA",
        "subcategoria": "Camiseta Técnica",
        "costo_unitario": 55.00,
        "precio_unitario": 120.00,
        "stock_seguridad": 6,
        "stock_inicial": 15,
    },
    # --- INDUMENTARIA: Shorts de Compresión (3 SKUs) ---
    {
        "id_producto": 28,
        "codigo_sku": "SKU-IND-SHT01",
        "nombre_producto": "Short Compresión 2-en-1 Spartan Stealth M",
        "categoria": "INDUMENTARIA",
        "subcategoria": "Short de Compresión",
        "costo_unitario": 75.00,
        "precio_unitario": 160.00,
        "stock_seguridad": 6,
        "stock_inicial": 15,
    },
    {
        "id_producto": 29,
        "codigo_sku": "SKU-IND-SHT02",
        "nombre_producto": "Short Compresión 2-en-1 Spartan Stealth L",
        "categoria": "INDUMENTARIA",
        "subcategoria": "Short de Compresión",
        "costo_unitario": 75.00,
        "precio_unitario": 160.00,
        "stock_seguridad": 6,
        "stock_inicial": 15,
    },
    {
        "id_producto": 30,
        "codigo_sku": "SKU-IND-SHT03",
        "nombre_producto": "Short Pro Combat Compresión Spartan XL",
        "categoria": "INDUMENTARIA",
        "subcategoria": "Short de Compresión",
        "costo_unitario": 70.00,
        "precio_unitario": 150.00,
        "stock_seguridad": 6,
        "stock_inicial": 15,
    },
]


def obtener_catalogo_30_skus() -> List[Dict]:
    """Retorna una copia independiente del catálogo oficial de 30 SKUs."""
    return [dict(p) for p in CATALOGO_30_SKUS]


# ==============================================================================
# 2. CLIENTES DEL SISTEMA ERP (500 USUARIOS POS / TIENDA)
# ==============================================================================

def obtener_clientes_500(seed: int = 42) -> List[Dict]:
    """
    Genera 500 registros de clientes de tienda/POS para simular el comportamiento
    transaccional en el ERP.
    Cada cliente cuenta con un identificador y ponderación de frecuencia de compra
    siguiendo la distribución de Pareto (distribución Gamma).
    NO contiene atributos de somatotipo ni antropometría (dominio 100% ERP).
    """
    rng = np.random.RandomState(seed)
    pesos_gamma = rng.gamma(shape=2.0, scale=1.0, size=500)
    p_visita = pesos_gamma / pesos_gamma.sum()

    clientes = []
    for i in range(500):
        clientes.append({
            "id_cliente": i + 1,
            "peso_frecuencia_visita": float(p_visita[i]),
        })
    return clientes


# ==============================================================================
# 3. MOTOR DE SIMULACIÓN DE VENTAS HISTÓRICAS Y GESTIÓN DE STOCK (ERP)
# ==============================================================================

def generar_dataset_completo(
    seed: int = 42,
    ruta_csv: Optional[str] = None,
    ruta_xlsx: Optional[str] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict]:
    """
    Ejecuta la simulación transaccional completa y feature engineering exclusivo de ERP:
      - 12 meses cronológicos de ventas históricas (2025-01-01 al 2025-12-31)
      - Exactamente 1,123 transacciones operacionales
      - Estacionalidad temporal en ventas (+20% fines de semana y cierre de mes)
      - Distribución de demanda por categoría/producto según rotación real en retail fitness
      - Calibración de quiebres de stock en [12%, 18%]
      - Blindaje estricto contra fuga de datos (warm-up 30 días, horizonte futuro 7 días)
      - Exportación de dataset CSV y reporte Excel multi-hoja
    """
    random.seed(seed)
    np.random.seed(seed)
    rng = np.random.default_rng(seed)

    catalogo = obtener_catalogo_30_skus()
    clientes = obtener_clientes_500(seed=seed)

    p_clientes = np.array([c["peso_frecuencia_visita"] for c in clientes])
    p_clientes = p_clientes / p_clientes.sum()

    # Ponderaciones de demanda de mercado realistas para retail fitness
    # Creatinas y Whey Protein concentrada son los productos de más alta rotación
    pesos_subcat = {
        "Creatina Monohidratada": 0.28,
        "Whey Protein Concentrada": 0.22,
        "Quemador Termogénico": 0.15,
        "Whey Protein Isolatada": 0.13,
        "Mass Gainer": 0.12,
        "Camiseta Técnica": 0.05,
        "Short de Compresión": 0.05,
    }

    skus_by_subcat: Dict[str, List[Dict]] = {}
    for p in catalogo:
        skus_by_subcat.setdefault(p["subcategoria"], []).append(p)

    subcats = list(pesos_subcat.keys())
    probs_subcats = [pesos_subcat[s] for s in subcats]
    probs_subcats = np.array(probs_subcats) / sum(probs_subcats)

    # ==========================================================================
    # CALIBRACIÓN DGP v3: ESCENARIOS DE STRESS
    # AR(1), promociones observables, shocks no anticipados y cambio de régimen.
    # ==========================================================================
    # 1. Definición del Calendario Temporal
    warmup_days = [date(2024, 12, 2) + timedelta(days=i) for i in range(30)]
    official_days = [date(2025, 1, 1) + timedelta(days=i) for i in range(365)]
    future_days = [date(2026, 1, 1) + timedelta(days=i) for i in range(14)]
    all_days = warmup_days + official_days + future_days
    day_to_idx = {d: i for i, d in enumerate(all_days)}
    n_days = len(all_days)

    # 2. Parámetros por producto y matrices de eventos observables/no observables.
    prod_params = {}
    promo_matrix = np.zeros((31, n_days), dtype=int)
    shock_event_matrix = np.zeros((31, n_days), dtype=int)
    shock_multiplier_matrix = np.ones((31, n_days), dtype=float)
    regime_change_matrix = np.zeros((31, n_days), dtype=int)

    for idx, p in enumerate(catalogo):
        pid = p["id_producto"]
        # Demanda base diferenciada por producto
        base_d = 0.8 + 4.5 * ((idx * 11) % 30) / 29.0
        rho = 0.70 + 0.10 * (idx % 3) / 2.0  # rho en [0.70, 0.75, 0.80]
        trend = -0.003 + 0.006 * (idx % 4) / 3.0  # +-0.3% semanal

        # 2-3 picos promocionales por producto con anticipación de 7 días
        picos = [int(rng.integers(45, 130)), int(rng.integers(160, 260)), int(rng.integers(285, 375))]
        for p_day in picos:
            st = max(0, p_day - 7)
            en = min(n_days, p_day + 3)
            promo_matrix[pid, st:en] = 1

        prod_params[pid] = {
            "base": base_d,
            "rho": rho,
            "trend": trend,
            "picos": picos,
        }

    # Calibración DGP v3: escenarios de stress con shocks no anticipados en holdout
    # y un cambio de régimen por inversión de tendencia.
    stress_scenarios = [
        {
            "id": 1,
            "inicio": date(2025, 11, 8),
            "duracion": 2,
            "productos": [27, 25, 24, 4, 6],
            "multiplicador": 2.6,
        },
        {
            "id": 2,
            "inicio": date(2025, 11, 26),
            "duracion": 2,
            "productos": [15, 22, 13, 7, 12],
            "multiplicador": 2.6,
        },
        {
            "id": 3,
            "inicio": date(2025, 12, 13),
            "duracion": 2,
            "productos": [18, 20, 30, 11, 9],
            "multiplicador": 2.6,
        },
    ]
    for escenario in stress_scenarios:
        inicio_idx = day_to_idx[escenario["inicio"]]
        fin_idx = inicio_idx + escenario["duracion"]
        for pid in escenario["productos"]:
            shock_event_matrix[pid, inicio_idx:fin_idx] = escenario["id"]
            shock_multiplier_matrix[pid, inicio_idx:fin_idx] = escenario["multiplicador"]
            # Elimina cualquier campaña aleatoria que pudiera anticipar el shock.
            promo_matrix[pid, max(0, inicio_idx - 7):fin_idx] = 0

    # Cambio de régimen: desde diciembre se invierte la pendiente previa para
    # seis productos. El evento está en holdout y no fue observado al entrenar.
    regime_start_idx = day_to_idx[date(2025, 12, 1)]
    regime_products = {3, 4, 13, 14, 22, 23}
    for pid in regime_products:
        regime_change_matrix[pid, regime_start_idx:] = 1

    # 3. Series temporales latentes de demanda diaria con AR(1), tendencia y estacionalidad
    D = np.zeros((31, n_days))
    for p in catalogo:
        pid = p["id_producto"]
        par = prod_params[pid]
        x = 0.0
        for t in range(n_days):
            x = par["rho"] * x + rng.normal(0, 0.08)
            d_curr = all_days[t]
            # Efecto fin de semana consistente (+20% promedio efectivo en transacciones y unidades)
            w_eff = 1.32 if d_curr.weekday() in (4, 5, 6) else 1.0
            m_eff = 1.15 if d_curr.day >= 28 else 1.0  # Fin de mes +15%
            if pid in regime_products and t >= regime_start_idx:
                nivel_cambio = 1.0 + par["trend"] * (regime_start_idx / 7.0)
                semanas_post = (t - regime_start_idx) / 7.0
                tr_eff = max(
                    0.6,
                    nivel_cambio + (-3.0 * par["trend"]) * semanas_post,
                )
            else:
                tr_eff = max(0.6, 1.0 + par["trend"] * (t / 7.0))
            pr_eff = 2.2 if any(p_day <= t < p_day + 3 for p_day in par["picos"]) else 1.0
            shock_eff = shock_multiplier_matrix[pid, t]
            D[pid, t] = max(
                0.1,
                par["base"] * tr_eff * w_eff * m_eff * pr_eff
                * shock_eff * np.exp(x),
            )

    # 4. Muestreo de transacciones (N = 1,123 oficiales, 92 warmup, 22 future)
    W_official = np.zeros((len(official_days), len(catalogo)))
    for d_idx, d in enumerate(official_days):
        for p_idx, p in enumerate(catalogo):
            W_official[d_idx, p_idx] = D[p["id_producto"], day_to_idx[d]]
    flat_probs_off = W_official.flatten() / W_official.sum()
    counts_off = rng.multinomial(1123, flat_probs_off).reshape(W_official.shape)

    W_wm = np.zeros((len(warmup_days), len(catalogo)))
    for d_idx, d in enumerate(warmup_days):
        for p_idx, p in enumerate(catalogo):
            W_wm[d_idx, p_idx] = D[p["id_producto"], day_to_idx[d]]
    counts_wm = rng.multinomial(92, W_wm.flatten() / W_wm.sum()).reshape(W_wm.shape)

    W_fut = np.zeros((len(future_days), len(catalogo)))
    for d_idx, d in enumerate(future_days):
        for p_idx, p in enumerate(catalogo):
            W_fut[d_idx, p_idx] = D[p["id_producto"], day_to_idx[d]]
    counts_fut = rng.multinomial(22, W_fut.flatten() / W_fut.sum()).reshape(W_fut.shape)

    q_probs = [0.55, 0.28, 0.12, 0.05]

    def crear_bloque_txs(dias_lista, grid_counts):
        txs = []
        for d_idx, d in enumerate(dias_lista):
            for p_idx, prod in enumerate(catalogo):
                cnt = grid_counts[d_idx, p_idx]
                pid = prod["id_producto"]
                glob_idx = day_to_idx[d]
                is_promo = int(promo_matrix[pid, glob_idx])
                shock_id = int(shock_event_matrix[pid, glob_idx])
                is_regime_change = int(regime_change_matrix[pid, glob_idx])
                for _ in range(cnt):
                    c_idx = rng.choice(500, p=p_clientes)
                    cliente = clientes[c_idx]
                    qty = int(rng.choice([1, 2, 3, 4], p=q_probs))
                    txs.append({
                        "fecha": d,
                        "id_cliente": cliente["id_cliente"],
                        "id_producto": pid,
                        "codigo_sku": prod["codigo_sku"],
                        "nombre_producto": prod["nombre_producto"],
                        "categoria": prod["categoria"],
                        "subcategoria": prod["subcategoria"],
                        "precio_unitario": float(prod["precio_unitario"]),
                        "stock_seguridad": int(prod["stock_seguridad"]),
                        "cantidad": qty,
                        "total_bs": round(qty * prod["precio_unitario"], 2),
                        "promo_activa": is_promo,
                        "es_shock_no_anticipado": int(shock_id > 0),
                        "id_evento_shock": shock_id,
                        "es_cambio_regimen": is_regime_change,
                    })
        return txs

    all_warmup = crear_bloque_txs(warmup_days, counts_wm)
    all_official = crear_bloque_txs(official_days, counts_off)
    all_future = crear_bloque_txs(future_days, counts_fut)

    all_official.sort(key=lambda x: x["fecha"])
    all_warmup.sort(key=lambda x: x["fecha"])
    all_future.sort(key=lambda x: x["fecha"])

    # 5. Simulación de Inventarios y Quiebres de Stock (Calibración ~15%)
    stock_actual_map = {p["id_producto"]: int(round(p["stock_inicial"] * 0.75)) for p in catalogo}
    stock_seg_map = {p["id_producto"]: int(p["stock_seguridad"]) for p in catalogo}
    ordenes_pendientes: Dict[int, List[Tuple[date, int]]] = {}

    lead_time = 32
    reorder_scale = 1.05

    quiebres_count = 0
    enriched_rows = []

    for tx_idx, tx in enumerate(all_official):
        current_date = tx["fecha"]
        pid = tx["id_producto"]
        qty = tx["cantidad"]
        t_idx = day_to_idx[current_date]

        # A. Recepción de órdenes de reposición programadas
        for p_id in list(ordenes_pendientes.keys()):
            pendientes = ordenes_pendientes[p_id]
            restantes = []
            for arr_date, arr_qty in pendientes:
                if arr_date <= current_date:
                    stock_actual_map[p_id] += arr_qty
                else:
                    restantes.append((arr_date, arr_qty))
            if restantes:
                ordenes_pendientes[p_id] = restantes
            else:
                del ordenes_pendientes[p_id]

        current_stock = stock_actual_map[pid]
        if current_stock < qty:
            quiebre = 1
            quiebres_count += 1
            stock_actual_map[pid] = 0
        else:
            quiebre = 0
            stock_actual_map[pid] -= qty

        # B. Disparar orden de reposición reactiva al alcanzar stock de seguridad
        if stock_actual_map[pid] <= stock_seg_map[pid] and pid not in ordenes_pendientes:
            q_reorder = max(1, int(round(stock_seg_map[pid] * reorder_scale)))
            arrival_date = current_date + timedelta(days=lead_time)
            ordenes_pendientes[pid] = [(arrival_date, q_reorder)]

        # C. Variables predictoras temporales AR(1) y target futuro
        v_7 = int(round(D[pid, max(0, t_idx - 7):t_idx].sum()))
        v_30 = int(round(D[pid, max(0, t_idx - 30):t_idx].sum()))
        demanda_futura = int(round(D[pid, t_idx:min(n_days, t_idx + 7)].sum()))
        demanda_futura = max(1, demanda_futura)

        # Riesgo de quiebre cuando el stock disponible es insuficiente frente al umbral crítico de demanda
        riesgo = 1 if current_stock < (demanda_futura * 0.25) else 0

        row = {
            "id_transaccion": f"TXN-{tx_idx+1:04d}",
            "fecha": str(current_date),
            "id_producto": pid,
            "codigo_sku": tx["codigo_sku"],
            "nombre_producto": tx["nombre_producto"],
            "categoria": tx["categoria"],
            "subcategoria": tx["subcategoria"],
            "id_cliente": tx["id_cliente"],
            "precio_unitario": float(tx["precio_unitario"]),
            "cantidad": qty,
            "total_bs": round(float(tx["total_bs"]), 2),
            "stock_actual": int(current_stock),
            "stock_seguridad": int(tx["stock_seguridad"]),
            "ventas_ultimos_7_dias": int(v_7),
            "ventas_ultimos_30_dias": int(v_30),
            "dia_semana": int(current_date.weekday()),
            "promo_activa": int(tx["promo_activa"]),
            "es_shock_no_anticipado": int(tx["es_shock_no_anticipado"]),
            "id_evento_shock": int(tx["id_evento_shock"]),
            "es_cambio_regimen": int(tx["es_cambio_regimen"]),
            "quiebre_stock": int(quiebre),
            "demanda_proxima_semana": int(demanda_futura),
            "riesgo_quiebre_stock": int(riesgo),
        }
        enriched_rows.append(row)

    df_analitico = pd.DataFrame(enriched_rows)
    df_transacciones = df_analitico[[
        "id_transaccion", "fecha", "id_producto", "codigo_sku", "nombre_producto",
        "categoria", "subcategoria", "id_cliente", "precio_unitario",
        "cantidad", "total_bs", "quiebre_stock"
    ]].copy()

    total_tx = len(df_analitico)
    total_unidades = int(df_analitico["cantidad"].sum())
    total_ingresos_bs = float(df_analitico["total_bs"].sum())
    tasa_quiebres = float(quiebres_count / total_tx)

    metricas_resumen = {
        "periodo": "2025-01-01 al 2025-12-31",
        "total_transacciones": total_tx,
        "total_unidades": total_unidades,
        "total_ingresos_bs": round(total_ingresos_bs, 2),
        "quiebres_stock": quiebres_count,
        "tasa_quiebres": tasa_quiebres,
        "total_skus": len(catalogo),
        "total_clientes": len(set(df_analitico["id_cliente"])),
        "ticket_promedio_bs": round(total_ingresos_bs / total_tx, 2),
        "ticket_promedio_unidades": round(total_unidades / total_tx, 2),
    }

    # Exportar a CSV (lineterminator='\n', UTF-8)
    target_csv = Path(ruta_csv) if ruta_csv else CSV_PATH_DEFAULT
    os.makedirs(target_csv.parent, exist_ok=True)
    df_analitico.to_csv(
        target_csv,
        index=False,
        encoding="utf-8",
        lineterminator="\n"
    )
    logger.info(f"Dataset CSV generado exitosamente: {target_csv} ({len(df_analitico)} filas)")

    # Exportar a Excel (3 hojas) si se solicitó o por defecto
    target_xlsx = Path(ruta_xlsx) if ruta_xlsx else (XLSX_PATH_DEFAULT if ruta_csv is None else None)
    if target_xlsx:
        os.makedirs(target_xlsx.parent, exist_ok=True)
        _exportar_reporte_excel(df_analitico, metricas_resumen, target_xlsx)
        logger.info(f"Reporte Excel generado exitosamente: {target_xlsx}")

    return df_transacciones, df_analitico, metricas_resumen


def _exportar_reporte_excel(df: pd.DataFrame, metricas: Dict, ruta_xlsx: Path):
    """
    Construye data/reporte_dataset_erp.xlsx con formato ejecutivo en 3 hojas (100% ERP):
      1. Resumen_Operaciones
      2. Rotacion_y_Quiebres_Categoria
      3. Estadistica_Descriptiva
    """
    # 1. Hoja 1: Resumen de Operaciones
    df_resumen = pd.DataFrame([
        {"Métrica Operacional": "Dominio del Dataset", "Valor": "ERP Transaccional e Inventarios"},
        {"Métrica Operacional": "Periodo de Operaciones Evaluado", "Valor": metricas["periodo"]},
        {"Métrica Operacional": "Total de Transacciones de Venta", "Valor": metricas["total_transacciones"]},
        {"Métrica Operacional": "Volumen Total de Unidades Vendidas", "Valor": metricas["total_unidades"]},
        {"Métrica Operacional": "Ingresos Brutos Totales (Bs.)", "Valor": f"{metricas['total_ingresos_bs']:,.2f} Bs."},
        {"Métrica Operacional": "Transacciones con Quiebre de Stock", "Valor": metricas["quiebres_stock"]},
        {"Métrica Operacional": "Tasa Efectiva de Quiebres de Stock", "Valor": f"{metricas['tasa_quiebres'] * 100:.2f}%"},
        {"Métrica Operacional": "Rango Calibrado de Quiebres Objetivo", "Valor": "[12.00%, 18.00%] (~15%)"},
        {"Métrica Operacional": "Total SKUs Activos en Catálogo", "Valor": metricas["total_skus"]},
        {"Métrica Operacional": "Clientes Únicos Registrados", "Valor": metricas["total_clientes"]},
        {"Métrica Operacional": "Ticket Promedio por Transacción (Bs.)", "Valor": f"{metricas['ticket_promedio_bs']:,.2f} Bs."},
        {"Métrica Operacional": "Ticket Promedio por Transacción (Unidades)", "Valor": f"{metricas['ticket_promedio_unidades']:.2f} unid."},
    ])

    # 2. Hoja 2: Rotación de Inventario y Quiebres por Categoría / Subcategoría
    df_pivot = df.groupby(["categoria", "subcategoria"]).agg(
        Transacciones=("id_transaccion", "count"),
        Unidades_Vendidas=("cantidad", "sum"),
        Ingresos_Totales_Bs=("total_bs", "sum"),
        Stock_Promedio=("stock_actual", "mean"),
        Quiebres_Stock=("quiebre_stock", "sum"),
        Tasa_Quiebres=("quiebre_stock", "mean"),
    ).reset_index()

    df_pivot["Stock_Promedio"] = df_pivot["Stock_Promedio"].round(2)
    df_pivot["Ingresos_Totales_Bs"] = df_pivot["Ingresos_Totales_Bs"].round(2)
    df_pivot["Tasa_Quiebres"] = (df_pivot["Tasa_Quiebres"] * 100).round(2).astype(str) + "%"

    # 3. Hoja 3: Estadística Descriptiva de Variables Numéricas
    cols_numericas = [
        "precio_unitario", "cantidad", "total_bs", "stock_actual", "stock_seguridad",
        "ventas_ultimos_7_dias", "ventas_ultimos_30_dias", "demanda_proxima_semana", "riesgo_quiebre_stock"
    ]
    df_stats = df[cols_numericas].describe(percentiles=[0.25, 0.50, 0.75]).T
    df_stats.index.name = "Variable ERP / Feature ML"
    df_stats = df_stats.reset_index()

    with pd.ExcelWriter(ruta_xlsx, engine="openpyxl") as writer:
        df_resumen.to_excel(writer, sheet_name="Resumen_Operaciones", index=False)
        df_pivot.to_excel(writer, sheet_name="Rotacion_y_Quiebres_Categoria", index=False)
        df_stats.to_excel(writer, sheet_name="Estadistica_Descriptiva", index=False)

    wb = openpyxl.load_workbook(ruta_xlsx)

    header_fill = PatternFill(start_color="1F497D", end_color="1F497D", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style="thin", color="D9D9D9"),
        right=Side(style="thin", color="D9D9D9"),
        top=Side(style="thin", color="D9D9D9"),
        bottom=Side(style="thin", color="D9D9D9"),
    )

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        ws.views.sheetView[0].showGridLines = True

        for cell in ws[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=ws.max_column):
            for cell in row:
                cell.border = thin_border
                if isinstance(cell.value, (int, float)):
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")

        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

    wb.save(ruta_xlsx)


# ==============================================================================
# 4. SALIDA CLI Y PRESENTACIÓN EN CONSOLA
# ==============================================================================

def imprimir_resumen_erp_consola(df: pd.DataFrame):
    """Calcula y despliega en consola el análisis ERP de rotación y quiebres por categoría."""
    tabla_cat = df.groupby("subcategoria").agg(
        Transacciones=("id_transaccion", "count"),
        Unidades=("cantidad", "sum"),
        Ingresos_Bs=("total_bs", "sum"),
        Quiebres=("quiebre_stock", "sum"),
        Tasa_Quiebre=("quiebre_stock", lambda x: f"{x.mean()*100:.2f}%")
    )

    print("\n" + "=" * 80)
    print("ANÁLISIS DE ROTACIÓN Y QUIEBRES DE STOCK POR SUBCATEGORÍA (ERP)")
    print("=" * 80)
    print(tabla_cat.to_string())
    print("-" * 80)

    # Test estadístico de estacionalidad (Ventas según fin de semana vs laborable)
    df["es_fin_de_semana"] = df["dia_semana"].isin([4, 5, 6])
    contingencia_estacional = pd.crosstab(df["es_fin_de_semana"], df["categoria"])
    chi2_stat, p_value, dof, _ = stats.chi2_contingency(contingencia_estacional)

    print(f"Test Estadístico Chi-cuadrado (Estacionalidad Fin de Semana vs Categoría):")
    print(f"  • Chi2:                   {chi2_stat:.4f}")
    print(f"  • p-valor:                {p_value:.4e}")
    print(f"  • Grados de libertad:     {dof}")
    print("=" * 80 + "\n")


def generar_transacciones_historicas(
    seed: int = 42,
    ruta_dataset_erp: Optional[str] = None,
    ruta_salida_csv: Optional[str] = None,
) -> pd.DataFrame:
    """
    Extensión del generador para la Tarea 13 (Motor de Reglas CART).
    Genera y persiste data/transacciones_historicas.csv con las columnas:
      id_venta, id_cliente, somatotipo_cliente, id_producto, categoria, cantidad, fecha.
    Inyecta afinidad producto-somatotipo no aleatoria garantizando explicabilidad de reglas.
    """
    project_root = Path(__file__).resolve().parent.parent
    if ruta_dataset_erp is None:
        ruta_dataset_erp = str(project_root / "data" / "dataset_historico_erp.csv")
    if ruta_salida_csv is None:
        ruta_salida_csv = str(project_root / "data" / "transacciones_historicas.csv")

    erp_path = Path(ruta_dataset_erp)
    if not erp_path.exists():
        generar_dataset_completo(seed=seed, ruta_csv=ruta_dataset_erp)

    df_erp = pd.read_csv(erp_path)

    def map_categoria_cart(subcat: str) -> str:
        s = str(subcat).lower()
        if "quemador" in s:
            return "QUEMADORES"
        elif "mass" in s:
            return "MASS_GAINER"
        elif "creatina" in s:
            return "CREATINA"
        elif "protein" in s or "whey" in s:
            return "PROTEINAS"
        else:
            return "INDUMENTARIA"

    df_erp["categoria_cart"] = df_erp["subcategoria"].apply(map_categoria_cart)

    rng = np.random.RandomState(seed)
    client_soma = {}
    for cid in range(1, 501):
        c_txs = df_erp[df_erp["id_cliente"] == cid]
        if len(c_txs) > 0:
            top_cat = c_txs["categoria_cart"].value_counts().index[0]
            if top_cat == "QUEMADORES":
                client_soma[cid] = "ENDOMORFO"
            elif top_cat == "MASS_GAINER":
                client_soma[cid] = "ECTOMORFO"
            elif top_cat == "PROTEINAS":
                client_soma[cid] = "MESOMORFO"
            elif top_cat == "CREATINA":
                client_soma[cid] = rng.choice(["ECTOMORFO", "MESOMORFO"])
            else:
                client_soma[cid] = rng.choice(["ECTOMORFO", "MESOMORFO", "ENDOMORFO"])
        else:
            client_soma[cid] = rng.choice(["ECTOMORFO", "MESOMORFO", "ENDOMORFO"])

    df_trans = pd.DataFrame({
        "id_venta": df_erp["id_transaccion"],
        "id_cliente": df_erp["id_cliente"],
        "somatotipo_cliente": df_erp["id_cliente"].map(client_soma),
        "id_producto": df_erp["id_producto"],
        "categoria": df_erp["categoria_cart"],
        "cantidad": df_erp["cantidad"],
        "fecha": df_erp["fecha"],
    })

    salida_p = Path(ruta_salida_csv)
    salida_p.parent.mkdir(parents=True, exist_ok=True)
    df_trans.to_csv(salida_p, index=False)
    return df_trans



if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("GENERANDO DATASET HISTÓRICO ERP EXCLUSIVO (VENTAS Y STOCK)")
    print("=" * 80)

    df_tx, df_ml, kpis = generar_dataset_completo(seed=42)
    df_trans = generar_transacciones_historicas(seed=42)

    imprimir_resumen_erp_consola(df_ml)

    print("=" * 80)
    print("RESUMEN DE OPERACIONES Y CALIBRACIÓN DE INVENTARIO:")
    print(f"  • Total Transacciones:   {kpis['total_transacciones']}")
    print(f"  • Unidades Vendidas:     {kpis['total_unidades']}")
    print(f"  • Facturación Total:     {kpis['total_ingresos_bs']:,.2f} Bs.")
    print(f"  • Quiebres de Stock:     {kpis['quiebres_stock']} ({kpis['tasa_quiebres']*100:.2f}%)")
    print(f"  • Estado Tasa Quiebres:  {'CALIBRADO [12%, 18%]' if 0.12 <= kpis['tasa_quiebres'] <= 0.18 else 'FUERA DE RANGO'}")
    print(f"  • Archivo CSV generado:  {CSV_PATH_DEFAULT}")
    print(f"  • Archivo Excel:         {XLSX_PATH_DEFAULT}")
    print("=" * 80 + "\n")
