"""Consultas canónicas para resolver la versión activa de los modelos de IA."""

from typing import Any, Mapping, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


ACTIVE_VERSION_SQL = text("""
    SELECT id_version, algoritmo, hash_archivo, metric_accuracy, metric_rmse,
           fecha_entrenamiento
    FROM ia.version_modelo_ia
    WHERE algoritmo = :algoritmo
      AND aprobado_produccion = TRUE
    ORDER BY id_version DESC
    LIMIT 1
""")


async def obtener_version_activa(
    db: AsyncSession,
    algoritmo: str,
) -> Optional[Mapping[str, Any]]:
    """Devuelve exclusivamente la versión aprobada más reciente del algoritmo."""
    result = await db.execute(ACTIVE_VERSION_SQL, {"algoritmo": algoritmo})
    return result.mappings().first()


async def obtener_reglas_prescripcion_activas(db: AsyncSession):
    """Carga reglas CART vinculadas a la única versión activa de prescripción."""
    result = await db.execute(
        text("""
            SELECT r.id_regla, r.codigo_regla, r.descripcion_tecnica,
                   r.umbral_decision, r.id_version
            FROM ia.regla_inferencia_cart AS r
            JOIN (
                SELECT id_version
                FROM ia.version_modelo_ia
                WHERE algoritmo = :algoritmo
                  AND aprobado_produccion = TRUE
                ORDER BY id_version DESC
                LIMIT 1
            ) AS activa ON activa.id_version = r.id_version
            ORDER BY r.id_regla
        """),
        {"algoritmo": "CART_CROSSSELLING"},
    )
    return result.mappings().all()
