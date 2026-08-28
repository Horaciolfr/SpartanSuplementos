from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, ForeignKey, DateTime, func
from datetime import datetime
from typing import Optional
from .base import Base

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
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class Proveedor(Base):
    __tablename__ = 'proveedor'
    __table_args__ = {'schema': 'erp'}

    id_proveedor: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    razon_social: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    nit: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
