from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.users import Usuario
from app.modules.auth.schemas import TokenResponse, UsuarioOut

router = APIRouter(prefix="/auth", tags=["Autenticación & Seguridad"])

@router.post("/token", response_model=TokenResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    stmt = select(Usuario).where(Usuario.email == form_data.username).options(selectinload(Usuario.rol))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hash_contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    rol_nombre = user.rol.nombre_rol if user.rol else "CLIENTE"
    access_token = create_access_token(
        data={"sub": str(user.id_usuario), "rol": rol_nombre, "email": user.email}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        rol=rol_nombre
    )

@router.get("/me", response_model=UsuarioOut)
async def read_users_me(
    current_user: Usuario = Depends(get_current_user)
) -> UsuarioOut:
    return UsuarioOut(
        id_usuario=current_user.id_usuario,
        numero_documento=current_user.numero_documento,
        nombres=current_user.nombres,
        apellidos=current_user.apellidos,
        email=current_user.email,
        rol=current_user.rol.nombre_rol if current_user.rol else "CLIENTE"
    )
