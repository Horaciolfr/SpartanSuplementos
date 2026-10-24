import os
from urllib.parse import urlsplit
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLE_PATH = os.path.join(PROJECT_ROOT, "tests", "assets", "sample_pose.jpg")


def bearer(user_id: int, role: str, email: str) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_a_post_pose_sin_token_retorna_401(client: AsyncClient):
    response = await client.post(
        "/ia/pose/analizar",
        files={"file": ("pose.jpg", b"fake-image", "image/jpeg")},
        data={"estatura_cm": "175", "peso_kg": "75"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_b_header_cliente_no_suplanta_titular_persistido(client: AsyncClient):
    from sqlalchemy import text
    from app.core.database import engine

    with open(SAMPLE_PATH, "rb") as sample:
        response = await client.post(
            "/ia/pose/analizar",
            files={"file": ("sample_pose.jpg", sample.read(), "image/jpeg")},
            data={"estatura_cm": "175", "peso_kg": "75"},
            headers={
                **bearer(4, "CLIENTE", "cliente@spartan.dev"),
                "X-Usuario-Id": "2",
            },
        )

    assert response.status_code == 200, response.text
    payload = response.json()
    id_perfil = payload.get("id_perfil")
    assert id_perfil is not None, f"Respuesta no incluye id_perfil: {payload}"

    # Verificar en base de datos que el perfil fue registrado para el usuario 4 (autenticado) y NO para el usuario 2 (suplantador)
    async with engine.connect() as conn:
        res = await conn.execute(
            text("SELECT id_usuario FROM ia.perfil_biometrico WHERE id_perfil = :id_perfil"),
            {"id_perfil": id_perfil},
        )
        row = res.fetchone()
        assert row is not None, f"No se encontró perfil {id_perfil} en base de datos"
        persisted_user_id = row[0]
        assert persisted_user_id == 4, f"Se persistió id_usuario {persisted_user_id}, esperado 4"
        assert persisted_user_id != 2, "Vulnerabilidad: se aceptó suplantación mediante X-Usuario-Id"



@pytest.mark.asyncio
async def test_c_get_perfiles_sin_token_retorna_401(client: AsyncClient):
    response = await client.get("/ia/perfiles")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_d_cliente_lista_exclusivamente_sus_perfiles(client: AsyncClient):
    captured: dict = {}

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            return None

        async def get(self, url, **kwargs):
            captured["params"] = kwargs.get("params", {})
            owner = captured["params"]["usuario_id"]
            return httpx.Response(200, json=[{"id_perfil": 1, "id_usuario": owner}])

    with patch("app.modules.ia.router.httpx.AsyncClient", new=MockAsyncClient):
        response = await client.get(
            "/ia/perfiles?usuario_id=2",
            headers=bearer(4, "CLIENTE", "cliente@spartan.dev"),
        )

    assert response.status_code == 200
    assert captured["params"]["usuario_id"] == 4
    assert all(item["id_usuario"] == 4 for item in response.json())
