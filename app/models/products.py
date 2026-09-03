from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Numeric, Boolean, ForeignKey, DateTime, func
from datetime import datetime
from typing import TYPE_CHECKING
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.transactions import DetalleVenta, DetalleCompra
    from app.models.kardex import KardexFisico

class CategoriaProducto(Base):
    __tablename__ = 'categoria_producto'
    __table_args__ = {'schema': 'erp'}

    id_categoria: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_categoria: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    productos: Mapped[list["Producto"]] = relationship("Producto", back_populates="categoria", lazy="selectin")

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
    imagen_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    descripcion: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    categoria: Mapped["CategoriaProducto"] = relationship("CategoriaProducto", back_populates="productos", lazy="selectin")
    detalles_venta: Mapped[list["DetalleVenta"]] = relationship("DetalleVenta", back_populates="producto")
    detalles_compra: Mapped[list["DetalleCompra"]] = relationship("DetalleCompra", back_populates="producto")
    kardex: Mapped[list["KardexFisico"]] = relationship("KardexFisico", back_populates="producto")
