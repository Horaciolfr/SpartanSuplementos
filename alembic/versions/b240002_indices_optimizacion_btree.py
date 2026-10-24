"""Indices B-tree de optimizacion transaccional (Tarea 15).

Revision ID: b240002
Revises: b240001
"""

from typing import Sequence, Union
from alembic import op

revision: str = "b240002"
down_revision: Union[str, Sequence[str], None] = "b240001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. erp.detalle_venta(id_venta)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_erp_detalle_venta_venta
        ON erp.detalle_venta (id_venta)
    """)
    # 2. erp.detalle_venta(id_producto)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_erp_detalle_venta_producto
        ON erp.detalle_venta (id_producto)
    """)
    # 3. erp.kardex_fisico(id_producto, fecha_registro DESC)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_erp_kardex_producto_fecha_desc
        ON erp.kardex_fisico (id_producto, fecha_registro DESC)
    """)
    # 4. erp.venta(id_cliente, fecha_hora_venta DESC)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_erp_venta_cliente_fecha_desc
        ON erp.venta (id_cliente, fecha_hora_venta DESC)
    """)
    # 5. ia.prescripcion_crossselling(id_perfil)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_ia_prescripcion_perfil
        ON ia.prescripcion_crossselling (id_perfil)
    """)
    # 6. erp.detalle_compra(id_compra)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_erp_detalle_compra_compra
        ON erp.detalle_compra (id_compra)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS erp.idx_erp_detalle_compra_compra")
    op.execute("DROP INDEX IF EXISTS erp.idx_erp_venta_cliente_fecha_desc")
    op.execute("DROP INDEX IF EXISTS erp.idx_erp_kardex_producto_fecha_desc")
    op.execute("DROP INDEX IF EXISTS erp.idx_erp_detalle_venta_producto")
