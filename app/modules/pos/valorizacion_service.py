from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.products import Producto
from app.models.kardex import KardexFisico
from app.models.transactions import DetalleCompra, DetalleVenta
from app.modules.pos.schemas import KardexValorizadoOut, KardexMovimientoValorizadoOut

class ValorizacionService:
    """
    Servicio de Valorización de Inventario según la Norma Contable y Financiera
    mediante el método de Precio Medio Ponderado (PMP).
    """

    @staticmethod
    async def obtener_kardex_valorizado_producto(
        db: AsyncSession,
        id_producto: int
    ) -> KardexValorizadoOut:
        # 1. Obtener producto
        stmt_prod = select(Producto).where(Producto.id_producto == id_producto)
        res_prod = await db.execute(stmt_prod)
        producto = res_prod.scalar_one_or_none()

        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con ID {id_producto} no encontrado"
            )

        # 2. Consultar movimientos históricos del producto en orden cronológico
        stmt_kardex = (
            select(KardexFisico)
            .where(KardexFisico.id_producto == id_producto)
            .options(
                selectinload(KardexFisico.tipo_operacion),
                selectinload(KardexFisico.compra),
                selectinload(KardexFisico.venta)
            )
            .order_by(KardexFisico.fecha_registro.asc(), KardexFisico.id_kardex.asc())
        )
        res_kardex = await db.execute(stmt_kardex)
        movimientos_db = res_kardex.scalars().all()

        # 3. Mapear costos unitarios de compras y precios históricos de ventas
        compras_ids = [m.id_compra for m in movimientos_db if m.id_compra]
        costos_compra_map = {}
        if compras_ids:
            stmt_dc = select(DetalleCompra).where(
                DetalleCompra.id_compra.in_(compras_ids),
                DetalleCompra.id_producto == id_producto
            )
            res_dc = await db.execute(stmt_dc)
            for dc in res_dc.scalars().all():
                costos_compra_map[dc.id_compra] = float(dc.costo_unitario)

        # 4. Cálculo secuencial de PMP
        saldo_unidades = 0
        pmp_actual = float(producto.precio_unitario) * 0.7  # Costo base referencial si no hubo compras previas
        saldo_valorizado = 0.0
        movimientos_valorizados = []

        for mov in movimientos_db:
            es_entrada = (mov.id_compra is not None) or (mov.id_tipo_operacion == 1)
            cantidad = mov.cantidad_movimiento

            if es_entrada:
                # ENTRADA / COMPRA: altera el costo promedio ponderado
                costo_unit = costos_compra_map.get(mov.id_compra, float(producto.precio_unitario) * 0.7)
                total_mov = round(cantidad * costo_unit, 2)
                nuevo_saldo_unidades = saldo_unidades + cantidad
                nuevo_saldo_valorizado = round(saldo_valorizado + total_mov, 2)
                
                if nuevo_saldo_unidades > 0:
                    pmp_actual = round(nuevo_saldo_valorizado / nuevo_saldo_unidades, 4)
                
                saldo_unidades = nuevo_saldo_unidades
                saldo_valorizado = nuevo_saldo_valorizado
                tipo_op_str = "COMPRA"
            else:
                # SALIDA / VENTA: sale al costo PMP actual (no altera el PMP unitario)
                costo_unit = round(pmp_actual, 4)
                total_mov = round(cantidad * costo_unit, 2)
                nuevo_saldo_unidades = max(0, saldo_unidades - cantidad)
                nuevo_saldo_valorizado = round(nuevo_saldo_unidades * pmp_actual, 2)

                saldo_unidades = nuevo_saldo_unidades
                saldo_valorizado = nuevo_saldo_valorizado
                tipo_op_str = "VENTA"

            movimientos_valorizados.append(
                KardexMovimientoValorizadoOut(
                    id_kardex=mov.id_kardex,
                    tipo_operacion=tipo_op_str,
                    cantidad=cantidad,
                    costo_unitario_movimiento=round(costo_unit, 2),
                    total_movimiento=round(total_mov, 2),
                    saldo_unidades=mov.saldo_resultante,
                    pmp_resultante=round(pmp_actual, 2),
                    saldo_valorizado=round(mov.saldo_resultante * pmp_actual, 2),
                    id_venta=mov.id_venta,
                    id_compra=mov.id_compra,
                    fecha_registro=mov.fecha_registro
                )
            )

        # Si el producto tiene stock actual en catálogo, reflejamos su valuación
        stock_final = producto.stock_actual
        valor_total = round(stock_final * pmp_actual, 2)

        return KardexValorizadoOut(
            id_producto=producto.id_producto,
            codigo_sku=producto.codigo_sku,
            nombre_producto=producto.nombre_producto,
            stock_actual=stock_final,
            pmp_actual=round(pmp_actual, 2),
            valor_total_inventario=valor_total,
            metodo_valorizacion="PMP (Precio Medio Ponderado)",
            movimientos=movimientos_valorizados
        )
