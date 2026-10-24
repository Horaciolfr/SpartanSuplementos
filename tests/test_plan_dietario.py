import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.security import create_access_token

@pytest.fixture
def auth_headers():
    token = create_access_token(data={"sub": "1", "rol": "ADMINISTRADOR", "email": "admin@spartan.dev"})
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_plan_diario_matriz_somatotipos_y_objetivos(auth_headers):
    """
    Verifica para cada combinación de somatotipo y objetivo que:
    1. Toda receta devuelta contiene el somatotipo afin (directo o por combinación).
    2. El objetivo respeta la regla declarada P1, P2 o P3.
    """
    somatotipos = ["ECTOMORFO", "MESOMORFO", "ENDOMORFO", "ECT-MESO", "MESO-ENDO"]
    objetivos = ["GP", "GM", "PP", "MANT"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        for soma in somatotipos:
            for obj in objetivos:
                res = await ac.get(f"/nutricion/plan-diario?somatotipo={soma}&objetivo={obj}", headers=auth_headers)
                assert res.status_code == 200, f"Error para {soma} + {obj}: {res.text}"
                data = res.json()
                assert data["somatotipo"] == soma
                assert data["objetivo"] == obj
                assert data["total_comidas"] > 0
                assert len(data["comidas"]) == data["total_comidas"]

                # Regla de categorías únicas
                cats = [c["categoria"] for c in data["comidas"]]
                assert len(cats) == len(set(cats)), "No debe haber categorías duplicadas en el plan"

                for c in data["comidas"]:
                    # Validar afinidad somatotípica
                    afin = c["somatotipo_afin"]
                    if "ECT" in soma and "MESO" not in soma:
                        assert "ECT" in afin or afin == "ECTO", f"Receta {c['codigo']} no afin a {soma}"
                    elif "MESO" in soma and "ECT" not in soma and "ENDO" not in soma:
                        assert "MESO" in afin, f"Receta {c['codigo']} no afin a {soma}"
                    elif "ENDO" in soma and "MESO" not in soma:
                        assert "ENDO" in afin, f"Receta {c['codigo']} no afin a {soma}"

                    # Validar objetivo según regla aplicada
                    regla = c["regla_aplicada"]
                    if "P1" in regla:
                        assert c["objetivo"] == obj
                    elif "P2" in regla:
                        assert c["objetivo"] == obj
                    elif "P3" in regla:
                        assert c["objetivo"] == "MANT"

@pytest.mark.asyncio
async def test_plan_diario_fallback_sin_objetivo(auth_headers):
    """Verifica que sin objetivo especificado, el motor aplica fallback MANT y emite aviso visible."""
    from app.core.database import AsyncSessionLocal
    from app.models.users import Usuario
    from sqlalchemy import update
    
    async with AsyncSessionLocal() as session:
        await session.execute(update(Usuario).where(Usuario.id_usuario == 1).values(objetivo=None))
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/nutricion/plan-diario?somatotipo=MESOMORFO", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["objetivo"] == "MANT"
        assert data["objetivo_declarado"] is False
        assert data["aviso"] == "Declara tu objetivo para afinar el plan"

@pytest.mark.asyncio
async def test_plan_diario_placeholders_cuando_no_hay_imagen(auth_headers):
    """La afinidad exacta tiene prioridad; la falta de imagen se resuelve con un placeholder."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/nutricion/plan-diario?somatotipo=MESOMORFO&objetivo=GM", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        comidas = data["comidas"]
        
        # La imagen se prioriza solo entre recetas igualmente afines. No debe forzar
        # una combinación corporal menos específica para completar la cuadrícula.
        con_img = [c for c in comidas if c["url_imagen"] is not None]
        assert len(con_img) >= 2, f"Se esperaban imágenes disponibles sin alterar la afinidad, encontradas {len(con_img)}"
        for c in con_img:
            assert c["placeholder"] is False
            assert c["url_imagen"].startswith("/recetas/REC-")

        # Debe haber al menos un placeholder visible
        sin_img = [c for c in comidas if c["url_imagen"] is None]
        assert len(sin_img) >= 1, "Debe haber al menos un placeholder visible"
        for c in sin_img:
            assert c["placeholder"] is True
            assert c["placeholder_texto"] == "Imagen en preparación"

@pytest.mark.asyncio
async def test_catalogo_recetas_paginacion_y_filtros():
    """Verifica el endpoint GET /catalogo/recetas con conteo de 110 y filtros."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/catalogo/recetas?tamano=150")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 110
        assert len(data["items"]) == 110

        # Filtro con_imagen=True
        res_img = await ac.get("/catalogo/recetas?con_imagen=true&tamano=150")
        assert res_img.status_code == 200
        data_img = res_img.json()
        assert data_img["total"] == 44

        # Filtro con_imagen=false
        res_no_img = await ac.get("/catalogo/recetas?con_imagen=false&tamano=150")
        assert res_no_img.status_code == 200
        data_no_img = res_no_img.json()
        assert data_no_img["total"] == 66

@pytest.mark.asyncio
async def test_actualizar_objetivo_usuario(auth_headers):
    """Verifica actualización de objetivo mediante PUT /usuarios/me/objetivo."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.put("/usuarios/me/objetivo", json={"objetivo": "GM"}, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["objetivo"] == "GM"

        # Validar rechazo de valor inválido
        res_inv = await ac.put("/usuarios/me/objetivo", json={"objetivo": "SUPER_FIT"}, headers=auth_headers)
        assert res_inv.status_code == 422
