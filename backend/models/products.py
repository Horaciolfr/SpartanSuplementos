from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Numeric, Boolean, ForeignKey, DateTime, func
from datetime import datetime
from .base import Base

class CategoriaProducto(Base):
    __tablename__ = 'categoria_producto'
    __table_args__ = {'schema': 'erp'}

    id_categoria: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_categoria: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Producto(Base):
    __tablename__ = 'producto'
    __table_args__ = {'schema': 'erp'}

    id_producto: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_categoria: Mapped[int] = mapped_column(ForeignKey('erp.categoria_producto.id_categoria'), nullable=False)
    codigo_sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre_producto: Mapped[str] = mapped_column(String(150), nullable=False)
    precio_unitario: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    stock_actual: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_seguridad: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    estado_activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
