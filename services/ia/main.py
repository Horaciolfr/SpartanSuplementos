"""
Microservicio Desacoplado de Visión Artificial e Inferencia Biometríca (Esquema IA)
Regla 2.1: Desacoplamiento total del Gateway ERP.
Las inferencias CPU-bound jamás saturan el Event Loop ASGI transaccional de ventas.
"""
import uuid
import logging
from datetime import datetime, timezone
import mediapipe as mp
import jsonschema
from contextlib import asynccontextmanager
from fastapi import BackgroundTasks, Depends, FastAPI, UploadFile, File, Form, Header, Query, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from jose import JWTError
from .config import settings
from .pose_service import pose_inference_service
from .jsonb_schema import validar_coordenadas_espaciales
from .security import ServiceIdentity, decode_service_assertion
from .db import (
    guardar_perfil_biometrico,
    obtener_perfil_por_id,
    listar_perfiles_paginados,
    buscar_perfiles_gin,
    obtener_rol_usuario,
    obtener_o_generar_prescripcion,
    obtener_prescripcion_lectura,
    generar_prescripcion,
    close_db_pool
)

logger = logging.getLogger("services.ia.main")

MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


async def get_service_identity(
    x_internal_authorization: Optional[str] = Header(None, alias="X-Internal-Authorization"),
) -> ServiceIdentity:
    """Valida la asercion firmada por el gateway y la contrasta con la BD."""
    if not x_internal_authorization or not x_internal_authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Asercion interna requerida.",
        )

    try:
        identity = decode_service_assertion(x_internal_authorization.removeprefix("Bearer ").strip())
    except (JWTError, KeyError, ValueError, RuntimeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Asercion interna invalida o expirada.",
        ) from exc

    database_role = await obtener_rol_usuario(identity.user_id)
    if database_role is None or database_role.upper() != identity.role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La identidad interna no corresponde a un usuario vigente.",
        )
    return identity

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_db_pool()

app = FastAPI(
    title=settings.SERVICE_NAME,
    description="Microservicio especializado en visión artificial (MediaPipe / Roboflow) y cálculo de somatotipos",
    version="1.0.0",
    lifespan=lifespan
)

class LandmarksPayload(BaseModel):
    id_usuario: int = Field(gt=0)
    estatura_cm: float = Field(ge=100, le=250)
    peso_kg: float = Field(ge=30, le=350)
    landmarks: Dict[str, Any]

@app.get("/health")
async def health_check():
    return {
        "service": settings.SERVICE_NAME,
        "status": "operational",
        "domain": "ia"
    }

@app.post("/ia/pose/analizar")
async def analizar_pose(
    file: UploadFile = File(...),
    estatura_cm: float = Form(...),
    peso_kg: float = Form(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Recibe un fotograma discreto JPEG/PNG, estatura_cm y peso_kg.
    Ejecuta inferencia CPU-bound de 33 landmarks con MediaPipe en hilo desacoplado.
    Calcula la antropometría determinista 3D y, tras inferencia exitosa,
    valida el contrato JSONB estricto y persiste de forma atómica en ia.perfil_biometrico.
    """
    if estatura_cm <= 0 or peso_kg <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="estatura_cm y peso_kg deben ser valores mayores a 0."
        )

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no permitido. Usa JPEG, PNG o WebP.",
        )

    image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo enviado está vacío."
        )

    if len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el limite de 8 MB.",
        )

    # Inferencia de postura desacoplada
    resultado = await pose_inference_service.analizar_postura_async(
        image_bytes=image_bytes,
        estatura_cm=estatura_cm,
        peso_kg=peso_kg
    )

    # Si la inferencia no detectó pose o falló, no se persiste nada (transacción atómica: OK o nada)
    if resultado.get("status") != "success" or not resultado.get("landmarks"):
        return resultado

    # 1. Mapeo estricto al contrato JSONB de la Tarea 8
    landmarks_formatted = []
    for lm in resultado["landmarks"]:
        landmarks_formatted.append({
            "ix": int(lm["id"]),
            "nombre": str(lm["nombre"]),
            "x": float(lm["x"]),
            "y": float(lm["y"]),
            "z": float(lm["z"]),
            "visibility": float(lm["visibilidad"])
        })

    world_landmarks_formatted = []
    for idx, wlm in enumerate(resultado.get("world_landmarks", [])):
        world_landmarks_formatted.append({
            "ix": int(wlm.get("id", idx)),
            "x": float(wlm["x"]),
            "y": float(wlm["y"]),
            "z": float(wlm["z"])
        })

    metricas_formatted = {
        "v_taper": float(resultado["metricas_biometricas"]["v_taper"]),
        "ancho_hombros_m": float(resultado["metricas_biometricas"]["ancho_hombros_m"]),
        "ancho_cadera_m": float(resultado["metricas_biometricas"]["ancho_cadera_m"]),
        "torso_length_m": float(resultado["metricas_biometricas"]["torso_length_m"]),
        "simetria": float(resultado["metricas_biometricas"]["simetria"]),
        "postura": str(resultado["metricas_biometricas"]["postura"])
    }

    coordenadas_espaciales = {
        "frame_id": str(uuid.uuid4()),
        "precision": float(resultado["precision_captura"]),
        "landmarks": landmarks_formatted,
        "world_landmarks": world_landmarks_formatted,
        "metricas": metricas_formatted,
        "metadata": {
            "mediapipe_version": getattr(mp, "__version__", "1.0.1"),
            "model": "pose_landmarker_lite",
            "timestamp_utc": datetime.now(timezone.utc).isoformat()
        }
    }

    # 2. Validación fail-fast ANTES del INSERT
    try:
        validar_coordenadas_espaciales(coordenadas_espaciales)
    except jsonschema.ValidationError as err:
        logger.error(
            "Fallo de validación de contrato JSONB: %s en %s",
            err.message,
            list(err.path),
            extra={"error": err.message, "path": list(err.path)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo de validación de contrato JSONB: {err.message}"
        )

    # 3. Persistencia atómica exclusiva en esquema ia
    id_perfil = await guardar_perfil_biometrico(
        id_usuario=identity.user_id,
        somatotipo_nombre=resultado["somatotipo_estimado"],
        coordenadas_espaciales=coordenadas_espaciales,
        precision_captura=resultado["precision_captura"],
        estatura_cm=estatura_cm,
        peso_kg=peso_kg
    )

    # 4. Orquestación en background: computa prescripción explicable tras captura (Tarea 17)
    background_tasks.add_task(
        generar_prescripcion,
        id_perfil,
        identity.user_id,
        identity.role
    )

    resultado["id_perfil"] = id_perfil
    return resultado

@app.get("/ia/perfiles/{id_perfil:int}")
async def get_perfil_por_id(
    id_perfil: int,
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Retorna la fila completa de ia.perfil_biometrico + nombre_somatotipo.
    Control de acceso:
    - Acceso permitido a usuarios con rol ADMINISTRADOR o al propietario del perfil (X-Usuario-Id == id_usuario).
    - Retorna 403 Forbidden si no está autorizado.
    """
    perfil = await obtener_perfil_por_id(id_perfil)
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Perfil biométrico {id_perfil} no encontrado."
        )

    # Control de acceso: ADMINISTRADOR o propietario
    es_admin = identity.role == "ADMINISTRADOR"
    es_propietario = identity.user_id == perfil["id_usuario"]

    if not (es_admin or es_propietario):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: solo ADMINISTRADOR o el usuario propietario pueden consultar este perfil."
        )

    return perfil

@app.get("/ia/perfiles")
async def get_perfiles_paginados(
    usuario_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Historial paginado de perfiles biométricos ordenado por fecha_captura DESC.
    """
    effective_user_id = usuario_id if identity.role == "ADMINISTRADOR" else identity.user_id
    return await listar_perfiles_paginados(usuario_id=effective_user_id, limit=limit, offset=offset)

@app.get("/ia/perfiles/search")
async def search_perfiles_gin(
    nombre_landmark: str = Query(..., description="Nombre del landmark de MediaPipe (ej. LEFT_SHOULDER)"),
    min_visibility: float = Query(0.0, ge=0.0, le=1.0, description="Umbral mínimo de visibilidad"),
    usuario_id: Optional[int] = Query(None, gt=0),
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Búsqueda especializada traducida a contención GIN:
    WHERE coordenadas_espaciales @> '{"landmarks":[{"nombre":$1}]}'
    AND filtro de visibility sobre el elemento correspondiente.
    """
    effective_user_id = usuario_id if identity.role == "ADMINISTRADOR" else identity.user_id
    return await buscar_perfiles_gin(
        nombre_landmark=nombre_landmark,
        min_visibility=min_visibility,
        usuario_id=effective_user_id,
    )

@app.post("/inferencia/somatotipo")
async def inferir_somatotipo(
    payload: LandmarksPayload,
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Simulación / worker de inferencia que clasifica somatotipo a partir de landmarks espaciales
    sin bloquear transacciones del ERP.
    """
    imc = payload.peso_kg / ((payload.estatura_cm / 100) ** 2)
    somatotipo = "MESOMORFO" if 20 <= imc <= 26 else ("ECTOMORFO" if imc < 20 else "ENDOMORFO")
    return {
        "id_usuario": identity.user_id,
        "somatotipo_predicho": somatotipo,
        "indice_masa_corporal": round(imc, 2),
        "precision_estimada": 0.94
    }


@app.get("/ia/prescripcion/{id_perfil}")
async def prescripcion_crossselling_lectura(
    id_perfil: int,
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Consulta estrictamente idempotente de prescripciones (F-04).
    Solo lectura. No ejecuta inferencia CART ni muta ia.prescripcion_crossselling.
    """
    try:
        return await obtener_prescripcion_lectura(
            id_perfil=id_perfil,
            requester_user_id=identity.user_id,
            requester_role=identity.role,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except RuntimeError as exc:
        msg = str(exc)
        if "no encontrado" in msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=msg)


@app.post("/ia/prescripcion/{id_perfil}/generar")
async def prescripcion_crossselling_generar(
    id_perfil: int,
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """
    Motor de Prescripción Cross-Selling explicable CART (Tarea 14 / F-04).
    Aplica reglas de inferencia CART de la versión activa en producción
    sobre el somatotipo del perfil biométrico.
    Filtra con gate obligatorio en SQL: estado_activo=TRUE AND stock_actual>0.
    Persiste las recomendaciones en ia.prescripcion_crossselling.
    """
    try:
        return await generar_prescripcion(
            id_perfil=id_perfil,
            requester_user_id=identity.user_id,
            requester_role=identity.role,
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except RuntimeError as exc:
        msg = str(exc)
        if "no encontrado" in msg.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        if "version aprobada" in msg.lower() or "versión aprobada" in msg.lower():
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=msg)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=msg)


@app.get("/ia/prescripcion/{id_perfil}/estado")
async def estado_prescripcion_post_captura(
    id_perfil: int,
    identity: ServiceIdentity = Depends(get_service_identity),
):
    """Consulta de polling sobre la generación en background de la prescripción."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        perfil = await conn.fetchrow(
            "SELECT id_usuario FROM ia.perfil_biometrico WHERE id_perfil = $1",
            int(id_perfil)
        )
        if not perfil:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Perfil {id_perfil} no encontrado.")
        if identity.role.upper() != "ADMINISTRADOR" and perfil["id_usuario"] != identity.user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso no autorizado al perfil ajeno.")

        count = await conn.fetchval(
            "SELECT count(*) FROM ia.prescripcion_crossselling WHERE id_perfil = $1",
            int(id_perfil)
        )
        return {
            "id_perfil": id_perfil,
            "prescripcion_lista": count > 0,
            "total_prescripciones": count,
            "estado": "COMPLETADO" if count > 0 else "EN_PROGRESO"
        }


