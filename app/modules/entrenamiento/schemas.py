from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List

class EjercicioItem(BaseModel):
    id_ejercicio: int
    codigo: str
    nombre: str
    categoria: str
    somatotipo_afin: str
    objetivo: str
    grupo_muscular: Optional[str] = None
    instrucciones: Optional[str] = None
    url_gif: Optional[str] = None
    placeholder: bool = False
    placeholder_texto: str = "Animación en preparación"
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)

class EjercicioRutinaItem(BaseModel):
    id_ejercicio: int
    codigo: str
    nombre: str
    categoria: str
    grupo_muscular: Optional[str] = None
    dia: int
    orden: int
    series: int
    repeticiones: str
    descanso_seg: int
    nota_tecnica: Optional[str] = None
    url_gif: Optional[str] = None
    placeholder: bool = False
    placeholder_texto: str = "Animación en preparación"
    disclaimer: str

    model_config = ConfigDict(from_attributes=True)

class DiaRutina(BaseModel):
    dia: int
    nombre_dia: str
    ejercicios: List[EjercicioRutinaItem]

class RutinaResponse(BaseModel):
    id_plantilla: int
    nombre: str
    somatotipo_solicitado: str
    somatotipo_plantilla: str
    objetivo_solicitado: str
    objetivo_plantilla: str
    objetivo_declarado: bool
    aviso: Optional[str] = None
    frecuencia: str
    enfoque: str
    descanso_general: str
    dias_semana: int
    regla_aplicada: str
    disclaimer: str
    total_ejercicios: int
    dias: List[DiaRutina]

class ActualizarObjetivoIn(BaseModel):
    objetivo: str = Field(..., pattern="^(GP|GM|PP|MANT)$")
