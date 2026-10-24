from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class UltimoPerfilResumen(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_perfil: int
    somatotipo: Optional[str] = None
    estatura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    visibilidad_media: Optional[float] = None
    fecha_captura: datetime


class PrescripcionesResumen(BaseModel):
    total: int
    convertidas: int
    ultima_fecha: Optional[datetime] = None


class PlanNutricionalResumen(BaseModel):
    nombre_plan: str


class ClienteListItem(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    email: str
    numero_documento: str
    esta_verificado: bool
    fecha_creacion: datetime
    objetivo: Optional[str] = None
    ultimo_perfil: Optional[UltimoPerfilResumen] = None
    prescripciones: PrescripcionesResumen
    plan_nutricional: Optional[PlanNutricionalResumen] = None


class ClientesPaginadosResponse(BaseModel):
    total: int
    pagina: int
    tamano: int
    items: List[ClienteListItem]


class PerfilBiometricoDetalle(BaseModel):
    id_perfil: int
    id_somatotipo: Optional[int] = None
    somatotipo: Optional[str] = None
    estatura_cm: Optional[float] = None
    peso_kg: Optional[float] = None
    precision_captura: Optional[float] = None
    fecha_captura: datetime
    coordenadas_espaciales: Optional[Dict[str, Any]] = None


class ProductoPrescripcion(BaseModel):
    id_producto: int
    sku: str
    nombre: str
    precio: float
    stock_actual: int


class ReglaPrescripcion(BaseModel):
    id_regla: int
    codigo: str
    descripcion: Optional[str] = None


class ConversionPrescripcion(BaseModel):
    id_venta_efectiva: Optional[int] = None
    estado: bool


class PrescripcionDetalle(BaseModel):
    id_prescripcion: int
    id_perfil: int
    fecha_prescripcion: datetime
    producto: ProductoPrescripcion
    regla: Optional[ReglaPrescripcion] = None
    conversion: ConversionPrescripcion


class PlanNutricionalCompleto(BaseModel):
    id_plan: int
    id_somatotipo: int
    nombre_plan: str
    objetivo: Optional[str] = None
    distribucion_macronutrientes: Dict[str, Any]
    pautas: List[str]
    comidas_sugeridas: List[Dict[str, Any]]
    disclaimer: str


class ClienteDetalleResponse(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    email: str
    numero_documento: str
    esta_verificado: bool
    fecha_creacion: datetime
    genero: Optional[str] = None
    tipo_documento: Optional[str] = None
    objetivo: Optional[str] = None
    perfiles: List[PerfilBiometricoDetalle]
    prescripciones: List[PrescripcionDetalle]
    plan_nutricional: Optional[PlanNutricionalCompleto] = None
