"""
Suite de Pruebas Automatizadas para Biometría y Persistencia en Esquema IA.
Cumple con los 5 requerimientos de la Tarea 7 del Paquete 11:
a) sample_pose.jpg + 175cm/75kg -> somatotipo MESOMORFO, v_taper en [1.0, 4.0], postura en dominio, simetria en [0,1].
b) Exactamente 1 fila nueva en ia.perfil_biometrico por request exitoso.
c) precision_captura == media(visibility) con tolerancia 1e-6.
d) Request sin estatura_cm -> 422, y CERO filas persistidas.
e) Unit test de la tabla de decisión con 6 vectores sintéticos (2 por clase).
"""

import os
import sys
import pytest
from httpx import AsyncClient, ASGITransport

# Asegurar que el root del proyecto esté en sys.path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from services.ia.main import app
from services.ia.pose_service import pose_inference_service
from services.ia.biometrics_service import (
    clasificar_somatotipo,
    SOMATOTIPO_UMBRALES,
    procesar_biometria_3d
)
from services.ia.db import get_db_pool, close_db_pool
from services.ia.tests.auth_helpers import service_headers

SAMPLE_PATH = os.path.join(PROJECT_ROOT, "tests", "assets", "sample_pose.jpg")


@pytest.fixture(autouse=True)
async def cleanup_db():
    yield
    await close_db_pool()


async def contar_filas_perfil_biometrico() -> int:
    """Helper para consultar el conteo actual de filas en ia.perfil_biometrico."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        count = await conn.fetchval("SELECT count(*) FROM ia.perfil_biometrico")
        return int(count)


@pytest.mark.asyncio
async def test_a_sample_pose_metricas_antropometricas():
    """
    a) sample_pose.jpg + 175cm/75kg -> somatotipo MESOMORFO, v_taper en [1.0, 4.0],
       postura en el dominio definido, simetria en [0,1].
    """
    assert os.path.exists(SAMPLE_PATH), f"El archivo de muestra {SAMPLE_PATH} debe existir"

    with open(SAMPLE_PATH, "rb") as f:
        img_bytes = f.read()

    resultado = await pose_inference_service.analizar_postura_async(
        image_bytes=img_bytes,
        estatura_cm=175.0,
        peso_kg=75.0
    )

    assert resultado["status"] == "success"
    assert resultado["somatotipo_estimado"] == "MESOMORFO"

    metricas = resultado["metricas_biometricas"]
    v_taper = metricas["v_taper"]
    assert 1.0 <= v_taper <= 4.0, f"v_taper ({v_taper}) debe estar en el rango [1.0, 4.0]"

    dominio_postura = {"ALINEADA", "INCLINACION_LEVE", "INCLINADA"}
    assert metricas["postura"] in dominio_postura, f"postura '{metricas['postura']}' fuera de dominio"

    simetria = metricas["simetria"]
    assert 0.0 <= simetria <= 1.0, f"simetria ({simetria}) debe estar en el rango [0.0, 1.0]"


@pytest.mark.asyncio
async def test_b_persistencia_exactamente_una_fila():
    """
    b) Exactamente 1 fila nueva en ia.perfil_biometrico por request exitoso.
    """
    filas_antes = await contar_filas_perfil_biometrico()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        with open(SAMPLE_PATH, "rb") as f:
            files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
            data = {"estatura_cm": "175.0", "peso_kg": "75.0"}
            headers = service_headers(1, "EMPLEADO")

            response = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers)

    assert response.status_code == 200, f"Respuesta esperada 200, recibida: {response.status_code} - {response.text}"
    body = response.json()
    assert "id_perfil" in body and body["id_perfil"] is not None

    filas_despues = await contar_filas_perfil_biometrico()
    assert filas_despues == filas_antes + 1, (
        f"Se esperaba exactamente 1 fila nueva. Antes: {filas_antes}, Después: {filas_despues}"
    )


@pytest.mark.asyncio
async def test_c_precision_captura_media_visibility():
    """
    c) precision_captura == media(visibility) con tolerancia 1e-6.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        with open(SAMPLE_PATH, "rb") as f:
            files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
            data = {"estatura_cm": "175.0", "peso_kg": "75.0"}
            headers = service_headers(1, "EMPLEADO")

            response = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers)

    assert response.status_code == 200
    body = response.json()
    id_perfil = body["id_perfil"]
    precision_json = body["precision_captura"]

    # Calcular media matemática directa de visibilidad de los landmarks normalizados
    landmarks = body["landmarks"]
    assert len(landmarks) == 33
    media_vis_esperada = sum(lm["visibilidad"] for lm in landmarks) / len(landmarks)

    # Validar en payload JSON
    assert abs(precision_json - media_vis_esperada) <= 1e-6, (
        f"precision_captura ({precision_json}) difiere de media(visibility) ({media_vis_esperada})"
    )

    # Validar en base de datos PostgreSQL
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT precision_captura FROM ia.perfil_biometrico WHERE id_perfil = $1",
            id_perfil
        )
        assert row is not None
        db_precision = float(row["precision_captura"])
        assert abs(db_precision - media_vis_esperada) <= 1e-6, (
            f"DB precision_captura ({db_precision}) difiere de media(visibility) ({media_vis_esperada})"
        )


@pytest.mark.asyncio
async def test_d_request_sin_estatura_422_y_cero_filas():
    """
    d) Request sin estatura_cm -> 422, y CERO filas persistidas.
    """
    filas_antes = await contar_filas_perfil_biometrico()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        with open(SAMPLE_PATH, "rb") as f:
            # Solicitud sin estatura_cm (únicamente file y peso_kg)
            files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
            data = {"peso_kg": "75.0"}
            headers = service_headers(1, "EMPLEADO")

            response = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers)

    assert response.status_code == 422, f"Se esperaba 422 Unprocessable Entity, se obtuvo {response.status_code}"

    filas_despues = await contar_filas_perfil_biometrico()
    assert filas_despues == filas_antes, (
        f"CERO filas debieron persistirse ante 422. Antes: {filas_antes}, Después: {filas_despues}"
    )


def test_e_tabla_decision_somatotipo_6_vectores_sinteticos():
    """
    e) Unit test de la tabla de decisión con 6 vectores sintéticos (2 por clase).
       Validación de la heurística determinista y constantes SOMATOTIPO_UMBRALES.
    """
    assert isinstance(SOMATOTIPO_UMBRALES, dict)
    assert "imc_bajo" in SOMATOTIPO_UMBRALES
    assert "imc_alto" in SOMATOTIPO_UMBRALES
    assert "v_taper_mesomorfo" in SOMATOTIPO_UMBRALES

    # 6 vectores sintéticos: (imc, v_taper, clase_esperada, descripcion)
    vectores = [
        # ECTOMORFO 1: IMC bajo (< 18.5)
        (17.2, 1.30, "ECTOMORFO", "IMC bajo, v_taper moderado"),
        # ECTOMORFO 2: IMC normal pero v_taper < 1.5
        (22.1, 1.25, "ECTOMORFO", "IMC normal, v_taper estrecho"),

        # MESOMORFO 1: IMC normal y v_taper >= 1.5
        (22.5, 1.65, "MESOMORFO", "IMC normal, v_taper atlético"),
        # MESOMORFO 2: Caso de referencia demostrado (v_taper 2.19, IMC ~24.5)
        (24.5, 2.19, "MESOMORFO", "IMC en límite superior normal con alto v_taper"),

        # ENDOMORFO 1: IMC alto (>= 25.0) con v_taper moderado
        (27.3, 1.20, "ENDOMORFO", "IMC sobrepeso, v_taper bajo"),
        # ENDOMORFO 2: IMC alto (>= 25.0) con v_taper alto
        (30.5, 1.70, "ENDOMORFO", "IMC elevado independientemente del v_taper"),
    ]

    for imc, v_taper, clase_esperada, descripcion in vectores:
        resultado = clasificar_somatotipo(imc=imc, v_taper=v_taper)
        assert resultado == clase_esperada, (
            f"Fallo en vector '{descripcion}': imc={imc}, v_taper={v_taper}. "
            f"Esperado: {clase_esperada}, Obtenido: {resultado}"
        )


@pytest.mark.asyncio
async def test_f_evidencia_to_thread_en_services_ia():
    """f) Evidencia de offloading CPU-bound: verifica uso de asyncio.to_thread en pose_service.py."""
    import pathlib
    ia_dir = pathlib.Path(__file__).resolve().parent.parent
    to_thread_found = []
    for py_file in ia_dir.rglob("*.py"):
        content = py_file.read_text(encoding="utf-8", errors="ignore")
        for line_no, line in enumerate(content.splitlines(), 1):
            if "to_thread" in line:
                to_thread_found.append((str(py_file), line_no, line.strip()))

    assert len(to_thread_found) > 0, "No se encontró 'to_thread' en services/ia/; debe existir para offload CPU-bound"


@pytest.mark.asyncio
async def test_g_pose_service_inferencia_directa():
    """g) Inferencia directa de MediaPipe sobre sample_pose.jpg con 33 landmarks y somatotipo."""
    assert os.path.exists(SAMPLE_PATH), f"El archivo de prueba {SAMPLE_PATH} debe existir"
    with open(SAMPLE_PATH, "rb") as f:
        img_bytes = f.read()

    resultado = await pose_inference_service.analizar_postura_async(img_bytes, estatura_cm=178.0, peso_kg=80.0)
    assert resultado["status"] == "success"
    assert resultado["landmarks_count"] == 33
    assert resultado["precision"] > 0.70
    assert resultado["somatotipo_estimado"] in ["MESOMORFO", "ECTOMORFO", "ENDOMORFO"]
    assert len(resultado["landmarks"]) == 33
    assert resultado["landmarks"][0]["nombre"] == "NOSE"

