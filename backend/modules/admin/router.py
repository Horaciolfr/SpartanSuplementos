from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select
from typing import Optional, List, Any
from datetime import datetime

from app.core.dependencies import get_db, require_roles
from app.models.users import Usuario
from app.models.catalogs import RolSistema, TipoDocumento, CatalogoGenero, CatalogoSomatotipo, PlanNutricionalSomatotipo
from app.models.ai_models import PerfilBiometrico, PrescripcionCrossSelling, ReglaInferenciaCART
from app.models.products import Producto
from app.modules.admin.schemas import (
    ClientesPaginadosResponse,
    ClienteListItem,
    UltimoPerfilResumen,
    PrescripcionesResumen,
    PlanNutricionalResumen,
    ClienteDetalleResponse,
    PerfilBiometricoDetalle,
    PrescripcionDetalle,
    ProductoPrescripcion,
    ReglaPrescripcion,
    ConversionPrescripcion,
    PlanNutricionalCompleto,
)

router = APIRouter(
    prefix="/admin",
    tags=["Administración de Clientes"],
    dependencies=[Depends(require_roles("ADMINISTRADOR"))]
)


@router.get("/clientes", response_model=ClientesPaginadosResponse)
async def listar_clientes_admin(
    q: Optional[str] = Query(None, description="Búsqueda por nombres, apellidos, email o documento"),
    somatotipo: Optional[int] = Query(None, description="Filtrar por id_somatotipo del último perfil"),
    conversion: Optional[str] = Query("any", description="Filtro de conversión: true, false o any"),
    desde: Optional[datetime] = Query(None, description="Fecha de registro mínima"),
    hasta: Optional[datetime] = Query(None, description="Fecha de registro máxima"),
    orden: Optional[str] = Query(
        "registro_reciente",
        description="Criterio de ordenación: nombre_asc, nombre_desc, registro_reciente, registro_antiguo, ultima_captura"
    ),
    pagina: int = Query(1, ge=1, description="Número de página"),
    tamano: int = Query(20, ge=1, le=100, description="Cantidad de registros por página"),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el listado paginado de clientes con agregación de último perfil biométrico,
    conteo de prescripciones y plan nutricional asignado mediante LATERAL JOIN para prevenir N+1.
    """
    offset = (pagina - 1) * tamano

    where_clauses = ["u.id_rol = r.id_rol", "r.nombre_rol = 'CLIENTE'"]
    params: dict[str, Any] = {"limit": tamano, "offset": offset}

    if q and q.strip():
        where_clauses.append("(u.nombres ILIKE :q OR u.apellidos ILIKE :q OR u.email ILIKE :q OR u.numero_documento ILIKE :q)")
        params["q"] = f"%{q.strip()}%"

    if somatotipo is not None:
        where_clauses.append("up.id_somatotipo = :somatotipo")
        params["somatotipo"] = somatotipo

    if conversion and conversion.lower() == "true":
        where_clauses.append("COALESCE(pr.convertidas, 0) > 0")
    elif conversion and conversion.lower() == "false":
        where_clauses.append("COALESCE(pr.convertidas, 0) = 0")

    if desde:
        where_clauses.append("u.fecha_creacion >= :desde")
        params["desde"] = desde

    if hasta:
        where_clauses.append("u.fecha_creacion <= :hasta")
        params["hasta"] = hasta

    where_sql = " AND ".join(where_clauses)

    order_by_sql = "u.fecha_creacion DESC"
    if orden == "nombre_asc":
        order_by_sql = "LOWER(u.nombres) ASC, LOWER(u.apellidos) ASC"
    elif orden == "nombre_desc":
        order_by_sql = "LOWER(u.nombres) DESC, LOWER(u.apellidos) DESC"
    elif orden == "registro_reciente":
        order_by_sql = "u.fecha_creacion DESC"
    elif orden == "registro_antiguo":
        order_by_sql = "u.fecha_creacion ASC"
    elif orden == "ultima_captura":
        order_by_sql = "up.fecha_captura DESC NULLS LAST, u.fecha_creacion DESC"

    # Conteo total con los mismos filtros
    count_sql = text(f"""
        SELECT COUNT(*)
        FROM erp.usuario u
        INNER JOIN parametros.rol_sistema r ON u.id_rol = r.id_rol
        LEFT JOIN LATERAL (
            SELECT pb.id_perfil, pb.id_somatotipo, pb.fecha_captura
            FROM ia.perfil_biometrico pb
            WHERE pb.id_usuario = u.id_usuario
            ORDER BY pb.fecha_captura DESC, pb.id_perfil DESC
            LIMIT 1
        ) up ON true
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(pc.id_prescripcion) AS total_prescripciones,
                COUNT(pc.id_prescripcion) FILTER (WHERE pc.estado_conversion IS TRUE OR pc.id_venta_efectiva IS NOT NULL) AS convertidas
            FROM ia.perfil_biometrico pb_sub
            INNER JOIN ia.prescripcion_crossselling pc ON pc.id_perfil = pb_sub.id_perfil
            WHERE pb_sub.id_usuario = u.id_usuario
        ) pr ON true
        WHERE {where_sql}
    """)
    total_result = await db.execute(count_sql, params)
    total = total_result.scalar_one()

    # Consulta paginada con LATERAL JOIN (anti N+1)
    items_sql = text(f"""
        SELECT 
            u.id_usuario,
            u.nombres,
            u.apellidos,
            u.email,
            u.numero_documento,
            u.esta_verificado,
            u.fecha_creacion,
            u.objetivo,
            up.id_perfil AS up_id_perfil,
            s.nombre_somatotipo AS up_somatotipo,
            up.estatura_cm AS up_estatura_cm,
            up.peso_kg AS up_peso_kg,
            up.precision_captura AS up_precision_captura,
            up.fecha_captura AS up_fecha_captura,
            COALESCE(pr.total_prescripciones, 0) AS pres_total,
            COALESCE(pr.convertidas, 0) AS pres_convertidas,
            pr.ultima_fecha AS pres_ultima_fecha,
            pns.nombre_plan AS plan_nombre
        FROM erp.usuario u
        INNER JOIN parametros.rol_sistema r ON u.id_rol = r.id_rol
        LEFT JOIN LATERAL (
            SELECT pb.id_perfil, pb.id_somatotipo, pb.estatura_cm, pb.peso_kg, pb.precision_captura, pb.fecha_captura
            FROM ia.perfil_biometrico pb
            WHERE pb.id_usuario = u.id_usuario
            ORDER BY pb.fecha_captura DESC, pb.id_perfil DESC
            LIMIT 1
        ) up ON true
        LEFT JOIN parametros.catalogo_somatotipo s ON up.id_somatotipo = s.id_somatotipo
        LEFT JOIN parametros.plan_nutricional_somatotipo pns ON up.id_somatotipo = pns.id_somatotipo
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(pc.id_prescripcion) AS total_prescripciones,
                COUNT(pc.id_prescripcion) FILTER (WHERE pc.estado_conversion IS TRUE OR pc.id_venta_efectiva IS NOT NULL) AS convertidas,
                MAX(pc.fecha_prescripcion) AS ultima_fecha
            FROM ia.perfil_biometrico pb_sub
            INNER JOIN ia.prescripcion_crossselling pc ON pc.id_perfil = pb_sub.id_perfil
            WHERE pb_sub.id_usuario = u.id_usuario
        ) pr ON true
        WHERE {where_sql}
        ORDER BY {order_by_sql}
        LIMIT :limit OFFSET :offset
    """)
    rows = (await db.execute(items_sql, params)).mappings().all()

    items: List[ClienteListItem] = []
    for r in rows:
        ultimo_perfil = None
        if r["up_id_perfil"] is not None:
            ultimo_perfil = UltimoPerfilResumen(
                id_perfil=r["up_id_perfil"],
                somatotipo=r["up_somatotipo"],
                estatura_cm=float(r["up_estatura_cm"]) if r["up_estatura_cm"] is not None else None,
                peso_kg=float(r["up_peso_kg"]) if r["up_peso_kg"] is not None else None,
                visibilidad_media=float(r["up_precision_captura"]) if r["up_precision_captura"] is not None else None,
                fecha_captura=r["up_fecha_captura"]
            )

        prescripciones = PrescripcionesResumen(
            total=r["pres_total"],
            convertidas=r["pres_convertidas"],
            ultima_fecha=r["pres_ultima_fecha"]
        )

        plan = None
        if r["plan_nombre"]:
            plan = PlanNutricionalResumen(nombre_plan=r["plan_nombre"])

        items.append(
            ClienteListItem(
                id_usuario=r["id_usuario"],
                nombres=r["nombres"],
                apellidos=r["apellidos"],
                email=r["email"],
                numero_documento=r["numero_documento"],
                esta_verificado=r["esta_verificado"],
                fecha_creacion=r["fecha_creacion"],
                objetivo=r["objetivo"],
                ultimo_perfil=ultimo_perfil,
                prescripciones=prescripciones,
                plan_nutricional=plan
            )
        )

    return ClientesPaginadosResponse(
        total=total,
        pagina=pagina,
        tamano=tamano,
        items=items
    )


@router.get("/clientes/{id_usuario}", response_model=ClienteDetalleResponse)
async def obtener_detalle_cliente_admin(
    id_usuario: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la ficha técnica y médica exhaustiva del cliente: perfiles biométricos ordenados,
    prescripciones con productos, reglas y conversión, y plan nutricional completo.
    Retorna HTTP 404 si el usuario no existe o no posee rol CLIENTE.
    """
    stmt_user = (
        select(Usuario, RolSistema.nombre_rol, TipoDocumento.sigla, CatalogoGenero.nombre_genero)
        .join(RolSistema, Usuario.id_rol == RolSistema.id_rol)
        .outerjoin(TipoDocumento, Usuario.id_tipo_documento == TipoDocumento.id_tipo_documento)
        .outerjoin(CatalogoGenero, Usuario.id_genero == CatalogoGenero.id_genero)
        .where(Usuario.id_usuario == id_usuario)
    )
    res_user = await db.execute(stmt_user)
    row_user = res_user.first()
    if not row_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    user, rol_nombre, tipo_doc_sigla, genero_nombre = row_user
    if rol_nombre != "CLIENTE":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El identificador especificado no corresponde a un cliente"
        )

    # 1. Obtener todos los perfiles biométricos ordenados por fecha
    stmt_perfiles = (
        select(PerfilBiometrico, CatalogoSomatotipo.nombre_somatotipo)
        .outerjoin(CatalogoSomatotipo, PerfilBiometrico.id_somatotipo == CatalogoSomatotipo.id_somatotipo)
        .where(PerfilBiometrico.id_usuario == id_usuario)
        .order_by(PerfilBiometrico.fecha_captura.desc(), PerfilBiometrico.id_perfil.desc())
    )
    res_perfiles = await db.execute(stmt_perfiles)
    perfiles_rows = res_perfiles.all()

    perfiles: List[PerfilBiometricoDetalle] = []
    ultimo_somatotipo_id = None
    for pb, nombre_soma in perfiles_rows:
        if ultimo_somatotipo_id is None and pb.id_somatotipo is not None:
            ultimo_somatotipo_id = pb.id_somatotipo
        perfiles.append(
            PerfilBiometricoDetalle(
                id_perfil=pb.id_perfil,
                id_somatotipo=pb.id_somatotipo,
                somatotipo=nombre_soma,
                estatura_cm=float(pb.estatura_cm) if pb.estatura_cm is not None else None,
                peso_kg=float(pb.peso_kg) if pb.peso_kg is not None else None,
                precision_captura=float(pb.precision_captura) if pb.precision_captura is not None else None,
                fecha_captura=pb.fecha_captura,
                coordenadas_espaciales=pb.coordenadas_espaciales
            )
        )

    # 2. Obtener todas las prescripciones con productos, reglas y conversión
    stmt_presc = (
        select(
            PrescripcionCrossSelling,
            Producto,
            ReglaInferenciaCART
        )
        .join(PerfilBiometrico, PrescripcionCrossSelling.id_perfil == PerfilBiometrico.id_perfil)
        .join(Producto, PrescripcionCrossSelling.id_producto == Producto.id_producto)
        .outerjoin(ReglaInferenciaCART, PrescripcionCrossSelling.id_regla_aplicada == ReglaInferenciaCART.id_regla)
        .where(PerfilBiometrico.id_usuario == id_usuario)
        .order_by(PrescripcionCrossSelling.fecha_prescripcion.desc(), PrescripcionCrossSelling.id_prescripcion.desc())
    )
    res_presc = await db.execute(stmt_presc)
    presc_rows = res_presc.all()

    prescripciones: List[PrescripcionDetalle] = []
    for pc, prod, regla in presc_rows:
        regla_model = None
        if regla is not None:
            regla_model = ReglaPrescripcion(
                id_regla=regla.id_regla,
                codigo=regla.codigo_regla,
                descripcion=regla.descripcion_tecnica
            )

        estado_conv = bool(pc.estado_conversion or pc.id_venta_efectiva is not None)
        conversion_model = ConversionPrescripcion(
            id_venta_efectiva=pc.id_venta_efectiva,
            estado=estado_conv
        )

        producto_model = ProductoPrescripcion(
            id_producto=prod.id_producto,
            sku=prod.codigo_sku,
            nombre=prod.nombre_producto,
            precio=float(prod.precio_unitario),
            stock_actual=prod.stock_actual
        )

        prescripciones.append(
            PrescripcionDetalle(
                id_prescripcion=pc.id_prescripcion,
                id_perfil=pc.id_perfil,
                fecha_prescripcion=pc.fecha_prescripcion,
                producto=producto_model,
                regla=regla_model,
                conversion=conversion_model
            )
        )

    # 3. Plan nutricional según el somatotipo del último perfil
    plan_completo = None
    if ultimo_somatotipo_id is not None:
        stmt_plan = select(PlanNutricionalSomatotipo).where(PlanNutricionalSomatotipo.id_somatotipo == ultimo_somatotipo_id)
        res_plan = await db.execute(stmt_plan)
        plan_obj = res_plan.scalar_one_or_none()
        if plan_obj is not None:
            plan_completo = PlanNutricionalCompleto(
                id_plan=plan_obj.id_plan,
                id_somatotipo=plan_obj.id_somatotipo,
                nombre_plan=plan_obj.nombre_plan,
                objetivo=plan_obj.objetivo,
                distribucion_macronutrientes=plan_obj.distribucion_macronutrientes,
                pautas=plan_obj.pautas,
                comidas_sugeridas=plan_obj.comidas_sugeridas,
                disclaimer=plan_obj.disclaimer
            )

    return ClienteDetalleResponse(
        id_usuario=user.id_usuario,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        numero_documento=user.numero_documento,
        esta_verificado=user.esta_verificado,
        fecha_creacion=user.fecha_creacion,
        genero=genero_nombre,
        tipo_documento=tipo_doc_sigla,
        objetivo=user.objetivo,
        perfiles=perfiles,
        prescripciones=prescripciones,
        plan_nutricional=plan_completo
    )


@router.put("/clientes/{id_usuario}/objetivo")
async def actualizar_objetivo_cliente_admin(
    id_usuario: int,
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al administrador asignar o modificar el objetivo de un cliente.
    """
    obj = payload.get("objetivo")
    if obj not in ('GP', 'GM', 'PP', 'MANT'):
        raise HTTPException(status_code=400, detail="Objetivo no válido. Debe ser GP, GM, PP o MANT")

    stmt = select(Usuario).where(Usuario.id_usuario == id_usuario)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    user.objetivo = obj
    await db.commit()
    await db.refresh(user)
    return {"message": "Objetivo de cliente actualizado", "id_usuario": id_usuario, "objetivo": user.objetivo}

