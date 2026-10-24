"""
Suite de Pruebas para Almacenamiento Estructurado de Landmarks (JSONB).
PAQUETE 12: Tarea 8

Requerimientos:
a) Round-trip: capturar -> leer GET /ia/perfiles/{id} -> valida contra jsonschema sin desviaciones.
b) Payload corrupto inyectado en validador -> rechazo fail-fast sin INSERT en ia.perfil_biometrico.
c) Prueba de uso del índice GIN: fixture con 10000 perfiles sintéticos, ANALYZE ia.perfil_biometrico,
   luego EXPLAIN de la consulta de contención: el plan DEBE mostrar 'Bitmap Index Scan on idx_landmarks_gin'.
   La evidencia se obtiene con enable_seqscan en su valor default; está prohibido forzar el plan.
d) GET de perfil ajeno con aserción firmada distinta y rol no admin -> 403 Forbidden.
"""

import os
import sys
import json
import uuid
from datetime import datetime, timezone
import pytest
import jsonschema
from httpx import AsyncClient, ASGITransport

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from services.ia.main import app
from services.ia.jsonb_schema import (
    COORDENADAS_ESPACIALES_SCHEMA,
    validar_coordenadas_espaciales
)
from services.ia.db import get_db_pool, close_db_pool
from services.ia.tests.auth_helpers import service_headers

SAMPLE_PATH = os.path.join(PROJECT_ROOT, "tests", "assets", "sample_pose.jpg")

LANDMARK_NAMES = [
    "NOSE", "LEFT_EYE_INNER", "LEFT_EYE", "LEFT_EYE_OUTER",
    "RIGHT_EYE_INNER", "RIGHT_EYE", "RIGHT_EYE_OUTER",
    "LEFT_EAR", "RIGHT_EAR", "MOUTH_LEFT", "MOUTH_RIGHT",
    "LEFT_SHOULDER", "RIGHT_SHOULDER", "LEFT_ELBOW", "RIGHT_ELBOW",
    "LEFT_WRIST", "RIGHT_WRIST", "LEFT_PINKY", "RIGHT_PINKY",
    "LEFT_INDEX", "RIGHT_INDEX", "LEFT_THUMB", "RIGHT_THUMB",
    "LEFT_HIP", "RIGHT_HIP", "LEFT_KNEE", "RIGHT_KNEE",
    "LEFT_ANKLE", "RIGHT_ANKLE", "LEFT_HEEL", "RIGHT_HEEL",
    "LEFT_FOOT_INDEX", "RIGHT_FOOT_INDEX"
]


@pytest.fixture(autouse=True)
async def cleanup_db():
    yield
    await close_db_pool()


async def contar_filas_perfil_biometrico() -> int:
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT count(*) FROM ia.perfil_biometrico")
        return int(count)


def generar_payload_valido_sintetico(visibility_shoulder: float = 0.95) -> dict:
    """Genera un payload válido que cumple 100% con el contrato JSONB."""
    landmarks = []
    world_landmarks = []
    for i, name in enumerate(LANDMARK_NAMES):
        vis = visibility_shoulder if i == 11 else 0.8
        landmarks.append({
            "ix": i,
            "nombre": name,
            "x": 0.5,
            "y": 0.5,
            "z": 0.0,
            "visibility": vis
        })
        world_landmarks.append({
            "ix": i,
            "x": 0.15,
            "y": -0.45,
            "z": 0.02
        })

    return {
        "frame_id": str(uuid.uuid4()),
        "precision": 0.85,
        "landmarks": landmarks,
        "world_landmarks": world_landmarks,
        "metricas": {
            "v_taper": 2.19,
            "ancho_hombros_m": 0.36,
            "ancho_cadera_m": 0.16,
            "torso_length_m": 0.47,
            "simetria": 0.88,
            "postura": "ALINEADA"
        },
        "metadata": {
            "mediapipe_version": "1.0.1",
            "model": "pose_landmarker_lite",
            "timestamp_utc": datetime.now(timezone.utc).isoformat()
        }
    }


@pytest.mark.asyncio
async def test_a_round_trip_captura_y_lectura_valida_jsonschema():
    """
    a) Round-trip: capturar -> leer GET /ia/perfiles/{id} -> el JSONB valida
       contra el esquema jsonschema sin desviaciones.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Inferencia y captura
        with open(SAMPLE_PATH, "rb") as f:
            files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
            data = {"estatura_cm": "175.0", "peso_kg": "75.0"}
            headers = service_headers(2, "ADMINISTRADOR")

            resp_post = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers)

        assert resp_post.status_code == 200
        id_perfil = resp_post.json()["id_perfil"]
        assert id_perfil > 0

        # 2. Leer mediante GET /ia/perfiles/{id}
        resp_get = await client.get(f"/ia/perfiles/{id_perfil}", headers=headers)
        assert resp_get.status_code == 200
        perfil = resp_get.json()

        # 3. Validar JSONB contra jsonschema
        coordenadas = perfil["coordenadas_espaciales"]
        assert isinstance(coordenadas, dict)

        # No debe lanzar ValidationError
        validar_coordenadas_espaciales(coordenadas)

        # Validaciones de integridad anatómica
        assert len(coordenadas["landmarks"]) == 33
        assert len(coordenadas["world_landmarks"]) == 33
        assert "frame_id" in coordenadas
        assert "metricas" in coordenadas
        assert "metadata" in coordenadas
        assert coordenadas["metadata"]["model"] == "pose_landmarker_lite"


def test_b_validador_rechaza_payload_corrupto_fail_fast():
    """
    b) Payload corrupto inyectado en unit test del validador -> rechazo sin INSERT.
    """
    payload_valido = generar_payload_valido_sintetico()

    # 1. Caso corrupto: Falta frame_id
    p1 = dict(payload_valido)
    del p1["frame_id"]
    with pytest.raises(jsonschema.ValidationError):
        validar_coordenadas_espaciales(p1)

    # 2. Caso corrupto: Clave ad-hoc no permitida (additionalProperties: False)
    p2 = dict(payload_valido)
    p2["clave_no_permitida"] = "hacker"
    with pytest.raises(jsonschema.ValidationError):
        validar_coordenadas_espaciales(p2)

    # 3. Caso corrupto: Solo 32 landmarks en vez de 33
    p3 = dict(payload_valido)
    p3["landmarks"] = p3["landmarks"][:32]
    with pytest.raises(jsonschema.ValidationError):
        validar_coordenadas_espaciales(p3)

    # 4. Caso corrupto: Visibilidad fuera de rango (> 1.0)
    p4 = json.loads(json.dumps(payload_valido))
    p4["landmarks"][0]["visibility"] = 1.5
    with pytest.raises(jsonschema.ValidationError):
        validar_coordenadas_espaciales(p4)


@pytest.mark.asyncio
async def test_b_endpoint_rechaza_corrupcion_y_cero_filas_persistidas():
    """
    b.2) Inyección de payload corrupto en pipeline: 500 fail-fast y CERO filas persistidas.
    """
    from unittest.mock import patch

    filas_antes = await contar_filas_perfil_biometrico()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # Mock de pose_service que devuelve resultado sin 33 landmarks para provocar fallo de contrato
        with patch.object(
            app,
            "state",
            create=True
        ):
            with open(SAMPLE_PATH, "rb") as f:
                # Simular error de contrato enviando payload corrupto interceptando validar_coordenadas_espaciales
                with patch("services.ia.main.validar_coordenadas_espaciales", side_effect=jsonschema.ValidationError("Simulada corrupción")):
                    files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
                    data = {"estatura_cm": "175.0", "peso_kg": "75.0"}
                    headers = service_headers(1, "EMPLEADO")

                    resp = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers)

    assert resp.status_code == 500
    assert "Fallo de validación de contrato JSONB" in resp.json()["detail"]

    filas_despues = await contar_filas_perfil_biometrico()
    assert filas_despues == filas_antes, "CERO filas debieron persistirse ante payload corrupto"


@pytest.mark.asyncio
async def test_c_prueba_uso_indice_gin_con_10000_perfiles_sinteticos():
    """
    c) Prueba de uso del índice GIN: fixture con 10000 perfiles sintéticos,
       ANALYZE ia.perfil_biometrico, luego EXPLAIN de la consulta de contención:
       el plan DEBE mostrar 'Bitmap Index Scan on idx_landmarks_gin'.
       Se conserva enable_seqscan en default durante toda la prueba.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            # 1. Generar 10000 perfiles; 1% contiene el valor selectivo buscado.
            registros = []
            for i in range(10000):
                payload = generar_payload_valido_sintetico(
                    visibility_shoulder=0.95 if i % 100 == 0 else 0.4
                )
                registros.append((
                    1,
                    2,
                    json.dumps(payload),
                    0.85,
                    175.0,
                    75.0
                ))

            await conn.executemany(
                """
                INSERT INTO ia.perfil_biometrico (
                    id_usuario, id_somatotipo, coordenadas_espaciales,
                    precision_captura, estatura_cm, peso_kg
                ) VALUES ($1, $2, $3::jsonb, $4, $5, $6)
                """,
                registros
            )

            # 2. ANALYZE para actualizar estadísticas del planificador
            await conn.execute("ANALYZE ia.perfil_biometrico;")

            # 3. EXPLAIN de la consulta de contención GIN
            enable_seqscan = await conn.fetchval("SHOW enable_seqscan")
            assert enable_seqscan == "on", (
                f"enable_seqscan debe conservar su valor default 'on', recibido {enable_seqscan}"
            )
            explain_query = """
                EXPLAIN
                SELECT id_perfil FROM ia.perfil_biometrico
                WHERE coordenadas_espaciales @>
                      '{"landmarks":[{"nombre":"LEFT_SHOULDER","visibility":0.95}]}'::jsonb
            """
            rows = await conn.fetch(explain_query)
            plan_text = "\n".join(r[0] for r in rows)
            print(f"\nEXPLAIN GIN (enable_seqscan={enable_seqscan}):\n{plan_text}")

            assert "Bitmap Index Scan on idx_landmarks_gin" in plan_text, (
                f"El plan EXPLAIN no utilizó el índice idx_landmarks_gin:\n{plan_text}"
            )
        finally:
            await tr.rollback()


@pytest.mark.asyncio
async def test_d_control_acceso_get_perfil_ajeno_retorna_403():
    """
    d) GET de perfil ajeno con aserción firmada distinta y rol no admin -> 403.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Crear perfil perteneciente al usuario 1 (propietario)
        with open(SAMPLE_PATH, "rb") as f:
            files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
            data = {"estatura_cm": "175.0", "peso_kg": "75.0"}
            headers_creador = service_headers(1, "EMPLEADO")

            resp_post = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers_creador)

        assert resp_post.status_code == 200
        id_perfil = resp_post.json()["id_perfil"]

        # 2. Intento de acceso por otro usuario (id 4) con rol CLIENTE (no admin) -> 403 Forbidden
        headers_ajeno = service_headers(4, "CLIENTE")
        resp_ajeno = await client.get(f"/ia/perfiles/{id_perfil}", headers=headers_ajeno)
        assert resp_ajeno.status_code == 403, (
            f"Se esperaba 403 Forbidden, recibido: {resp_ajeno.status_code}"
        )

        # 3. Acceso por el propietario (id 1) -> 200 OK
        resp_propietario = await client.get(f"/ia/perfiles/{id_perfil}", headers=headers_creador)
        assert resp_propietario.status_code == 200

        # 4. Acceso por un administrador (id 2) -> 200 OK
        headers_admin = service_headers(2, "ADMINISTRADOR")
        resp_admin = await client.get(f"/ia/perfiles/{id_perfil}", headers=headers_admin)
        assert resp_admin.status_code == 200
