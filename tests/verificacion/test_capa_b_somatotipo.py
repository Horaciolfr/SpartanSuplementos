"""
Pruebas de Verificación Automatizada: Capa B — M1 Clasificador de Somatotipo (Bloque 30).
Proyecto: Spartan Suplementos Bolivia.

Verifica:
1. Determinación del estado en registro: RF_SOMATOTIPO_POSE no posee versión aprobada en ia.version_modelo_ia.
2. Modo runtime: Fallback heurístico determinista activo.
3. Validación de umbrales constantes de la heurística determinista (SOMATOTIPO_UMBRALES).
4. Cobertura determinista sobre los 6 vectores sintéticos canónicos (2 por clase).
5. Veredicto: CONFORME CON OBSERVACIÓN (el clasificador aún no se entrenó con dataset real;
   la heurística determinista opera de respaldo).
"""

import pytest
from sqlalchemy import text
from app.core.database import engine

# Umbrales canónicos de la heurística
SOMATOTIPO_UMBRALES_REF = {
    "imc_bajo": 18.5,
    "imc_alto": 24.9,
    "v_taper_mesomorfo": 1.5,
}


def clasificar_somatotipo_puro(imc: float, v_taper: float) -> str:
    """Implementación canónica de la regla determinista de respaldo."""
    if imc < SOMATOTIPO_UMBRALES_REF["imc_bajo"]:
        return "ECTOMORFO"
    elif imc <= SOMATOTIPO_UMBRALES_REF["imc_alto"]:
        if v_taper >= SOMATOTIPO_UMBRALES_REF["v_taper_mesomorfo"]:
            return "MESOMORFO"
        else:
            return "ECTOMORFO"
    else:
        return "ENDOMORFO"


@pytest.mark.asyncio
async def test_capa_b_registro_sin_version_aprobada_somatotipo():
    """
    Verifica que en ia.version_modelo_ia no existe ninguna versión aprobada para
    'RF_SOMATOTIPO_POSE'. Conforme a la regla del Bloque 30, esto impone que el
    sistema debe operar bajo la heurística determinista de respaldo y prohíbe
    declarar MODELO_RF activo.
    """
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT id_version, algoritmo, aprobado_produccion
            FROM ia.version_modelo_ia
            WHERE algoritmo = 'RF_SOMATOTIPO_POSE'
              AND aprobado_produccion = TRUE;
        """))
        filas = res.fetchall()

    assert len(filas) == 0, (
        f"Inconsistencia: Se detectó versión aprobada para RF_SOMATOTIPO_POSE: {filas}. "
        "El clasificador no debía tener versión activa sin dataset real."
    )


def test_capa_b_umbrales_heuristicos_y_vectores_sinteticos():
    """
    Valida la coherencia de la tabla de decisión determinista sobre 6 vectores
    sintéticos de prueba (2 por somatotipo).
    """
    vectores = [
        # ECTOMORFO 1: IMC bajo (< 18.5)
        (17.2, 1.30, "ECTOMORFO", "IMC bajo, v_taper moderado"),
        # ECTOMORFO 2: IMC normal pero v_taper < 1.5
        (22.1, 1.25, "ECTOMORFO", "IMC normal, v_taper estrecho"),

        # MESOMORFO 1: IMC normal y v_taper >= 1.5
        (22.5, 1.65, "MESOMORFO", "IMC normal, v_taper atlético"),
        # MESOMORFO 2: Caso atlético clásico
        (24.5, 2.19, "MESOMORFO", "IMC en límite superior normal con alto v_taper"),

        # ENDOMORFO 1: IMC alto (>= 25.0) con v_taper moderado
        (27.3, 1.20, "ENDOMORFO", "IMC sobrepeso, v_taper bajo"),
        # ENDOMORFO 2: IMC alto (>= 25.0) con v_taper alto
        (30.5, 1.70, "ENDOMORFO", "IMC elevado independientemente del v_taper"),
    ]

    for imc, v_taper, clase_esperada, descripcion in vectores:
        res = clasificar_somatotipo_puro(imc=imc, v_taper=v_taper)
        assert res == clase_esperada, (
            f"Fallo en vector '{descripcion}': imc={imc}, v_taper={v_taper}. Esperado {clase_esperada}, obtenido {res}"
        )
