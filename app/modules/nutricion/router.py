from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from typing import Optional, List

from app.core.dependencies import get_db, get_current_user, get_optional_current_user
from app.models.users import Usuario
from app.models.catalogs import RecetaNutricional
from app.models.ai_models import PerfilBiometrico
from app.modules.nutricion.schemas import (
    PlanDiarioResponse,
    RecetaNutricionalItem,
    CatalogoRecetasResponse,
    ActualizarObjetivoIn
)

router = APIRouter(tags=["Nutrición y Dietética"])

CATEGORIAS_ORDENADAS = ['DESAYUNO', 'ALMUERZO', 'CENA', 'SNACK', 'POST_ENTRENO', 'ENSALADA']

def resolver_grupos_somatotipo(somatotipo_str: str):
    s = somatotipo_str.upper().strip()
    if 'ECT' in s and 'MESO' not in s:
        return (('ECT', 'ECTO'), ('ECT-MESO',), ('ECT', 'ECTO', 'ECT-MESO'))
    elif 'ENDO' in s and 'MESO' not in s:
        return (('ENDO', 'ENDOMORFO'), ('MESO-ENDO',), ('ENDO', 'ENDOMORFO', 'MESO-ENDO'))
    elif 'ECT-MESO' in s:
        return (('ECT-MESO',), ('ECT', 'ECTO', 'MESO'), ('ECT-MESO', 'ECT', 'ECTO', 'MESO'))
    elif 'MESO-ENDO' in s:
        return (('MESO-ENDO',), ('MESO', 'ENDO'), ('MESO-ENDO', 'MESO', 'ENDO'))
    else:  # MESOMORFO
        return (('MESO', 'MESOMORFO'), ('ECT-MESO', 'MESO-ENDO'), ('MESO', 'MESOMORFO', 'ECT-MESO', 'MESO-ENDO'))

@router.get("/nutricion/plan-diario", response_model=PlanDiarioResponse)
async def obtener_plan_diario(
    somatotipo: Optional[str] = Query(None, description="Somatotipo (e.g. ECTOMORFO, MESOMORFO, ENDOMORFO)"),
    somatipo: Optional[str] = Query(None, description="Alias para somatotipo"),
    objetivo: Optional[str] = Query(None, description="Objetivo: GP, GM, PP, MANT"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[Usuario] = Depends(get_optional_current_user)
):
    """
    Retorna el plan dietético diario con hasta 6 comidas categorizadas aplicando
    el motor determinista con precedencia P1 -> P2 -> P3 (y prioridad a recetas con imagen disponible).
    Sin ML, garantizando reproducibilidad y cumplimiento de reglas clínicas R1-R3.
    """
    # 1. Resolver somatotipo
    soma_input = somatotipo or somatipo
    if not soma_input or not soma_input.strip():
        if current_user:
            # Consultar último perfil biométrico del usuario
            stmt_pb = (
                select(PerfilBiometrico)
                .where(PerfilBiometrico.id_usuario == current_user.id_usuario)
                .order_by(PerfilBiometrico.fecha_captura.desc())
                .limit(1)
            )
            res_pb = await db.execute(stmt_pb)
            pb = res_pb.scalar_one_or_none()
            if pb and pb.id_somatotipo == 1:
                soma_input = "ECTOMORFO"
            elif pb and pb.id_somatotipo == 2:
                soma_input = "MESOMORFO"
            elif pb and pb.id_somatotipo == 3:
                soma_input = "ENDOMORFO"
            else:
                soma_input = "MESOMORFO"
        else:
            soma_input = "MESOMORFO"

    soma_canonical = soma_input.upper().strip()

    # 2. Resolver objetivo
    objetivo_declarado = True
    aviso = None
    obj_input = objetivo.upper().strip() if objetivo else None

    if not obj_input or obj_input not in ('GP', 'GM', 'PP', 'MANT'):
        if current_user and current_user.objetivo and current_user.objetivo in ('GP', 'GM', 'PP', 'MANT'):
            obj_input = current_user.objetivo
            objetivo_declarado = True
        else:
            obj_input = 'MANT'
            objetivo_declarado = False
            aviso = "Declara tu objetivo para afinar el plan"

    exact_somas, combo_somas, _ = resolver_grupos_somatotipo(soma_canonical)

    comidas_resultado: List[RecetaNutricionalItem] = []

    for cat in CATEGORIAS_ORDENADAS:
        receta_encontrada = None
        regla_nombre = ""

        # La adecuación nutricional manda sobre la disponibilidad de fotografía:
        # P1 perfil exacto + objetivo, P2 combinación compatible + objetivo y,
        # únicamente si no hay alternativa, P3 mantenimiento del mismo perfil.
        prioridades = [
            (exact_somas, obj_input, "P1: Perfil corporal y objetivo exactos"),
            (combo_somas, obj_input, "P2: Perfil corporal compatible y objetivo exacto"),
        ]
        if obj_input != 'MANT':
            prioridades.extend([
                (exact_somas, 'MANT', "P3: Perfil corporal exacto con pauta de mantenimiento"),
                (combo_somas, 'MANT', "P3: Perfil corporal compatible con pauta de mantenimiento"),
            ])

        for somatotipos_validos, objetivo_receta, regla in prioridades:
            stmt = (
                select(RecetaNutricional)
                .where(
                    RecetaNutricional.categoria == cat,
                    RecetaNutricional.somatotipo_afin.in_(somatotipos_validos),
                    RecetaNutricional.objetivo == objetivo_receta,
                )
                .order_by(
                    RecetaNutricional.url_imagen.is_(None).asc(),
                    RecetaNutricional.id_receta.asc(),
                )
                .limit(1)
            )
            res = await db.execute(stmt)
            receta_encontrada = res.scalar_one_or_none()
            if receta_encontrada:
                regla_nombre = regla
                break

        if receta_encontrada:
            es_placeholder = (receta_encontrada.url_imagen is None)
            comidas_resultado.append(
                RecetaNutricionalItem(
                    id_receta=receta_encontrada.id_receta,
                    codigo=receta_encontrada.codigo,
                    nombre=receta_encontrada.nombre,
                    categoria=receta_encontrada.categoria,
                    somatotipo_afin=receta_encontrada.somatotipo_afin,
                    objetivo=receta_encontrada.objetivo,
                    ingredientes=receta_encontrada.ingredientes or [],
                    macronutrientes=receta_encontrada.macronutrientes or {},
                    instrucciones=receta_encontrada.instrucciones,
                    disclaimer=receta_encontrada.disclaimer,
                    url_imagen=receta_encontrada.url_imagen,
                    placeholder=es_placeholder,
                    placeholder_texto="Imagen en preparación",
                    regla_aplicada=regla_nombre
                )
            )

    return PlanDiarioResponse(
        somatotipo=soma_canonical,
        objetivo=obj_input,
        objetivo_declarado=objetivo_declarado,
        aviso=aviso,
        total_comidas=len(comidas_resultado),
        comidas=comidas_resultado
    )


@router.get("/catalogo/recetas", response_model=CatalogoRecetasResponse)
async def listar_recetas_catalogo(
    categoria: Optional[str] = Query(None, description="Filtro por categoría"),
    somatotipo_afin: Optional[str] = Query(None, description="Filtro por somatotipo"),
    objetivo: Optional[str] = Query(None, description="Filtro por objetivo: GP, GM, PP, MANT"),
    con_imagen: Optional[bool] = Query(None, description="Filtrar por disponibilidad de imagen"),
    q: Optional[str] = Query(None, description="Búsqueda por texto en nombre o código"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=200),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el catálogo completo de 110 recetas con paginación y filtros.
    """
    conditions = []
    if categoria:
        conditions.append(RecetaNutricional.categoria == categoria.upper().strip())
    if somatotipo_afin:
        soma_clean = somatotipo_afin.upper().strip()
        conditions.append(RecetaNutricional.somatotipo_afin.like(f"%{soma_clean}%"))
    if objetivo:
        conditions.append(RecetaNutricional.objetivo == objetivo.upper().strip())
    if con_imagen is True:
        conditions.append(RecetaNutricional.url_imagen.is_not(None))
    elif con_imagen is False:
        conditions.append(RecetaNutricional.url_imagen.is_(None))
    if q and q.strip():
        search = f"%{q.strip()}%"
        conditions.append(or_(
            RecetaNutricional.nombre.ilike(search),
            RecetaNutricional.codigo.ilike(search)
        ))

    count_stmt = select(func.count(RecetaNutricional.id_receta))
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))
    total = (await db.execute(count_stmt)).scalar() or 0

    offset = (pagina - 1) * tamano
    query_stmt = select(RecetaNutricional)
    if conditions:
        query_stmt = query_stmt.where(and_(*conditions))
    query_stmt = query_stmt.order_by(RecetaNutricional.codigo.asc()).offset(offset).limit(tamano)

    res = await db.execute(query_stmt)
    rows = res.scalars().all()

    items = [
        RecetaNutricionalItem(
            id_receta=r.id_receta,
            codigo=r.codigo,
            nombre=r.nombre,
            categoria=r.categoria,
            somatotipo_afin=r.somatotipo_afin,
            objetivo=r.objetivo,
            ingredientes=r.ingredientes or [],
            macronutrientes=r.macronutrientes or {},
            instrucciones=r.instrucciones,
            disclaimer=r.disclaimer,
            url_imagen=r.url_imagen,
            placeholder=(r.url_imagen is None),
            placeholder_texto="Imagen en preparación",
            regla_aplicada="Catálogo"
        )
        for r in rows
    ]

    return CatalogoRecetasResponse(
        total=total,
        pagina=pagina,
        tamano=tamano,
        items=items
    )


@router.put("/usuarios/me/objetivo")
@router.patch("/usuarios/me/objetivo")
@router.put("/nutricion/objetivo")
async def actualizar_objetivo_usuario_actual(
    payload: ActualizarObjetivoIn,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Actualiza el objetivo nutricional del usuario en sesión.
    """
    current_user.objetivo = payload.objetivo
    await db.commit()
    await db.refresh(current_user)
    return {"message": "Objetivo actualizado exitosamente", "objetivo": current_user.objetivo}
