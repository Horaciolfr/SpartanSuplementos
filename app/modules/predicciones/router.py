import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_roles
from app.models.users import Usuario
from app.modules.ia.versioning import obtener_version_activa
from app.modules.predicciones.schemas import DashboardPrediccionesResponse
from app.modules.predicciones.service import predicciones_service
from scripts.promocionar_modelo import actualizar_estado_bd, evaluar_metricas_holdout
from scripts.train_modelos import entrenar_y_persistir_modelos

router = APIRouter(prefix="/predicciones", tags=["Módulo Predictivo de Ventas & Business Intelligence (ERP)"])

_jobs_reentrenamiento: Dict[str, Dict[str, Any]] = {}


async def _ejecutar_reentrenamiento_background(job_id: str):
    """Ejecuta el pipeline de reentrenamiento, validación de gates y promoción de forma asíncrona."""
    try:
        _jobs_reentrenamiento[job_id]["estado"] = "EN_PROGRESO"
        _jobs_reentrenamiento[job_id]["progreso"] = 20

        entrenamiento = await asyncio.to_thread(entrenar_y_persistir_modelos)
        _jobs_reentrenamiento[job_id]["progreso"] = 60

        metricas = await asyncio.to_thread(evaluar_metricas_holdout)
        versiones = {
            "RF_REGRESOR_DEMANDA": entrenamiento["id_version_demanda"],
            "RF_CLASIFICADOR_QUIEBRE": entrenamiento["id_version_quiebre"],
        }
        _jobs_reentrenamiento[job_id]["progreso"] = 80

        await actualizar_estado_bd(metricas, versiones)

        if metricas["todos_gates_pasan"]:
            predicciones_service.cargar_datos()
            predicciones_service.entrenar_modelo_predictivo()

        _jobs_reentrenamiento[job_id]["estado"] = "COMPLETADO"
        _jobs_reentrenamiento[job_id]["progreso"] = 100
        _jobs_reentrenamiento[job_id]["resultado"] = {
            "mensaje": (
                "Candidatos evaluados y promovidos tras superar los gates."
                if metricas["todos_gates_pasan"]
                else "Candidatos evaluados sin promoción: uno o más gates fallaron."
            ),
            "versiones_candidatas": versiones,
            "promovido": metricas["todos_gates_pasan"],
            "metricas": metricas,
        }
        _jobs_reentrenamiento[job_id]["finalizado_en"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        _jobs_reentrenamiento[job_id]["estado"] = "FALLIDO"
        _jobs_reentrenamiento[job_id]["error"] = str(exc)
        _jobs_reentrenamiento[job_id]["finalizado_en"] = datetime.now(timezone.utc).isoformat()


@router.get(
    "/dashboard",
    response_model=DashboardPrediccionesResponse,
    summary="Dashboard de Predicción de Ventas para el Administrador",
    description="Provee análisis histórico consolidado, validación temporal fuera de muestra y proyecciones con intervalos empíricos al 90% para La Paz, Santa Cruz y el consolidado."
)
async def obtener_dashboard_predicciones(
    sucursal: str = Query("TODAS", description="Filtro de sucursal: TODAS, CENTRAL, SANTA_CRUZ"),
    horizonte_dias: int = Query(14, ge=7, le=60, description="Días hacia adelante a proyectar (7, 14, 30)"),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR", "EMPLEADO")),
    db: AsyncSession = Depends(get_db),
) -> DashboardPrediccionesResponse:
    try:
        version_activa = await obtener_version_activa(db, "RF_REGRESOR_DEMANDA")
        return predicciones_service.generar_dashboard(
            sucursal_filtro=sucursal,
            horizonte_dias=horizonte_dias,
            version_activa=version_activa
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al generar predicciones de ventas: {str(exc)}"
        )


@router.post(
    "/reentrenar",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Recalcular Modelo Predictivo de Ventas (Asíncrono)",
    description="Encola el reentrenamiento de Random Forest como tarea en background. Responde 202 con job_id sin bloquear el Event Loop ASGI."
)
async def reentrenar_modelo_ventas(
    background_tasks: BackgroundTasks,
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    job_id = f"job_rf_{uuid.uuid4().hex[:12]}"
    _jobs_reentrenamiento[job_id] = {
        "job_id": job_id,
        "estado": "EN_PROGRESO",
        "progreso": 5,
        "iniciado_en": datetime.now(timezone.utc).isoformat(),
        "finalizado_en": None,
        "resultado": None,
        "error": None,
    }
    background_tasks.add_task(_ejecutar_reentrenamiento_background, job_id)

    return {
        "job_id": job_id,
        "estado": "EN_PROGRESO",
        "mensaje": "Tarea de reentrenamiento encolada exitosamente en segundo plano.",
        "polling_url": f"/predicciones/reentrenar/estado?job_id={job_id}"
    }


@router.get(
    "/reentrenar/estado",
    summary="Consultar Estado de Reentrenamiento en Background",
    description="Expone el estado de progreso, finalización y métricas del trabajo de reentrenamiento encolado."
)
async def obtener_estado_reentrenamiento(
    job_id: Optional[str] = Query(None, description="Identificador único de la tarea devuelto en 202"),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    if job_id:
        if job_id not in _jobs_reentrenamiento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trabajo con job_id '{job_id}' no encontrado.",
            )
        return _jobs_reentrenamiento[job_id]

    if not _jobs_reentrenamiento:
        return {
            "job_id": None,
            "estado": "IDLE",
            "mensaje": "No se han ejecutado trabajos de reentrenamiento en la sesión actual."
        }

    # Devuelve el trabajo más reciente
    ultimo_id = list(_jobs_reentrenamiento.keys())[-1]
    return _jobs_reentrenamiento[ultimo_id]

