import uuid
from unittest.mock import patch
import httpx
import pytest
from httpx import AsyncClient

from app.core.metrics import metrics_registry
from app.core.security import create_access_token


def auth_bearer(user_id: int, role: str, email: str) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_x_request_id_generado_y_propagado_en_respuesta(client: AsyncClient):
    """Verifica que el middleware inyecta X-Request-Id y propaga IDs provistos por el cliente."""
    # 1. Sin header: se genera UUID v4 automáticamente
    res1 = await client.get("/health")
    assert res1.status_code == 200
    assert "x-request-id" in res1.headers or "X-Request-Id" in res1.headers
    req_id = res1.headers.get("X-Request-Id") or res1.headers.get("x-request-id")
    assert req_id is not None
    # Validar formato UUID
    uuid.UUID(req_id)

    # 2. Con header explícito: se propaga exactamente el mismo ID
    custom_id = "spartan-trace-xyz-12345"
    res2 = await client.get("/health", headers={"X-Request-Id": custom_id})
    assert res2.status_code == 200
    assert res2.headers.get("X-Request-Id") == custom_id or res2.headers.get("x-request-id") == custom_id


@pytest.mark.asyncio
async def test_endpoint_metrics_expone_histograma_y_contadores(client: AsyncClient):
    """Verifica que /metrics expone el histograma de latencia y contadores en formato Prometheus."""
    res = await client.get("/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers.get("content-type", "")
    content = res.text

    assert "# HELP http_requests_total" in content
    assert "# TYPE http_requests_total counter" in content
    assert "# HELP http_request_duration_seconds" in content
    assert "# TYPE http_request_duration_seconds histogram" in content
    assert "http_request_duration_seconds_bucket" in content
    assert "http_request_duration_seconds_sum" in content
    assert "http_request_duration_seconds_count" in content


@pytest.mark.asyncio
async def test_gateway_reintento_flaky_ia_retorna_200_con_metricas_y_request_id(client: AsyncClient):
    """
    Simulación de microservicio IA con comportamiento inestable (flaky):
    - Intento 1: falla con HTTP 500 Internal Server Error.
    - Intento 2: responde con éxito HTTP 200 OK y carga útil.
    Aserciones:
      1. El API Gateway realiza el reintento con backoff exponencial y entrega HTTP 200 al cliente.
      2. El header X-Request-Id está presente en la respuesta del cliente.
      3. Las métricas registran el reintento en ia_gateway_retries_total.
    """
    headers = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")
    custom_req_id = "trace-flaky-test-999"
    headers["X-Request-Id"] = custom_req_id

    response_500 = httpx.Response(
        status_code=500,
        json={"detail": "Error temporal en workers de inferencia"},
        request=httpx.Request("GET", "http://localhost:8001/ia/perfiles/search"),
    )
    response_200 = httpx.Response(
        status_code=200,
        json=[{"id_perfil": 1, "somatotipo": "MESOMORFO", "precision_captura": 0.95}],
        request=httpx.Request("GET", "http://localhost:8001/ia/perfiles/search"),
    )

    call_count = [0]

    class MockFlakyClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        async def get(self, url, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                return response_500
            return response_200

    with patch("app.modules.ia.router.httpx.AsyncClient", new=MockFlakyClient):
        res = await client.get(
            "/ia/perfiles/search?nombre_landmark=NOSE&min_visibility=0.5",
            headers=headers,
        )

    assert res.status_code == 200, f"Se esperaba 200 tras reintento pero se obtuvo {res.status_code}: {res.text}"
    data = res.json()
    assert len(data) == 1
    assert data[0]["somatotipo"] == "MESOMORFO"

    # Verificar presencia de Request-ID en respuesta del cliente
    res_req_id = res.headers.get("X-Request-Id") or res.headers.get("x-request-id")
    assert res_req_id == custom_req_id

    # Verificar que fueron realizados 2 intentos (1 inicial + 1 reintento exitoso)
    assert call_count[0] == 2

    # Verificar registro en métricas
    metrics_res = await client.get("/metrics")
    assert "ia_gateway_retries_total" in metrics_res.text


@pytest.mark.asyncio
async def test_gateway_agota_reintentos_y_retorna_502_cuando_ia_falla_persistentemente(client: AsyncClient):
    """Verifica que el gateway devuelve 502 tras agotar los 2 reintentos ante falla persistente."""
    headers = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")

    response_503 = httpx.Response(
        status_code=503,
        json={"detail": "Inference cluster saturated"},
        request=httpx.Request("GET", "http://localhost:8001/ia/perfiles/search"),
    )

    call_count = [0]

    class MockPersistentFailureClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        async def get(self, url, **kwargs):
            call_count[0] += 1
            return response_503

    with patch("app.modules.ia.router.httpx.AsyncClient", new=MockPersistentFailureClient):
        res = await client.get(
            "/ia/perfiles/search?nombre_landmark=NOSE&min_visibility=0.5",
            headers=headers,
        )

    # El servicio de IA devolvió 503 tras reintentos, el gateway entrega 502 Bad Gateway
    assert res.status_code == 502
    assert call_count[0] == 3
