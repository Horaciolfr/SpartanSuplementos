from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, ForeignKey, DateTime, func
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.catalogs import RolSistema, TipoDocumento, CatalogoGenero
    from app.models.transactions import Venta, Compra

class Usuario(Base):
    __tablename__ = 'usuario'
    __table_args__ = {'schema': 'erp'}

    id_usuario: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_rol: Mapped[int] = mapped_column(ForeignKey('parametros.rol_sistema.id_rol'), nullable=False)
    id_tipo_documento: Mapped[int] = mapped_column(ForeignKey('parametros.tipo_documento.id_tipo_documento'), nullable=False)
    id_genero: Mapped[Optional[int]] = mapped_column(ForeignKey('parametros.catalogo_genero.id_genero'), nullable=True)
    
    numero_documento: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nombres: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    hash_contrasena: Mapped[str] = mapped_column(String(255), nullable=False)
    esta_verificado: Mapped[bool] = mapped_column(default=True, nullable=False)
    codigo_verificacion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    codigo_verificacion_expira: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    codigo_recuperacion: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    codigo_recuperacion_expira: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    objetivo: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    rol: Mapped["RolSistema"] = relationship("RolSistema", back_populates="usuarios", lazy="selectin")
    tipo_documento: Mapped["TipoDocumento"] = relationship("TipoDocumento", lazy="selectin")
    genero: Mapped[Optional["CatalogoGenero"]] = relationship("CatalogoGenero", lazy="selectin")

class Proveedor(Base):
    __tablename__ = 'proveedor'
    __table_args__ = {'schema': 'erp'}

    id_proveedor: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    razon_social: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    nit: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
