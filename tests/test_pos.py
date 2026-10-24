import pytest
from httpx import AsyncClient
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.products import Producto
from app.models.transactions import Venta, DetalleVenta
from app.models.users import Usuario
from app.core.security import create_access_token


def role_headers(user_id: int, role: str, email: str) -> dict[str, str]:
    """Genera una sesión de prueba por rol sin depender de contraseñas demo."""
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_pos_venta_exitosa_decrementa_stock(client: AsyncClient):
    """Venta exitosa a través de POS: decrementa stock, genera recibo y persiste Kárdex"""
    headers = role_headers(3, "CAJERO", "cajero@spartan.dev")

    # 2. Consultar producto y cliente
    async with AsyncSessionLocal() as session:
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-WHEY-001"))).scalar_one()
        cliente = (await session.execute(select(Usuario).where(Usuario.email == "cliente@spartan.dev"))).scalar_one()
        stock_inicial = prod.stock_actual
        prod_id = prod.id_producto
        precio_unitario = float(prod.precio_unitario)
        cliente_id = cliente.id_usuario

    cantidad_compra = 2
    payload = {
        "id_cliente": cliente_id,
        "items": [
            {"id_producto": prod_id, "cantidad": cantidad_compra}
        ]
    }

    # 3. Ejecutar POST /pos/ventas
    res = await client.post("/pos/ventas", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["total_transaccion"] == precio_unitario * cantidad_compra
    assert len(data["detalles"]) == 1
    assert data["detalles"][0]["codigo_sku"] == "SKU-WHEY-001"
    id_venta_creada = data["id_venta"]

    # 4. Verificar en base de datos
    async with AsyncSessionLocal() as verify_session:
        p = (await verify_session.execute(select(Producto).where(Producto.id_producto == prod_id))).scalar_one()
        assert p.stock_actual == stock_inicial - cantidad_compra

    # 5. Probar GET /pos/ventas/{id_venta}
    get_res = await client.get(f"/pos/ventas/{id_venta_creada}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id_venta"] == id_venta_creada

@pytest.mark.asyncio
async def test_pos_venta_dos_items_validos_recibo_con_total(client: AsyncClient):
    """POST /pos/ventas con 2 ítems válidos -> recibo con total y decremento exacto en base de datos"""
    headers = role_headers(3, "CAJERO", "cajero@spartan.dev")

    async with AsyncSessionLocal() as session:
        p1 = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-WHEY-001"))).scalar_one()
        p2 = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-CREA-001"))).scalar_one()
        cliente = (await session.execute(select(Usuario).where(Usuario.email == "cliente@spartan.dev"))).scalar_one()

        stock1_before = p1.stock_actual
        stock2_before = p2.stock_actual
        p1_id, p1_price = p1.id_producto, float(p1.precio_unitario)
        p2_id, p2_price = p2.id_producto, float(p2.precio_unitario)
        cliente_id = cliente.id_usuario

    cant1, cant2 = 2, 3
    total_esperado = (p1_price * cant1) + (p2_price * cant2)

    payload = {
        "id_cliente": cliente_id,
        "items": [
            {"id_producto": p1_id, "cantidad": cant1},
            {"id_producto": p2_id, "cantidad": cant2}
        ]
    }

    res = await client.post("/pos/ventas", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()

    # Validar recibo generado con total
    assert data["total_transaccion"] == total_esperado
    assert data["numero_recibo"].startswith("REC-")
    assert len(data["detalles"]) == 2

    # Validar que cada detalle tenga SKU y precio_historico congelado
    detalles_skus = {d["codigo_sku"]: d for d in data["detalles"]}
    assert "SKU-WHEY-001" in detalles_skus
    assert "SKU-CREA-001" in detalles_skus
    assert detalles_skus["SKU-WHEY-001"]["cantidad"] == cant1
    assert detalles_skus["SKU-WHEY-001"]["precio_historico"] == p1_price
    assert detalles_skus["SKU-CREA-001"]["cantidad"] == cant2
    assert detalles_skus["SKU-CREA-001"]["precio_historico"] == p2_price

    # Validar en SQL (SELECT stock_actual FROM erp.producto) el decremento exacto
    async with AsyncSessionLocal() as verify_session:
        p1_after = (await verify_session.execute(select(Producto).where(Producto.id_producto == p1_id))).scalar_one()
        p2_after = (await verify_session.execute(select(Producto).where(Producto.id_producto == p2_id))).scalar_one()

        assert p1_after.stock_actual == stock1_before - cant1
        assert p2_after.stock_actual == stock2_before - cant2

@pytest.mark.asyncio
async def test_pos_venta_quiebre_stock_rollback_total(client: AsyncClient):
    """Venta con 2 items donde el segundo quiebra stock -> 409 y NADA persistido (ni venta, ni primer detalle)"""
    headers = role_headers(3, "CAJERO", "cajero@spartan.dev")

    async with AsyncSessionLocal() as session:
        p1 = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-WHEY-001"))).scalar_one()
        p2 = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-CREA-001"))).scalar_one()
        stock1_init = p1.stock_actual
        stock2_init = p2.stock_actual
        p1_id = p1.id_producto
        p2_id = p2.id_producto
        p2_sku = p2.codigo_sku

    payload = {
        "items": [
            {"id_producto": p1_id, "cantidad": 2},
            {"id_producto": p2_id, "cantidad": stock2_init + 1000}  # Causa quiebre
        ]
    }

    res = await client.post("/pos/ventas", json=payload, headers=headers)
    assert res.status_code == 409
    assert p2_sku in res.json()["detail"]

    # Verificar que el stock de p1 NO se alteró (rollback total del primer item)
    async with AsyncSessionLocal() as verify_session:
        p1_db = (await verify_session.execute(select(Producto).where(Producto.id_producto == p1_id))).scalar_one()
        p2_db = (await verify_session.execute(select(Producto).where(Producto.id_producto == p2_id))).scalar_one()
        assert p1_db.stock_actual == stock1_init
        assert p2_db.stock_actual == stock2_init

@pytest.mark.asyncio
async def test_catalogo_crud_forbidden_for_cajero(client: AsyncClient):
    """CRUD catálogo devuelve 403 a rol CAJERO"""
    headers = role_headers(3, "CAJERO", "cajero@spartan.dev")

    # Intentar crear categoría
    res_cat = await client.post("/catalogo/categorias", json={"nombre_categoria": "NO_PERMITIDO"}, headers=headers)
    assert res_cat.status_code == 403

    # Intentar crear producto
    res_prod = await client.post("/catalogo/productos", json={
        "id_categoria": 1,
        "codigo_sku": "SKU-FORBIDDEN",
        "nombre_producto": "Invalido",
        "precio_unitario": 100.0
    }, headers=headers)
    assert res_prod.status_code == 403

@pytest.mark.asyncio
async def test_kardex_producto_query_admin(client: AsyncClient):
    """GET /kardex/producto/{id_producto} devuelve historial a ADMINISTRADOR"""
    login_res = await client.post(
        "/auth/token",
        data={"username": "admin@spartan.dev", "password": "SpartanAdmin2026!"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncSessionLocal() as session:
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-WHEY-001"))).scalar_one()
        prod_id = prod.id_producto

    res = await client.get(f"/kardex/producto/{prod_id}", headers=headers)
    assert res.status_code == 200
    kardex_data = res.json()
    assert isinstance(kardex_data, list)
    if len(kardex_data) > 0:
        assert "saldo_resultante" in kardex_data[0]
        assert "cantidad_movimiento" in kardex_data[0]

@pytest.mark.asyncio
async def test_pos_listar_clientes_rbac(client: AsyncClient):
    """GET /pos/clientes devuelve 403 Forbidden para rol CLIENTE y 200 OK para CAJERO/ADMINISTRADOR"""
    # 1. Sesión de rol CLIENTE
    headers_cliente = role_headers(4, "CLIENTE", "cliente@spartan.dev")

    # 2. Intentar listar clientes como CLIENTE -> 403 Forbidden
    res_cli = await client.get("/pos/clientes", headers=headers_cliente)
    assert res_cli.status_code == 403
    assert "Permisos insuficientes" in res_cli.json()["detail"]

    # 3. Sesión de rol CAJERO
    headers_cajero = role_headers(3, "CAJERO", "cajero@spartan.dev")

    # 4. Listar clientes como CAJERO -> 200 OK
    res_cajero = await client.get("/pos/clientes", headers=headers_cajero)
    assert res_cajero.status_code == 200
    clientes = res_cajero.json()
    assert isinstance(clientes, list)
    assert len(clientes) > 0
    assert all("id_usuario" in c and "nombres" in c and "email" in c for c in clientes)
