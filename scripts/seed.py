import asyncio
import os
import sys

# Ensure root and app are on path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine
from app.core.config import settings
from app.core.security import hash_password
from app.models.catalogs import RolSistema, TipoDocumento, TipoOperacionKardex, CatalogoSomatotipo, CatalogoGenero
from app.models.users import Usuario, Proveedor
from app.models.products import CategoriaProducto, Producto

async def seed():
    print("Iniciando sembrado idempotente de datos (seed.py)...")
    async with AsyncSessionLocal() as session:
        # 1. Roles del Sistema
        roles = ["ADMINISTRADOR", "CAJERO", "CLIENTE"]
        for r_name in roles:
            existing = await session.execute(select(RolSistema).where(RolSistema.nombre_rol == r_name))
            if not existing.scalar_one_or_none():
                session.add(RolSistema(nombre_rol=r_name))
        await session.flush()

        # 2. Tipos de Operación Kárdex (1: COMPRA (+1), 2: VENTA (-1))
        operaciones = [
            ("COMPRA", 1),
            ("VENTA", -1)
        ]
        for nombre_op, mult in operaciones:
            existing = await session.execute(select(TipoOperacionKardex).where(TipoOperacionKardex.nombre_operacion == nombre_op))
            if not existing.scalar_one_or_none():
                session.add(TipoOperacionKardex(nombre_operacion=nombre_op, multiplicador=mult))
        await session.flush()

        # 3. Tipos de Documento
        docs = ["CI", "PASAPORTE"]
        for sigla in docs:
            existing = await session.execute(select(TipoDocumento).where(TipoDocumento.sigla == sigla))
            if not existing.scalar_one_or_none():
                session.add(TipoDocumento(sigla=sigla))
        await session.flush()

        # 4. Catálogo Género
        generos = ["MASCULINO", "FEMENINO"]
        for g_name in generos:
            existing = await session.execute(select(CatalogoGenero).where(CatalogoGenero.nombre_genero == g_name))
            if not existing.scalar_one_or_none():
                session.add(CatalogoGenero(nombre_genero=g_name))
        await session.flush()

        # 5. Catálogo Somatotipo
        somatos = ["ECTOMORFO", "MESOMORFO", "ENDOMORFO"]
        for s_name in somatos:
            existing = await session.execute(select(CatalogoSomatotipo).where(CatalogoSomatotipo.nombre_somatotipo == s_name))
            if not existing.scalar_one_or_none():
                session.add(CatalogoSomatotipo(nombre_somatotipo=s_name))
        await session.flush()

        # 6. Categorías de Producto
        categorias = ["SUPLEMENTOS", "INDUMENTARIA"]
        cat_map = {}
        for c_name in categorias:
            existing = await session.execute(select(CategoriaProducto).where(CategoriaProducto.nombre_categoria == c_name))
            cat = existing.scalar_one_or_none()
            if not cat:
                cat = CategoriaProducto(nombre_categoria=c_name)
                session.add(cat)
                await session.flush()
            cat_map[c_name] = cat.id_categoria

        # 7. Proveedor de prueba
        prov_q = await session.execute(select(Proveedor).where(Proveedor.nit == "NIT-99887766"))
        prov = prov_q.scalar_one_or_none()
        if not prov:
            prov = Proveedor(razon_social="Spartan Labs Distribuidora S.A.", nit="NIT-99887766")
            session.add(prov)
            await session.flush()

        # 8. Productos de prueba con stock_actual=50, stock_seguridad=10
        productos_seed = [
            ("SKU-WHEY-001", "Proteína Whey 2kg", 350.00, cat_map["SUPLEMENTOS"]),
            ("SKU-CREA-001", "Creatina Monohidratada 300g", 180.00, cat_map["SUPLEMENTOS"]),
            ("SKU-SHIRT-001", "Camiseta Spartan Dry-Fit", 120.00, cat_map["INDUMENTARIA"]),
        ]
        for sku, nombre, precio, cat_id in productos_seed:
            existing = await session.execute(select(Producto).where(Producto.codigo_sku == sku))
            prod = existing.scalar_one_or_none()
            if not prod:
                prod = Producto(
                    id_categoria=cat_id,
                    codigo_sku=sku,
                    nombre_producto=nombre,
                    precio_unitario=precio,
                    stock_actual=50,
                    stock_seguridad=10,
                    estado_activo=True
                )
                session.add(prod)
            else:
                # Asegurar stock requerido para pruebas si ya existía
                prod.stock_actual = 50
                prod.stock_seguridad = 10
        await session.flush()

        # 9. Usuarios (ADMINISTRADOR, CAJERO, CLIENTE) con bcrypt
        rol_admin_id = (await session.execute(select(RolSistema.id_rol).where(RolSistema.nombre_rol == "ADMINISTRADOR"))).scalar_one()
        rol_cajero_id = (await session.execute(select(RolSistema.id_rol).where(RolSistema.nombre_rol == "CAJERO"))).scalar_one()
        rol_cliente_id = (await session.execute(select(RolSistema.id_rol).where(RolSistema.nombre_rol == "CLIENTE"))).scalar_one()
        tipo_doc_id = (await session.execute(select(TipoDocumento.id_tipo_documento).where(TipoDocumento.sigla == "CI"))).scalar_one()
        genero_id = (await session.execute(select(CatalogoGenero.id_genero).where(CatalogoGenero.nombre_genero == "MASCULINO"))).scalar_one()

        hashed_admin_pwd = hash_password(settings.ADMIN_INITIAL_PASSWORD)

        usuarios_seed = [
            ("admin@spartan.dev", "10000001", "Admin", "Spartan", rol_admin_id),
            ("cajero@spartan.dev", "10000002", "Cajero", "Spartan", rol_cajero_id),
            ("cliente@spartan.dev", "10000003", "Cliente", "Spartan", rol_cliente_id),
        ]

        for email, doc_num, nombres, apellidos, rol_id in usuarios_seed:
            existing = await session.execute(select(Usuario).where(Usuario.email == email))
            user = existing.scalar_one_or_none()
            if not user:
                user = Usuario(
                    id_rol=rol_id,
                    id_tipo_documento=tipo_doc_id,
                    id_genero=genero_id,
                    numero_documento=doc_num,
                    nombres=nombres,
                    apellidos=apellidos,
                    email=email,
                    hash_contrasena=hashed_admin_pwd
                )
                session.add(user)
            else:
                user.hash_contrasena = hashed_admin_pwd
                user.id_rol = rol_id

        await session.commit()
        print("SEMILLA DE DATOS COMPLETADA CON ÉXITO.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
