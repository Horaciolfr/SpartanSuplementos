from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import Optional, List, Tuple

from app.core.dependencies import get_db, get_current_user
from app.models.users import Usuario
from app.models.catalogs import Ejercicio, RutinaPlantilla, PlantillaEjercicio
from app.models.ai_models import PerfilBiometrico
from app.modules.entrenamiento.schemas import (
    EjercicioItem,
    EjercicioRutinaItem,
    DiaRutina,
    RutinaResponse,
    ActualizarObjetivoIn
)

router = APIRouter(tags=["Entrenamiento y Rutinas"])

def normalizar_somatotipo_canónico(soma_raw: str) -> str:
    """Normaliza variantes de texto a los somatotipos del catálogo."""
    s = soma_raw.upper().strip().replace("_", "-").replace(" ", "-")
    if "ECTO-MESO" in s or "ECT-MESO" in s:
        return "ECT-MESO"
    if "MESO-ENDO" in s:
        return "MESO-ENDO"
    if "ENDO-ECTO" in s:
        return "ENDO"
    if "ECTO" in s or "ECT" in s:
        return "ECT"
    if "ENDO" in s:
        return "ENDO"
    if "MESO" in s:
        return "MESO"
    return "MESO"

def obtener_somatotipos_afines_p2(soma_canon: str) -> List[str]:
    """Retorna lista de somatotipos combinados/afines para precedencia P2."""
    if soma_canon == "ECT":
        return ["ECT-MESO"]
    elif soma_canon == "MESO":
        return ["ECT-MESO", "MESO-ENDO"]
    elif soma_canon == "ENDO":
        return ["MESO-ENDO"]
    elif soma_canon == "ECT-MESO":
        return ["MESO", "ECT"]
    elif soma_canon == "MESO-ENDO":
        return ["MESO", "ENDO"]
    return ["MESO"]

@router.get("/entrenamiento/rutina", response_model=RutinaResponse)
async def obtener_rutina_entrenamiento(
    somatotipo: Optional[str] = Query(None, description="Somatotipo (ECTOMORFO, MESOMORFO, ENDOMORFO, etc.)"),
    somatipo: Optional[str] = Query(None, description="Alias para somatotipo"),
    objetivo: Optional[str] = Query(None, description="Objetivo: GP, GM, PP, MANT"),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Retorna la plantilla de rutina personalizada aplicando precedencia determinista:
    - P1: Somatotipo exacto + objetivo exacto.
    - P2: Combinación que contenga el somatotipo + objetivo exacto.
    - P3: Plantilla del somatotipo con objetivo MANT declarada en regla_aplicada.
    Orden estable por (dia, orden, id_ejercicio).
    """
    # 1. Resolver somatotipo
    soma_input = somatotipo or somatipo
    if not soma_input or not soma_input.strip():
        # Consultar el último perfil biométrico del usuario autenticado.
        stmt_pb = (
            select(PerfilBiometrico)
            .where(PerfilBiometrico.id_usuario == current_user.id_usuario)
            .order_by(PerfilBiometrico.fecha_captura.desc())
            .limit(1)
        )
        res_pb = await db.execute(stmt_pb)
        pb = res_pb.scalar_one_or_none()
        if pb and pb.id_somatotipo == 1:
            soma_input = "ECT"
        elif pb and pb.id_somatotipo == 2:
            soma_input = "MESO"
        elif pb and pb.id_somatotipo == 3:
            soma_input = "ENDO"
        else:
            soma_input = "MESO"

    soma_canon = normalizar_somatotipo_canónico(soma_input)

    # 2. Resolver objetivo
    objetivo_declarado = True
    aviso = None
    obj_input = objetivo.upper().strip() if objetivo else None

    if not obj_input or obj_input not in ('GP', 'GM', 'PP', 'MANT'):
        if current_user.objetivo and current_user.objetivo in ('GP', 'GM', 'PP', 'MANT'):
            obj_input = current_user.objetivo
            objetivo_declarado = True
        else:
            obj_input = 'MANT'
            objetivo_declarado = False
            aviso = "Declara tu objetivo para afinar tu rutina de entrenamiento"

    plantilla = None
    regla_aplicada = ""

    # Precedencia P1: Somatotipo exacto + objetivo exacto
    stmt_p1 = select(RutinaPlantilla).where(
        RutinaPlantilla.somatotipo_afin == soma_canon,
        RutinaPlantilla.objetivo == obj_input
    )
    res_p1 = await db.execute(stmt_p1)
    plantilla = res_p1.scalars().first()
    if plantilla:
        regla_aplicada = f"P1: Somatotipo exacto ({soma_canon}) y objetivo exacto ({obj_input})"

    # Precedencia P2: Combinación que contenga el somatotipo + objetivo exacto
    if not plantilla:
        afines = obtener_somatotipos_afines_p2(soma_canon)
        stmt_p2 = select(RutinaPlantilla).where(
            RutinaPlantilla.somatotipo_afin.in_(afines),
            RutinaPlantilla.objetivo == obj_input
        ).order_by(RutinaPlantilla.id_plantilla.asc())
        res_p2 = await db.execute(stmt_p2)
        plantilla = res_p2.scalars().first()
        if plantilla:
            regla_aplicada = f"P2: Combinación afín ({plantilla.somatotipo_afin}) con objetivo exacto ({obj_input})"

    # Precedencia P3: Plantilla del somatotipo con objetivo MANT (o afín con MANT)
    if not plantilla:
        stmt_p3 = select(RutinaPlantilla).where(
            RutinaPlantilla.somatotipo_afin == soma_canon,
            RutinaPlantilla.objetivo == 'MANT'
        )
        res_p3 = await db.execute(stmt_p3)
        plantilla = res_p3.scalars().first()
        if plantilla:
            regla_aplicada = f"P3: Plantilla base ({soma_canon}) con objetivo de mantenimiento (MANT)"
        else:
            # Fallback final a MESO MANT si el somatotipo específico no tuviera MANT
            stmt_p3_alt = select(RutinaPlantilla).where(
                RutinaPlantilla.somatotipo_afin == 'MESO',
                RutinaPlantilla.objetivo == 'MANT'
            )
            res_p3_alt = await db.execute(stmt_p3_alt)
            plantilla = res_p3_alt.scalars().first()
            regla_aplicada = "P3: Plantilla general adaptada (MESO-MANT)"

    if not plantilla:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró ninguna rutina para {soma_canon} y {obj_input}"
        )

    # 3. Cargar ejercicios con orden estricto (dia, orden, id_ejercicio)
    stmt_ej = (
        select(PlantillaEjercicio, Ejercicio)
        .join(Ejercicio, PlantillaEjercicio.id_ejercicio == Ejercicio.id_ejercicio)
        .where(PlantillaEjercicio.id_plantilla == plantilla.id_plantilla)
        .order_by(
            PlantillaEjercicio.dia.asc(),
            PlantillaEjercicio.orden.asc(),
            PlantillaEjercicio.id_ejercicio.asc()
        )
    )
    res_ej = await db.execute(stmt_ej)
    rows_ej = res_ej.all()

    # Agrupar por día
    dias_dict = {}
    for pe, ej in rows_ej:
        d = pe.dia
        if d not in dias_dict:
            dias_dict[d] = []
        dias_dict[d].append(
            EjercicioRutinaItem(
                id_ejercicio=ej.id_ejercicio,
                codigo=ej.codigo,
                nombre=ej.nombre,
                categoria=ej.categoria,
                grupo_muscular=ej.grupo_muscular,
                dia=pe.dia,
                orden=pe.orden,
                series=pe.series,
                repeticiones=pe.repeticiones,
                descanso_seg=pe.descanso_seg,
                nota_tecnica=pe.nota_tecnica,
                url_gif=ej.url_gif,
                placeholder=(ej.url_gif is None),
                placeholder_texto="Animación en preparación" if ej.url_gif is None else "",
                disclaimer=ej.disclaimer
            )
        )

    dias_lista = [
        DiaRutina(
            dia=d,
            nombre_dia=f"Día {d}",
            ejercicios=ejercicios
        )
        for d, ejercicios in sorted(dias_dict.items())
    ]

    total_ej = sum(len(d.ejercicios) for d in dias_lista)

    return RutinaResponse(
        id_plantilla=plantilla.id_plantilla,
        nombre=plantilla.nombre,
        somatotipo_solicitado=soma_canon,
        somatotipo_plantilla=plantilla.somatotipo_afin,
        objetivo_solicitado=obj_input,
        objetivo_plantilla=plantilla.objetivo,
        objetivo_declarado=objetivo_declarado,
        aviso=aviso,
        frecuencia=plantilla.frecuencia,
        enfoque=plantilla.enfoque,
        descanso_general=plantilla.descanso_general,
        dias_semana=plantilla.dias_semana,
        regla_aplicada=regla_aplicada,
        disclaimer=plantilla.disclaimer,
        total_ejercicios=total_ej,
        dias=dias_lista
    )

@router.get("/entrenamiento/ejercicios", response_model=List[EjercicioItem])
async def catalogo_ejercicios(
    categoria: Optional[str] = Query(None, description="Categoría (PIERNAS, TIRON, EMPUJE, CORE, CONDICION, MOVILIDAD)"),
    somatotipo_afin: Optional[str] = Query(None, description="Somatotipo afín"),
    objetivo: Optional[str] = Query(None, description="Objetivo (GP, GM, PP, MANT)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Catálogo público de ejercicios con filtros opcionales y soporte R3-E para placeholder.
    """
    stmt = select(Ejercicio)
    filters = []
    if categoria:
        filters.append(Ejercicio.categoria == categoria.upper().strip())
    if somatotipo_afin:
        filters.append(Ejercicio.somatotipo_afin == somatotipo_afin.upper().strip())
    if objetivo:
        filters.append(Ejercicio.objetivo == objetivo.upper().strip())

    if filters:
        stmt = stmt.where(and_(*filters))

    stmt = stmt.order_by(Ejercicio.codigo.asc())
    res = await db.execute(stmt)
    rows = res.scalars().all()

    return [
        EjercicioItem(
            id_ejercicio=r.id_ejercicio,
            codigo=r.codigo,
            nombre=r.nombre,
            categoria=r.categoria,
            somatotipo_afin=r.somatotipo_afin,
            objetivo=r.objetivo,
            grupo_muscular=r.grupo_muscular,
            instrucciones=r.instrucciones,
            url_gif=r.url_gif,
            placeholder=(r.url_gif is None),
            placeholder_texto="Animación en preparación",
            disclaimer=r.disclaimer
        )
        for r in rows
    ]

@router.put("/usuarios/me/objetivo")
@router.patch("/usuarios/me/objetivo")
@router.put("/entrenamiento/objetivo")
async def actualizar_objetivo_usuario(
    payload: ActualizarObjetivoIn,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Actualiza el objetivo corporal/fitness del usuario autenticado ('GP', 'GM', 'PP', 'MANT').
    """
    current_user.objetivo = payload.objetivo
    await db.commit()
    await db.refresh(current_user)
    return {
        "message": "Objetivo actualizado exitosamente",
        "objetivo": current_user.objetivo
    }
