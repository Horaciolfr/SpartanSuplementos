"""
Script de prueba y optimización de calibración DGP v2.
"""

from datetime import date, timedelta
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.dummy import DummyRegressor
from sklearn.metrics import r2_score, root_mean_squared_error, balanced_accuracy_score, recall_score

import os, sys
from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.generar_dataset_erp import (
    obtener_catalogo_30_skus,
    obtener_clientes_500,
)

def simular_dgp_v2(seed: int = 42):
    rng = np.random.RandomState(seed)
    catalogo = obtener_catalogo_30_skus()
    clientes = obtener_clientes_500(seed=seed)
    
    # Probabilidades de cliente por Pareto
    pesos_gamma = rng.gamma(shape=2.0, scale=1.0, size=500)
    p_clientes = pesos_gamma / pesos_gamma.sum()
    
    # Calendario
    warmup_days = [date(2024, 12, 2) + timedelta(days=i) for i in range(30)]
    official_days = [date(2025, 1, 1) + timedelta(days=i) for i in range(365)]
    future_days = [date(2026, 1, 1) + timedelta(days=i) for i in range(7)]
    all_days = warmup_days + official_days + future_days
    n_days = len(all_days)
    day_to_idx = {d: i for i, d in enumerate(all_days)}
    
    # 1. Configuración por Producto para DGP v2:
    # AR(1) rho in [0.5, 0.8]
    # Tendencia semanal en [-0.005, +0.005] (+-0.5% semanal)
    prod_params = {}
    for p in catalogo:
        pid = p["id_producto"]
        rho = 0.50 + 0.30 * (rng.uniform(0.0, 1.0)) # rho in [0.5, 0.8]
        tendencia = rng.uniform(-0.005, 0.005) # +-0.5% semanal
        base_intensity = 0.5 + 1.5 * (pid % 5) / 4.0 # escala de demanda base
        
        # 2-3 picos promocionales en 2025 (días 30 a 390 en all_days)
        n_picos = rng.randint(2, 4)
        picos = []
        for _ in range(n_picos):
            pico_day_idx = rng.randint(45, 380) # dentro del año
            duracion = rng.randint(2, 5)
            picos.append((pico_day_idx, duracion))
            
        prod_params[pid] = {
            "rho": rho,
            "tendencia": tendencia,
            "base": base_intensity,
            "picos": picos
        }
        
    # 2. Generar series temporales latentes de demanda AR(1) por producto
    # d_t = rho * d_{t-1} + eps
    demanda_latente: Dict[int, np.ndarray] = {}
    promo_flag: Dict[int, np.ndarray] = {}
    
    for pid, params in prod_params.items():
        rho = params["rho"]
        trend = params["tendencia"]
        base = params["base"]
        picos = params["picos"]
        
        series = np.zeros(n_days)
        promo = np.zeros(n_days, dtype=int)
        
        # Marcar promo_activa: 7 días antes del pico hasta el fin del pico
        for pico_start, dur in picos:
            # promo activa 7 días antes
            p_activa_start = max(0, pico_start - 7)
            p_activa_end = min(n_days, pico_start + dur)
            promo[p_activa_start:p_activa_end] = 1
            
        # Generar proceso AR(1)
        eps = rng.normal(0, 0.35, size=n_days)
        x_t = 0.0
        for t in range(n_days):
            x_t = rho * x_t + eps[t]
            d_curr = all_days[t]
            
            # Tendencia suave por semana
            semana = t / 7.0
            factor_trend = max(0.6, 1.0 + trend * semana)
            
            # Efecto día-semana: sáb/dom +20% (weekday in (5, 6))
            factor_wd = 1.20 if d_curr.weekday() in (5, 6) else 1.0
            
            # Efecto fin de mes: día >= 28 (+15%)
            factor_m = 1.15 if d_curr.day >= 28 else 1.0
            
            # Factor promocional (impulso durante los días del pico)
            factor_promo = 1.0
            for p_start, dur in picos:
                if p_start <= t < p_start + dur:
                    factor_promo = 2.0
                    break
                    
            intensidad = base * factor_trend * factor_wd * factor_m * factor_promo * np.exp(x_t)
            series[t] = max(0.05, intensidad)
            
        demanda_latente[pid] = series
        promo_flag[pid] = promo

    # 3. Muestreo de Transacciones para mantener exactamente 1,123 oficiales
    # Matriz de pesos día x producto
    weights_matrix = np.zeros((len(official_days), len(catalogo)))
    for p_idx, p in enumerate(catalogo):
        pid = p["id_producto"]
        for d_idx, d in enumerate(official_days):
            glob_idx = day_to_idx[d]
            weights_matrix[d_idx, p_idx] = demanda_latente[pid][glob_idx]
            
    # Normalizar a probabilidades multinomiales conjuntas (día, producto)
    total_w = weights_matrix.sum()
    flat_probs = weights_matrix.flatten() / total_w
    
    # 1,123 extracciones oficiales
    flat_counts = rng.multinomial(1123, flat_probs)
    counts_grid = flat_counts.reshape(weights_matrix.shape)
    
    # Warmup (92 transacciones) y future (22 transacciones)
    # Similar ponderación
    wm_w = np.zeros((len(warmup_days), len(catalogo)))
    for p_idx, p in enumerate(catalogo):
        pid = p["id_producto"]
        for d_idx, d in enumerate(warmup_days):
            wm_w[d_idx, p_idx] = demanda_latente[pid][day_to_idx[d]]
    flat_wm = rng.multinomial(92, wm_w.flatten() / wm_w.sum()).reshape(wm_w.shape)
    
    fut_w = np.zeros((len(future_days), len(catalogo)))
    for p_idx, p in enumerate(catalogo):
        pid = p["id_producto"]
        for d_idx, d in enumerate(future_days):
            fut_w[d_idx, p_idx] = demanda_latente[pid][day_to_idx[d]]
    flat_fut = rng.multinomial(22, fut_w.flatten() / fut_w.sum()).reshape(fut_w.shape)
    
    q_probs = [0.55, 0.28, 0.12, 0.05]
    
    def crear_transacciones(dias_lista, grid_counts):
        txs = []
        for d_idx, d in enumerate(dias_lista):
            for p_idx, prod in enumerate(catalogo):
                cnt = grid_counts[d_idx, p_idx]
                pid = prod["id_producto"]
                glob_idx = day_to_idx[d]
                is_promo = int(promo_flag[pid][glob_idx])
                
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
                    })
        return txs

    all_warmup = crear_transacciones(warmup_days, flat_wm)
    all_official = crear_transacciones(official_days, counts_grid)
    all_future = crear_transacciones(future_days, flat_fut)
    
    # Ordenar cronológicamente
    all_official.sort(key=lambda x: x["fecha"])
    all_warmup.sort(key=lambda x: x["fecha"])
    all_future.sort(key=lambda x: x["fecha"])
    
    all_sim = all_warmup + all_official + all_future
    tx_by_date: Dict[date, List[Dict]] = {}
    for tx in all_sim:
        tx_by_date.setdefault(tx["fecha"], []).append(tx)
        
    # 4. Simulación de Inventarios (calibrando quiebres a ~15%)
    # Ajuste de lead_time y stock_inicial
    stock_actual_map = {p["id_producto"]: int(round(p["stock_inicial"] * 0.95)) for p in catalogo}
    stock_seg_map = {p["id_producto"]: int(p["stock_seguridad"]) for p in catalogo}
    ordenes_pendientes: Dict[int, List[Tuple[date, int]]] = {}
    
    lead_time = 32
    batch_scale = 0.75
    
    quiebres_count = 0
    enriched_rows = []
    
    for tx_idx, tx in enumerate(all_official):
        current_date = tx["fecha"]
        pid = tx["id_producto"]
        qty = tx["cantidad"]
        
        # Recepciones
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
            
        # Reorden reactivo
        if stock_actual_map[pid] <= stock_seg_map[pid] and pid not in ordenes_pendientes:
            q_reorder = max(1, int(round(stock_seg_map[pid] * batch_scale)))
            arrival_date = current_date + timedelta(days=lead_time)
            ordenes_pendientes[pid] = [(arrival_date, q_reorder)]
            
        # Históricos [t-30, t-1] y [t-7, t-1]
        v_7 = 0
        v_30 = 0
        for delta in range(1, 31):
            past_d = current_date - timedelta(days=delta)
            if past_d in tx_by_date:
                for p_tx in tx_by_date[past_d]:
                    if p_tx["id_producto"] == pid:
                        v_30 += p_tx["cantidad"]
                        if delta <= 7:
                            v_7 += p_tx["cantidad"]
                            
        # Demanda futura [t, t+6]
        demanda_futura = 0
        for delta in range(7):
            fut_d = current_date + timedelta(days=delta)
            if fut_d in tx_by_date:
                for f_tx in tx_by_date[fut_d]:
                    if f_tx["id_producto"] == pid:
                        demanda_futura += f_tx["cantidad"]
                        
        riesgo = 1 if current_stock < demanda_futura else 0
        
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
            "quiebre_stock": int(quiebre),
            "demanda_proxima_semana": int(demanda_futura),
            "riesgo_quiebre_stock": int(riesgo),
        }
        enriched_rows.append(row)
        
    df = pd.DataFrame(enriched_rows)
    tasa_quiebres = quiebres_count / len(df)
    print(f"Total TX: {len(df)}, Tasa Quiebres: {tasa_quiebres*100:.2f}% ({quiebres_count}/{len(df)})")
    return df

if __name__ == "__main__":
    df = simular_dgp_v2(seed=42)
    # Check ML metrics on train/test split (months 1-10 vs 11-12)
    df["fecha_dt"] = pd.to_datetime(df["fecha"])
    df_train = df[df["fecha_dt"] < "2025-11-01"]
    df_test = df[df["fecha_dt"] >= "2025-11-01"]
    print(f"Train: {len(df_train)}, Test: {len(df_test)}")
    
    # Feature preparation
    features_cols = ["stock_actual", "stock_seguridad", "ventas_ultimos_7_dias", "ventas_ultimos_30_dias", "dia_semana", "precio_unitario", "promo_activa"]
    X_train = df_train[features_cols]
    y_train_dem = df_train["demanda_proxima_semana"]
    y_train_qui = df_train["riesgo_quiebre_stock"]
    
    X_test = df_test[features_cols]
    y_test_dem = df_test["demanda_proxima_semana"]
    y_test_qui = df_test["riesgo_quiebre_stock"]
    
    dummy = DummyRegressor(strategy="mean").fit(X_train, y_train_dem)
    rmse_base = root_mean_squared_error(y_test_dem, dummy.predict(X_test))
    
    rf_reg = RandomForestRegressor(n_estimators=300, min_samples_split=10, min_samples_leaf=5, random_state=42, n_jobs=-1)
    rf_reg.fit(X_train, y_train_dem)
    preds_reg = rf_reg.predict(X_test)
    rmse_reg = root_mean_squared_error(y_test_dem, preds_reg)
    r2 = r2_score(y_test_dem, preds_reg)
    
    print("\n--- REGRESOR TEST ---")
    print(f"RMSE Base: {rmse_base:.4f}")
    print(f"RMSE Reg:  {rmse_reg:.4f} (Ratio: {rmse_reg/rmse_base:.4f}, Req <= 0.70)")
    print(f"R2 Reg:    {r2:.4f} (Req >= 0.75)")
    
    rf_clf = RandomForestClassifier(n_estimators=300, min_samples_split=10, min_samples_leaf=5, class_weight="balanced", random_state=42, n_jobs=-1)
    rf_clf.fit(X_train, y_train_qui)
    preds_clf = rf_clf.predict(X_test)
    bal_acc = balanced_accuracy_score(y_test_qui, preds_clf)
    rec = recall_score(y_test_qui, preds_clf, pos_label=1)
    
    print("\n--- CLASIFICADOR TEST ---")
    print(f"Balanced Acc: {bal_acc:.4f} (Req >= 0.80)")
    print(f"Recall:       {rec:.4f} (Req >= 0.85)")
