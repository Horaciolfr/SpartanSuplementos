from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, CheckConstraint
from .base import Base

class RolSistema(Base):
    __tablename__ = 'rol_sistema'
    __table_args__ = {'schema': 'parametros'}

    id_rol: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_rol: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

class TipoDocumento(Base):
    __tablename__ = 'tipo_documento'
    __table_args__ = {'schema': 'parametros'}

    id_tipo_documento: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    sigla: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)

class TipoOperacionKardex(Base):
    __tablename__ = 'tipo_operacion_kardex'
    __table_args__ = (
        CheckConstraint('multiplicador IN (-1, 1)', name='chk_multiplicador'),
        {'schema': 'parametros'}
    )

    id_tipo_operacion: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_operacion: Mapped[str] = mapped_column(String(50), nullable=False)
    multiplicador: Mapped[int] = mapped_column(Integer, nullable=False)

class CatalogoSomatotipo(Base):
    __tablename__ = 'catalogo_somatotipo'
    __table_args__ = {'schema': 'parametros'}

    id_somatotipo: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_somatotipo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

class CatalogoGenero(Base):
    __tablename__ = 'catalogo_genero'
    __table_args__ = {'schema': 'parametros'}

    id_genero: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_genero: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
