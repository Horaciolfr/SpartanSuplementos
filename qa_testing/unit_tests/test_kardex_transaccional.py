import os
import sys
import pytest
import asyncio
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
backend_path = os.path.join(project_root, "backend")
if project_root not in sys.path:
    sys.path.insert(0, project_root)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.core.database import AsyncSessionLocal
from backend.services_erp.kardex_service import KardexService
from backend.schemas.kardex import KardexSalidaRequest, KardexEntradaRequest
from backend.models.products import Producto
from sqlalchemy import select

@pytest.mark.asyncio
async def test_kardex_salida_con_bloqueo_pesimista():
    async with AsyncSessionLocal() as session:
        # Estado inicial
        sku = "SKU-PROT-WHEY-01"
        prod_before = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        stock_inicial = prod_before.stock_actual

        # Ejecutar salida transaccional
        request_data = KardexSalidaRequest(
            codigo_sku=sku,
            cantidad=5
        )
        response = await KardexService.registrar_salida(session=session, data=request_data)

        # Verificaciones
        assert response.codigo_sku == sku
        assert response.cantidad_movimiento == 5
        assert response.stock_anterior == stock_inicial
        assert response.saldo_resultante == stock_inicial - 5
        assert response.tipo_operacion == "VENTA"
        assert response.latencia_ms is not None
        assert response.id_kardex > 0

        # Verificar persistencia en base de datos en una sesión limpia
        async with AsyncSessionLocal() as verify_session:
            prod_db = (await verify_session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
            assert prod_db.stock_actual == stock_inicial - 5

@pytest.mark.asyncio
async def test_quiebre_de_stock_rechazo_409():
    from fastapi import HTTPException
    async with AsyncSessionLocal() as session:
        sku = "SKU-PROT-WHEY-01"
        prod = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        
        # Intentar sacar más de lo disponible
        request_data = KardexSalidaRequest(
            codigo_sku=sku,
            cantidad=prod.stock_actual + 1000
        )
        with pytest.raises(HTTPException) as exc_info:
            await KardexService.registrar_salida(session=session, data=request_data)
        
        assert exc_info.value.status_code == 409
        assert "Quiebre de stock" in exc_info.value.detail

@pytest.mark.asyncio
async def test_concurrencia_kardex_bloqueo_pesimista():
    """Simula 10 transacciones concurrentes sobre el mismo SKU para verificar serialización por FOR UPDATE"""
    sku = "SKU-PROT-WHEY-01"
    async with AsyncSessionLocal() as session:
        prod_before = (await session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        stock_inicial = prod_before.stock_actual

    num_hilos = 10
    cantidad_por_hilo = 2

    async def worker():
        async with AsyncSessionLocal() as worker_session:
            req = KardexSalidaRequest(codigo_sku=sku, cantidad=cantidad_por_hilo)
            return await KardexService.registrar_salida(session=worker_session, data=req)

    # Lanzar 10 peticiones en paralelo real
    resultados = await asyncio.gather(*[worker() for _ in range(num_hilos)])
    assert len(resultados) == num_hilos

    # Verificar stock final exacto
    async with AsyncSessionLocal() as final_session:
        prod_after = (await final_session.execute(select(Producto).where(Producto.codigo_sku == sku))).scalar_one()
        assert prod_after.stock_actual == stock_inicial - (num_hilos * cantidad_por_hilo)

if __name__ == "__main__":
    asyncio.run(test_kardex_salida_con_bloqueo_pesimista())
    print("TEST KARDEX TRANSACCIONAL COMPLETADO CON ÉXITO")
