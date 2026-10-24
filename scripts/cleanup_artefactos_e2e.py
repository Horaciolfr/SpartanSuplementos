"""
scripts/cleanup_artefactos_e2e.py
Eliminación transaccional y documentada de artefactos de prueba (E2E / Test)
Respetando estrictamente la política de exclusión de registros de auditoría UX:
IDs protegidos: {13450, 205, 23, 149511, 1319, 1320}
"""
import os
import sys
import asyncio
from datetime import datetime
from sqlalchemy import text

# Add project root to sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.core.database import AsyncSessionLocal, engine

PROTECTED_IDS = {13450, 205, 23, 149511, 1319, 1320}


async def cleanup():
    print("=== INICIANDO LIMPIEZA DE ARTEFACTOS E2E Y PRUEBAS ===")
    
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # 1. Identificar usuarios de prueba
            res_users = await session.execute(text("""
                SELECT id_usuario, email, nombres, apellidos
                FROM erp.usuario
                WHERE (email LIKE '%@test.com' 
                   OR email LIKE 'e2e_%' 
                   OR email LIKE '%_test@%'
                   OR email LIKE '%fsafsa%')
                  AND id_usuario NOT IN (13450, 205, 23, 149511, 1319, 1320)
                ORDER BY id_usuario;
            """))
            target_users = res_users.fetchall()
            target_user_ids = [u[0] for u in target_users]
            
            print(f"Usuarios de prueba identificados ({len(target_user_ids)}): {target_user_ids}")
            
            # 2. Identificar ventas de prueba (por cliente de prueba o recibo de prueba)
            res_ventas = await session.execute(text("""
                SELECT id_venta, numero_recibo, id_cliente
                FROM erp.venta
                WHERE (id_cliente = ANY(:user_ids)
                   OR numero_recibo LIKE 'e2e_%'
                   OR numero_recibo LIKE 'REC-E2E%')
                  AND id_venta NOT IN (13450, 205, 23, 149511, 1319, 1320)
                ORDER BY id_venta;
            """), {"user_ids": target_user_ids if target_user_ids else [-1]})
            target_ventas = res_ventas.fetchall()
            target_venta_ids = [v[0] for v in target_ventas]
            print(f"Ventas de prueba identificadas ({len(target_venta_ids)}): {target_venta_ids}")

            # 3. Identificar perfiles biométricos de prueba
            res_perfiles = await session.execute(text("""
                SELECT id_perfil, id_usuario
                FROM ia.perfil_biometrico
                WHERE id_usuario = ANY(:user_ids)
                  AND id_perfil NOT IN (13450, 205, 23, 149511, 1319, 1320)
                ORDER BY id_perfil;
            """), {"user_ids": target_user_ids if target_user_ids else [-1]})
            target_perfiles = res_perfiles.fetchall()
            target_perfil_ids = [p[0] for p in target_perfiles]
            print(f"Perfiles biométricos de prueba identificados ({len(target_perfil_ids)}): {target_perfil_ids}")

            # 4. Identificar prescripciones de prueba
            res_presc = await session.execute(text("""
                SELECT id_prescripcion, id_perfil, id_venta_efectiva
                FROM ia.prescripcion_crossselling
                WHERE (id_perfil = ANY(:perfil_ids)
                   OR id_venta_efectiva = ANY(:venta_ids))
                  AND id_prescripcion NOT IN (13450, 205, 23, 149511, 1319, 1320)
                ORDER BY id_prescripcion;
            """), {
                "perfil_ids": target_perfil_ids if target_perfil_ids else [-1],
                "venta_ids": target_venta_ids if target_venta_ids else [-1]
            })
            target_presc = res_presc.fetchall()
            target_presc_ids = [pr[0] for pr in target_presc]
            print(f"Prescripciones de prueba identificadas ({len(target_presc_ids)}): {target_presc_ids}")

            # 5. Identificar kárdex físico de prueba
            res_kardex = await session.execute(text("""
                SELECT id_kardex, id_venta
                FROM erp.kardex_fisico
                WHERE id_venta = ANY(:venta_ids)
                  AND id_kardex NOT IN (13450, 205, 23, 149511, 1319, 1320)
                ORDER BY id_kardex;
            """), {"venta_ids": target_venta_ids if target_venta_ids else [-1]})
            target_kardex = res_kardex.fetchall()
            target_kardex_ids = [k[0] for k in target_kardex]
            print(f"Asientos de kárdex de prueba identificados ({len(target_kardex_ids)}): {target_kardex_ids}")

            # 6. Identificar detalle venta de prueba
            res_detalles = await session.execute(text("""
                SELECT id_detalle_venta, id_venta
                FROM erp.detalle_venta
                WHERE id_venta = ANY(:venta_ids)
                ORDER BY id_detalle_venta;
            """), {"venta_ids": target_venta_ids if target_venta_ids else [-1]})
            target_detalles = res_detalles.fetchall()
            target_detalle_ids = [d[0] for d in target_detalles]
            print(f"Detalles de venta de prueba identificados ({len(target_detalle_ids)}): {target_detalle_ids}")

            # VERIFICACIÓN ESTRICTA DE IDs PROTEGIDOS
            all_candidate_ids = set(target_user_ids + target_venta_ids + target_perfil_ids + 
                                    target_presc_ids + target_kardex_ids)
            intersection = all_candidate_ids.intersection(PROTECTED_IDS)
            if intersection:
                raise RuntimeError(f"¡ABORTANDO! Violación de política de exclusión. Se detectaron IDs protegidos: {intersection}")

            # EJECUCIÓN EN ORDEN DE CADENA FK
            # A. Desvincular id_venta_efectiva de prescripciones que no se van a eliminar
            if target_venta_ids:
                await session.execute(text("""
                    UPDATE ia.prescripcion_crossselling
                    SET id_venta_efectiva = NULL
                    WHERE id_venta_efectiva = ANY(:venta_ids);
                """), {"venta_ids": target_venta_ids})

            # B. Eliminar prescripciones
            if target_presc_ids:
                await session.execute(text("""
                    DELETE FROM ia.prescripcion_crossselling
                    WHERE id_prescripcion = ANY(:presc_ids);
                """), {"presc_ids": target_presc_ids})

            # C. Eliminar kárdex físico
            if target_kardex_ids:
                await session.execute(text("""
                    DELETE FROM erp.kardex_fisico
                    WHERE id_kardex = ANY(:kardex_ids);
                """), {"kardex_ids": target_kardex_ids})

            # D. Eliminar detalle de venta
            if target_detalle_ids:
                await session.execute(text("""
                    DELETE FROM erp.detalle_venta
                    WHERE id_detalle_venta = ANY(:detalle_ids);
                """), {"detalle_ids": target_detalle_ids})

            # E. Eliminar ventas
            if target_venta_ids:
                await session.execute(text("""
                    DELETE FROM erp.venta
                    WHERE id_venta = ANY(:venta_ids);
                """), {"venta_ids": target_venta_ids})

            # F. Eliminar perfiles biométricos
            if target_perfil_ids:
                await session.execute(text("""
                    DELETE FROM ia.perfil_biometrico
                    WHERE id_perfil = ANY(:perfil_ids);
                """), {"perfil_ids": target_perfil_ids})

            # G. Eliminar usuarios
            if target_user_ids:
                await session.execute(text("""
                    DELETE FROM erp.usuario
                    WHERE id_usuario = ANY(:user_ids);
                """), {"user_ids": target_user_ids})

    print("Transacción completada con éxito.")

    # REGISTRAR EN data/MANIFIESTO.md
    manifiesto_path = os.path.join(project_root, "data", "MANIFIESTO.md")
    timestamp = datetime.now().isoformat()
    registro_md = f"""
## Registro de Limpieza de Artefactos E2E (Paso 3 / V-09 — {timestamp})

En cumplimiento del aislamiento estricto de datos de prueba y preservando los IDs protegidos `[13450, 205, 23, 149511, 1319, 1320]`, se eliminaron los siguientes registros transaccionales:

- **Usuarios eliminados ({len(target_user_ids)})**:
  `{target_user_ids}`
  (Emails: `{[u[1] for u in target_users]}`)
- **Ventas eliminadas ({len(target_venta_ids)})**:
  `{target_venta_ids}`
  (Recibos: `{[v[1] for v in target_ventas]}`)
- **Perfiles biométricos eliminados ({len(target_perfil_ids)})**:
  `{target_perfil_ids}`
- **Prescripciones eliminadas ({len(target_presc_ids)})**:
  `{target_presc_ids}`
- **Asientos de kárdex eliminados ({len(target_kardex_ids)})**:
  `{target_kardex_ids}`
- **Detalles de venta eliminados ({len(target_detalle_ids)})**:
  `{target_detalle_ids}`
"""
    with open(manifiesto_path, "a", encoding="utf-8") as f:
        f.write(registro_md)

    print(f"Registro documentado en {manifiesto_path}.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(cleanup())
