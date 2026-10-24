import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import DBAPIError

from app.core.dependencies import get_db, require_roles
from app.models.products import Producto
from app.models.transactions import Venta, DetalleVenta
from app.models.kardex import KardexFisico
from app.models.users import Usuario
from app.modules.pos.schemas import (
    VentaCreateRequest, VentaResponse, DetalleVentaOut, KardexMovimientoOut, KardexValorizadoOut, ClienteOut
)
from app.modules.pos.valorizacion_service import ValorizacionService

router = APIRouter(tags=["Punto de Venta (POS) & Kárdex"])

@router.post("/pos/ventas", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
async def crear_venta_pos(
    payload: VentaCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("CAJERO", "ADMINISTRADOR"))
) -> VentaResponse:
    # 1. Obtener los productos en orden canónico con bloqueo exclusivo FOR UPDATE para eliminar deadlocks
    prod_ids = [it.id_producto for it in payload.items]
    prod_ids_ordenados = sorted(set(prod_ids))
    stmt = (
        select(Producto)
        .where(Producto.id_producto.in_(prod_ids_ordenados))
        .order_by(Producto.id_producto)
        .with_for_update()
    )
    res = await db.execute(stmt)
    productos_map = {p.id_producto: p for p in res.scalars().all()}
    productos_sku_map = {p.id_producto: p.codigo_sku for p in productos_map.values()}

    for item in payload.items:
        if item.id_producto not in productos_map:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Producto con ID {item.id_producto} no encontrado"
            )

    # 2. Iniciar registro de venta en UNA sola transacción atómica
    recibo_num = f"REC-{uuid.uuid4().hex[:8].upper()}"
    nueva_venta = Venta(
        id_cliente=payload.id_cliente,
        id_cajero=current_user.id_usuario,
        numero_recibo=recibo_num,
        total_transaccion=0.0,
        estado_pago="PAGADO"
    )
    db.add(nueva_venta)
    await db.flush()

    total_calculado = 0.0
    detalles_guardados = []

    try:
        for item in payload.items:
            prod = productos_map[item.id_producto]
            precio_hist = float(prod.precio_unitario)
            subtotal = precio_hist * item.cantidad
            total_calculado += subtotal

            detalle = DetalleVenta(
                id_venta=nueva_venta.id_venta,
                id_producto=prod.id_producto,
                cantidad=item.cantidad,
                precio_historico=precio_hist
            )
            db.add(detalle)
            # El trigger trg_kardex_detalle_venta de PostgreSQL se ejecuta al hacer flush
            await db.flush()

            detalles_guardados.append(
                DetalleVentaOut(
                    id_detalle_venta=detalle.id_detalle_venta,
                    id_producto=prod.id_producto,
                    codigo_sku=prod.codigo_sku,
                    nombre_producto=prod.nombre_producto,
                    cantidad=item.cantidad,
                    precio_historico=precio_hist,
                    subtotal=subtotal
                )
            )

        nueva_venta.total_transaccion = total_calculado
        await db.commit()
        await db.refresh(nueva_venta)

        # Conversión de prescripción: empareja con prescripciones abiertas del último perfil (7 días)
        if nueva_venta.id_cliente:
            prod_ids = [it.id_producto for it in payload.items]
            try:
                stmt_perfil = text("""
                    SELECT id_perfil
                    FROM ia.perfil_biometrico
                    WHERE id_usuario = :id_cliente
                      AND fecha_captura >= (CURRENT_TIMESTAMP - INTERVAL '7 days')
                    ORDER BY fecha_captura DESC
                    LIMIT 1
                """)
                res_perfil = await db.execute(stmt_perfil, {"id_cliente": nueva_venta.id_cliente})
                id_perfil_cliente = res_perfil.scalar_one_or_none()
                if id_perfil_cliente:
                    stmt_conv = text("""
                        UPDATE ia.prescripcion_crossselling
                        SET id_venta_efectiva = :id_venta
                        WHERE id_perfil = :id_perfil
                          AND id_producto = ANY(:ids_prods)
                          AND id_venta_efectiva IS NULL
                    """)
                    await db.execute(
                        stmt_conv,
                        {"id_venta": nueva_venta.id_venta, "id_perfil": id_perfil_cliente, "ids_prods": prod_ids}
                    )
                    await db.commit()
            except Exception:
                pass

    except DBAPIError as exc:
        await db.rollback()
        err_msg = str(exc)
        if "Quiebre de stock" in err_msg:
            # Buscar el ID del producto que causó la excepción
            match = re.search(r"producto\s+(\d+)", err_msg)
            offending_sku = "Desconocido"
            if match:
                offending_id = int(match.group(1))
                offending_sku = productos_sku_map.get(offending_id, "Desconocido")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Quiebre de stock para producto SKU: {offending_sku}"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error en la transacción de venta: {err_msg}"
        )

    # 3. Cargar información de cliente si aplica
    cliente_nombre = None
    if nueva_venta.id_cliente:
        cli_stmt = select(Usuario).where(Usuario.id_usuario == nueva_venta.id_cliente)
        cli = (await db.execute(cli_stmt)).scalar_one_or_none()
        if cli:
            cliente_nombre = f"{cli.nombres} {cli.apellidos}"

    cajero_nombre = f"{current_user.nombres} {current_user.apellidos}"

    return VentaResponse(
        id_venta=nueva_venta.id_venta,
        numero_recibo=nueva_venta.numero_recibo,
        total_transaccion=total_calculado,
        estado_pago=nueva_venta.estado_pago,
        fecha_hora_venta=nueva_venta.fecha_hora_venta,
        cajero=cajero_nombre,
        cliente=cliente_nombre,
        detalles=detalles_guardados
    )

@router.get("/pos/ventas/{id_venta}", response_model=VentaResponse)
async def get_venta(
    id_venta: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("CAJERO", "ADMINISTRADOR"))
):
    stmt = (
        select(Venta)
        .where(Venta.id_venta == id_venta)
        .options(
            selectinload(Venta.cliente),
            selectinload(Venta.cajero),
            selectinload(Venta.detalles).selectinload(DetalleVenta.producto)
        )
    )
    res = await db.execute(stmt)
    venta = res.scalar_one_or_none()
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    detalles_out = [
        DetalleVentaOut(
            id_detalle_venta=d.id_detalle_venta,
            id_producto=d.id_producto,
            codigo_sku=d.producto.codigo_sku,
            nombre_producto=d.producto.nombre_producto,
            cantidad=d.cantidad,
            precio_historico=float(d.precio_historico),
            subtotal=float(d.precio_historico) * d.cantidad
        )
        for d in venta.detalles
    ]

    cliente_nombre = f"{venta.cliente.nombres} {venta.cliente.apellidos}" if venta.cliente else None
    cajero_nombre = f"{venta.cajero.nombres} {venta.cajero.apellidos}"

    return VentaResponse(
        id_venta=venta.id_venta,
        numero_recibo=venta.numero_recibo,
        total_transaccion=float(venta.total_transaccion),
        estado_pago=venta.estado_pago,
        fecha_hora_venta=venta.fecha_hora_venta,
        cajero=cajero_nombre,
        cliente=cliente_nombre,
        detalles=detalles_out
    )

@router.get("/kardex/producto/{id_producto}", response_model=list[KardexMovimientoOut])
async def get_kardex_producto(
    id_producto: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    # Verificar que el producto existe
    prod = (await db.execute(select(Producto).where(Producto.id_producto == id_producto))).scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    stmt = (
        select(KardexFisico)
        .where(KardexFisico.id_producto == id_producto)
        .options(selectinload(KardexFisico.tipo_operacion))
        .order_by(KardexFisico.fecha_registro.desc())
    )
    res = await db.execute(stmt)
    kardex_list = res.scalars().all()

    return [
        KardexMovimientoOut(
            id_kardex=k.id_kardex,
            id_producto=k.id_producto,
            tipo_operacion=k.tipo_operacion.nombre_operacion if k.tipo_operacion else "OPERACION",
            cantidad_movimiento=k.cantidad_movimiento,
            saldo_resultante=k.saldo_resultante,
            id_venta=k.id_venta,
            id_compra=k.id_compra,
            fecha_registro=k.fecha_registro
        )
        for k in kardex_list
    ]

@router.get("/kardex/valorizacion/{id_producto}", response_model=KardexValorizadoOut)
async def get_kardex_valorizado_producto(
    id_producto: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    """
    Visor de Kárdex Valorizado con Precio Medio Ponderado (PMP).
    Exclusivo para ADMINISTRADOR.
    """
    return await ValorizacionService.obtener_kardex_valorizado_producto(db=db, id_producto=id_producto)

@router.get("/pos/clientes", response_model=list[ClienteOut])
async def listar_clientes_pos(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("CAJERO", "ADMINISTRADOR"))
):
    """
    Lista de clientes registrados para el selector de caja (POS).
    Exclusivo para roles CAJERO y ADMINISTRADOR (rol CLIENTE recibe 403 Forbidden).
    """
    stmt = (
        select(Usuario)
        .where(Usuario.id_rol == 3)
        .order_by(Usuario.apellidos, Usuario.nombres)
    )
    res = await db.execute(stmt)
    clientes = res.scalars().all()
    return [
        ClienteOut(
            id_usuario=c.id_usuario,
            nombres=c.nombres,
            apellidos=c.apellidos,
            email=c.email,
            numero_documento=c.numero_documento
        )
        for c in clientes
    ]
