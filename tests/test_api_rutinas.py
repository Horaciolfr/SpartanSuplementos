import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "1", "rol": "ADMINISTRADOR", "email": "admin@spartan.dev"})
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_rutina_matriz_somatotipos_y_objetivos(auth_headers):
    """
    Verifica que la matriz completa de 6 somatotipos x 4 objetivos resuelva sin error 404:
    ECTOMORFO, MESOMORFO, ENDOMORFO, ECTO-MESOMORFO, MESO-ENDOMORFO, ENDO-ECTOMORFO
    con objetivos GP, GM, PP, MANT.
    """
    somatotipos = [
        "ECTOMORFO",
        "MESOMORFO",
        "ENDOMORFO",
        "ECTO-MESOMORFO",
        "MESO-ENDOMORFO",
        "ENDO-ECTOMORFO"
    ]
    objetivos = ["GP", "GM", "PP", "MANT"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for soma in somatotipos:
            for obj in objetivos:
                res = await ac.get(f"/entrenamiento/rutina?somatotipo={soma}&objetivo={obj}", headers=auth_headers)
                assert res.status_code == 200, f"Error para {soma} + {obj}: {res.text}"
                data = res.json()
                assert data["id_plantilla"] > 0
                assert data["total_ejercicios"] > 0
                assert len(data["dias"]) == data["dias_semana"]
                assert data["regla_aplicada"] != ""

                # Validar orden estricto de ejercicios por (dia, orden, id_ejercicio)
                for dia_obj in data["dias"]:
                    ordenes = [e["orden"] for e in dia_obj["ejercicios"]]
                    assert ordenes == sorted(ordenes), f"Ejercicios desordenados en día {dia_obj['dia']}"

@pytest.mark.asyncio
async def test_rutina_precedencia_p1_p2_p3(auth_headers):
    """
    Verifica el cumplimiento determinista de la precedencia:
    - P1: ECT + GP -> id_plantilla=1, somatotipo_afin=ECT, objetivo=GP
    - P2: ECT + GM -> id_plantilla=3 (ECT-MESO GM)
    - P3: ECT + PP -> id_plantilla=2 (ECT MANT)
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # P1
        res_p1 = await ac.get("/entrenamiento/rutina?somatotipo=ECTOMORFO&objetivo=GP", headers=auth_headers)
        assert res_p1.status_code == 200
        d_p1 = res_p1.json()
        assert "P1" in d_p1["regla_aplicada"]
        assert d_p1["id_plantilla"] == 1

        # P2
        res_p2 = await ac.get("/entrenamiento/rutina?somatotipo=ECTOMORFO&objetivo=GM", headers=auth_headers)
        assert res_p2.status_code == 200
        d_p2 = res_p2.json()
        assert "P2" in d_p2["regla_aplicada"]
        assert d_p2["id_plantilla"] == 3

        # P3
        res_p3 = await ac.get("/entrenamiento/rutina?somatotipo=ECTOMORFO&objetivo=PP", headers=auth_headers)
        assert res_p3.status_code == 200
        d_p3 = res_p3.json()
        assert "P3" in d_p3["regla_aplicada"]
        assert d_p3["id_plantilla"] == 2

@pytest.mark.asyncio
async def test_rutina_fallback_sin_objetivo(auth_headers):
    """Verifica que sin objetivo especificado, el motor aplica fallback MANT con aviso claro."""
    from app.core.database import AsyncSessionLocal
    from app.models.users import Usuario
    from sqlalchemy import update

    async with AsyncSessionLocal() as session:
        await session.execute(update(Usuario).where(Usuario.id_usuario == 1).values(objetivo=None))
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/entrenamiento/rutina?somatotipo=MESOMORFO", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["objetivo_solicitado"] == "MANT"
        assert data["objetivo_declarado"] is False
        assert data["aviso"] == "Declara tu objetivo para afinar tu rutina de entrenamiento"

@pytest.mark.asyncio
async def test_rutina_placeholder_r3_cuando_no_hay_gif(auth_headers):
    """Verifica regla R3-E: si un ejercicio no tiene GIF (ej. EJ-010), retorna placeholder=True y texto informativo."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # En Plantilla 1 (ECT GP) o Plantilla 2 (ECT MANT), EJ-010 está incluido
        res = await ac.get("/entrenamiento/rutina?somatotipo=ECTOMORFO&objetivo=GP", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()

        todos_ejercicios = []
        for d in data["dias"]:
            todos_ejercicios.extend(d["ejercicios"])

        ej_sin_gif = [e for e in todos_ejercicios if e["codigo"] == "EJ-010"]
        assert len(ej_sin_gif) > 0, "EJ-010 debe estar presente en la rutina"
        assert ej_sin_gif[0]["url_gif"] is None
        assert ej_sin_gif[0]["placeholder"] is True
        assert ej_sin_gif[0]["placeholder_texto"] == "Animación en preparación"

@pytest.mark.asyncio
async def test_rutina_seguridad_401_si_anonimo():
    """GET /entrenamiento/rutina debe rechazar accesos anónimos con 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/entrenamiento/rutina?somatotipo=MESOMORFO&objetivo=GM")
        assert res.status_code == 401

@pytest.mark.asyncio
async def test_actualizar_objetivo_422_si_invalido(auth_headers):
    """PUT /usuarios/me/objetivo con valor no permitido debe responder 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.put("/usuarios/me/objetivo", json={"objetivo": "INVENTADO"}, headers=auth_headers)
        assert res.status_code == 422

@pytest.mark.asyncio
async def test_actualizar_objetivo_exitoso(auth_headers):
    """PUT /usuarios/me/objetivo con valor válido actualiza y persiste el objetivo."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.put("/usuarios/me/objetivo", json={"objetivo": "GM"}, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["objetivo"] == "GM"

@pytest.mark.asyncio
async def test_catalogo_ejercicios_publico():
    """GET /entrenamiento/ejercicios es público y devuelve los 20 ejercicios."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/entrenamiento/ejercicios")
        assert res.status_code == 200
        ejercicios = res.json()
        assert len(ejercicios) == 20
        codigos = [e["codigo"] for e in ejercicios]
        assert "EJ-001" in codigos
        assert "EJ-020" in codigos
