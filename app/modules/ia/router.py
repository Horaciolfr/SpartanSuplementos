from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from jose import jwt

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.gateway import resilient_ia_request
from app.models.users import Usuario

router = APIRouter(prefix="/ia", tags=["Vision Artificial & Biometria (Gateway)"])

IA_SERVICE_URL = settings.IA_SERVICE_URL.rstrip("/")
MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _service_signing_key() -> str:
    internal_key = settings.IA_INTERNAL_API_KEY.strip()
    if internal_key:
        return internal_key
    if settings.ENVIRONMENT.lower() in {"development", "test"}:
        return settings.SECRET_KEY
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="La comunicacion segura con el servicio de IA no esta configurada.",
    )


def _service_headers(current_user: Usuario) -> dict[str, str]:
    """Firma la identidad ya verificada; nunca propaga identidad del cliente."""
    role = current_user.rol.nombre_rol if current_user.rol else "CLIENTE"
    now = datetime.now(timezone.utc)
    assertion = jwt.encode(
        {
            "sub": str(current_user.id_usuario),
            "rol": role,
            "aud": "spartan-ia",
            "iat": now,
            "exp": now + timedelta(seconds=60),
            "type": "service_identity",
        },
        _service_signing_key(),
        algorithm="HS256",
    )
    return {
        "X-Internal-Authorization": f"Bearer {assertion}",
    }


def _upstream_detail(response: httpx.Response) -> str:
    try:
        payload: Any = response.json()
        if isinstance(payload, dict) and payload.get("detail"):
            return str(payload["detail"])
    except ValueError:
        pass
    return "El servicio de IA no pudo completar la operacion."


@router.post("/pose/analizar")
async def gateway_analizar_pose(
    request: Request,
    file: UploadFile = File(...),
    estatura_cm: float = Form(175.0, ge=100.0, le=250.0),
    peso_kg: float = Form(75.0, ge=30.0, le=350.0),
    current_user: Usuario = Depends(get_current_user),
):
    """Analiza una imagen y persiste el resultado asociado al usuario autenticado."""
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no permitido. Usa una imagen JPG, PNG o WebP.",
        )

    file_bytes = await file.read(MAX_IMAGE_BYTES + 1)
    if not file_bytes:
        raise HTTPException(status_code=400, detail="El archivo de imagen esta vacio.")
    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el limite de 8 MB.",
        )

    files_payload = {
        "file": (file.filename or "capture.jpg", file_bytes, content_type),
    }
    data_payload = {
        "estatura_cm": str(estatura_cm),
        "peso_kg": str(peso_kg),
    }

    response = await resilient_ia_request(
        method="POST",
        url=f"{IA_SERVICE_URL}/ia/pose/analizar",
        files=files_payload,
        data=data_payload,
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


@router.get("/perfiles/search")
async def gateway_search_perfiles(
    request: Request,
    nombre_landmark: str = Query(..., min_length=2, max_length=50),
    min_visibility: float = Query(0.0, ge=0.0, le=1.0),
    current_user: Usuario = Depends(get_current_user),
):
    """Busca perfiles propios; un administrador puede consultar el universo."""
    role = current_user.rol.nombre_rol if current_user.rol else "CLIENTE"
    params: dict[str, Any] = {
        "nombre_landmark": nombre_landmark,
        "min_visibility": min_visibility,
    }
    if role != "ADMINISTRADOR":
        params["usuario_id"] = current_user.id_usuario

    response = await resilient_ia_request(
        method="GET",
        url=f"{IA_SERVICE_URL}/ia/perfiles/search",
        params=params,
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


@router.get("/perfiles/{id_perfil}")
async def gateway_get_perfil(
    id_perfil: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
):
    """Consulta un perfil propio o, para administradores, cualquier perfil."""
    response = await resilient_ia_request(
        method="GET",
        url=f"{IA_SERVICE_URL}/ia/perfiles/{id_perfil}",
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


@router.get("/perfiles")
async def gateway_list_perfiles(
    request: Request,
    usuario_id: Optional[int] = Query(None, gt=0),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Usuario = Depends(get_current_user),
):
    """Lista perfiles propios; un administrador puede filtrar cualquier usuario."""
    role = current_user.rol.nombre_rol if current_user.rol else "CLIENTE"
    params: dict[str, int] = {"limit": limit, "offset": offset}
    if role == "ADMINISTRADOR" and usuario_id is not None:
        params["usuario_id"] = usuario_id
    elif role != "ADMINISTRADOR":
        params["usuario_id"] = current_user.id_usuario

    response = await resilient_ia_request(
        method="GET",
        url=f"{IA_SERVICE_URL}/ia/perfiles",
        params=params,
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


@router.get("/prescripcion/{id_perfil}")
async def gateway_get_prescripcion(
    id_perfil: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
):
    """Consulta estrictamente idempotente de prescripcion (F-04). Solo lectura."""
    response = await resilient_ia_request(
        method="GET",
        url=f"{IA_SERVICE_URL}/ia/prescripcion/{id_perfil}",
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


@router.post("/prescripcion/{id_perfil}/generar")
async def gateway_post_prescripcion_generar(
    id_perfil: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
):
    """Genera o recalcula y persiste la prescripcion de cross-selling (F-04)."""
    response = await resilient_ia_request(
        method="POST",
        url=f"{IA_SERVICE_URL}/ia/prescripcion/{id_perfil}/generar",
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


@router.get("/prescripcion/{id_perfil}/estado")
async def gateway_get_prescripcion_estado(
    id_perfil: int,
    request: Request,
    current_user: Usuario = Depends(get_current_user),
):
    """Consulta de polling sobre el estado de la prescripcion en background."""
    response = await resilient_ia_request(
        method="GET",
        url=f"{IA_SERVICE_URL}/ia/prescripcion/{id_perfil}/estado",
        headers=_service_headers(current_user),
        request=request,
        global_timeout=10.0,
        client_factory=httpx.AsyncClient,
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_upstream_detail(response))
    return response.json()


