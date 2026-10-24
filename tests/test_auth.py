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

@pytest.mark.asyncio
async def test_auth_registro_cliente_y_verificacion_codigo(client: AsyncClient):
    """Verifica registro de nuevo cliente, despacho de código y verificación exitosa."""
    import secrets
    from sqlalchemy import select, text
    from app.models.users import Usuario
    from app.core.database import AsyncSessionLocal

    random_id = secrets.token_hex(3)
    test_email = f"e2e_atleta_{random_id}@test.com"

    try:
        # 1. Registro de nuevo cliente con activación inmediata
        reg_res = await client.post(
            "/auth/registro",
            json={
                "nombres": "Carlos",
                "apellidos": "Atleta E2E",
                "email": test_email,
                "password": "PasswordSpartan123!",
                "numero_documento": f"CI-E2E-{random_id}"
            }
        )
        assert reg_res.status_code == 200
        assert reg_res.json()["requiere_verificacion"] is False

        # 2. Login inmediato exitoso sin bloqueo de verificación
        login_ok = await client.post(
            "/auth/token",
            data={"username": test_email, "password": "PasswordSpartan123!"}
        )
        assert login_ok.status_code == 200
        assert login_ok.json()["rol"] == "CLIENTE"

        # 3. Código generado para endpoints de soporte/verificación manual
        async with AsyncSessionLocal() as session:
            stmt = select(Usuario).where(Usuario.email == test_email)
            user = (await session.execute(stmt)).scalar_one()
            codigo_enviado = user.codigo_verificacion

        assert codigo_enviado is not None
        assert len(codigo_enviado) == 6

        # 4. Verificar endpoint de verificación devuelve sesión
        verif_ok = await client.post(
            "/auth/verificar-codigo",
            json={"email": test_email, "codigo": codigo_enviado}
        )
        assert verif_ok.status_code == 200
        assert "access_token" in verif_ok.json()
        assert verif_ok.json()["rol"] == "CLIENTE"
    finally:
        # Teardown de aislamiento de datos de prueba
        async with AsyncSessionLocal() as session:
            await session.execute(text("DELETE FROM erp.usuario WHERE email = :email"), {"email": test_email})
            await session.commit()

@pytest.mark.asyncio
async def test_auth_recuperacion_y_restablecimiento_password(client: AsyncClient):
    """Verifica flujo completo de olvido y restablecimiento de contraseña."""
    import secrets
    from sqlalchemy import select
    from app.models.users import Usuario
    from app.core.database import AsyncSessionLocal

    test_email = "cliente@spartan.dev"

    # 1. Solicitar código de recuperación
    req_res = await client.post(
        "/auth/solicitar-recuperacion",
        json={"email": test_email}
    )
    assert req_res.status_code == 200

    # 2. Consultar código de recuperación en BD
    async with AsyncSessionLocal() as session:
        stmt = select(Usuario).where(Usuario.email == test_email)
        user = (await session.execute(stmt)).scalar_one()
        codigo_recup = user.codigo_recuperacion

    assert codigo_recup is not None
    assert len(codigo_recup) == 6

    # 3. Restablecer con nueva contraseña
    nueva_pass = f"SpartanNueva{secrets.token_hex(2)}!"
    reset_res = await client.post(
        "/auth/restablecer-password",
        json={
            "email": test_email,
            "codigo": codigo_recup,
            "nueva_password": nueva_pass
        }
    )
    assert reset_res.status_code == 200
    assert "actualizada exitosamente" in reset_res.json()["message"]

    # 4. Iniciar sesión con la nueva contraseña
    login_new = await client.post(
        "/auth/token",
        data={"username": test_email, "password": nueva_pass}
    )
    assert login_new.status_code == 200
    assert "access_token" in login_new.json()

    # Restaurar contraseña original para no afectar otros tests
    async with AsyncSessionLocal() as session:
        from app.core.security import hash_password
        stmt = select(Usuario).where(Usuario.email == test_email)
        user = (await session.execute(stmt)).scalar_one()
        user.hash_contrasena = hash_password("SpartanAdmin2026!")
        await session.commit()

