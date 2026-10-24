from datetime import datetime
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select

from app.main import app
from app.models.users import Usuario
from app.core.config import settings
from jose import jwt


@pytest.fixture
def token_admin():
    payload = {
        "sub": "2",
        "rol": "ADMINISTRADOR",
        "email": "admin@spartan.dev",
        "exp": datetime.utcnow().timestamp() + 3600
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@pytest.fixture
def token_cliente():
    payload = {
        "sub": "4",
        "rol": "CLIENTE",
        "email": "cliente@spartan.dev",
        "exp": datetime.utcnow().timestamp() + 3600
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@pytest.mark.asyncio
async def test_dashboard_predicciones_acceso_admin_exitoso(token_admin):
    """Verifica que el Administrador puede acceder al dashboard de predicciones de ventas."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/predicciones/dashboard?sucursal=TODAS&horizonte_dias=14",
            headers={"Authorization": f"Bearer {token_admin}"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "resumen_general" in data
    assert data["resumen_general"]["total_transacciones_historicas"] == 1397
    assert len(data["sucursales"]) == 2
    assert len(data["proyecciones_diarias"]) == 14
    # El módulo predictivo no simula existencias: las alertas de inventario deben
    # provenir del stock real del ERP, no de cifras inventadas.
    assert data["alertas_inventario"] == []
    assert len(data["insights"]) > 0
    metricas = data["metricas_modelo"]
    assert metricas["evaluacion"].startswith("Validación temporal")
    assert metricas["muestras_validacion"] > 0
    assert metricas["baseline_rmse_bs"] > 0
    assert metricas["estado_validacion"] in {"ACEPTABLE", "REFERENCIAL"}
    assert len(metricas["fuentes_datos"]) == 2


@pytest.mark.asyncio
async def test_dashboard_predicciones_filtro_sucursal_central_y_scz(token_admin):
    """Verifica los filtros por sucursal específica (Central 512, Santa Cruz 885)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp_c = await ac.get(
            "/predicciones/dashboard?sucursal=CENTRAL&horizonte_dias=7",
            headers={"Authorization": f"Bearer {token_admin}"}
        )
        resp_sc = await ac.get(
            "/predicciones/dashboard?sucursal=SANTA_CRUZ&horizonte_dias=7",
            headers={"Authorization": f"Bearer {token_admin}"}
        )
    assert resp_c.status_code == 200
    assert resp_sc.status_code == 200
    data_c = resp_c.json()
    data_sc = resp_sc.json()
    assert data_c["sucursal_filtrada"] == "CENTRAL"
    assert data_sc["sucursal_filtrada"] == "SANTA_CRUZ"
    assert len(data_c["proyecciones_diarias"]) == 7
    assert len(data_sc["proyecciones_diarias"]) == 7


@pytest.mark.asyncio
async def test_dashboard_predicciones_forbidden_para_cliente(token_cliente):
    """Verifica que un usuario con rol CLIENTE no tiene acceso al dashboard de predicciones del ERP."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/predicciones/dashboard",
            headers={"Authorization": f"Bearer {token_cliente}"}
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_dashboard_predicciones_trazabilidad_metricas_v07(token_admin):
    """
    PASO 1 (V-07): Aserción de que el modelo citado en métricas proviene de ia.version_modelo_ia,
    declara id_version, hash corto y objetivo de unidades con metric_rmse, y que cualquier R2
    monetario exhibido porta rótulo explícito obligatorio (sin rótulo = falla).
    """
    from sqlalchemy import text
    from app.core.database import engine

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/predicciones/dashboard?sucursal=TODAS&horizonte_dias=14",
            headers={"Authorization": f"Bearer {token_admin}"}
        )
    assert response.status_code == 200
    data = response.json()
    metricas = data.get("metricas_modelo")
    assert metricas is not None, "metricas_modelo ausente en respuesta de dashboard"

    # Verificar que cita algoritmo, id_version y hash_corto
    assert metricas.get("algoritmo") == "Random Forest de facturación diaria con rezagos"
    assert metricas.get("id_version") is not None and metricas["id_version"] > 0
    assert metricas.get("hash_corto") is not None and len(metricas["hash_corto"]) == 8

    # Consultar versión aprobada en ia.version_modelo_ia
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT id_version, metric_rmse, hash_archivo
            FROM ia.version_modelo_ia
            WHERE algoritmo = 'RF_REGRESOR_DEMANDA'
              AND aprobado_produccion = TRUE
            ORDER BY id_version DESC
            LIMIT 1;
        """))
        row = res.fetchone()
        assert row is not None, "No existe versión aprobada en BD para RF_REGRESOR_DEMANDA"
        bd_id_version, bd_rmse, bd_hash = row

    # Coincidencia con registro de BD
    assert metricas["id_version"] == bd_id_version
    assert metricas["hash_artefacto"] == bd_hash
    assert metricas["hash_corto"] == bd_hash[:8]
    assert abs(metricas["metric_rmse_unidades"] - float(bd_rmse)) < 1e-4

    # Regla de rótulo explícito para R2 sobre agregado monetario
    rotulo = metricas.get("r2_monetario_rotulo")
    assert rotulo is not None and len(rotulo.strip()) > 0, "Falla: El R2 monetario no porta rótulo explícito de objetivo"
    assert "fuera de muestra" in rotulo.lower() and "facturación diaria" in rotulo.lower(), (
        f"Falla: Rótulo de R2 inválido o genérico: '{rotulo}'"
    )
    assert metricas.get("corte_serie") is not None, "Falla: No se reporta el corte temporal de la serie analizada"


def test_modelo_usa_holdout_temporal_y_publica_la_misma_prediccion():
    """La curva debe salir del modelo validado, sin factores ni ruido manual."""
    from app.modules.predicciones.service import PrediccionVentasService

    service = PrediccionVentasService()
    dashboard_a = service.generar_dashboard("TODAS", 7)
    dashboard_b = service.generar_dashboard("TODAS", 7)
    metrics = dashboard_a.metricas_modelo

    assert metrics.fin_validacion == metrics.corte_serie
    assert metrics.muestras_entrenamiento > metrics.muestras_validacion
    assert metrics.wape_pct > 0
    assert metrics.baseline_wape_pct > 0
    assert [item.prediccion_bs for item in dashboard_a.proyecciones_diarias] == [
        item.prediccion_bs for item in dashboard_b.proyecciones_diarias
    ]
    assert all(item.limite_inferior_bs <= item.prediccion_bs <= item.limite_superior_bs for item in dashboard_a.proyecciones_diarias)
