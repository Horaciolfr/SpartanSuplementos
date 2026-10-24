from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class CategoriaBase(BaseModel):
    nombre_categoria: str = Field(..., min_length=2, max_length=100)

class CategoriaCreate(CategoriaBase):
    pass

class CategoriaOut(CategoriaBase):
    id_categoria: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class ProductoBase(BaseModel):
    id_categoria: int
    codigo_sku: str = Field(..., min_length=2, max_length=50)
    nombre_producto: str = Field(..., min_length=2, max_length=150)
    precio_unitario: float = Field(..., gt=0)
    stock_actual: int = Field(default=0, ge=0)
    stock_seguridad: int = Field(default=0, ge=0)
    estado_activo: bool = True
    imagen_url: Optional[str] = None
    descripcion: Optional[str] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    id_categoria: Optional[int] = None
    codigo_sku: Optional[str] = None
    nombre_producto: Optional[str] = None
    precio_unitario: Optional[float] = Field(default=None, gt=0)
    stock_seguridad: Optional[int] = Field(default=None, ge=0)
    estado_activo: Optional[bool] = None
    imagen_url: Optional[str] = None
    descripcion: Optional[str] = None

class ProductoOut(ProductoBase):
    id_producto: int
    created_at: Optional[datetime] = None
    categoria: Optional[CategoriaOut] = None

    model_config = ConfigDict(from_attributes=True)
