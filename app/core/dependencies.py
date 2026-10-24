from typing import AsyncGenerator, Callable, Any, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.users import Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas o token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id_int = int(user_id)
    except (JWTError, ValueError):
        raise credentials_exception

    stmt = select(Usuario).where(Usuario.id_usuario == user_id_int).options(selectinload(Usuario.rol))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception
    return user

async def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[Usuario]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user_id_int = int(user_id)
    except (JWTError, ValueError):
        return None

    stmt = select(Usuario).where(Usuario.id_usuario == user_id_int).options(selectinload(Usuario.rol))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

def require_roles(*roles: str) -> Callable[[Usuario], Any]:
    # Expandir sinónimos de rol (EMPLEADO y CAJERO) para máxima robustez y compatibilidad
    expanded_roles = set(roles)
    if "EMPLEADO" in expanded_roles:
        expanded_roles.add("CAJERO")
    if "CAJERO" in expanded_roles:
        expanded_roles.add("EMPLEADO")

    def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if not current_user.rol or current_user.rol.nombre_rol not in expanded_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Se requiere rol: {', '.join(roles)}"
            )
        return current_user
    return role_checker
