from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_current_user
from app.models.users import Usuario
from app.modules.entrenamiento.schemas import ActualizarObjetivoIn

router = APIRouter(tags=["Usuarios"])

@router.put("/usuarios/me/objetivo")
@router.patch("/usuarios/me/objetivo")
async def actualizar_objetivo_usuario(
    payload: ActualizarObjetivoIn,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    current_user.objetivo = payload.objetivo
    await db.commit()
    await db.refresh(current_user)
    return {
        "message": "Objetivo actualizado exitosamente",
        "objetivo": current_user.objetivo
    }
