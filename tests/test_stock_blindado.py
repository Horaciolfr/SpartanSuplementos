import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

import uuid

from app.core.database import engine
from app.core.security import create_access_token


def auth_bearer(user_id: int, role: str, email: str) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_update_directo_stock_actual_lanza_excepcion_trigger():
    """
    Verifica que cualquier mutación directa de stock_actual fuera del circuito
    de kárdex físico sea abortada inmediatamente por el trigger trg_proteger_stock_actual.
    """
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id_producto, stock_actual FROM erp.producto WHERE estado_activo = TRUE LIMIT 1")
        )
        row = res.fetchone()
        assert row is not None
        prod_id, stock_orig = row[0], row[1]

    # Intentar UPDATE directo sobre stock_actual sin GUC app.kardex_interno
    with pytest.raises(DBAPIError) as exc_info:
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE erp.producto SET stock_actual = stock_actual + 5 WHERE id_producto = :pid"),
                {"pid": prod_id},
            )

    err_msg = str(exc_info.value).lower()
    assert "violacion de integridad" in err_msg or "la modificacion directa de stock_actual esta prohibida" in err_msg

    # Comprobar que el stock no fue alterado
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT stock_actual FROM erp.producto WHERE id_producto = :pid"),
            {"pid": prod_id},
        )
        stock_final = res.scalar_one()
        assert stock_final == stock_orig


@pytest.mark.asyncio
async def test_update_otros_campos_no_afecta_trigger():
    """Verifica que mutaciones de otros atributos (precio, descripción) no sean bloqueadas por el trigger."""
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id_producto, precio_unitario FROM erp.producto WHERE estado_activo = TRUE LIMIT 1")
        )
        row = res.fetchone()
        assert row is not None
        prod_id, precio_orig = row[0], float(row[1])

    nuevo_precio = precio_orig + 1.0

    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE erp.producto SET precio_unitario = :p WHERE id_producto = :pid"),
            {"p": nuevo_precio, "pid": prod_id},
        )

    # Revertir cambio
    async with engine.begin() as conn:
        await conn.execute(
            text("UPDATE erp.producto SET precio_unitario = :p WHERE id_producto = :pid"),
            {"p": precio_orig, "pid": prod_id},
        )


@pytest.mark.asyncio
async def test_venta_via_detalle_muta_stock_y_registra_kardex(client: AsyncClient):
    """
    Verifica que una venta transaccional vía POS procesa el detalle a través de
    erp.fn_procesar_venta fijando app.kardex_interno='on', decrementa stock y audita kárdex.
    """
    headers = auth_bearer(1, "CAJERO", "cajero@spartan.dev")

    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id_producto, stock_actual FROM erp.producto WHERE estado_activo = TRUE AND stock_actual >= 5 LIMIT 1")
        )
        row = res.fetchone()
        assert row is not None
        prod_id, stock_antes = row[0], row[1]

    resp = await client.post(
        "/pos/ventas",
        json={
            "id_cliente": 4,
            "items": [{"id_producto": prod_id, "cantidad": 2}],
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    venta_id = resp.json()["id_venta"]

    # Verificar decremento de stock y asiento en kárdex
    async with engine.connect() as conn:
        res_stock = await conn.execute(
            text("SELECT stock_actual FROM erp.producto WHERE id_producto = :pid"),
            {"pid": prod_id},
        )
        stock_despues = res_stock.scalar_one()
        assert stock_despues == stock_antes - 2

        res_kardex = await conn.execute(
            text("""
                SELECT id_tipo_operacion, cantidad_movimiento, saldo_resultante
                FROM erp.kardex_fisico
                WHERE id_venta = :vid AND id_producto = :pid
            """),
            {"vid": venta_id, "pid": prod_id},
        )
        k_row = res_kardex.fetchone()
        assert k_row is not None
        assert k_row[0] == 2  # VENTA
        assert k_row[1] == 2  # Cantidad
        assert k_row[2] == stock_despues


@pytest.mark.asyncio
async def test_compra_via_detalle_incrementa_stock_y_registra_kardex():
    """
    Verifica que una recepción de compra transaccional a través del trigger erp.fn_procesar_compra
    fija app.kardex_interno='on', incrementa stock y audita kárdex.
    """
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id_producto, stock_actual FROM erp.producto WHERE estado_activo = TRUE LIMIT 1")
        )
        row = res.fetchone()
        assert row is not None
        prod_id, stock_antes = row[0], row[1]

    async with engine.begin() as conn:
        # Crear compra y detalle de compra
        c_res = await conn.execute(
            text("""
                INSERT INTO erp.compra (id_usuario_registro, id_proveedor, numero_factura, total_compra, estado_compra)
                VALUES (2, 1, :factura, 200.00, 'RECIBIDO')
                RETURNING id_compra
            """),
            {"factura": f"FAC-{uuid.uuid4().hex[:10]}"},
        )
        compra_id = c_res.scalar_one()

        await conn.execute(
            text("""
                INSERT INTO erp.detalle_compra (id_compra, id_producto, cantidad, costo_unitario)
                VALUES (:cid, :pid, 3, 50.00)
            """),
            {"cid": compra_id, "pid": prod_id},
        )

    # Verificar incremento de stock y asiento en kárdex
    async with engine.connect() as conn:
        res_stock = await conn.execute(
            text("SELECT stock_actual FROM erp.producto WHERE id_producto = :pid"),
            {"pid": prod_id},
        )
        stock_despues = res_stock.scalar_one()
        assert stock_despues == stock_antes + 3

        res_kardex = await conn.execute(
            text("""
                SELECT id_tipo_operacion, cantidad_movimiento, saldo_resultante
                FROM erp.kardex_fisico
                WHERE id_compra = :cid AND id_producto = :pid
            """),
            {"cid": compra_id, "pid": prod_id},
        )
        k_row = res_kardex.fetchone()
        assert k_row is not None
        assert k_row[0] == 1  # COMPRA
        assert k_row[1] == 3
        assert k_row[2] == stock_despues
