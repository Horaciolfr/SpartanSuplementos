"""Invariante de una única versión activa por algoritmo.

Revision ID: b240001
Revises: 761ffb34b246
"""

from typing import Sequence, Union

from alembic import op

revision: str = "b240001"
down_revision: Union[str, Sequence[str], None] = "761ffb34b246"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        WITH activas AS (
            SELECT id_version,
                   ROW_NUMBER() OVER (
                       PARTITION BY algoritmo
                       ORDER BY id_version DESC
                   ) AS posicion
            FROM ia.version_modelo_ia
            WHERE aprobado_produccion = TRUE
        )
        UPDATE ia.version_modelo_ia AS v
        SET aprobado_produccion = FALSE
        FROM activas
        WHERE v.id_version = activas.id_version
          AND activas.posicion > 1
    """)
    op.execute("""
        ALTER TABLE ia.version_modelo_ia
        DROP CONSTRAINT IF EXISTS version_modelo_ia_hash_archivo_key
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_version_modelo_ia_activa_algoritmo
        ON ia.version_modelo_ia (algoritmo)
        WHERE aprobado_produccion = TRUE
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS ia.uq_version_modelo_ia_activa_algoritmo
    """)
