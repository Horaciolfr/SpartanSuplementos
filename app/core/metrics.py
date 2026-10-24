import threading
import time
from collections import defaultdict
from typing import Any, Dict, List, Tuple


class MetricsRegistry:
    """
    Registro en memoria de métricas operacionales para Prometheus / OpenTelemetry:
    - Contadores de solicitudes HTTP (método, ruta, código de estado).
    - Histograma de latencia en segundos con buckets estándar.
    - Contadores de reintentos del API Gateway hacia servicios upstream.
    """

    DEFAULT_BUCKETS: Tuple[float, ...] = (
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0
    )

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.request_counts: Dict[Tuple[str, str, int], int] = defaultdict(int)
        self.duration_sum: float = 0.0
        self.duration_count: int = 0
        self.duration_buckets: Dict[float, int] = defaultdict(int)
        self.retries_count: Dict[Tuple[str, str], int] = defaultdict(int)

    def record_request(self, method: str, path: str, status_code: int, duration_seconds: float) -> None:
        with self._lock:
            self.request_counts[(method, path, status_code)] += 1
            self.duration_sum += duration_seconds
            self.duration_count += 1
            for b in self.DEFAULT_BUCKETS:
                if duration_seconds <= b:
                    self.duration_buckets[b] += 1

    def record_retry(self, endpoint: str, reason: str) -> None:
        with self._lock:
            self.retries_count[(endpoint, reason)] += 1

    def to_prometheus(self) -> str:
        lines: List[str] = [
            "# HELP http_requests_total Total de solicitudes HTTP procesadas por el API Gateway.",
            "# TYPE http_requests_total counter",
        ]
        with self._lock:
            for (method, path, status), count in sorted(self.request_counts.items()):
                lines.append(f'http_requests_total{{method="{method}",path="{path}",status="{status}"}} {count}')

            lines.append("")
            lines.append("# HELP http_request_duration_seconds Histograma de latencia de solicitudes en segundos.")
            lines.append("# TYPE http_request_duration_seconds histogram")
            for b in self.DEFAULT_BUCKETS:
                b_count = self.duration_buckets[b]
                lines.append(f'http_request_duration_seconds_bucket{{le="{b}"}} {b_count}')
            lines.append(f'http_request_duration_seconds_bucket{{le="+Inf"}} {self.duration_count}')
            lines.append(f"http_request_duration_seconds_sum {self.duration_sum:.6f}")
            lines.append(f"http_request_duration_seconds_count {self.duration_count}")

            lines.append("")
            lines.append("# HELP ia_gateway_retries_total Reintentos del API Gateway hacia el microservicio de IA.")
            lines.append("# TYPE ia_gateway_retries_total counter")
            for (endpoint, reason), count in sorted(self.retries_count.items()):
                lines.append(f'ia_gateway_retries_total{{endpoint="{endpoint}",reason="{reason}"}} {count}')

        return "\n".join(lines) + "\n"


metrics_registry = MetricsRegistry()
