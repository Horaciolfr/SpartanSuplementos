"""
Manejador de Persistencia Transaccional Exclusivo para el Esquema IA (asyncpg).

REGLA ARQUITECTÓNICA 2.1:
La escritura en el esquema `ia` (tabla `ia.perfil_biometrico`) es EXCLUSIVA de este microservicio.
El Gateway ERP jamás escribe en el esquema `ia`.
Este módulo gestiona la conexión asyncpg nativa directa y ejecuta inserciones atómicas ACID.
"""

import json
import logging
from typing import Optional, Dict, Any
import asyncpg
from .config import settings

logger = logging.getLogger("services.ia.db")

_pool: Optional[asyncpg.Pool] = None


def get_db_dsn() -> str:
    """Obtiene y normaliza el DSN de conexión para asyncpg (removiendo +asyncpg de SQLAlchemy)."""
    raw_url = settings.DATABASE_URL
    dsn = raw_url.replace("postgresql+asyncpg://", "postgresql://")
    return dsn


async def get_db_pool() -> asyncpg.Pool:
    """Obtiene o inicializa el pool de conexiones asyncpg para services/ia."""
    global _pool
    if _pool is None:
        dsn = get_db_dsn()
        try:
            _pool = await asyncpg.create_pool(dsn=dsn, min_size=1, max_size=5)
        except Exception as e:
            # Fallback en entorno local si el puerto mapeado es 5433
            if ":5432/" in dsn:
                fallback_dsn = dsn.replace(":5432/", ":5433/")
                try:
                    _pool = await asyncpg.create_pool(dsn=fallback_dsn, min_size=1, max_size=5)
                except Exception:
                    raise e
            else:
                raise e
    return _pool


async def close_db_pool():
    """Cierra el pool de conexiones al finalizar el ciclo de vida del servicio."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def guardar_perfil_biometrico(
    id_usuario: int,
    somatotipo_nombre: str,
    coordenadas_espaciales: Dict[str, Any],
    precision_captura: float,
    estatura_cm: float,
    peso_kg: float,
) -> int:
    """
    Inserta de forma atómica en una única transacción:
    1. Lookup de id_somatotipo en parametros.catalogo_somatotipo.
    2. INSERT en ia.perfil_biometrico con coordinates espaciales JSONB.
    Retorna el id_perfil generado.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 1. Lookup id_somatotipo
            row_somatotipo = await conn.fetchrow(
                "SELECT id_somatotipo FROM parametros.catalogo_somatotipo WHERE UPPER(nombre_somatotipo) = UPPER($1)",
                somatotipo_nombre.strip()
            )
            id_somatotipo = row_somatotipo["id_somatotipo"] if row_somatotipo else None

            # 2. Insert en ia.perfil_biometrico
            row_perfil = await conn.fetchrow(
                """
                INSERT INTO ia.perfil_biometrico (
                    id_usuario,
                    id_somatotipo,
                    coordenadas_espaciales,
                    precision_captura,
                    estatura_cm,
                    peso_kg,
                    fecha_captura
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
                RETURNING id_perfil
                """,
                int(id_usuario),
                id_somatotipo,
                json.dumps(coordenadas_espaciales),
                float(precision_captura),
                float(estatura_cm),
                float(peso_kg)
            )

            if not row_perfil:
                raise RuntimeError("No se pudo obtener el id_perfil tras la inserción.")

            return int(row_perfil["id_perfil"])


async def obtener_perfil_por_id(id_perfil: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene la fila completa de ia.perfil_biometrico + nombre_somatotipo
    mediante JOIN con parametros.catalogo_somatotipo.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                p.id_perfil,
                p.id_usuario,
                p.id_somatotipo,
                s.nombre_somatotipo,
                p.coordenadas_espaciales,
                p.precision_captura,
                p.estatura_cm,
                p.peso_kg,
                p.fecha_captura
            FROM ia.perfil_biometrico p
            LEFT JOIN parametros.catalogo_somatotipo s
                ON p.id_somatotipo = s.id_somatotipo
            WHERE p.id_perfil = $1
            """,
            int(id_perfil)
        )
        if not row:
            return None
        res = dict(row)
        if isinstance(res.get("coordenadas_espaciales"), str):
            res["coordenadas_espaciales"] = json.loads(res["coordenadas_espaciales"])
        return res


async def listar_perfiles_paginados(
    usuario_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> list:
    """
    Historial paginado ordenado por fecha_captura DESC.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        if usuario_id is not None:
            rows = await conn.fetch(
                """
                SELECT
                    p.id_perfil,
                    p.id_usuario,
                    p.id_somatotipo,
                    s.nombre_somatotipo,
                    p.coordenadas_espaciales,
                    p.precision_captura,
                    p.estatura_cm,
                    p.peso_kg,
                    p.fecha_captura
                FROM ia.perfil_biometrico p
                LEFT JOIN parametros.catalogo_somatotipo s
                    ON p.id_somatotipo = s.id_somatotipo
                WHERE p.id_usuario = $1
                ORDER BY p.fecha_captura DESC
                LIMIT $2 OFFSET $3
                """,
                int(usuario_id),
                int(limit),
                int(offset)
            )
        else:
            rows = await conn.fetch(
                """
                SELECT
                    p.id_perfil,
                    p.id_usuario,
                    p.id_somatotipo,
                    s.nombre_somatotipo,
                    p.coordenadas_espaciales,
                    p.precision_captura,
                    p.estatura_cm,
                    p.peso_kg,
                    p.fecha_captura
                FROM ia.perfil_biometrico p
                LEFT JOIN parametros.catalogo_somatotipo s
                    ON p.id_somatotipo = s.id_somatotipo
                ORDER BY p.fecha_captura DESC
                LIMIT $1 OFFSET $2
                """,
                int(limit),
                int(offset)
            )

        resultado = []
        for r in rows:
            item = dict(r)
            if isinstance(item.get("coordenadas_espaciales"), str):
                item["coordenadas_espaciales"] = json.loads(item["coordenadas_espaciales"])
            resultado.append(item)
        return resultado


async def buscar_perfiles_gin(
    nombre_landmark: str,
    min_visibility: float = 0.0,
    usuario_id: Optional[int] = None,
) -> list:
    """
    Busca perfiles utilizando el operador de contención GIN (@>) y filtrando
    por el valor mínimo de visibility en el elemento correspondiente.
    """
    pattern = json.dumps({"landmarks": [{"nombre": nombre_landmark.strip()}]})
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        query = """
            SELECT
                p.id_perfil,
                p.id_usuario,
                p.id_somatotipo,
                s.nombre_somatotipo,
                p.coordenadas_espaciales,
                p.precision_captura,
                p.estatura_cm,
                p.peso_kg,
                p.fecha_captura
            FROM ia.perfil_biometrico p
            LEFT JOIN parametros.catalogo_somatotipo s
                ON p.id_somatotipo = s.id_somatotipo
            WHERE p.coordenadas_espaciales @> $1::jsonb
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(p.coordenadas_espaciales->'landmarks') AS lm
                WHERE lm->>'nombre' = $2
                AND CAST(lm->>'visibility' AS float) >= $3
            )
            AND ($4::bigint IS NULL OR p.id_usuario = $4)
            ORDER BY p.fecha_captura DESC
            LIMIT 25
            """
        rows = await conn.fetch(
            query,
            pattern,
            nombre_landmark.strip(),
            float(min_visibility),
            int(usuario_id) if usuario_id is not None else None,
        )

        resultado = []
        for r in rows:
            item = dict(r)
            if isinstance(item.get("coordenadas_espaciales"), str):
                item["coordenadas_espaciales"] = json.loads(item["coordenadas_espaciales"])
            resultado.append(item)
        return resultado


async def obtener_rol_usuario(id_usuario: int) -> Optional[str]:
    """Obtiene el nombre_rol de erp.usuario JOIN parametros.rol_sistema."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rol = await conn.fetchval(
            """
            SELECT r.nombre_rol
            FROM erp.usuario u
            JOIN parametros.rol_sistema r ON u.id_rol = r.id_rol
            WHERE u.id_usuario = $1
            """,
            int(id_usuario)
        )
        return rol


async def obtener_prescripcion_lectura(
    id_perfil: int,
    requester_user_id: int,
    requester_role: str,
) -> Dict[str, Any]:
    """
    Consulta estrictamente idempotente de prescripciones (F-04).
    Solo lectura. No ejecuta inferencia CART ni muta ia.prescripcion_crossselling.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # 1. Verificar perfil y RBAC
        perfil = await conn.fetchrow(
            """
            SELECT p.id_perfil, p.id_usuario, p.id_somatotipo, s.nombre_somatotipo,
                   p.precision_captura, p.fecha_captura,
                   u.nombres, u.apellidos, u.objetivo
            FROM ia.perfil_biometrico p
            LEFT JOIN parametros.catalogo_somatotipo s ON p.id_somatotipo = s.id_somatotipo
            LEFT JOIN erp.usuario u ON p.id_usuario = u.id_usuario
            WHERE p.id_perfil = $1
            """,
            int(id_perfil),
        )
        if not perfil:
            raise RuntimeError(f"Perfil biometrico {id_perfil} no encontrado.")

        if requester_role.upper() != "ADMINISTRADOR" and perfil["id_usuario"] != requester_user_id:
            raise PermissionError("Acceso no autorizado al perfil biometrico ajeno.")

        somatotipo_nombre = (perfil["nombre_somatotipo"] or "").strip().upper()

        # 2. Consultar prescripciones registradas existentes
        existentes = await conn.fetch(
            """
            SELECT pr.id_prescripcion, pr.id_perfil, pr.id_producto, pr.id_regla_aplicada,
                   pr.id_venta_efectiva, pr.estado_conversion, pr.fecha_prescripcion,
                   p.nombre_producto, p.codigo_sku, p.precio_unitario, p.stock_actual,
                   r.codigo_regla, r.descripcion_tecnica, r.umbral_decision
            FROM ia.prescripcion_crossselling pr
            JOIN erp.producto p ON pr.id_producto = p.id_producto
            LEFT JOIN ia.regla_inferencia_cart r ON pr.id_regla_aplicada = r.id_regla
            WHERE pr.id_perfil = $1
            ORDER BY pr.id_prescripcion ASC
            """,
            int(id_perfil),
        )

        items = []
        for r in existentes:
            items.append({
                "id_prescripcion": r["id_prescripcion"],
                "id_producto": r["id_producto"],
                "codigo_sku": r["codigo_sku"],
                "nombre_producto": r["nombre_producto"],
                "precio_unitario": float(r["precio_unitario"]),
                "stock_actual": r["stock_actual"],
                "id_regla_aplicada": r["id_regla_aplicada"],
                "codigo_regla": r["codigo_regla"],
                "descripcion_tecnica": r["descripcion_tecnica"],
                "umbral_decision": float(r["umbral_decision"]) if r["umbral_decision"] is not None else None,
                "estado_conversion": bool(r["estado_conversion"]),
                "id_venta_efectiva": r["id_venta_efectiva"],
                "fecha_prescripcion": r["fecha_prescripcion"].isoformat() if r["fecha_prescripcion"] else None,
            })

        nombre_cliente = f"{perfil['nombres'] or ''} {perfil['apellidos'] or ''}".strip()
        fecha_captura_iso = perfil["fecha_captura"].isoformat() if perfil["fecha_captura"] else None

        return {
            "id_perfil": perfil["id_perfil"],
            "id_usuario": perfil["id_usuario"],
            "nombre_cliente": nombre_cliente if nombre_cliente else "Cliente Spartan",
            "fecha_captura": fecha_captura_iso,
            "somatotipo": somatotipo_nombre,
            "objetivo": perfil["objetivo"],
            "precision_captura": float(perfil["precision_captura"]) if perfil["precision_captura"] is not None else None,
            "prescripciones": items,
        }


async def generar_prescripcion(
    id_perfil: int,
    requester_user_id: int,
    requester_role: str,
) -> Dict[str, Any]:
    """
    Motor de Prescripción Cross-Selling Inteligente CART (Tarea 14 / F-04).
    Aplica reglas CART de la versión activa en producción y persiste las recomendaciones.
    """
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # 1. Verificar perfil y RBAC
        perfil = await conn.fetchrow(
            """
            SELECT p.id_perfil, p.id_usuario, p.id_somatotipo, s.nombre_somatotipo,
                   p.precision_captura, p.fecha_captura,
                   u.nombres, u.apellidos, u.objetivo
            FROM ia.perfil_biometrico p
            LEFT JOIN parametros.catalogo_somatotipo s ON p.id_somatotipo = s.id_somatotipo
            LEFT JOIN erp.usuario u ON p.id_usuario = u.id_usuario
            WHERE p.id_perfil = $1
            """,
            int(id_perfil),
        )
        if not perfil:
            raise RuntimeError(f"Perfil biometrico {id_perfil} no encontrado.")

        if requester_role.upper() != "ADMINISTRADOR" and perfil["id_usuario"] != requester_user_id:
            raise PermissionError("Acceso no autorizado al perfil biometrico ajeno.")

        somatotipo_nombre = (perfil["nombre_somatotipo"] or "").strip().upper()

        # Consultar existentes antes de regenerar
        existentes = await conn.fetch(
            "SELECT id_prescripcion FROM ia.prescripcion_crossselling WHERE id_perfil = $1",
            int(id_perfil)
        )

        # 3. Resolver versión activa
        id_version_activa = await conn.fetchval(
            """
            SELECT id_version
            FROM ia.version_modelo_ia
            WHERE algoritmo = 'CART_CROSSSELLING'
              AND aprobado_produccion = TRUE
            ORDER BY id_version DESC
            LIMIT 1
            """
        )
        if not id_version_activa:
            raise RuntimeError("No existe una version aprobada en produccion de CART_CROSSSELLING.")

        # 4. Obtener reglas CART aprobadas
        reglas = await conn.fetch(
            """
            SELECT id_regla, codigo_regla, descripcion_tecnica, umbral_decision
            FROM ia.regla_inferencia_cart
            WHERE id_version = $1
            ORDER BY umbral_decision DESC, id_regla ASC
            """,
            id_version_activa,
        )

        # 5. Obtener mapeo de categorias
        cat_rows = await conn.fetch("SELECT id_categoria, nombre_categoria FROM erp.categoria_producto")

        def cat_matches(token: str, nom_cat: str) -> bool:
            t = token.upper()
            n = nom_cat.upper()
            if t == "INDUMENTARIA":
                return "INDUMENTARIA" in n
            if t == "CREATINA":
                return "CREATIN" in n
            if t == "QUEMADORES":
                return "QUEMADOR" in n
            if t == "MASS_GAINER":
                return "GANADOR" in n or "MASS" in n
            if t == "PROTEINAS":
                return "PROTEIC" in n or "WHEY" in n
            return t in n

        recomendaciones_candidatas = []
        productos_usados = set()

        for reg in reglas:
            desc = reg["descripcion_tecnica"] or ""
            if "SI" not in desc or "ENTONCES" not in desc:
                continue
            antecedente = desc.split("SI", 1)[1].split("ENTONCES", 1)[0].strip()
            condiciones = [c.strip() for c in antecedente.split(" Y ") if c.strip()]

            soma_cumple = True
            cats_in = []
            cats_not_in = []

            for cond in condiciones:
                if cond.startswith("somatotipo="):
                    val = cond.split("somatotipo=", 1)[1].strip().upper()
                    if somatotipo_nombre != val:
                        soma_cumple = False
                        break
                elif cond.startswith("somatotipo!="):
                    val = cond.split("somatotipo!=", 1)[1].strip().upper()
                    if somatotipo_nombre == val:
                        soma_cumple = False
                        break
                elif cond.startswith("categoria="):
                    val = cond.split("categoria=", 1)[1].strip().upper()
                    cats_in.append(val)
                elif cond.startswith("categoria!="):
                    val = cond.split("categoria!=", 1)[1].strip().upper()
                    cats_not_in.append(val)

            if not soma_cumple:
                continue

            cat_ids_permitidas = []
            for cr in cat_rows:
                cid = cr["id_categoria"]
                cnom = cr["nombre_categoria"]
                if cats_in and not any(cat_matches(t, cnom) for t in cats_in):
                    continue
                if any(cat_matches(t, cnom) for t in cats_not_in):
                    continue
                cat_ids_permitidas.append(cid)

            if not cat_ids_permitidas:
                continue

            query_prod = """
                SELECT p.id_producto, p.nombre_producto, p.codigo_sku, p.precio_unitario, p.stock_actual
                FROM erp.producto p
                JOIN erp.categoria_producto c ON p.id_categoria = c.id_categoria
                WHERE p.estado_activo = TRUE
                  AND p.stock_actual > 0
                  AND p.id_categoria = ANY($1::int[])
                  AND NOT (p.id_producto = ANY($2::int[]))
                ORDER BY p.stock_actual DESC, p.id_producto ASC
                LIMIT 1
            """
            prod_row = await conn.fetchrow(
                query_prod,
                cat_ids_permitidas,
                list(productos_usados) if productos_usados else [0],
            )
            if prod_row:
                productos_usados.add(prod_row["id_producto"])
                recomendaciones_candidatas.append({
                    "producto": prod_row,
                    "regla": reg,
                })
                if len(recomendaciones_candidatas) >= 3:
                    break

        # 6. Limpiar no convertidas si existen previas (respetando exclusion de registros de auditoria)
        if existentes:
            await conn.execute(
                """
                DELETE FROM ia.prescripcion_crossselling
                WHERE id_perfil = $1
                  AND id_venta_efectiva IS NULL
                  AND id_prescripcion NOT IN (1319, 1320)
                """,
                int(id_perfil),
            )

        # 7. Persistir en ia.prescripcion_crossselling
        items_persistidos = []
        for rec in recomendaciones_candidatas:
            p = rec["producto"]
            r = rec["regla"]
            row_ins = await conn.fetchrow(
                """
                INSERT INTO ia.prescripcion_crossselling (
                    id_perfil, id_producto, id_regla_aplicada, fecha_prescripcion
                ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                RETURNING id_prescripcion, fecha_prescripcion, estado_conversion, id_venta_efectiva
                """,
                int(id_perfil),
                p["id_producto"],
                r["id_regla"],
            )
            items_persistidos.append({
                "id_prescripcion": row_ins["id_prescripcion"],
                "id_producto": p["id_producto"],
                "codigo_sku": p["codigo_sku"],
                "nombre_producto": p["nombre_producto"],
                "precio_unitario": float(p["precio_unitario"]),
                "stock_actual": p["stock_actual"],
                "id_regla_aplicada": r["id_regla"],
                "codigo_regla": r["codigo_regla"],
                "descripcion_tecnica": r["descripcion_tecnica"],
                "umbral_decision": float(r["umbral_decision"]) if r["umbral_decision"] is not None else None,
                "estado_conversion": bool(row_ins["estado_conversion"]),
                "id_venta_efectiva": row_ins["id_venta_efectiva"],
                "fecha_prescripcion": row_ins["fecha_prescripcion"].isoformat() if row_ins["fecha_prescripcion"] else None,
            })

        nombre_cliente = f"{perfil['nombres'] or ''} {perfil['apellidos'] or ''}".strip()
        fecha_captura_iso = perfil["fecha_captura"].isoformat() if perfil["fecha_captura"] else None

        return {
            "id_perfil": perfil["id_perfil"],
            "id_usuario": perfil["id_usuario"],
            "nombre_cliente": nombre_cliente if nombre_cliente else "Cliente Spartan",
            "fecha_captura": fecha_captura_iso,
            "somatotipo": somatotipo_nombre,
            "objetivo": perfil["objetivo"],
            "precision_captura": float(perfil["precision_captura"]) if perfil["precision_captura"] is not None else None,
            "prescripciones": items_persistidos,
        }


async def obtener_o_generar_prescripcion(
    id_perfil: int,
    requester_user_id: int,
    requester_role: str,
    regenerar: bool = False,
) -> Dict[str, Any]:
    """Funcion de compatibilidad: invoca lectura o generacion segun flag."""
    if regenerar:
        return await generar_prescripcion(id_perfil, requester_user_id, requester_role)
    lectura = await obtener_prescripcion_lectura(id_perfil, requester_user_id, requester_role)
    if lectura["prescripciones"]:
        return lectura
    return await generar_prescripcion(id_perfil, requester_user_id, requester_role)

