from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any

class RecetaNutricionalItem(BaseModel):
    id_receta: int
    codigo: str
    nombre: str
    categoria: str
    somatotipo_afin: str
    objetivo: str
    ingredientes: List[str] = Field(default_factory=list)
    macronutrientes: Dict[str, Any] = Field(default_factory=dict)
    instrucciones: Optional[str] = None
    disclaimer: str
    url_imagen: Optional[str] = None
    placeholder: bool = False
    placeholder_texto: str = "Imagen en preparación"
    regla_aplicada: str

    model_config = ConfigDict(from_attributes=True)

class PlanDiarioResponse(BaseModel):
    somatotipo: str
    objetivo: str
    objetivo_declarado: bool
    aviso: Optional[str] = None
    total_comidas: int
    comidas: List[RecetaNutricionalItem]

class CatalogoRecetasResponse(BaseModel):
    total: int
    pagina: int
    tamano: int
    items: List[RecetaNutricionalItem]

class ActualizarObjetivoIn(BaseModel):
    objetivo: str = Field(..., pattern="^(GP|GM|PP|MANT)$")
