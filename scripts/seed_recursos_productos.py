"""
Script de Carga de Productos Reales desde la carpeta de recursos.
Procesa cada una de las imágenes auténticas del catálogo, asigna SKU,
nombre formateado, categoría adecuada, precio realista en Bolivianos (Bs.),
stock inicial y descripción nutricional detallada.
"""
import os
import re
import sys
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

RECURSOS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "recursos")

# Categorías en erp.categoria_producto:
# 1: SUPLEMENTOS PROTEICOS
# 2: SUPLEMENTOS
# 3: INDUMENTARIA
# 4: CREATINAS & FUERZA
# 5: PRE-ENTRENOS & ENERGÍA
# 6: GANADORES DE MASA (MASS GAINERS)
# 7: AMINOÁCIDOS & RECUPERACIÓN
# 8: QUEMADORES & DEFINICIÓN
# 9: SALUD, VITAMINAS & ARTICULACIONES

def sanitize_name(filename_no_ext: str) -> str:
    # Reemplazar guiones bajos por espacios
    name = filename_no_ext.replace('_', ' ')
    # Reemplazar abreviaciones comunes
    name = re.sub(r'\s+', ' ', name).strip()
    return name

def determine_metadata(filename: str):
    name_no_ext, ext = os.path.splitext(filename)
    lower = name_no_ext.lower()

    # Brand extraction
    brand = "GENÉRICO"
    if lower.startswith("adn_"):
        brand = "ADN NUTRITION"
    elif lower.startswith("dragon_pharma_"):
        brand = "DRAGON PHARMA"
    elif lower.startswith("evogen_"):
        brand = "EVOGEN NUTRITION"
    elif lower.startswith("finaflex_"):
        brand = "FINAFLEX"
    elif lower.startswith("insane_labz_"):
        brand = "INSANE LABZ"
    elif lower.startswith("level_pro_usa_"):
        brand = "LEVEL PRO USA"
    elif lower.startswith("muscletech_"):
        brand = "MUSCLETECH"
    elif lower.startswith("nutrex_"):
        brand = "NUTREX RESEARCH"
    elif lower.startswith("orgain_"):
        brand = "ORGAIN"
    elif lower.startswith("rcss_"):
        brand = "RONNIE COLEMAN (RCSS)"
    elif lower.startswith("syntrax_"):
        brand = "SYNTRAX"
    elif lower.startswith("ultimate_nutrition_") or lower.startswith("un_"):
        brand = "ULTIMATE NUTRITION"

    clean_name = sanitize_name(name_no_ext)
    image_url = f"/products/{filename}"

    # 1. Shakers / Accesorios
    if "shaker" in lower:
        return {
            "nombre": clean_name,
            "id_categoria": 3,
            "precio": 65.00,
            "stock": 45,
            "stock_seguridad": 10,
            "imagen_url": image_url,
            "descripcion": f"Vaso mezclador oficial {brand} de 700ml con rejilla anti-grumos de alta eficiencia, cierre hermético y plástico grado médico libre de BPA."
        }

    # 2. Creatinas
    if any(k in lower for k in ["creatine", "creatina", "atp_force", "creactor"]):
        precio = 210.00
        if "500g" in lower or "200serv" in lower or "120serv" in lower or "gummies" in lower:
            precio = 280.00
        elif "flavored" in lower or "sour" in lower or "chews" in lower:
            precio = 240.00
        elif "hmb" in lower:
            precio = 260.00

        return {
            "nombre": clean_name,
            "id_categoria": 4,
            "precio": precio,
            "stock": 35,
            "stock_seguridad": 8,
            "imagen_url": image_url,
            "descripcion": f"Creatina monohidratada de alta pureza por {brand}. Incrementa la síntesis de ATP, potencia la fuerza máxima explosiva y favorece la voluminización muscular intracelular."
        }

    # 3. Ganadores de Peso (Mass Gainers)
    if any(k in lower for k in ["mass", "gainer", "bigm", "super_huge", "goliath", "juice"]):
        precio = 420.00
        if "10lb" in lower or "12lb" in lower or "2000" in lower or "2544" in lower or "2600" in lower:
            precio = 540.00
        elif "6lb" in lower or "6lbs" in lower:
            precio = 380.00

        return {
            "nombre": clean_name,
            "id_categoria": 6,
            "precio": precio,
            "stock": 25,
            "stock_seguridad": 5,
            "imagen_url": image_url,
            "descripcion": f"Fórmula hipercalórica y reconstructora de {brand}. Contiene carbohidratos de asimilación gradual, matriz proteica multifase y BCAAs para hipertrofia y aumento de volumen limpio."
        }

    # 4. Proteínas (Whey / Isolate / Casein)
    if any(k in lower for k in ["whey", "iso", "protein", "proteina", "casein", "prostar", "nitrotech", "isoject", "isophorm", "isofit"]):
        precio = 350.00
        if "5lb" in lower or "4lb" in lower or "2kg" in lower:
            precio = 430.00
        elif "iso" in lower or "isolate" in lower or "clear" in lower:
            precio = 460.00
            if "5lb" in lower:
                precio = 520.00
        elif "2lb" in lower or "1_1kg" in lower or "1.1kg" in lower:
            precio = 260.00

        return {
            "nombre": clean_name,
            "id_categoria": 1,
            "precio": precio,
            "stock": 40,
            "stock_seguridad": 10,
            "imagen_url": image_url,
            "descripcion": f"Aislado y concentrado proteico premium de {brand}. Aporta más de 24g de proteína de máxima biodisponibilidad por porción, bajo en grasa y azúcares, ideal para recuperación y tono magro."
        }

    # 5. Pre-Entrenos y Óxido Nítrico
    if any(k in lower for k in ["pre", "venom", "psychotic", "psychopath", "stimul8", "vapor", "outlift", "yeah_buddy", "nox", "pump", "veinz", "evp", "thunder"]):
        precio = 250.00
        if "gold" in lower or "xtreme" in lower or "diablo" in lower or "amped" in lower or "saw" in lower:
            precio = 290.00
        elif "non_stim" in lower or "3d" in lower or "aq" in lower:
            precio = 270.00

        return {
            "nombre": clean_name,
            "id_categoria": 5,
            "precio": precio,
            "stock": 30,
            "stock_seguridad": 8,
            "imagen_url": image_url,
            "descripcion": f"Activador pre-entrenamiento de alta concentración por {brand}. Con cafeína anhidra, beta-alanina, citrulina malato y nootrópicos para energía explosiva, congestión vascular y enfoque túnel."
        }

    # 6. Aminoácidos, BCAA, EAA, Glutamina
    if any(k in lower for k in ["amino", "bcaa", "eaa", "glutamin", "glutapure", "beta_alanine", "citrulline"]):
        precio = 195.00
        if "12000" in lower or "8000" in lower or "kem" in lower or "plus" in lower:
            precio = 230.00

        return {
            "nombre": clean_name,
            "id_categoria": 7,
            "precio": precio,
            "stock": 35,
            "stock_seguridad": 8,
            "imagen_url": image_url,
            "descripcion": f"Complejo de aminoácidos ramificados y micronizados por {brand}. Protege la masa muscular durante sesiones extenuantes, reduce el dolor muscular tardío y optimiza la hidratación intra-entreno."
        }

    # 7. Quemadores y Definición
    if any(k in lower for k in ["quemador", "burn", "cutz", "lipo6", "diabolus", "fat_loss", "dryup", "carnitine", "carnigen", "cla", "ripped", "viper"]):
        precio = 230.00
        if "hardcore" in lower or "black" in lower or "ultra" in lower:
            precio = 260.00

        return {
            "nombre": clean_name,
            "id_categoria": 8,
            "precio": precio,
            "stock": 30,
            "stock_seguridad": 6,
            "imagen_url": image_url,
            "descripcion": f"Matriz lipotrópica y termogénica avanzada de {brand}. Facilita la conversión de ácidos grasos en energía limpia, reduce el apetito y promueve la eliminación de líquidos retenidos."
        }

    # 8. Salud, Vitaminas, Articulaciones y Longevidad
    precio = 180.00
    if "superfoods" in lower or "evogreens" in lower or "collagen" in lower or "tudca" in lower:
        precio = 240.00
    elif "krill" in lower or "resveratrol" in lower or "coq10" in lower or "liver" in lower:
        precio = 210.00

    return {
        "nombre": clean_name,
        "id_categoria": 9,
        "precio": precio,
        "stock": 30,
        "stock_seguridad": 6,
        "imagen_url": image_url,
        "descripcion": f"Fórmula de protección biológica y micronutrición de {brand}. Enriquecida con antioxidantes, soporte articular, digestivo y celular para sostener la salud global del deportista."
    }

async def seed_products():
    files = sorted([f for f in os.listdir(RECURSOS_DIR) if f.lower() != 'logo.jpg' and os.path.isfile(os.path.join(RECURSOS_DIR, f))])
    print(f"Total imágenes encontradas en recursos: {len(files)}")

    async with engine.begin() as conn:
        # Asegurar columnas imagen_url y descripcion
        await conn.execute(text("ALTER TABLE erp.producto ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(500);"))
        await conn.execute(text("ALTER TABLE erp.producto ADD COLUMN IF NOT EXISTS descripcion TEXT;"))

        # Desactivar temporalmente triggers si fuera necesario o insertar directamente
        inserted_count = 0
        updated_count = 0

        for idx, filename in enumerate(files, start=1):
            meta = determine_metadata(filename)
            # Generar SKU limpio y único
            sku_clean = re.sub(r'[^A-Z0-9]', '', os.path.splitext(filename)[0].upper())[:35]
            sku = f"SKU-{sku_clean}"

            # Verificar si ya existe por SKU
            existing = (await conn.execute(
                text("SELECT id_producto FROM erp.producto WHERE codigo_sku = :sku"),
                {"sku": sku}
            )).scalar()

            if existing:
                await conn.execute(
                    text("""
                        UPDATE erp.producto 
                        SET nombre_producto = :nombre,
                            id_categoria = :id_categoria,
                            precio_unitario = :precio,
                            imagen_url = :imagen_url,
                            descripcion = :descripcion,
                            estado_activo = true
                        WHERE id_producto = :id
                    """),
                    {
                        "id": existing,
                        "nombre": meta["nombre"],
                        "id_categoria": meta["id_categoria"],
                        "precio": meta["precio"],
                        "imagen_url": meta["imagen_url"],
                        "descripcion": meta["descripcion"],
                    }
                )
                updated_count += 1
            else:
                await conn.execute(
                    text("""
                        INSERT INTO erp.producto 
                            (id_categoria, codigo_sku, nombre_producto, precio_unitario, stock_actual, stock_seguridad, estado_activo, imagen_url, descripcion)
                        VALUES 
                            (:id_categoria, :sku, :nombre, :precio, :stock, :stock_seguridad, true, :imagen_url, :descripcion)
                    """),
                    {
                        "id_categoria": meta["id_categoria"],
                        "sku": sku,
                        "nombre": meta["nombre"],
                        "precio": meta["precio"],
                        "stock": meta["stock"],
                        "stock_seguridad": meta["stock_seguridad"],
                        "imagen_url": meta["imagen_url"],
                        "descripcion": meta["descripcion"],
                    }
                )
                inserted_count += 1

        print(f"Productos insertados: {inserted_count}, actualizados: {updated_count}")
        total = (await conn.execute(text("SELECT count(*) FROM erp.producto WHERE estado_activo = true"))).scalar()
        print(f"Total de productos activos en la base de datos PostgreSQL: {total}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_products())
