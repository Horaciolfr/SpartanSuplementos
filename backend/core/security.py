# Re-exportación canónica desde app.core.security para compatibilidad retroactiva total
from app.core.security import hash_password, verify_password, create_access_token

__all__ = ["hash_password", "verify_password", "create_access_token"]

