from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Integer, BigInteger, ForeignKey, DateTime, func, CheckConstraint, Index
from datetime import datetime
from typing import Optional
from .base import Base

class KardexFisico(Base):
    __tablename__ = 'kardex_fisico'
    __table_args__ = (
        CheckConstraint("num_nonnulls(id_venta, id_compra) = 1", name='chk_origen_kardex'),
        Index('idx_erp_kardex_producto_fecha', 'id_producto', 'fecha_registro'),
        {'schema': 'erp'}
    )

    id_kardex: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey('erp.producto.id_producto'), nullable=False)
    id_compra: Mapped[Optional[int]] = mapped_column(ForeignKey('erp.compra.id_compra'), nullable=True)
    id_venta: Mapped[Optional[int]] = mapped_column(ForeignKey('erp.venta.id_venta'), nullable=True)
    id_tipo_operacion: Mapped[int] = mapped_column(ForeignKey('parametros.tipo_operacion_kardex.id_tipo_operacion'), nullable=False)
    cantidad_movimiento: Mapped[int] = mapped_column(Integer, nullable=False)
    saldo_resultante: Mapped[int] = mapped_column(Integer, nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
