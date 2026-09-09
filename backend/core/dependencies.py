# Re-exportación canónica desde app.core.dependencies para compatibilidad retroactiva total
from app.core.dependencies import get_db, get_current_user, require_roles, oauth2_scheme

__all__ = ["get_db", "get_current_user", "require_roles", "oauth2_scheme"]

