# Re-exportación canónica desde app.core.database para compatibilidad retroactiva total
from app.core.database import engine, AsyncSessionLocal

__all__ = ["engine", "AsyncSessionLocal"]


