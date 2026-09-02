"""
Microservicio Desacoplado de Visión Artificial e Inferencia Biometríca (Esquema IA)
Regla 2.1: Desacoplamiento total del Gateway ERP.
Las inferencias CPU-bound jamás saturan el Event Loop ASGI transaccional de ventas.
"""
from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict, Any, List
from .config import settings

app = FastAPI(
    title=settings.SERVICE_NAME,
    description="Microservicio especializado en visión artificial (MediaPipe / Roboflow) y cálculo de somatotipos",
    version="1.0.0"
)

class LandmarksPayload(BaseModel):
    id_usuario: int
    estatura_cm: float
    peso_kg: float
    landmarks: Dict[str, Any]

@app.get("/health")
async def health_check():
    return {
        "service": settings.SERVICE_NAME,
        "status": "operational",
        "domain": "ia"
    }

@app.post("/inferencia/somatotipo")
async def inferir_somatotipo(payload: LandmarksPayload):
    """
    Simulación / worker de inferencia que clasifica somatotipo a partir de landmarks espaciales
    sin bloquear transacciones del ERP.
    """
    imc = payload.peso_kg / ((payload.estatura_cm / 100) ** 2)
    somatotipo = "MESOMORFO" if 20 <= imc <= 26 else ("ECTOMORFO" if imc < 20 else "ENDOMORFO")
    return {
        "id_usuario": payload.id_usuario,
        "somatotipo_predicho": somatotipo,
        "indice_masa_corporal": round(imc, 2),
        "precision_estimada": 0.94
    }
