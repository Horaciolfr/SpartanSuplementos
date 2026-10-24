import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from app.core.database import AsyncSessionLocal
from app.models.catalogs import PlanNutricionalSomatotipo, CatalogoSomatotipo


@pytest.mark.asyncio
async def test_plan_nutricional_seed_existencia_y_contenido():
    """Verifica que los tres planes canónicos (Ectomorfo, Mesomorfo, Endomorfo) existan."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(PlanNutricionalSomatotipo, CatalogoSomatotipo.nombre_somatotipo)
            .join(CatalogoSomatotipo, PlanNutricionalSomatotipo.id_somatotipo == CatalogoSomatotipo.id_somatotipo)
            .order_by(PlanNutricionalSomatotipo.id_somatotipo)
        )
        rows = result.all()
        assert len(rows) == 3, f"Se esperaban 3 planes nutricionales, encontrados {len(rows)}"

        somatotopos = [r[1] for r in rows]
        assert "ECTOMORFO" in somatotopos
        assert "MESOMORFO" in somatotopos
        assert "ENDOMORFO" in somatotopos

        for plan, nombre_soma in rows:
            assert plan.nombre_plan, f"El plan para {nombre_soma} debe tener nombre"
            assert isinstance(plan.pautas, list) and len(plan.pautas) > 0
            assert isinstance(plan.comidas_sugeridas, list) and len(plan.comidas_sugeridas) > 0
            assert plan.disclaimer == "Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional"


@pytest.mark.asyncio
async def test_plan_nutricional_suma_macronutrientes_100():
    """Verifica que la suma de porcentajes de macronutrientes sea exactamente 100% en cada plan."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(PlanNutricionalSomatotipo))
        planes = result.scalars().all()
        assert len(planes) >= 3

        for plan in planes:
            macros = plan.distribucion_macronutrientes
            assert isinstance(macros, dict), f"Macros deben ser diccionario en plan {plan.id_plan}"
            assert "proteina_pct" in macros
            assert "carbohidratos_pct" in macros
            assert "grasas_pct" in macros

            p = int(macros["proteina_pct"])
            c = int(macros["carbohidratos_pct"])
            g = int(macros["grasas_pct"])

            assert p > 0 and c > 0 and g > 0, f"Porcentajes deben ser positivos: {macros}"
            total = p + c + g
            assert total == 100, f"Plan {plan.nombre_plan} suma {total}%, se requiere exactamente 100%"


@pytest.mark.asyncio
async def test_plan_nutricional_unicidad_somatotipo():
    """Verifica que la restricción UNIQUE sobre id_somatotipo impida duplicidad."""
    async with AsyncSessionLocal() as session:
        nuevo_duplicado = PlanNutricionalSomatotipo(
            id_somatotipo=1,  # Ya existe para ECTOMORFO
            nombre_plan="Plan Duplicado No Permitido",
            objetivo="Test de fallo por unicidad",
            distribucion_macronutrientes={"proteina_pct": 30, "carbohidratos_pct": 50, "grasas_pct": 20},
            pautas=["Pauta prueba"],
            comidas_sugeridas=[{"comida": "Test", "sugerencia": "Test"}],
            disclaimer="Contenido informativo por somatotipo; no constituye consejo médico ni sustituye evaluación profesional"
        )
        session.add(nuevo_duplicado)
        with pytest.raises(IntegrityError):
            await session.flush()
        await session.rollback()


@pytest.mark.asyncio
async def test_plan_nutricional_seed_idempotente():
    """Verifica que la re-ejecución del script de seed (ON CONFLICT DO UPDATE) no duplica registros ni falla."""
    async with AsyncSessionLocal() as session:
        # Re-ejecutar el statement de seed idempotente
        seed_sql = text("""
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
            )
            ON CONFLICT (id_somatotipo) DO UPDATE SET
                nombre_plan = EXCLUDED.nombre_plan,
                objetivo = EXCLUDED.objetivo,
                distribucion_macronutrientes = EXCLUDED.distribucion_macronutrientes,
                pautas = EXCLUDED.pautas,
                comidas_sugeridas = EXCLUDED.comidas_sugeridas,
                disclaimer = EXCLUDED.disclaimer;
        """)
        await session.execute(seed_sql)
        await session.commit()

        # Comprobar que sigue habiendo exactamente 3 registros
        count_res = await session.execute(text("SELECT count(*) FROM parametros.plan_nutricional_somatotipo"))
        total = count_res.scalar_one()
        assert total == 3, f"El total de planes tras re-sembrado debe ser 3, encontrado {total}"
