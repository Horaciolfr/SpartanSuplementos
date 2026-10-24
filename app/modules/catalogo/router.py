from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_db, require_roles
from app.models.products import CategoriaProducto, Producto
from app.models.users import Usuario
from app.modules.catalogo.schemas import (
    CategoriaCreate, CategoriaOut,
    ProductoCreate, ProductoUpdate, ProductoOut
)

router = APIRouter(prefix="/catalogo", tags=["Catálogo de Productos"])

# --- CATEGORÍAS (ADMINISTRADOR) ---

@router.get("/categorias", response_model=list[CategoriaOut])
async def list_categorias(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    stmt = select(CategoriaProducto).order_by(CategoriaProducto.id_categoria)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/categorias", response_model=CategoriaOut, status_code=status.HTTP_201_CREATED)
async def create_categoria(
    payload: CategoriaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    existing = await db.execute(select(CategoriaProducto).where(CategoriaProducto.nombre_categoria == payload.nombre_categoria))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="La categoría ya existe")
    
    nueva_cat = CategoriaProducto(nombre_categoria=payload.nombre_categoria)
    db.add(nueva_cat)
    await db.commit()
    await db.refresh(nueva_cat)
    return nueva_cat

# --- PRODUCTOS ---

@router.get("/productos", response_model=list[ProductoOut])
async def list_productos(
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Producto)
        .options(selectinload(Producto.categoria))
        .where(Producto.estado_activo == True)
        .order_by(Producto.id_producto)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("/productos", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
async def create_producto(
    payload: ProductoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    # Verificar SKU único
    existing = await db.execute(select(Producto).where(Producto.codigo_sku == payload.codigo_sku))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El código SKU ya está registrado")
    
    # Verificar Categoría
    cat = await db.execute(select(CategoriaProducto).where(CategoriaProducto.id_categoria == payload.id_categoria))
    if not cat.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    nuevo_prod = Producto(
        id_categoria=payload.id_categoria,
        codigo_sku=payload.codigo_sku,
        nombre_producto=payload.nombre_producto,
        precio_unitario=payload.precio_unitario,
        stock_actual=payload.stock_actual,
        stock_seguridad=payload.stock_seguridad,
        estado_activo=payload.estado_activo
    )
    db.add(nuevo_prod)
    await db.commit()
    
    # Cargar con selectinload
    stmt = select(Producto).where(Producto.id_producto == nuevo_prod.id_producto).options(selectinload(Producto.categoria))
    prod_loaded = (await db.execute(stmt)).scalar_one()
    return prod_loaded

@router.get("/productos/{id_producto}", response_model=ProductoOut)
async def get_producto(
    id_producto: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    stmt = select(Producto).where(Producto.id_producto == id_producto).options(selectinload(Producto.categoria))
    res = await db.execute(stmt)
    prod = res.scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return prod

@router.put("/productos/{id_producto}", response_model=ProductoOut)
async def update_producto(
    id_producto: int,
    payload: ProductoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    stmt = select(Producto).where(Producto.id_producto == id_producto).options(selectinload(Producto.categoria))
    prod = (await db.execute(stmt)).scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prod, field, value)

    await db.commit()
    await db.refresh(prod)
    return prod

@router.delete("/productos/{id_producto}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_producto(
    id_producto: int,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(require_roles("ADMINISTRADOR"))
):
    stmt = select(Producto).where(Producto.id_producto == id_producto)
    prod = (await db.execute(stmt)).scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    prod.estado_activo = False
    await db.commit()
    return None
