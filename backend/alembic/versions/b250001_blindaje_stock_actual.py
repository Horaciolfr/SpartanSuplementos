"""Blindaje estricto de stock_actual contra mutaciones directas (Paso C1 - NC2).

Revision ID: b250001
Revises: b240002
"""

from typing import Sequence, Union
from alembic import op

revision: str = "b250001"
down_revision: Union[str, Sequence[str], None] = "b240002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Función restrictiva de verificación para BEFORE UPDATE en erp.producto
    op.execute("""
        CREATE OR REPLACE FUNCTION erp.fn_proteger_stock_actual()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        BEGIN
            IF NEW.stock_actual IS DISTINCT FROM OLD.stock_actual THEN
                IF coalesce(current_setting('app.kardex_interno', true), 'off') <> 'on' THEN
                    RAISE EXCEPTION 'Violacion de integridad: la modificacion directa de stock_actual esta prohibida. El stock solo puede mutar mediante transacciones de kardex fisico (venta o compra).';
                END IF;
            END IF;
            RETURN NEW;
        END $function$
    """)

    # 2. Separar DROP y CREATE TRIGGER para compatibilidad con asyncpg
    op.execute("DROP TRIGGER IF EXISTS trg_proteger_stock_actual ON erp.producto")
    op.execute("""
        CREATE TRIGGER trg_proteger_stock_actual
        BEFORE UPDATE ON erp.producto
        FOR EACH ROW
        EXECUTE FUNCTION erp.fn_proteger_stock_actual()
    """)

    # 3. Actualizar erp.fn_procesar_venta para fijar y restaurar app.kardex_interno
    op.execute("""
        CREATE OR REPLACE FUNCTION erp.fn_procesar_venta()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE
            v_saldo INT;
            v_operacion_id INT := 2; -- ID 2 para 'VENTA'
            v_prev_guc TEXT;
        BEGIN
            -- Bloqueo pesimista de fila para prevenir condición de carrera
            SELECT stock_actual INTO v_saldo FROM erp.producto WHERE id_producto = NEW.id_producto FOR UPDATE;
            IF v_saldo < NEW.cantidad THEN
                RAISE EXCEPTION 'Quiebre de stock: producto %', NEW.id_producto;
            END IF;

            v_prev_guc := current_setting('app.kardex_interno', true);
            PERFORM set_config('app.kardex_interno', 'on', true);

            UPDATE erp.producto SET stock_actual = stock_actual - NEW.cantidad WHERE id_producto = NEW.id_producto;
            INSERT INTO erp.kardex_fisico (id_producto, id_venta, id_tipo_operacion, cantidad_movimiento, saldo_resultante)
            VALUES (NEW.id_producto, NEW.id_venta, v_operacion_id, NEW.cantidad, v_saldo - NEW.cantidad);

            PERFORM set_config('app.kardex_interno', coalesce(v_prev_guc, 'off'), true);
            RETURN NEW;
        END $function$
    """)

    # 4. Actualizar erp.fn_procesar_compra para fijar y restaurar app.kardex_interno
    op.execute("""
        CREATE OR REPLACE FUNCTION erp.fn_procesar_compra()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE
            v_saldo INT;
            v_operacion_id INT := 1; -- ID 1 para 'COMPRA'
            v_prev_guc TEXT;
        BEGIN
            SELECT stock_actual INTO v_saldo FROM erp.producto WHERE id_producto = NEW.id_producto FOR UPDATE;

            v_prev_guc := current_setting('app.kardex_interno', true);
            PERFORM set_config('app.kardex_interno', 'on', true);

            UPDATE erp.producto SET stock_actual = stock_actual + NEW.cantidad WHERE id_producto = NEW.id_producto;
            INSERT INTO erp.kardex_fisico (id_producto, id_compra, id_tipo_operacion, cantidad_movimiento, saldo_resultante)
            VALUES (NEW.id_producto, NEW.id_compra, v_operacion_id, NEW.cantidad, v_saldo + NEW.cantidad);

            PERFORM set_config('app.kardex_interno', coalesce(v_prev_guc, 'off'), true);
            RETURN NEW;
        END $function$
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_proteger_stock_actual ON erp.producto")
    op.execute("DROP FUNCTION IF EXISTS erp.fn_proteger_stock_actual()")
