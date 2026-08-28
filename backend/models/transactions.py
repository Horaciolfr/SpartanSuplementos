from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, BigInteger, Numeric, ForeignKey, DateTime, func, CheckConstraint, Index
from datetime import datetime
from typing import Optional
from .base import Base

class Compra(Base):
    __tablename__ = 'compra'
    __table_args__ = (
        CheckConstraint("estado_compra IN ('RECIBIDO', 'ANULADO')", name='chk_estado_compra'),
        {'schema': 'erp'}
    )

    id_compra: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_proveedor: Mapped[int] = mapped_column(ForeignKey('erp.proveedor.id_proveedor'), nullable=False)
    id_usuario_registro: Mapped[int] = mapped_column(ForeignKey('erp.usuario.id_usuario'), nullable=False)
    numero_factura: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    total_compra: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    estado_compra: Mapped[str] = mapped_column(String(20), nullable=False)
    fecha_hora_compra: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class DetalleCompra(Base):
    __tablename__ = 'detalle_compra'
    __table_args__ = (
        CheckConstraint('cantidad > 0', name='chk_cantidad_compra'),
        {'schema': 'erp'}
    )

    id_detalle_compra: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_compra: Mapped[int] = mapped_column(ForeignKey('erp.compra.id_compra'), nullable=False)
    id_producto: Mapped[int] = mapped_column(ForeignKey('erp.producto.id_producto'), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    costo_unitario: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

class Venta(Base):
    __tablename__ = 'venta'
    __table_args__ = (
        CheckConstraint("estado_pago IN ('PENDIENTE', 'PAGADO', 'ANULADO')", name='chk_estado_pago'),
        Index('idx_erp_venta_cliente_fecha', 'id_cliente', 'fecha_hora_venta'),
        {'schema': 'erp'}
    )

    id_venta: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_cliente: Mapped[Optional[int]] = mapped_column(ForeignKey('erp.usuario.id_usuario'), nullable=True)
    id_cajero: Mapped[int] = mapped_column(ForeignKey('erp.usuario.id_usuario'), nullable=False)
    numero_recibo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    total_transaccion: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    estado_pago: Mapped[str] = mapped_column(String(20), nullable=False)
    fecha_hora_venta: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class DetalleVenta(Base):
    __tablename__ = 'detalle_venta'
    __table_args__ = (
        CheckConstraint('cantidad > 0', name='chk_cantidad_venta'),
        Index('idx_erp_detalle_venta_venta', 'id_venta'),
        {'schema': 'erp'}
    )

    id_detalle_venta: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_venta: Mapped[int] = mapped_column(ForeignKey('erp.venta.id_venta'), nullable=False)
    id_producto: Mapped[int] = mapped_column(ForeignKey('erp.producto.id_producto'), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    precio_historico: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
