import asyncio
import os
import sys

# Ensure root is on path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from sqlalchemy import text
from app.core.database import engine

async def export_seed():
    output_path = os.path.join(root_dir, 'docker', 'postgres', '02_seed_data.sql')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    async with engine.connect() as conn:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('-- ==========================================================\n')
            f.write('-- SPARTAN SUPLEMENTOS BOLIVIA — DATOS INICIALES (SEED)\n')
            f.write('-- ==========================================================\n\n')

            # 1. parametros.rol_sistema
            rows = await conn.execute(text('SELECT id_rol, nombre_rol FROM parametros.rol_sistema ORDER BY id_rol'))
            for r in rows:
                f.write(f"INSERT INTO parametros.rol_sistema (id_rol, nombre_rol) VALUES ({r[0]}, '{r[1]}') ON CONFLICT (id_rol) DO NOTHING;\n")
            f.write("SELECT setval('parametros.rol_sistema_id_rol_seq', COALESCE((SELECT MAX(id_rol) FROM parametros.rol_sistema), 1));\n\n")

            # 2. parametros.tipo_documento
            rows = await conn.execute(text('SELECT id_tipo_documento, sigla FROM parametros.tipo_documento ORDER BY id_tipo_documento'))
            for r in rows:
                f.write(f"INSERT INTO parametros.tipo_documento (id_tipo_documento, sigla) VALUES ({r[0]}, '{r[1]}') ON CONFLICT (id_tipo_documento) DO NOTHING;\n")
            f.write("SELECT setval('parametros.tipo_documento_id_tipo_documento_seq', COALESCE((SELECT MAX(id_tipo_documento) FROM parametros.tipo_documento), 1));\n\n")

            # 3. parametros.tipo_operacion_kardex
            rows = await conn.execute(text('SELECT id_tipo_operacion, nombre_operacion, multiplicador FROM parametros.tipo_operacion_kardex ORDER BY id_tipo_operacion'))
            for r in rows:
                f.write(f"INSERT INTO parametros.tipo_operacion_kardex (id_tipo_operacion, nombre_operacion, multiplicador) VALUES ({r[0]}, '{r[1]}', {r[2]}) ON CONFLICT (id_tipo_operacion) DO NOTHING;\n")
            f.write("SELECT setval('parametros.tipo_operacion_kardex_id_tipo_operacion_seq', COALESCE((SELECT MAX(id_tipo_operacion) FROM parametros.tipo_operacion_kardex), 1));\n\n")

            # 4. parametros.catalogo_somatotipo
            rows = await conn.execute(text('SELECT id_somatotipo, nombre_somatotipo FROM parametros.catalogo_somatotipo ORDER BY id_somatotipo'))
            for r in rows:
                f.write(f"INSERT INTO parametros.catalogo_somatotipo (id_somatotipo, nombre_somatotipo) VALUES ({r[0]}, '{r[1]}') ON CONFLICT (id_somatotipo) DO NOTHING;\n")
            f.write("SELECT setval('parametros.catalogo_somatotipo_id_somatotipo_seq', COALESCE((SELECT MAX(id_somatotipo) FROM parametros.catalogo_somatotipo), 1));\n\n")

            # 5. parametros.catalogo_genero
            rows = await conn.execute(text('SELECT id_genero, nombre_genero FROM parametros.catalogo_genero ORDER BY id_genero'))
            for r in rows:
                f.write(f"INSERT INTO parametros.catalogo_genero (id_genero, nombre_genero) VALUES ({r[0]}, '{r[1]}') ON CONFLICT (id_genero) DO NOTHING;\n")
            f.write("SELECT setval('parametros.catalogo_genero_id_genero_seq', COALESCE((SELECT MAX(id_genero) FROM parametros.catalogo_genero), 1));\n\n")

            # 6. erp.categoria_producto
            rows = await conn.execute(text('SELECT id_categoria, nombre_categoria FROM erp.categoria_producto ORDER BY id_categoria'))
            for r in rows:
                name_esc = r[1].replace("'", "''")
                f.write(f"INSERT INTO erp.categoria_producto (id_categoria, nombre_categoria) VALUES ({r[0]}, '{name_esc}') ON CONFLICT (id_categoria) DO NOTHING;\n")
            f.write("SELECT setval('erp.categoria_producto_id_categoria_seq', COALESCE((SELECT MAX(id_categoria) FROM erp.categoria_producto), 1));\n\n")

            # 7. erp.proveedor
            rows = await conn.execute(text('SELECT id_proveedor, razon_social, nit FROM erp.proveedor ORDER BY id_proveedor'))
            for r in rows:
                rz_esc = r[1].replace("'", "''")
                f.write(f"INSERT INTO erp.proveedor (id_proveedor, razon_social, nit) VALUES ({r[0]}, '{rz_esc}', '{r[2]}') ON CONFLICT (id_proveedor) DO NOTHING;\n")
            f.write("SELECT setval('erp.proveedor_id_proveedor_seq', COALESCE((SELECT MAX(id_proveedor) FROM erp.proveedor), 1));\n\n")

            # 8. erp.usuario
            rows = await conn.execute(text('SELECT id_usuario, id_rol, id_tipo_documento, id_genero, numero_documento, nombres, apellidos, email, hash_contrasena FROM erp.usuario ORDER BY id_usuario'))
            for r in rows:
                gen_val = f"{r[3]}" if r[3] is not None else 'NULL'
                nom_esc = r[5].replace("'", "''")
                ape_esc = r[6].replace("'", "''")
                f.write(f"INSERT INTO erp.usuario (id_usuario, id_rol, id_tipo_documento, id_genero, numero_documento, nombres, apellidos, email, hash_contrasena) VALUES ({r[0]}, {r[1]}, {r[2]}, {gen_val}, '{r[4]}', '{nom_esc}', '{ape_esc}', '{r[7]}', '{r[8]}') ON CONFLICT (id_usuario) DO NOTHING;\n")
            f.write("SELECT setval('erp.usuario_id_usuario_seq', COALESCE((SELECT MAX(id_usuario) FROM erp.usuario), 1));\n\n")

            # 9. erp.producto
            rows = await conn.execute(text('SELECT id_producto, id_categoria, codigo_sku, nombre_producto, precio_unitario, stock_actual, stock_seguridad, estado_activo, imagen_url, descripcion FROM erp.producto ORDER BY id_producto'))
            count_prods = 0
            for r in rows:
                sku_esc = r[2].replace("'", "''")
                nom_esc = r[3].replace("'", "''")
                img_esc = f"'{r[8]}'" if r[8] else 'NULL'
                clean_desc = r[9].replace("'", "''") if r[9] else None
                desc_esc = f"'{clean_desc}'" if clean_desc else 'NULL'
                f.write(f"INSERT INTO erp.producto (id_producto, id_categoria, codigo_sku, nombre_producto, precio_unitario, stock_actual, stock_seguridad, estado_activo, imagen_url, descripcion) VALUES ({r[0]}, {r[1]}, '{sku_esc}', '{nom_esc}', {r[4]}, {r[5]}, {r[6]}, {str(r[7]).upper()}, {img_esc}, {desc_esc}) ON CONFLICT (id_producto) DO NOTHING;\n")
                count_prods += 1
            f.write("SELECT setval('erp.producto_id_producto_seq', COALESCE((SELECT MAX(id_producto) FROM erp.producto), 1));\n\n")

        print(f'02_seed_data.sql generado con éxito con {count_prods} productos!')

if __name__ == '__main__':
    asyncio.run(export_seed())
