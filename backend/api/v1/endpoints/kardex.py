from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.dependencies import get_db
from services_erp.kardex_service import KardexService
from schemas.kardex import KardexSalidaRequest, KardexEntradaRequest, KardexResponse

router = APIRouter(prefix="/kardex", tags=["Kardex Transaccional"])

@router.post(
    "/salida",
    response_model=KardexResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar salida o venta con bloqueo pesimista",
    description=(
        "Ejecuta una transacción asíncrona ACID sobre el Kárdex físico. "
        "Aplica SELECT ... FOR UPDATE sobre la fila del SKU solicitado en PostgreSQL, "
        "previniendo condiciones de carrera y quiebres de stock bajo alta concurrencia."
    )
)
async def registrar_salida_kardex(
    payload: KardexSalidaRequest,
    db: AsyncSession = Depends(get_db)
) -> KardexResponse:
    return await KardexService.registrar_salida(session=db, data=payload)

@router.post(
    "/entrada",
    response_model=KardexResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar entrada o compra con bloqueo pesimista",
    description=(
        "Ejecuta una transacción asíncrona de reposición de inventario con bloqueo de fila "
        "para garantizar la actualización determinística del stock y registro en Kárdex."
    )
)
async def registrar_entrada_kardex(
    payload: KardexEntradaRequest,
    db: AsyncSession = Depends(get_db)
) -> KardexResponse:
    return await KardexService.registrar_entrada(session=db, data=payload)
