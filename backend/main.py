from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.database import engine
from models.base import Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # La inicialización del esquema delegará el control a Alembic más adelante, 
    # pero verificamos la conexión de los modelos base aquí.
    async with engine.begin() as conn:
        pass
    yield
    await engine.dispose()

app = FastAPI(
    title="Spartan Suplementos ERP & IA",
    description="Sistema transaccional de inventario e inferencia biométrica acoplada a MediaPipe",
    version="1.0.0",
    lifespan=lifespan
)

from api.v1.api import api_router

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "operational", "environment": "development"}
