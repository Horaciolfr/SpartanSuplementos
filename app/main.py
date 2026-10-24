from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.core.database import engine
from app.modules.auth.router import router as auth_router
from app.modules.catalogo.router import router as catalogo_router
from app.modules.pos.router import router as pos_router
from app.modules.ia.router import router as ia_router
from app.modules.predicciones.router import router as predicciones_router
from app.modules.admin.router import router as admin_router
from app.modules.nutricion.router import router as nutricion_router
from app.modules.entrenamiento.router import router as entrenamiento_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Spartan Suplementos ERP & IA",
    description="Backend asíncrono para ERP transaccional (Kárdex ACID) e Inteligencia Artificial",
    version="1.0.0",
    lifespan=lifespan
)

import os

cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:80,http://localhost"
)
allowed_origins = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]

# Habilitar CORS con orígenes confiables para integración con Frontend SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.core.middleware import RequestIdAndMetricsMiddleware
from app.core.metrics import metrics_registry
from fastapi import Response

# Middleware de trazabilidad y métricas (X-Request-Id y latencia Prometheus)
app.add_middleware(RequestIdAndMetricsMiddleware)

# Routers de la aplicación
app.include_router(auth_router)
app.include_router(catalogo_router)
app.include_router(pos_router)
app.include_router(ia_router)
app.include_router(predicciones_router)
app.include_router(admin_router)
app.include_router(nutricion_router)
app.include_router(entrenamiento_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "operational", "environment": "development"}

@app.get("/metrics", tags=["Observabilidad"])
async def get_metrics():
    """Expone el histograma de latencia y contadores en formato de texto Prometheus."""
    return Response(content=metrics_registry.to_prometheus(), media_type="text/plain")
