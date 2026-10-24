import os
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_evidencia_desacople_grep_mediapipe_en_app():
    """Evidencia de desacople: grep -RIn 'mediapipe' app/ -> sin resultados"""
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    app_dir = os.path.join(root_dir, "app")

    mediapipe_found = []
    for root, _, files in os.walk(app_dir):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_no, line in enumerate(f, 1):
                        if "mediapipe" in line.lower():
                            mediapipe_found.append((file_path, line_no, line.strip()))

    assert len(mediapipe_found) == 0, f"Violación de desacoplamiento: 'mediapipe' encontrado en app/: {mediapipe_found}"

@pytest.mark.asyncio
async def test_gateway_proxy_reenvia_estatura_peso_y_asercion_firmada(client: AsyncClient):
    """
    Gateway Proxy:
    - Reenvía multipart con file, estatura_cm y peso_kg.
    - Inyecta una aserción interna firmada desde el claim sub del token JWT.
    - Retorna la respuesta del microservicio de IA sin mutarla.
    """
    from unittest.mock import patch, AsyncMock
    import httpx
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": "3", "rol": "CAJERO", "email": "cajero@spartan.dev"})
    sample_path = os.path.join(os.path.dirname(__file__), "assets", "sample_pose.jpg")

    mock_ia_response = {
        "status": "success",
        "id_perfil": 42,
        "somatotipo_estimado": "MESOMORFO",
        "precision": 0.85,
        "precision_captura": 0.854321,
        "landmarks_count": 33,
        "metricas_biometricas": {
            "v_taper": 2.27,
            "ancho_hombros_m": 0.36,
            "ancho_cadera_m": 0.16,
            "torso_length_m": 0.47,
            "simetria": 0.79,
            "postura": "INCLINACION_LEVE",
            "imc": 24.5
        },
        "landmarks": []
    }

    captured_request = {}

    class MockAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        async def post(self, url, *args, **kwargs):
            captured_request["url"] = url
            captured_request["headers"] = kwargs.get("headers", {})
            captured_request["data"] = kwargs.get("data", {})
            captured_request["files"] = kwargs.get("files", {})
            return httpx.Response(200, json=mock_ia_response)

    with patch("app.modules.ia.router.httpx.AsyncClient", new=MockAsyncClient):
        with open(sample_path, "rb") as f:
            files = {"file": ("sample_pose.jpg", f.read(), "image/jpeg")}
            data = {"estatura_cm": "178.0", "peso_kg": "80.0"}
            headers = {"Authorization": f"Bearer {token}"}

            response = await client.post("/ia/pose/analizar", files=files, data=data, headers=headers)


    assert response.status_code == 200
    assert response.json() == mock_ia_response

    # La identidad no viaja en headers falsificables; se encapsula en JWT interno.
    from jose import jwt
    from app.core.config import settings

    assert "X-Usuario-Id" not in captured_request["headers"]
    assertion = captured_request["headers"]["X-Internal-Authorization"].removeprefix("Bearer ")
    payload = jwt.decode(
        assertion,
        settings.IA_INTERNAL_API_KEY or settings.SECRET_KEY,
        algorithms=["HS256"],
        audience="spartan-ia",
    )
    assert payload["sub"] == "3"
    # Verificar reenvío de parámetros antropométricos
    assert captured_request["data"].get("estatura_cm") == "178.0"
    assert captured_request["data"].get("peso_kg") == "80.0"
