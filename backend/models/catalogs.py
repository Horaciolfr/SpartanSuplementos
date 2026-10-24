from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, CheckConstraint, ForeignKey, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import TYPE_CHECKING, Optional, List, Dict, Any
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.users import Usuario

class RolSistema(Base):
    __tablename__ = 'rol_sistema'
    __table_args__ = {'schema': 'parametros'}

    id_rol: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_rol: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    usuarios: Mapped[list["Usuario"]] = relationship("Usuario", back_populates="rol")

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

    plan_nutricional: Mapped[Optional["PlanNutricionalSomatotipo"]] = relationship("PlanNutricionalSomatotipo", back_populates="somatotipo", uselist=False)

class CatalogoGenero(Base):
    __tablename__ = 'catalogo_genero'
    __table_args__ = {'schema': 'parametros'}

    id_genero: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre_genero: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)

class PlanNutricionalSomatotipo(Base):
    __tablename__ = 'plan_nutricional_somatotipo'
    __table_args__ = {'schema': 'parametros'}

    id_plan: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_somatotipo: Mapped[int] = mapped_column(ForeignKey('parametros.catalogo_somatotipo.id_somatotipo'), unique=True, nullable=False)
    nombre_plan: Mapped[str] = mapped_column(String(80), nullable=False)
    objetivo: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    distribucion_macronutrientes: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    pautas: Mapped[List[str]] = mapped_column(JSONB, nullable=False)
    comidas_sugeridas: Mapped[List[Dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    somatotipo: Mapped["CatalogoSomatotipo"] = relationship("CatalogoSomatotipo", back_populates="plan_nutricional")
    recetas: Mapped[List["RecetaNutricional"]] = relationship(
        "RecetaNutricional",
        secondary="parametros.plan_receta",
        back_populates="planes"
    )

class PlanReceta(Base):
    __tablename__ = 'plan_receta'
    __table_args__ = {'schema': 'parametros'}

    id_plan: Mapped[int] = mapped_column(ForeignKey('parametros.plan_nutricional_somatotipo.id_plan', ondelete='CASCADE'), primary_key=True)
    id_receta: Mapped[int] = mapped_column(ForeignKey('parametros.receta_nutricional.id_receta', ondelete='CASCADE'), primary_key=True)

class RecetaNutricional(Base):
    __tablename__ = 'receta_nutricional'
    __table_args__ = {'schema': 'parametros'}

    id_receta: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    codigo: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    categoria: Mapped[str] = mapped_column(String(30), nullable=False)
    somatotipo_afin: Mapped[str] = mapped_column(String(30), nullable=False)
    objetivo: Mapped[str] = mapped_column(String(10), nullable=False)
    ingredientes: Mapped[List[str]] = mapped_column(JSONB, nullable=False, default=list)
    macronutrientes: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    instrucciones: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disclaimer: Mapped[str] = mapped_column(Text, nullable=False)
    url_imagen: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    planes: Mapped[List["PlanNutricionalSomatotipo"]] = relationship(
        "PlanNutricionalSomatotipo",
        secondary="parametros.plan_receta",
        back_populates="recetas"
    )

