import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_login_success_and_role(client: AsyncClient):
    """Verifica 200 con token y rol correctos para administrador y cliente"""
    response = await client.post(
        "/auth/token",
        data={"username": "admin@spartan.dev", "password": "SpartanAdmin2026!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["rol"] == "ADMINISTRADOR"

@pytest.mark.asyncio
async def test_auth_login_wrong_password(client: AsyncClient):
    """Verifica 401 con contraseña errada"""
    response = await client.post(
        "/auth/token",
        data={"username": "admin@spartan.dev", "password": "PasswordIncorrecta123"}
    )
    assert response.status_code == 401
    assert "incorrectos" in response.json()["detail"]

@pytest.mark.asyncio
async def test_auth_me_without_token(client: AsyncClient):
    """Verifica 401 al acceder a /auth/me sin token"""
    response = await client.get("/auth/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_auth_me_with_valid_token(client: AsyncClient):
    """Verifica 200 y obtención de datos de usuario (sin hash_contrasena)"""
    login_res = await client.post(
        "/auth/token",
        data={"username": "admin@spartan.dev", "password": "SpartanAdmin2026!"}
    )
    token = login_res.json()["access_token"]

    response = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == "admin@spartan.dev"
    assert user_data["rol"] == "ADMINISTRADOR"
    assert "hash_contrasena" not in user_data

@pytest.mark.asyncio
async def test_auth_role_forbidden_403(client: AsyncClient):
    """Verifica 403 con rol CLIENTE sobre ruta protegida para ADMINISTRADOR (/catalogo/categorias)"""
    login_res = await client.post(
        "/auth/token",
        data={"username": "cliente@spartan.dev", "password": "SpartanAdmin2026!"}
    )
    token = login_res.json()["access_token"]

    response = await client.get("/catalogo/categorias", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert "Permisos insuficientes" in response.json()["detail"]
