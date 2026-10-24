from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, BigInteger, Numeric, Boolean, ForeignKey, DateTime, func, Index, Text, Computed
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional
from app.models.base import Base

class VersionModeloIA(Base):
    __tablename__ = 'version_modelo_ia'
    __table_args__ = {'schema': 'ia'}

    id_version: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    algoritmo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hash_archivo: Mapped[str] = mapped_column(String(255), nullable=False)
    metric_accuracy: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    metric_rmse: Mapped[Optional[float]] = mapped_column(Numeric(5, 4), nullable=True)
    aprobado_produccion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fecha_entrenamiento: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class ReglaInferenciaCART(Base):
    __tablename__ = 'regla_inferencia_cart'
    __table_args__ = {'schema': 'ia'}

    id_regla: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_version: Mapped[int] = mapped_column(ForeignKey('ia.version_modelo_ia.id_version'), nullable=False)
    codigo_regla: Mapped[str] = mapped_column(String(50), nullable=False)
    descripcion_tecnica: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    umbral_decision: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)

class PerfilBiometrico(Base):
    __tablename__ = 'perfil_biometrico'
    __table_args__ = (
        Index('idx_landmarks_gin', 'coordenadas_espaciales', postgresql_using='gin', postgresql_ops={'coordenadas_espaciales': 'jsonb_path_ops'}),
        {'schema': 'ia'}
    )

    id_perfil: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey('erp.usuario.id_usuario'), nullable=False)
    id_somatotipo: Mapped[Optional[int]] = mapped_column(ForeignKey('parametros.catalogo_somatotipo.id_somatotipo'), nullable=True)
    coordenadas_espaciales = mapped_column(JSONB, nullable=False)
    precision_captura: Mapped[Optional[float]] = mapped_column(Numeric(8, 6), nullable=True)
    estatura_cm: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    peso_kg: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    fecha_captura: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class PrescripcionCrossSelling(Base):
    __tablename__ = 'prescripcion_crossselling'
    __table_args__ = (
        Index('idx_ia_prescripcion_perfil', 'id_perfil'),
        {'schema': 'ia'}
    )

    id_prescripcion: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_perfil: Mapped[int] = mapped_column(ForeignKey('ia.perfil_biometrico.id_perfil'), nullable=False)
    id_producto: Mapped[int] = mapped_column(ForeignKey('erp.producto.id_producto'), nullable=False)
    id_regla_aplicada: Mapped[Optional[int]] = mapped_column(ForeignKey('ia.regla_inferencia_cart.id_regla'), nullable=True)
    id_venta_efectiva: Mapped[Optional[int]] = mapped_column(ForeignKey('erp.venta.id_venta'), nullable=True)
    estado_conversion: Mapped[Optional[bool]] = mapped_column(Computed("id_venta_efectiva IS NOT NULL", persisted=True), nullable=True)
    fecha_prescripcion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
