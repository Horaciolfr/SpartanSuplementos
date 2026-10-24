"""Módulo de planes nutricionales por somatotipo (Bloque 28 - Paso 1).

Revision ID: b280001
Revises: b250001
"""

from typing import Sequence, Union
from alembic import op

revision: str = "b280001"
down_revision: Union[str, Sequence[str], None] = "b250001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Creación de tabla en esquema parametros
    op.execute("""
        CREATE TABLE IF NOT EXISTS parametros.plan_nutricional_somatotipo (
            id_plan SERIAL PRIMARY KEY,
            id_somatotipo INT NOT NULL UNIQUE REFERENCES parametros.catalogo_somatotipo(id_somatotipo),
            nombre_plan VARCHAR(80) NOT NULL,
            objetivo VARCHAR(150),
            distribucion_macronutrientes JSONB NOT NULL,
            pautas JSONB NOT NULL,
            comidas_sugeridas JSONB NOT NULL,
            disclaimer TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # 2. Seed idempotente de los 3 planes de somatotipo
    op.execute("""
        INSERT INTO parametros.plan_nutricional_somatotipo (
            id_somatotipo, nombre_plan, objetivo, distribucion_macronutrientes, pautas, comidas_sugeridas, disclaimer
        ) VALUES 
        (
            1,
            'Plan Ectomorfo - Superávit Controlado',
            'Superávit calórico controlado y balance glucogénico para desarrollo muscular sostenido',
            '{"proteina_pct": 25, "carbohidratos_pct": 55, "grasas_pct": 20}'::jsonb,
            '["Superávit calórico controlado de 300 a 500 kcal sobre el gasto total", "Priorizar hidratos de carbono complejos y alta densidad energética", "Distribuir ingesta proteica en 4 a 5 comidas diarias (1.8 a 2.2 g/kg)", "Hidratación constante mínima de 35-40 ml por kg de peso corporal"]'::jsonb,
            '[{"comida": "Desayuno", "sugerencia": "Avena cocida con leche entera, plátano, frutos secos y proteína en polvo", "timing": "08:00"}, {"comida": "Media Mañana", "sugerencia": "Tostadas integrales con mantequilla de maní y pechuga de pavo", "timing": "11:00"}, {"comida": "Almuerzo", "sugerencia": "Pechuga de pollo con arroz jazmín, batatas asadas y ensalada con aceite de oliva", "timing": "14:00"}, {"comida": "Merienda", "sugerencia": "Yogur griego con granola, arándanos y miel", "timing": "17:30"}, {"comida": "Cena", "sugerencia": "Filete de pescado o atún con puré de patata, verduras al vapor y aguacate", "timing": "21:00"}]'::jsonb,
            'Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional'
        ),
        (
            2,
            'Plan Mesomorfo - Equilibrio y Recomposición',
            'Equilibrio metabólico y recomposición corporal con soporte proteico óptimo',
            '{"proteina_pct": 30, "carbohidratos_pct": 45, "grasas_pct": 25}'::jsonb,
            '["Ingesta isocalórica o ciclado moderado de hidratos según intensidad de entrenamiento", "Aporte proteico objetivo en rango de 2.0 a 2.4 g/kg de peso corporal", "Balance de grasas insaturadas para soporte hormonal y salud articular", "Timing enfocado en ventanas peri-entreno para optimizar rendimiento y síntesis"]'::jsonb,
            '[{"comida": "Desayuno", "sugerencia": "Huevos revueltos con espinacas, avena integral con frutos rojos y té verde", "timing": "08:00"}, {"comida": "Media Mañana", "sugerencia": "Manzana verde con nueces o almendras y requesón magro", "timing": "11:00"}, {"comida": "Almuerzo", "sugerencia": "Ternera magra con patata asada, brócoli al vapor y aceite de oliva virgen", "timing": "14:00"}, {"comida": "Merienda", "sugerencia": "Tortitas de avena y claras con fruta fresca", "timing": "17:30"}, {"comida": "Cena", "sugerencia": "Pechuga de pavo a la plancha con quinoa, espárragos y ensalada mixta", "timing": "21:00"}]'::jsonb,
            'Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional'
        ),
        (
            3,
            'Plan Endomorfo - Déficit Moderado y Alta Proteína',
            'Déficit calórico moderado con alta saciedad y predominio proteico para preservar masa magra',
            '{"proteina_pct": 40, "carbohidratos_pct": 30, "grasas_pct": 30}'::jsonb,
            '["Déficit calórico moderado de 300 a 500 kcal priorizando saciedad y volumen de vegetales", "Aporte proteico elevado de 2.2 a 2.6 g/kg de masa libre de grasa", "Restringir carbohidratos refinados y priorizar fuentes de bajo índice glucémico y fibra", "Grasas saludables controladas procedentes de aguacate, frutos secos y aceite de oliva"]'::jsonb,
            '[{"comida": "Desayuno", "sugerencia": "Omelette de claras con espinacas, champiñones y medio aguacate", "timing": "08:30"}, {"comida": "Media Mañana", "sugerencia": "Batido de proteína aislada (whey isolate) con semillas de chía", "timing": "11:30"}, {"comida": "Almuerzo", "sugerencia": "Pechuga de pollo a la plancha con abundante ensalada verde y porción medida de arroz integral", "timing": "14:30"}, {"comida": "Merienda", "sugerencia": "Yogur proteico desnatado con canela y un puñado de nueces", "timing": "17:30"}, {"comida": "Cena", "sugerencia": "Lomo de merluza o salmón al horno con calabacines y pimientos asados", "timing": "21:00"}]'::jsonb,
            'Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional'
        )
        ON CONFLICT (id_somatotipo) DO UPDATE SET
            nombre_plan = EXCLUDED.nombre_plan,
            objetivo = EXCLUDED.objetivo,
            distribucion_macronutrientes = EXCLUDED.distribucion_macronutrientes,
            pautas = EXCLUDED.pautas,
            comidas_sugeridas = EXCLUDED.comidas_sugeridas,
            disclaimer = EXCLUDED.disclaimer;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parametros.plan_nutricional_somatotipo CASCADE;")
