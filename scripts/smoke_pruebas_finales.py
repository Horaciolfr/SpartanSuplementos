#!/usr/bin/env python3
"""
scripts/smoke_pruebas_finales.py
Ejecución automatizada de los flujos humo por rol para el Acta de Pruebas Finales (Paso 3).
"""

import httpx
import json
import sys

BASE_URL = "http://127.0.0.1:8000"
PASSWORD = "SpartanAdmin2026!"

def run_smoke():
    client = httpx.Client(base_url=BASE_URL, timeout=15.0)

    print("=== INICIANDO SMOKE SUITE POR ROL — CERTIFICACIÓN FINAL ===")

    # 1. Login ADMINISTRADOR
    r_admin = client.post("/auth/token", data={"username": "admin@spartan.dev", "password": PASSWORD})
    assert r_admin.status_code == 200, f"Error login admin: {r_admin.text}"
    token_admin = r_admin.json()["access_token"]
    print(f"[OK] 1. Login ADMINISTRADOR: HTTP 200 (Token emitido: {token_admin[:16]}...)")

    # 2. Login CAJERO
    r_cajero = client.post("/auth/token", data={"username": "cajero@spartan.dev", "password": PASSWORD})
    assert r_cajero.status_code == 200, f"Error login cajero: {r_cajero.text}"
    token_cajero = r_cajero.json()["access_token"]
    print(f"[OK] 2. Login CAJERO: HTTP 200 (Token emitido: {token_cajero[:16]}...)")

    # 3. Login CLIENTE
    r_cliente = client.post("/auth/token", data={"username": "cliente@spartan.dev", "password": PASSWORD})
    assert r_cliente.status_code == 200, f"Error login cliente: {r_cliente.text}"
    token_cliente = r_cliente.json()["access_token"]
    print(f"[OK] 3. Login CLIENTE: HTTP 200 (Token emitido: {token_cliente[:16]}...)")

    # 4. Venta con recibo POS
    payload_venta = {
        "id_cliente": 4,
        "items": [{"id_producto": 26, "cantidad": 1}]
    }
    r_venta = client.post("/pos/ventas", json=payload_venta, headers={"Authorization": f"Bearer {token_cajero}"})
    assert r_venta.status_code == 201, f"Error venta POS: {r_venta.text}"
    venta_data = r_venta.json()
    recibo = venta_data.get("numero_recibo")
    print(f"[OK] 4. Venta con Recibo POS: HTTP 201 (Recibo: {recibo}, Total: Bs {venta_data.get('total_transaccion')})")

    # 5. Captura Demo
    with open("/app/tests/assets/sample_pose.jpg", "rb") as f:
        files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
        data = {"estatura_cm": "175.0", "peso_kg": "75.0"}
        r_pose = client.post("/ia/pose/analizar", files=files, data=data, headers={"Authorization": f"Bearer {token_admin}"})
    assert r_pose.status_code == 200, f"Error captura pose: {r_pose.text}"
    pose_data = r_pose.json()
    id_perfil = pose_data.get("id_perfil")
    visibilidad = pose_data.get("precision_captura")
    print(f"[OK] 5. Captura Biometría Demo: HTTP 200 (Perfil ID: {id_perfil}, Visibilidad Media: {visibilidad:.4f})")

    # 6. Prescripción con reglas CART
    r_presc = client.post(f"/ia/prescripcion/{id_perfil}/generar", headers={"Authorization": f"Bearer {token_admin}"})
    assert r_presc.status_code == 200, f"Error generar prescripcion: {r_presc.text}"
    presc_data = r_presc.json()
    candidatos = presc_data.get("prescripciones", [])
    print(f"[OK] 6. Prescripción con Reglas CART: HTTP 200 (Somatotipo: {presc_data.get('somatotipo')}, Recomendaciones: {len(candidatos)})")
    for idx, c in enumerate(candidatos, 1):
        print(f"      - Regla {idx}: [{c.get('codigo_regla')}] {c.get('nombre_producto')} (Afinidad: {c.get('umbral_decision')})")

    # 7. Ficha de cliente administrativo
    r_admin_cli = client.get("/admin/clientes?limit=5", headers={"Authorization": f"Bearer {token_admin}"})
    assert r_admin_cli.status_code == 200, f"Error clientes admin: {r_admin_cli.text}"
    cli_data = r_admin_cli.json()
    total_cli = cli_data.get("total")
    print(f"[OK] 7. Ficha de Cliente Administrativo: HTTP 200 (Total clientes registrados: {total_cli})")

    # 8. Predicciones con corte visible
    r_pred = client.get("/predicciones/dashboard?sucursal=TODAS&horizonte_dias=14", headers={"Authorization": f"Bearer {token_admin}"})
    assert r_pred.status_code == 200, f"Error predicciones: {r_pred.text}"
    pred_data = r_pred.json()
    metricas = pred_data.get("metricas_modelo", {})
    print(f"[OK] 8. Dashboard Predicciones con Corte: HTTP 200 (Corte serie: {metricas.get('corte_serie')}, ID Versión: {metricas.get('id_version')}, Hash: {metricas.get('hash_corto')}, Rótulo R2: '{metricas.get('r2_monetario_rotulo')}')")

    print("\n=== TODOS LOS FLUJOS HUMO CERTIFICADOS EN ESTADO VERDE ===")

if __name__ == "__main__":
    run_smoke()
