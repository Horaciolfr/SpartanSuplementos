import pytest
import os
import sys
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, DBAPIError

from app.core.database import AsyncSessionLocal
from app.models.products import Producto
from app.models.transactions import Compra, DetalleCompra, Venta, DetalleVenta
from app.models.kardex import KardexFisico
from app.models.users import Usuario, Proveedor

@pytest.mark.asyncio
async def test_compra_recibida_incrementa_stock_y_kardex():
    """a) Compra RECIBIDA con 2 detalles -> stock_actual incrementa y kárdex registra 2 filas con id_compra"""
    async with AsyncSessionLocal() as session:
        sku1 = "SKU-WHEY-001"
        sku2 = "SKU-CREA-001"

        prod1 = (await session.execute(select(Producto).where(Producto.codigo_sku == sku1))).scalar_one()
        prod2 = (await session.execute(select(Producto).where(Producto.codigo_sku == sku2))).scalar_one()
        prov = (await session.execute(select(Proveedor).limit(1))).scalar_one()
        admin = (await session.execute(select(Usuario).where(Usuario.email == "admin@spartan.dev"))).scalar_one()

        stock1_init = prod1.stock_actual
        stock2_init = prod2.stock_actual

        # Crear Compra con 2 detalles
        nueva_compra = Compra(
            id_proveedor=prov.id_proveedor,
            id_usuario_registro=admin.id_usuario,
            numero_factura=f"FACT-TEST-{os.urandom(4).hex()}",
            total_compra=prod1.precio_unitario * 10 + prod2.precio_unitario * 20,
            estado_compra="RECIBIDO"
        )
        session.add(nueva_compra)
        await session.flush()

        det1 = DetalleCompra(
            id_compra=nueva_compra.id_compra,
            id_producto=prod1.id_producto,
            cantidad=10,
            costo_unitario=prod1.precio_unitario
        )
        det2 = DetalleCompra(
            id_compra=nueva_compra.id_compra,
            id_producto=prod2.id_producto,
            cantidad=20,
            costo_unitario=prod2.precio_unitario
        )
        session.add_all([det1, det2])
        await session.commit()

        # Verificar incremento de stock y registros en kárdex
        async with AsyncSessionLocal() as verify_session:
            p1 = (await verify_session.execute(select(Producto).where(Producto.id_producto == prod1.id_producto))).scalar_one()
            p2 = (await verify_session.execute(select(Producto).where(Producto.id_producto == prod2.id_producto))).scalar_one()

            assert p1.stock_actual == stock1_init + 10
            assert p2.stock_actual == stock2_init + 20

            kardex_rows = (await verify_session.execute(
                select(KardexFisico).where(KardexFisico.id_compra == nueva_compra.id_compra)
            )).scalars().all()

            assert len(kardex_rows) == 2
            for k in kardex_rows:
                assert k.id_tipo_operacion == 1  # COMPRA
                assert k.id_compra == nueva_compra.id_compra
                assert k.id_venta is None

@pytest.mark.asyncio
async def test_venta_quiebre_stock_rollback_total():
    """b) Venta con cantidad > stock -> excepción 'Quiebre de stock', rollback total, stock inalterado"""
    async with AsyncSessionLocal() as session:
        sku = "SKU-SHIRT-001"
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        cajero = (await session.execute(select(Usuario).where(Usuario.email == "cajero@spartan.dev"))).scalar_one()
        cliente = (await session.execute(select(Usuario).where(Usuario.email == "cliente@spartan.dev"))).scalar_one()

        stock_original = prod.stock_actual
        prod_id = prod.id_producto
        precio_unitario = float(prod.precio_unitario)
        cantidad_excesiva = stock_original + 1000
        recibo_num = f"REC-FAIL-{os.urandom(4).hex()}"

        nueva_venta = Venta(
            id_cliente=cliente.id_usuario,
            id_cajero=cajero.id_usuario,
            numero_recibo=recibo_num,
            total_transaccion=precio_unitario * cantidad_excesiva,
            estado_pago="PAGADO"
        )
        session.add(nueva_venta)
        await session.flush()

        det = DetalleVenta(
            id_venta=nueva_venta.id_venta,
            id_producto=prod_id,
            cantidad=cantidad_excesiva,
            precio_historico=precio_unitario
        )
        session.add(det)

        with pytest.raises(DBAPIError) as exc_info:
            await session.commit()

        assert "Quiebre de stock" in str(exc_info.value)
        await session.rollback()

        # Verificar que el stock quedó completamente inalterado y no se guardó la venta
        async with AsyncSessionLocal() as verify_session:
            p = (await verify_session.execute(select(Producto).where(Producto.id_producto == prod_id))).scalar_one()
            assert p.stock_actual == stock_original

            v = (await verify_session.execute(select(Venta).where(Venta.numero_recibo == recibo_num))).scalar_one_or_none()
            assert v is None

@pytest.mark.asyncio
async def test_venta_valida_decrementa_stock_y_kardex():
    """c) Venta válida -> decrementa stock y kárdex registra id_venta con saldo_resultante correcto"""
    async with AsyncSessionLocal() as session:
        sku = "SKU-WHEY-001"
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        cajero = (await session.execute(select(Usuario).where(Usuario.email == "cajero@spartan.dev"))).scalar_one()
        cliente = (await session.execute(select(Usuario).where(Usuario.email == "cliente@spartan.dev"))).scalar_one()

        stock_previo = prod.stock_actual
        cantidad_venta = 5

        nueva_venta = Venta(
            id_cliente=cliente.id_usuario,
            id_cajero=cajero.id_usuario,
            numero_recibo=f"REC-OK-{os.urandom(4).hex()}",
            total_transaccion=prod.precio_unitario * cantidad_venta,
            estado_pago="PAGADO"
        )
        session.add(nueva_venta)
        await session.flush()

        det = DetalleVenta(
            id_venta=nueva_venta.id_venta,
            id_producto=prod.id_producto,
            cantidad=cantidad_venta,
            precio_historico=prod.precio_unitario
        )
        session.add(det)
        await session.commit()

        # Verificar decremento y kárdex
        async with AsyncSessionLocal() as verify_session:
            p = (await verify_session.execute(select(Producto).where(Producto.id_producto == prod.id_producto))).scalar_one()
            assert p.stock_actual == stock_previo - cantidad_venta

            k = (await verify_session.execute(
                select(KardexFisico).where(KardexFisico.id_venta == nueva_venta.id_venta)
            )).scalar_one()

            assert k.id_producto == prod.id_producto
            assert k.id_tipo_operacion == 2  # VENTA
            assert k.cantidad_movimiento == cantidad_venta
            assert k.saldo_resultante == stock_previo - cantidad_venta
            assert k.id_compra is None

@pytest.mark.asyncio
async def test_kardex_chk_origen_constraint_violation():
    """d) INSERT directo en kardex_fisico con id_venta E id_compra NULL -> viola chk_origen_kardex"""
    async with AsyncSessionLocal() as session:
        sku = "SKU-CREA-001"
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()

        kardex_invalido = KardexFisico(
            id_producto=prod.id_producto,
            id_compra=None,
            id_venta=None,
            id_tipo_operacion=1,
            cantidad_movimiento=10,
            saldo_resultante=prod.stock_actual
        )
        session.add(kardex_invalido)

        with pytest.raises((IntegrityError, DBAPIError)) as exc_info:
            await session.commit()

        assert "chk_origen_kardex" in str(exc_info.value)
        await session.rollback()
