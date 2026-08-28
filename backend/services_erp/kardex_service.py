import uuid
import time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from models.products import Producto
from models.kardex import KardexFisico
from models.transactions import Venta, DetalleVenta, Compra, DetalleCompra
from models.users import Usuario, Proveedor
from schemas.kardex import KardexSalidaRequest, KardexEntradaRequest, KardexResponse

class KardexService:
    """
    Servicio transaccional de Kárdex físico con control de concurrencia ACID
    mediante bloqueo pesimista de filas (SELECT ... FOR UPDATE).
    """

    @staticmethod
    async def registrar_salida(session: AsyncSession, data: KardexSalidaRequest) -> KardexResponse:
        start_time = time.perf_counter()

        # 1. Bloqueo pesimista exclusivo a nivel de fila sobre el Producto (FOR UPDATE)
        stmt_producto = (
            select(Producto)
            .where(Producto.codigo_sku == data.codigo_sku)
            .with_for_update()
        )
        result_prod = await session.execute(stmt_producto)
        producto = result_prod.scalar_one_or_none()

        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con SKU '{data.codigo_sku}' no encontrado en el inventario."
            )

        if not producto.estado_activo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El producto SKU '{data.codigo_sku}' está inactivo para operaciones de venta."
            )

        # 2. Verificación matemática de disponibilidad de stock
        stock_anterior = producto.stock_actual
        if stock_anterior < data.cantidad:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Quiebre de stock para SKU '{data.codigo_sku}'. "
                    f"Stock disponible: {stock_anterior}, Unidades solicitadas: {data.cantidad}."
                )
            )

        # 3. Cálculo de saldo resultante
        saldo_resultante = stock_anterior - data.cantidad

        # 4. Gestión o creación de la entidad de Venta (cumplimiento de constraint num_nonnulls)
        id_venta_vinculada = data.id_venta
        if not id_venta_vinculada:
            # Obtener cajero válido o el primer usuario del sistema
            id_cajero = data.id_cajero
            if not id_cajero:
                cajero_query = await session.execute(select(Usuario.id_usuario).limit(1))
                id_cajero = cajero_query.scalar_one_or_none()
                if not id_cajero:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No existe un usuario/cajero registrado para procesar la transacción."
                    )

            recibo_num = data.numero_recibo or f"REC-{uuid.uuid4().hex[:8].upper()}"
            nueva_venta = Venta(
                id_cliente=data.id_cliente,
                id_cajero=id_cajero,
                numero_recibo=recibo_num,
                total_transaccion=float(producto.precio_unitario) * data.cantidad,
                estado_pago="PAGADO"
            )
            session.add(nueva_venta)
            await session.flush()

            detalle_venta = DetalleVenta(
                id_venta=nueva_venta.id_venta,
                id_producto=producto.id_producto,
                cantidad=data.cantidad,
                precio_historico=producto.precio_unitario
            )
            session.add(detalle_venta)
            await session.flush()
            id_venta_vinculada = nueva_venta.id_venta

        # 5. Mutación del stock del producto
        producto.stock_actual = saldo_resultante

        # 6. Inserción del asiento inmutable en el Kárdex Físico
        nuevo_kardex = KardexFisico(
            id_producto=producto.id_producto,
            id_venta=id_venta_vinculada,
            id_compra=None,
            id_tipo_operacion=2,  # 2 = VENTA (multiplicador -1)
            cantidad_movimiento=data.cantidad,
            saldo_resultante=saldo_resultante
        )
        session.add(nuevo_kardex)
        await session.flush()

        # 7. Confirmación atómica y liberación del candado exclusivo de fila
        await session.commit()
        await session.refresh(nuevo_kardex)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return KardexResponse(
            id_kardex=nuevo_kardex.id_kardex,
            id_producto=producto.id_producto,
            codigo_sku=producto.codigo_sku,
            nombre_producto=producto.nombre_producto,
            tipo_operacion="VENTA",
            cantidad_movimiento=data.cantidad,
            stock_anterior=stock_anterior,
            saldo_resultante=saldo_resultante,
            id_venta=id_venta_vinculada,
            id_compra=None,
            fecha_registro=nuevo_kardex.fecha_registro,
            latencia_ms=round(elapsed_ms, 3)
        )

    @staticmethod
    async def registrar_entrada(session: AsyncSession, data: KardexEntradaRequest) -> KardexResponse:
        start_time = time.perf_counter()

        # 1. Bloqueo pesimista exclusivo a nivel de fila sobre el Producto (FOR UPDATE)
        stmt_producto = (
            select(Producto)
            .where(Producto.codigo_sku == data.codigo_sku)
            .with_for_update()
        )
        result_prod = await session.execute(stmt_producto)
        producto = result_prod.scalar_one_or_none()

        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con SKU '{data.codigo_sku}' no encontrado en el inventario."
            )

        # 2. Cálculo de incremento de stock
        stock_anterior = producto.stock_actual
        saldo_resultante = stock_anterior + data.cantidad

        # 3. Gestión o creación de la entidad de Compra
        id_compra_vinculada = data.id_compra
        if not id_compra_vinculada:
            # Obtener proveedor y usuario de registro válidos
            id_proveedor = data.id_proveedor
            if not id_proveedor:
                prov_query = await session.execute(select(Proveedor.id_proveedor).limit(1))
                id_proveedor = prov_query.scalar_one_or_none()
                if not id_proveedor:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No existe un proveedor registrado para respaldar la compra."
                    )

            id_usuario = data.id_usuario_registro
            if not id_usuario:
                user_query = await session.execute(select(Usuario.id_usuario).limit(1))
                id_usuario = user_query.scalar_one_or_none()
                if not id_usuario:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="No existe un usuario de registro para procesar la entrada de almacén."
                    )

            factura_num = data.numero_factura or f"FACT-{uuid.uuid4().hex[:8].upper()}"
            nueva_compra = Compra(
                id_proveedor=id_proveedor,
                id_usuario_registro=id_usuario,
                numero_factura=factura_num,
                total_compra=float(producto.precio_unitario) * data.cantidad,
                estado_compra="RECIBIDO"
            )
            session.add(nueva_compra)
            await session.flush()

            detalle_compra = DetalleCompra(
                id_compra=nueva_compra.id_compra,
                id_producto=producto.id_producto,
                cantidad=data.cantidad,
                costo_unitario=producto.precio_unitario
            )
            session.add(detalle_compra)
            await session.flush()
            id_compra_vinculada = nueva_compra.id_compra

        # 4. Mutación del stock del producto
        producto.stock_actual = saldo_resultante

        # 5. Inserción del asiento inmutable en el Kárdex Físico
        nuevo_kardex = KardexFisico(
            id_producto=producto.id_producto,
            id_venta=None,
            id_compra=id_compra_vinculada,
            id_tipo_operacion=1,  # 1 = COMPRA (multiplicador +1)
            cantidad_movimiento=data.cantidad,
            saldo_resultante=saldo_resultante
        )
        session.add(nuevo_kardex)
        await session.flush()

        # 6. Confirmación atómica y liberación del candado
        await session.commit()
        await session.refresh(nuevo_kardex)

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return KardexResponse(
            id_kardex=nuevo_kardex.id_kardex,
            id_producto=producto.id_producto,
            codigo_sku=producto.codigo_sku,
            nombre_producto=producto.nombre_producto,
            tipo_operacion="COMPRA",
            cantidad_movimiento=data.cantidad,
            stock_anterior=stock_anterior,
            saldo_resultante=saldo_resultante,
            id_venta=None,
            id_compra=id_compra_vinculada,
            fecha_registro=nuevo_kardex.fecha_registro,
            latencia_ms=round(elapsed_ms, 3)
        )
