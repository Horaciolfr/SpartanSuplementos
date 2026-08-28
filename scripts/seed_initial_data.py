import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from sqlalchemy import select
from backend.core.database import AsyncSessionLocal, engine
from backend.models.catalogs import RolSistema, TipoDocumento, TipoOperacionKardex, CatalogoSomatotipo, CatalogoGenero
from backend.models.users import Usuario, Proveedor
from backend.models.products import CategoriaProducto, Producto

async def seed():
    async with AsyncSessionLocal() as session:
        # 1. Catálogos
        roles = ["ADMINISTRADOR", "CAJERO", "CLIENTE"]
        for r_name in roles:
            existing = await session.execute(select(RolSistema).where(RolSistema.nombre_rol == r_name))
            if not existing.scalar_one_or_none():
                session.add(RolSistema(nombre_rol=r_name))

        docs = ["CI", "NIT", "PAS"]
        for sigla in docs:
            existing = await session.execute(select(TipoDocumento).where(TipoDocumento.sigla == sigla))
            if not existing.scalar_one_or_none():
                session.add(TipoDocumento(sigla=sigla))

        somatos = ["ECTOMORFO", "MESOMORFO", "ENDOMORFO"]
        for s_name in somatos:
            existing = await session.execute(select(CatalogoSomatotipo).where(CatalogoSomatotipo.nombre_somatotipo == s_name))
            if not existing.scalar_one_or_none():
                session.add(CatalogoSomatotipo(nombre_somatotipo=s_name))

        generos = ["MASCULINO", "FEMENINO", "OTRO"]
        for g_name in generos:
            existing = await session.execute(select(CatalogoGenero).where(CatalogoGenero.nombre_genero == g_name))
            if not existing.scalar_one_or_none():
                session.add(CatalogoGenero(nombre_genero=g_name))

        await session.flush()

        # 2. Categoría y Proveedor
        cat_q = await session.execute(select(CategoriaProducto).where(CategoriaProducto.nombre_categoria == "SUPLEMENTOS PROTEICOS"))
        cat = cat_q.scalar_one_or_none()
        if not cat:
            cat = CategoriaProducto(nombre_categoria="SUPLEMENTOS PROTEICOS")
            session.add(cat)
            await session.flush()

        prov_q = await session.execute(select(Proveedor).where(Proveedor.nit == "NIT-100200300"))
        prov = prov_q.scalar_one_or_none()
        if not prov:
            prov = Proveedor(razon_social="Optimum Nutrition Imports S.A.", nit="NIT-100200300")
            session.add(prov)
            await session.flush()

        # 3. Usuario Cajero / Admin
        user_q = await session.execute(select(Usuario).where(Usuario.numero_documento == "12345678"))
        user = user_q.scalar_one_or_none()
        if not user:
            rol_cajero = (await session.execute(select(RolSistema.id_rol).where(RolSistema.nombre_rol == "CAJERO"))).scalar_one()
            tipo_ci = (await session.execute(select(TipoDocumento.id_tipo_documento).where(TipoDocumento.sigla == "CI"))).scalar_one()
            gen_m = (await session.execute(select(CatalogoGenero.id_genero).where(CatalogoGenero.nombre_genero == "MASCULINO"))).scalar_one()

            user = Usuario(
                id_rol=rol_cajero,
                id_tipo_documento=tipo_ci,
                id_genero=gen_m,
                numero_documento="12345678",
                nombres="Horacio",
                apellidos="Cajero",
                email="cajero@spartan.com",
                hash_contrasena="argon2_hashed_secret_placeholder"
            )
            session.add(user)
            await session.flush()

        # 4. Producto de prueba para pruebas de concurrencia
        prod_q = await session.execute(select(Producto).where(Producto.codigo_sku == "SKU-PROT-WHEY-01"))
        prod = prod_q.scalar_one_or_none()
        if not prod:
            prod = Producto(
                id_categoria=cat.id_categoria,
                codigo_sku="SKU-PROT-WHEY-01",
                nombre_producto="100% Gold Standard Whey 5lb",
                precio_unitario=380.00,
                stock_actual=5000,
                stock_seguridad=50,
                estado_activo=True
            )
            session.add(prod)
            await session.flush()

        await session.commit()
        print("SEMILLA DE DATOS EJECUTADA CORRECTAMENTE")
        print(f"Producto listo para pruebas: SKU='{prod.codigo_sku}', Stock Inicial={prod.stock_actual}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed())
