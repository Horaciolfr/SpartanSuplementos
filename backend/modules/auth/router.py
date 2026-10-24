import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, get_current_user
from app.core.security import verify_password, create_access_token, hash_password
from app.core.email import send_verification_email, send_password_reset_email
from app.models.users import Usuario
from app.modules.auth.schemas import (
    TokenResponse,
    UsuarioOut,
    RegistroClienteIn,
    VerificarCodigoIn,
    ReenviarCodigoIn,
    SolicitarRecuperacionIn,
    RestablecerPasswordIn,
    AuthMessageResponse,
)

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

    # Verificación por correo temporalmente desactivada (cuentas verificadas por defecto)
    # if user.rol and user.rol.nombre_rol == "CLIENTE" and not user.esta_verificado:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Tu cuenta aún no está verificada. Por favor ingresa el código enviado a tu correo.",
    #     )

    rol_nombre = user.rol.nombre_rol if user.rol else "CLIENTE"
    access_token = create_access_token(
        data={"sub": str(user.id_usuario), "rol": rol_nombre, "email": user.email}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        rol=rol_nombre
    )

@router.post("/registro", response_model=AuthMessageResponse)
async def registrar_cliente(
    payload: RegistroClienteIn,
    db: AsyncSession = Depends(get_db)
) -> AuthMessageResponse:
    """Registra un nuevo cliente con activación directa (verificación por correo temporalmente desactivada)."""
    # Verificar si el correo ya existe
    stmt_exist = select(Usuario).where(Usuario.email == payload.email)
    res_exist = await db.execute(stmt_exist)
    if res_exist.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya se encuentra registrado."
        )

    # Documento de identidad (si no se proporciona se autogenera número de socio)
    doc_num = payload.numero_documento.strip() if payload.numero_documento else f"CLI-{secrets.token_hex(4).upper()}"
    stmt_doc = select(Usuario).where(Usuario.numero_documento == doc_num)
    res_doc = await db.execute(stmt_doc)
    if res_doc.scalar_one_or_none():
        doc_num = f"CLI-{secrets.token_hex(4).upper()}"

    # Código generado para trazabilidad sin bloqueo
    codigo_verif = f"{secrets.randbelow(900000) + 100000}"
    expira = datetime.now(timezone.utc) + timedelta(minutes=15)

    nuevo_usuario = Usuario(
        id_rol=3, # CLIENTE
        id_tipo_documento=1, # CI
        id_genero=payload.id_genero,
        numero_documento=doc_num,
        nombres=payload.nombres.strip(),
        apellidos=payload.apellidos.strip(),
        email=payload.email.lower().strip(),
        hash_contrasena=hash_password(payload.password),
        esta_verificado=True,
        codigo_verificacion=codigo_verif,
        codigo_verificacion_expira=expira
    )
    db.add(nuevo_usuario)
    await db.commit()

    return AuthMessageResponse(
        message="Cuenta creada y activada exitosamente.",
        email=nuevo_usuario.email,
        requiere_verificacion=False
    )

@router.post("/verificar-codigo", response_model=TokenResponse)
async def verificar_codigo_cuenta(
    payload: VerificarCodigoIn,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Verifica el código de 6 dígitos y activa la cuenta de cliente con sesión inmediata."""
    stmt = select(Usuario).where(Usuario.email == payload.email.lower().strip()).options(selectinload(Usuario.rol))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    if user.esta_verificado:
        rol_nombre = user.rol.nombre_rol if user.rol else "CLIENTE"
        access_token = create_access_token(data={"sub": str(user.id_usuario), "rol": rol_nombre, "email": user.email})
        return TokenResponse(access_token=access_token, token_type="bearer", rol=rol_nombre)

    now = datetime.now(timezone.utc)
    if not user.codigo_verificacion or user.codigo_verificacion.strip() != payload.codigo.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ingresado es incorrecto."
        )

    if user.codigo_verificacion_expira and user.codigo_verificacion_expira < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ha expirado. Por favor solicita uno nuevo."
        )

    user.esta_verificado = True
    user.codigo_verificacion = None
    user.codigo_verificacion_expira = None
    await db.commit()

    rol_nombre = user.rol.nombre_rol if user.rol else "CLIENTE"
    access_token = create_access_token(
        data={"sub": str(user.id_usuario), "rol": rol_nombre, "email": user.email}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        rol=rol_nombre
    )

@router.post("/reenviar-codigo", response_model=AuthMessageResponse)
async def reenviar_codigo(
    payload: ReenviarCodigoIn,
    db: AsyncSession = Depends(get_db)
) -> AuthMessageResponse:
    """Reenvía un nuevo código de verificación de 6 dígitos."""
    stmt = select(Usuario).where(Usuario.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    if user.esta_verificado:
        return AuthMessageResponse(message="Tu cuenta ya se encuentra verificada.", email=user.email)

    codigo_verif = f"{secrets.randbelow(900000) + 100000}"
    user.codigo_verificacion = codigo_verif
    user.codigo_verificacion_expira = datetime.now(timezone.utc) + timedelta(minutes=15)
    await db.commit()

    await send_verification_email(user.email, user.nombres, codigo_verif)
    return AuthMessageResponse(message="Nuevo código enviado a tu correo.", email=user.email)

@router.post("/solicitar-recuperacion", response_model=AuthMessageResponse)
async def solicitar_recuperacion_contrasena(
    payload: SolicitarRecuperacionIn,
    db: AsyncSession = Depends(get_db)
) -> AuthMessageResponse:
    """Genera código de recuperación y lo despacha al correo."""
    stmt = select(Usuario).where(Usuario.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    # Por razones de seguridad estándar no revelamos si el email no existe, pero si existe generamos el código
    if user:
        codigo_reset = f"{secrets.randbelow(900000) + 100000}"
        user.codigo_recuperacion = codigo_reset
        user.codigo_recuperacion_expira = datetime.now(timezone.utc) + timedelta(minutes=15)
        await db.commit()
        await send_password_reset_email(user.email, user.nombres, codigo_reset)

    return AuthMessageResponse(
        message="Si el correo electrónico está registrado, recibirás un código de seguridad para restablecer tu contraseña.",
        email=payload.email
    )

@router.post("/restablecer-password", response_model=AuthMessageResponse)
async def restablecer_contrasena(
    payload: RestablecerPasswordIn,
    db: AsyncSession = Depends(get_db)
) -> AuthMessageResponse:
    """Valida el código de recuperación y actualiza la contraseña del usuario."""
    stmt = select(Usuario).where(Usuario.email == payload.email.lower().strip())
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    now = datetime.now(timezone.utc)
    if not user.codigo_recuperacion or user.codigo_recuperacion.strip() != payload.codigo.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de seguridad incorrecto."
        )

    if user.codigo_recuperacion_expira and user.codigo_recuperacion_expira < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de seguridad ha expirado. Por favor solicita uno nuevo."
        )

    user.hash_contrasena = hash_password(payload.nueva_password)
    user.codigo_recuperacion = None
    user.codigo_recuperacion_expira = None
    await db.commit()

    return AuthMessageResponse(
        message="Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión.",
        email=user.email
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
        rol=current_user.rol.nombre_rol if current_user.rol else "CLIENTE",
        esta_verificado=current_user.esta_verificado,
        objetivo=current_user.objetivo
    )
