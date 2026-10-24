from dataclasses import dataclass
from typing import Any

from jose import JWTError, jwt

from .config import settings

SERVICE_AUDIENCE = "spartan-ia"
SERVICE_ALGORITHM = "HS256"


@dataclass(frozen=True)
class ServiceIdentity:
    user_id: int
    role: str


def service_signing_key() -> str:
    key = settings.IA_INTERNAL_API_KEY.strip()
    if key:
        return key
    if settings.ENVIRONMENT.lower() in {"development", "test"} and settings.SECRET_KEY:
        return settings.SECRET_KEY
    raise RuntimeError("La clave interna del servicio IA no esta configurada.")


def decode_service_assertion(token: str) -> ServiceIdentity:
    payload: dict[str, Any] = jwt.decode(
        token,
        service_signing_key(),
        algorithms=[SERVICE_ALGORITHM],
        audience=SERVICE_AUDIENCE,
    )
    if payload.get("type") != "service_identity":
        raise JWTError("Tipo de asercion invalido")
    user_id = int(payload["sub"])
    role = str(payload["rol"]).upper()
    if user_id <= 0 or not role:
        raise JWTError("Identidad interna invalida")
    return ServiceIdentity(user_id=user_id, role=role)
