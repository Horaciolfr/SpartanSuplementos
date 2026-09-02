from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.core.database import engine
from app.modules.auth.router import router as auth_router
from app.modules.catalogo.router import router as catalogo_router
from app.modules.pos.router import router as pos_router

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

# Habilitar CORS para integración con Frontend SPA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers de la aplicación
app.include_router(auth_router)
app.include_router(catalogo_router)
app.include_router(pos_router)

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "operational", "environment": "development"}
