import asyncio
import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from sqlalchemy import text
from app.core.database import engine

async def verificar_db():
    async with engine.connect() as conn:
        print("=" * 60)
        print("ESTADO ACTUAL DE LA BASE DE DATOS POSTGRESQL (spartan_db)")
        print("=" * 60)

        # 1. Categorias
        cats = await conn.execute(text("SELECT id_categoria, nombre_categoria FROM erp.categoria_producto ORDER BY id_categoria;"))
        print("\n[1] CATEGORIAS (erp.categoria_producto):")
        for row in cats:
            print(f"    ID {row[0]}: {row[1]}")

        # 2. Productos
        prods = await conn.execute(text("SELECT id_producto, codigo_sku, nombre_producto, precio_unitario, stock_actual, stock_seguridad, estado_activo FROM erp.producto ORDER BY id_producto;"))
        print("\n[2] PRODUCTOS E INVENTARIO (erp.producto):")
        for row in prods:
            print(f"    ID {row[0]} | SKU: {row[1]:<15} | {row[2]:<30} | Bs. {float(row[3]):>6.2f} | Stock: {row[4]:>3} uds | Activo: {row[6]}")

        # 3. Ventas
        ventas = await conn.execute(text("SELECT id_venta, numero_recibo, total_transaccion, estado_pago, fecha_hora_venta FROM erp.venta ORDER BY id_venta DESC LIMIT 10;"))
        print("\n[3] ULTIMAS VENTAS REGISTRADAS (erp.venta):")
        v_list = list(ventas)
        if not v_list:
            print("    (No hay ventas registradas aun)")
        else:
            for row in v_list:
                print(f"    Venta #{row[0]} | Recibo: {row[1]} | Total: Bs. {float(row[2]):.2f} | Estado: {row[3]} | Fecha: {row[4]}")

        # 4. Kardex
        kardex = await conn.execute(text("SELECT id_kardex, id_producto, id_tipo_operacion, cantidad_movimiento, saldo_resultante, id_venta, id_compra, fecha_registro FROM erp.kardex_fisico ORDER BY id_kardex DESC LIMIT 10;"))
        print("\n[4] ULTIMOS ASIENTOS DE KARDEX (erp.kardex_fisico):")
        k_list = list(kardex)
        if not k_list:
            print("    (No hay movimientos en kardex aun)")
        else:
            for row in k_list:
                op = "COMPRA (+)" if row[2] == 1 else "VENTA (-)"
                print(f"    Kardex #{row[0]} | Prod ID: {row[1]} | Operacion: {op} | Cantidad: {row[3]} | Saldo Resultante: {row[4]} uds | Venta: {row[5]}")

        # 5. Usuarios
        users = await conn.execute(text("SELECT u.id_usuario, u.email, u.nombres, u.apellidos, r.nombre_rol FROM erp.usuario u JOIN parametros.rol_sistema r ON u.id_rol = r.id_rol ORDER BY u.id_usuario;"))
        print("\n[5] USUARIOS REGISTRADOS (erp.usuario):")
        for row in users:
            print(f"    ID {row[0]} | Email: {row[1]:<25} | Nombre: {row[2]} {row[3]} | Rol: {row[4]}")

        print("\n" + "=" * 60)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(verificar_db())
