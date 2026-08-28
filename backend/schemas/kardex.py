from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

class KardexSalidaRequest(BaseModel):
    codigo_sku: str = Field(..., description="Código SKU del producto a descontar", min_length=1, max_length=50, examples=["SKU-PROT-WHEY-01"])
    cantidad: int = Field(..., description="Cantidad de unidades vendidas o retiradas", gt=0, examples=[1])
    id_cliente: Optional[int] = Field(default=None, description="ID del cliente (opcional)")
    id_cajero: Optional[int] = Field(default=None, description="ID del cajero que procesa la transacción")
    numero_recibo: Optional[str] = Field(default=None, description="Número de recibo/factura único de venta")
    id_venta: Optional[int] = Field(default=None, description="ID de venta existente (si aplica)")

class KardexEntradaRequest(BaseModel):
    codigo_sku: str = Field(..., description="Código SKU del producto a ingresar", min_length=1, max_length=50, examples=["SKU-PROT-WHEY-01"])
    cantidad: int = Field(..., description="Cantidad de unidades compradas o ingresadas", gt=0, examples=[10])
    id_proveedor: Optional[int] = Field(default=None, description="ID del proveedor de la compra")
    id_usuario_registro: Optional[int] = Field(default=None, description="ID del usuario que registra el ingreso")
    numero_factura: Optional[str] = Field(default=None, description="Número de factura de la compra")
    id_compra: Optional[int] = Field(default=None, description="ID de compra existente (si aplica)")

class KardexResponse(BaseModel):
    id_kardex: int = Field(..., description="ID autogenerado del movimiento en Kárdex")
    id_producto: int = Field(..., description="ID único del producto")
    codigo_sku: str = Field(..., description="Código SKU")
    nombre_producto: str = Field(..., description="Nombre comercial del producto")
    tipo_operacion: str = Field(..., description="Tipo de operación (VENTA / COMPRA / SALIDA)")
    cantidad_movimiento: int = Field(..., description="Cantidad de unidades procesadas")
    stock_anterior: int = Field(..., description="Stock antes de la transacción")
    saldo_resultante: int = Field(..., description="Stock resultante posterior al bloqueo pesimista")
    id_venta: Optional[int] = Field(default=None, description="ID de venta vinculada")
    id_compra: Optional[int] = Field(default=None, description="ID de compra vinculada")
    fecha_registro: datetime = Field(..., description="Timestamp exacto del registro en base de datos")
    latencia_ms: Optional[float] = Field(default=None, description="Tiempo de ejecución en milisegundos de la transacción")

    model_config = ConfigDict(from_attributes=True)
