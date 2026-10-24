from datetime import datetime, timedelta, timezone

from jose import jwt

from services.ia.security import SERVICE_ALGORITHM, SERVICE_AUDIENCE, service_signing_key


def service_headers(user_id: int, role: str) -> dict[str, str]:
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "rol": role,
            "aud": SERVICE_AUDIENCE,
            "iat": now,
            "exp": now + timedelta(seconds=60),
            "type": "service_identity",
        },
        service_signing_key(),
        algorithm=SERVICE_ALGORITHM,
    )
    return {"X-Internal-Authorization": f"Bearer {token}"}
