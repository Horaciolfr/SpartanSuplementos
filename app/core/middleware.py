import time
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.metrics import metrics_registry


class RequestIdAndMetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware ASGI de observabilidad y trazabilidad:
    1. Propaga o genera el identificador único X-Request-Id por petición.
    2. Inyecta X-Request-Id en el encabezado de respuesta HTTP.
    3. Mide la latencia de procesamiento y actualiza el histograma de Prometheus.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Extraer o generar Request ID
        incoming_id = request.headers.get("x-request-id") or request.headers.get("X-Request-Id")
        request_id = incoming_id if incoming_id else str(uuid.uuid4())
        request.state.request_id = request_id

        start_time = time.perf_counter()
        try:
            response: Response = await call_next(request)
        except Exception:
            # Registrar excepción no capturada como 500 para métricas antes de propagar
            duration = time.perf_counter() - start_time
            path = request.url.path
            metrics_registry.record_request(request.method, path, 500, duration)
            raise

        duration = time.perf_counter() - start_time

        # Inyectar header de correlación en la respuesta
        response.headers["X-Request-Id"] = request_id
        response.headers["x-request-id"] = request_id

        # Registrar en histograma y contadores
        path = request.url.path
        metrics_registry.record_request(request.method, path, response.status_code, duration)

        return response
