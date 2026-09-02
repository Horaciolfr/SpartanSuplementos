import asyncio
import os
import sys
from httpx import AsyncClient, ASGITransport

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.main import app

async def main():
    print("=== INICIANDO VALIDACIÓN END-TO-END DEL FLUJO SPA ===")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://localhost:8000") as client:
        # 1. Login Cajero
        print("\n1. POST /auth/token (Login Cajero)...")
        login_res = await client.post("/auth/token", data={"username": "cajero@spartan.dev", "password": "SpartanAdmin2026!"})
        print(f"Status: {login_res.status_code} - Res: {login_res.json()}")
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Obtener /auth/me
        print("\n2. GET /auth/me (Perfil de Usuario)...")
        me_res = await client.get("/auth/me", headers=headers)
        print(f"Status: {me_res.status_code} - Res: {me_res.json()}")
        assert me_res.status_code == 200

        # 3. Login Administrador para ver catálogo
        print("\n3. POST /auth/token (Login Administrador)...")
        admin_login = await client.post("/auth/token", data={"username": "admin@spartan.dev", "password": "SpartanAdmin2026!"})
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        print("\n4. GET /catalogo/productos (Catálogo de productos)...")
        prod_res = await client.get("/catalogo/productos", headers=admin_headers)
        print(f"Status: {prod_res.status_code} - Total productos: {len(prod_res.json())}")
        assert prod_res.status_code == 200
        productos = prod_res.json()
        p1 = productos[0]

        # 5. Emisión de Venta en POS
        print(f"\n5. POST /pos/ventas (Venta de 2 unidades de {p1['codigo_sku']})...")
        pos_payload = {
            "id_cliente": None,
            "items": [{"id_producto": p1["id_producto"], "cantidad": 2}]
        }
        venta_res = await client.post("/pos/ventas", json=pos_payload, headers=headers)
        print(f"Status: {venta_res.status_code} - Recibo generado: {venta_res.json()['numero_recibo']}, Total: Bs. {venta_res.json()['total_transaccion']}")
        assert venta_res.status_code == 201
        id_venta = venta_res.json()["id_venta"]

        # 6. Consulta de Recibo Digital
        print(f"\n6. GET /pos/ventas/{id_venta} (Consulta de Recibo Digital)...")
        recibo_res = await client.get(f"/pos/ventas/{id_venta}", headers=headers)
        print(f"Status: {recibo_res.status_code} - Recibo verificado: {recibo_res.json()['numero_recibo']}")
        assert recibo_res.status_code == 200

        # 7. Simulación de Quiebre de Stock (Control 409)
        print(f"\n7. POST /pos/ventas con cantidad excesiva (999999) para comprobar 409 Conflict...")
        fail_payload = {
            "id_cliente": None,
            "items": [{"id_producto": p1["id_producto"], "cantidad": 999999}]
        }
        fail_res = await client.post("/pos/ventas", json=fail_payload, headers=headers)
        print(f"Status: {fail_res.status_code} - Mensaje capturado: {fail_res.json()['detail']}")
        assert fail_res.status_code == 409

    print("\n=== TODAS LAS PRUEBAS DEL FLUJO SPA COMPLETADAS CON ÉXITO (0 ERRORES) ===")

if __name__ == "__main__":
    asyncio.run(main())
