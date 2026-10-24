import asyncio
import time
from typing import Any, Dict, Optional
import httpx
from fastapi import HTTPException, Request, status

from app.core.metrics import metrics_registry


async def resilient_ia_request(
    method: str,
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, Any]] = None,
    files: Optional[Dict[str, Any]] = None,
    data: Optional[Dict[str, Any]] = None,
    json: Optional[Any] = None,
    request: Optional[Request] = None,
    max_retries: int = 2,
    base_delay: float = 0.05,
    global_timeout: float = 10.0,
    client_factory: Any = httpx.AsyncClient,
) -> httpx.Response:
    """
    Cliente de reenvío resiliente del API Gateway hacia el microservicio de IA:
    - Aplica política de reintento con backoff exponencial (máx. 2 reintentos).
    - Captura errores HTTP 5xx y fallas de transporte (Timeout, ConnectionError).
    - Preserva un timeout global estricto de 10.0 segundos en toda la cadena.
    - Propaga X-Request-Id desde el contexto de la petición hacia el servicio de IA.
    - Registra contadores de reintento en el sistema de telemetría / métricas.
    """
    req_headers = dict(headers or {})
    if request is not None and hasattr(request.state, "request_id"):
        req_headers["X-Request-Id"] = request.state.request_id

    t_start = time.monotonic()
    last_response: Optional[httpx.Response] = None
    last_exc: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        elapsed = time.monotonic() - t_start
        remaining = global_timeout - elapsed
        if remaining <= 0:
            break

        current_timeout = min(remaining, 10.0)

        try:
            async with client_factory(timeout=current_timeout) as client:
                m_upper = method.upper()
                if m_upper == "GET" and hasattr(client, "get"):
                    response = await client.get(url, params=params, headers=req_headers)
                elif m_upper == "POST" and hasattr(client, "post"):
                    post_kwargs: dict[str, Any] = {"headers": req_headers}
                    if params is not None:
                        post_kwargs["params"] = params
                    if data is not None:
                        post_kwargs["data"] = data
                    if files is not None:
                        post_kwargs["files"] = files
                    if json is not None:
                        post_kwargs["json"] = json
                    response = await client.post(url, **post_kwargs)
                else:
                    response = await client.request(
                        method=method,
                        url=url,
                        headers=req_headers,
                        params=params,
                        files=files,
                        data=data,
                        json=json,
                    )

                if response.status_code < 500:
                    return response

                last_response = response
                metrics_registry.record_retry(endpoint=url, reason=f"http_{response.status_code}")
        except (httpx.TransportError, httpx.RequestError) as exc:
            last_exc = exc
            reason = "timeout" if isinstance(exc, httpx.TimeoutException) else "transport_error"
            metrics_registry.record_retry(endpoint=url, reason=reason)

        # Evaluar si corresponde reintento
        if attempt < max_retries:
            delay = base_delay * (2 ** attempt)
            remaining_after_delay = global_timeout - (time.monotonic() - t_start)
            if remaining_after_delay > delay:
                await asyncio.sleep(delay)
            else:
                break

    if last_response is not None:
        if last_response.status_code >= 500:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"El servicio de IA retorno error HTTP {last_response.status_code} tras reintentos.",
            )
        return last_response

    if isinstance(last_exc, httpx.TimeoutException):
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El servicio de analisis de IA excedio el tiempo limite global de 10 segundos.",
        )
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="El servicio de analisis biometrico/IA no esta disponible tras reintentos.",
    )
