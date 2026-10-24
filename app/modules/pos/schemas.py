from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class VentaItemRequest(BaseModel):
    id_producto: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)

class VentaCreateRequest(BaseModel):
    id_cliente: Optional[int] = None
    items: list[VentaItemRequest] = Field(..., min_length=1)

class DetalleVentaOut(BaseModel):
    id_detalle_venta: int
    id_producto: int
    codigo_sku: str
    nombre_producto: str
    cantidad: int
    precio_historico: float
    subtotal: float

    model_config = ConfigDict(from_attributes=True)

class VentaResponse(BaseModel):
    id_venta: int
    numero_recibo: str
    total_transaccion: float
    estado_pago: str
    fecha_hora_venta: datetime
    cajero: str
    cliente: Optional[str] = None
    detalles: list[DetalleVentaOut]

    model_config = ConfigDict(from_attributes=True)

class KardexMovimientoOut(BaseModel):
    id_kardex: int
    id_producto: int
    tipo_operacion: str
    cantidad_movimiento: int
    saldo_resultante: int
    id_venta: Optional[int] = None
    id_compra: Optional[int] = None
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)

class KardexMovimientoValorizadoOut(BaseModel):
    id_kardex: int
    tipo_operacion: str
    cantidad: int
    costo_unitario_movimiento: float
    total_movimiento: float
    saldo_unidades: int
    pmp_resultante: float
    saldo_valorizado: float
    id_venta: Optional[int] = None
    id_compra: Optional[int] = None
    fecha_registro: datetime

    model_config = ConfigDict(from_attributes=True)

class KardexValorizadoOut(BaseModel):
    id_producto: int
    codigo_sku: str
    nombre_producto: str
    stock_actual: int
    pmp_actual: float
    valor_total_inventario: float
    metodo_valorizacion: str = "PMP (Precio Medio Ponderado)"
    movimientos: list[KardexMovimientoValorizadoOut]

    model_config = ConfigDict(from_attributes=True)

class ClienteOut(BaseModel):
    id_usuario: int
    nombres: str
    apellidos: str
    email: str
    numero_documento: str

    model_config = ConfigDict(from_attributes=True)
