import json
import os

with open(r'E:\PROYECTO DE GRADO\nuevo proyecto\recetas\catalogo_recetas.json', 'r', encoding='utf-8') as f:
    cat = json.load(f)

recipes = cat['recetas']

cat_map = {
    'A': 'DESAYUNO',
    'B': 'ALMUERZO',
    'C': 'CENA',
    'D': 'SNACK',
    'E': 'POST_ENTRENO',
    'F': 'ENSALADA'
}

values_recetas = []
for r in recipes:
    num = r['numero']
    code = f"REC-{num:03d}"
    c_code = r['codigo_categoria']
    category = cat_map[c_code]
    tag = r['tag_somatotipo'].strip('[]')
    parts = tag.split('·') if '·' in tag else tag.split('-')
    soma = parts[0].strip()
    obj = parts[1].strip() if len(parts) > 1 else 'MANT'
    nom = r['nombre'].replace("'", "''")
    prompt = r['prompt'].replace("'", "''")
    disclaimer = "Contenido nutricional informativo; no sustituye evaluación médica o nutricional profesional."
    
    values_recetas.append(
        f"        ('{code}', '{nom}', '{category}', '{soma}', '{obj}', '[]'::jsonb, '{{}}'::jsonb, '{prompt}', '{disclaimer}')"
    )

recetas_sql_values = ",\n".join(values_recetas)

migration_content = f'''"""Catálogo de 110 recetas nutricionales, tabla puente plan_receta y objetivo en usuario (Bloque 36).

Revision ID: b360001
Revises: b280001
"""

from typing import Sequence, Union
from alembic import op

revision: str = "b360001"
down_revision: Union[str, Sequence[str], None] = "b280001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear tabla parametros.receta_nutricional
    op.execute("""
        CREATE TABLE IF NOT EXISTS parametros.receta_nutricional (
            id_receta SERIAL PRIMARY KEY,
            codigo VARCHAR(10) UNIQUE NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            categoria VARCHAR(30) NOT NULL,
            somatotipo_afin VARCHAR(30) NOT NULL,
            objetivo VARCHAR(10) NOT NULL,
            ingredientes JSONB NOT NULL DEFAULT '[]'::jsonb,
            macronutrientes JSONB NOT NULL DEFAULT '{{}}'::jsonb,
            instrucciones TEXT,
            disclaimer TEXT NOT NULL,
            url_imagen VARCHAR(255) NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_receta_codigo ON parametros.receta_nutricional(codigo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_receta_cat_soma_obj ON parametros.receta_nutricional(categoria, somatotipo_afin, objetivo)")

    # 2. Crear tabla puente parametros.plan_receta
    op.execute("""
        CREATE TABLE IF NOT EXISTS parametros.plan_receta (
            id_plan INT NOT NULL REFERENCES parametros.plan_nutricional_somatotipo(id_plan) ON DELETE CASCADE,
            id_receta INT NOT NULL REFERENCES parametros.receta_nutricional(id_receta) ON DELETE CASCADE,
            PRIMARY KEY (id_plan, id_receta)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_plan_receta_plan ON parametros.plan_receta(id_plan)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_plan_receta_receta ON parametros.plan_receta(id_receta)")

    # 3. Columna objetivo en erp.usuario con CHECK
    op.execute("ALTER TABLE erp.usuario ADD COLUMN IF NOT EXISTS objetivo VARCHAR(10) NULL")
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuario_objetivo'
            ) THEN
                ALTER TABLE erp.usuario ADD CONSTRAINT chk_usuario_objetivo
                CHECK (objetivo IS NULL OR objetivo IN ('GP', 'GM', 'PP', 'MANT'));
            END IF;
        END $$;
    """)

    # 4. Seed idempotente de las 110 recetas del catálogo aprobado
    op.execute("""
        INSERT INTO parametros.receta_nutricional (
            codigo, nombre, categoria, somatotipo_afin, objetivo, ingredientes, macronutrientes, instrucciones, disclaimer
        ) VALUES 
{recetas_sql_values}
        ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            categoria = EXCLUDED.categoria,
            somatotipo_afin = EXCLUDED.somatotipo_afin,
            objetivo = EXCLUDED.objetivo,
            instrucciones = EXCLUDED.instrucciones,
            disclaimer = EXCLUDED.disclaimer
    """)

    # 5. Poblar tabla puente plan_receta:
    op.execute("""
        INSERT INTO parametros.plan_receta (id_plan, id_receta)
        SELECT p.id_plan, r.id_receta
        FROM parametros.plan_nutricional_somatotipo p
        CROSS JOIN parametros.receta_nutricional r
        WHERE p.id_somatotipo = 1
          AND (r.somatotipo_afin LIKE '%ECT%' OR r.somatotipo_afin = 'ECTO')
        ON CONFLICT (id_plan, id_receta) DO NOTHING
    """)

    op.execute("""
        INSERT INTO parametros.plan_receta (id_plan, id_receta)
        SELECT p.id_plan, r.id_receta
        FROM parametros.plan_nutricional_somatotipo p
        CROSS JOIN parametros.receta_nutricional r
        WHERE p.id_somatotipo = 2
          AND r.somatotipo_afin LIKE '%MESO%'
        ON CONFLICT (id_plan, id_receta) DO NOTHING
    """)

    op.execute("""
        INSERT INTO parametros.plan_receta (id_plan, id_receta)
        SELECT p.id_plan, r.id_receta
        FROM parametros.plan_nutricional_somatotipo p
        CROSS JOIN parametros.receta_nutricional r
        WHERE p.id_somatotipo = 3
          AND r.somatotipo_afin LIKE '%ENDO%'
        ON CONFLICT (id_plan, id_receta) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parametros.plan_receta CASCADE")
    op.execute("DROP TABLE IF EXISTS parametros.receta_nutricional CASCADE")
    op.execute("ALTER TABLE erp.usuario DROP CONSTRAINT IF EXISTS chk_usuario_objetivo")
    op.execute("ALTER TABLE erp.usuario DROP COLUMN IF EXISTS objetivo")
'''

with open(r'alembic\versions\b360001_recetas_nutricionales_y_objetivo.py', 'w', encoding='utf-8') as f:
    f.write(migration_content)

with open(r'backend\alembic\versions\b360001_recetas_nutricionales_y_objetivo.py', 'w', encoding='utf-8') as f:
    f.write(migration_content)

print("Migracion b360001 generada con exito en alembic/versions y backend/alembic/versions")
