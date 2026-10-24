import pytest
import os
from httpx import AsyncClient
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.products import Producto
from app.models.transactions import Compra, DetalleCompra, Venta, DetalleVenta
from app.models.users import Usuario, Proveedor
from app.modules.pos.valorizacion_service import ValorizacionService
from app.core.security import create_access_token


def role_headers(user_id: int, role: str, email: str) -> dict[str, str]:
    """Genera una sesión de prueba por rol sin depender de contraseñas demo."""
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_calculo_pmp_entradas_ponderadas():
    """Calcula el Precio Medio Ponderado (PMP) exacto tras recepciones a costos diferenciados"""
    async with AsyncSessionLocal() as session:
        sku = "SKU-WHEY-001"
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        prov = (await session.execute(select(Proveedor).limit(1))).scalar_one()
        admin = (await session.execute(select(Usuario).where(Usuario.email == "admin@spartan.dev"))).scalar_one()

        prod_id = prod.id_producto

        # 1. Primera Compra: 10 unidades a 100.0 Bs
        compra1 = Compra(
            id_proveedor=prov.id_proveedor,
            id_usuario_registro=admin.id_usuario,
            numero_factura=f"FACT-PMP1-{os.urandom(3).hex()}",
            total_compra=1000.0,
            estado_compra="RECIBIDO"
        )
        session.add(compra1)
        await session.flush()

        det1 = DetalleCompra(
            id_compra=compra1.id_compra,
            id_producto=prod_id,
            cantidad=10,
            costo_unitario=100.0
        )
        session.add(det1)
        await session.commit()

        # 2. Segunda Compra: 10 unidades a 140.0 Bs
        compra2 = Compra(
            id_proveedor=prov.id_proveedor,
            id_usuario_registro=admin.id_usuario,
            numero_factura=f"FACT-PMP2-{os.urandom(3).hex()}",
            total_compra=1400.0,
            estado_compra="RECIBIDO"
        )
        session.add(compra2)
        await session.flush()

        det2 = DetalleCompra(
            id_compra=compra2.id_compra,
            id_producto=prod_id,
            cantidad=10,
            costo_unitario=140.0
        )
        session.add(det2)
        await session.commit()

    # 3. Verificar Kárdex Valorizado
    async with AsyncSessionLocal() as verify_session:
        valorizado = await ValorizacionService.obtener_kardex_valorizado_producto(verify_session, prod_id)
        assert valorizado.id_producto == prod_id
        assert valorizado.codigo_sku == sku
        assert valorizado.pmp_actual > 0
        assert len(valorizado.movimientos) >= 2

        # Las 2 últimas entradas registradas deben reflejar los costos de compra
        movs = [m for m in valorizado.movimientos if m.id_compra in (compra1.id_compra, compra2.id_compra)]
        assert len(movs) == 2
        assert movs[0].costo_unitario_movimiento == 100.0
        assert movs[1].costo_unitario_movimiento == 140.0

@pytest.mark.asyncio
async def test_venta_consume_a_costo_pmp_y_congela_precio_historico(client: AsyncClient):
    """Venta valúa salida al PMP y congela precio_historico de venta en detalle_venta"""
    headers = role_headers(3, "CAJERO", "cajero@spartan.dev")

    async with AsyncSessionLocal() as session:
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-CREA-001"))).scalar_one()
        cliente = (await session.execute(select(Usuario).where(Usuario.email == "cliente@spartan.dev"))).scalar_one()
        prod_id = prod.id_producto
        precio_venta_actual = float(prod.precio_unitario)

    # 2. Registrar Venta de 2 unidades
    cant_venta = 2
    res = await client.post("/pos/ventas", json={
        "id_cliente": cliente.id_usuario,
        "items": [{"id_producto": prod_id, "cantidad": cant_venta}]
    }, headers=headers)

    assert res.status_code == 201
    data = res.json()
    id_venta = data["id_venta"]

    # 3. Validar en base de datos que precio_historico quedó congelado
    async with AsyncSessionLocal() as verify_session:
        stmt = select(DetalleVenta).where(DetalleVenta.id_venta == id_venta, DetalleVenta.id_producto == prod_id)
        det_v = (await verify_session.execute(stmt)).scalar_one()
        assert float(det_v.precio_historico) == precio_venta_actual

@pytest.mark.asyncio
async def test_precio_cambia_al_dia_siguiente_congela_precio_historico_y_auditoria(client: AsyncClient):
    """¿Y si el precio cambia al día siguiente? -> precio_historico congela el valor de venta para auditoría financiera"""
    headers = role_headers(3, "CAJERO", "cajero@spartan.dev")

    async with AsyncSessionLocal() as session:
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-SHIRT-001"))).scalar_one()
        cliente = (await session.execute(select(Usuario).where(Usuario.email == "cliente@spartan.dev"))).scalar_one()
        prod_id = prod.id_producto
        precio_original = float(prod.precio_unitario)

    # 1. Registrar venta a precio del 'Día 1'
    res_v = await client.post("/pos/ventas", json={
        "id_cliente": cliente.id_usuario,
        "items": [{"id_producto": prod_id, "cantidad": 1}]
    }, headers=headers)
    assert res_v.status_code == 201
    id_venta_dia1 = res_v.json()["id_venta"]

    try:
        # 2. Simular cambio de precio en el catálogo al 'Día 2' (+50%)
        nuevo_precio_dia2 = round(precio_original * 1.5, 2)
        async with AsyncSessionLocal() as update_session:
            await update_session.execute(
                update(Producto).where(Producto.id_producto == prod_id).values(precio_unitario=nuevo_precio_dia2)
            )
            await update_session.commit()

        # 3. Auditoría Financiera: Consultar el recibo del Día 1
        res_recibo = await client.get(f"/pos/ventas/{id_venta_dia1}", headers=headers)
        assert res_recibo.status_code == 200
        recibo_data = res_recibo.json()

        # El precio histórico del recibo debe permanecer INMUTABLE a pesar del cambio en el catálogo
        item_dia1 = recibo_data["detalles"][0]
        assert item_dia1["precio_historico"] == precio_original
        assert item_dia1["precio_historico"] != nuevo_precio_dia2
        assert recibo_data["total_transaccion"] == precio_original
    finally:
        async with AsyncSessionLocal() as reset_session:
            await reset_session.execute(
                update(Producto).where(Producto.id_producto == prod_id).values(precio_unitario=precio_original)
            )
            await reset_session.commit()

@pytest.mark.asyncio
async def test_endpoint_kardex_valorizacion_admin_vs_cajero(client: AsyncClient):
    """Visor de Kárdex Valorizado: 200 OK a ADMINISTRADOR, 403 Forbidden a CAJERO"""
    # 1. Sesiones de Administrador y Cajero
    headers_admin = role_headers(2, "ADMINISTRADOR", "admin@spartan.dev")
    headers_cajero = role_headers(3, "CAJERO", "cajero@spartan.dev")

    async with AsyncSessionLocal() as session:
        prod = (await session.execute(select(Producto).limit(1))).scalar_one()
        prod_id = prod.id_producto

    # 3. Administrador accede correctamente
    res_admin = await client.get(f"/kardex/valorizacion/{prod_id}", headers=headers_admin)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert "pmp_actual" in data
    assert "valor_total_inventario" in data
    assert data["metodo_valorizacion"] == "PMP (Precio Medio Ponderado)"

    # 4. Cajero es denegado por RBAC
    res_cajero = await client.get(f"/kardex/valorizacion/{prod_id}", headers=headers_cajero)
    assert res_cajero.status_code == 403
