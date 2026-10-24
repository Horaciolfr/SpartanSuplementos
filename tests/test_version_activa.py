"""Invariantes de versionado y promoción de modelos de IA."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.main import app
from app.modules.predicciones import router as predicciones_router


@pytest.mark.asyncio
async def test_a_existe_exactamente_una_version_true_por_algoritmo():
    async with engine.connect() as conn:
        resultado = await conn.execute(text("""
            SELECT algoritmo,
                   COUNT(*) FILTER (WHERE aprobado_produccion = TRUE) AS activas
            FROM ia.version_modelo_ia
            GROUP BY algoritmo
            ORDER BY algoritmo
        """))
        filas = resultado.fetchall()

    assert filas, "No existen versiones registradas"
    assert all(fila.activas == 1 for fila in filas), filas


@pytest.mark.asyncio
async def test_b_reentrenar_no_promociona_candidatos_si_falla_gate(monkeypatch):
    algoritmos = ("RF_REGRESOR_DEMANDA", "RF_CLASIFICADOR_QUIEBRE")
    hashes = {algoritmo: f"test-no-gate-{uuid4().hex}" for algoritmo in algoritmos}

    async with engine.begin() as conn:
        activas_antes_result = await conn.execute(text("""
            SELECT algoritmo, id_version
            FROM ia.version_modelo_ia
            WHERE algoritmo = ANY(:algoritmos)
              AND aprobado_produccion = TRUE
            ORDER BY algoritmo
        """), {"algoritmos": list(algoritmos)})
        activas_antes = dict(activas_antes_result.fetchall())

        candidatos = {}
        for algoritmo in algoritmos:
            insertado = await conn.execute(text("""
                INSERT INTO ia.version_modelo_ia (
                    algoritmo, hash_archivo, aprobado_produccion
                )
                VALUES (:algoritmo, :hash_archivo, FALSE)
                RETURNING id_version
            """), {"algoritmo": algoritmo, "hash_archivo": hashes[algoritmo]})
            candidatos[algoritmo] = insertado.scalar_one()

    def entrenamiento_fallido():
        return {
            "id_version_demanda": candidatos["RF_REGRESOR_DEMANDA"],
            "id_version_quiebre": candidatos["RF_CLASIFICADOR_QUIEBRE"],
        }

    def metricas_gate_fallido():
        return {
            "regresor": {"rmse": 9.0, "gate_pasa": False},
            "clasificador": {
                "balanced_accuracy": 0.5,
                "gate_pasa": False,
            },
            "todos_gates_pasan": False,
        }

    monkeypatch.setattr(
        predicciones_router,
        "entrenar_y_persistir_modelos",
        entrenamiento_fallido,
    )
    monkeypatch.setattr(
        predicciones_router,
        "evaluar_metricas_holdout",
        metricas_gate_fallido,
    )

    token = jwt.encode(
        {
            "sub": "2",
            "rol": "ADMINISTRADOR",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/predicciones/reentrenar",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code in {200, 202}, response.text
            if response.status_code == 202:
                job_id = response.json()["job_id"]
                res_st = await client.get(
                    f"/predicciones/reentrenar/estado?job_id={job_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert res_st.status_code == 200
                st_data = res_st.json()
                if st_data.get("resultado"):
                    assert st_data["resultado"].get("promovido") is False
            else:
                assert response.json()["promovido"] is False

        async with engine.connect() as conn:
            estados_result = await conn.execute(text("""
                SELECT id_version, aprobado_produccion
                FROM ia.version_modelo_ia
                WHERE id_version = ANY(:ids)
            """), {"ids": list(candidatos.values())})
            estados = dict(estados_result.fetchall())

            activas_despues_result = await conn.execute(text("""
                SELECT algoritmo, id_version
                FROM ia.version_modelo_ia
                WHERE algoritmo = ANY(:algoritmos)
                  AND aprobado_produccion = TRUE
                ORDER BY algoritmo
            """), {"algoritmos": list(algoritmos)})
            activas_despues = dict(activas_despues_result.fetchall())

        assert estados == {id_version: False for id_version in candidatos.values()}
        assert activas_despues == activas_antes
    finally:
        async with engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM ia.version_modelo_ia WHERE id_version = ANY(:ids)"),
                {"ids": list(candidatos.values())},
            )
