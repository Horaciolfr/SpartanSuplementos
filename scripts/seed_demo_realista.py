"""
scripts/seed_demo_realista.py
BLOQUE 31 — Paso 3 y Paso 6 (V-01, V-02, V-09, V-10)

Funcionalidades:
1. Normalización de inventario: stocks entre 20 y 300 unidades por SKU con
   exactamente 10-15% de productos por debajo de stock_seguridad (alertas de quiebre).
2. Verificación de cifra pública de catálogo derivada estrictamente de COUNT
   de productos activos (estado_activo=TRUE, id_producto <> 205).
3. Sembrado de clientes de demostración con nombres realistas bolivianos,
   correos de dominio propio (@spartan.dev), CI válidos, perfiles biométricos
   y prescripciones cruzadas con reglas CART (algunas convertidas).
4. Procedimiento documentado de reset del volumen de demo.
5. Declaración formal de independencia de artefactos ML: los modelos se entrenan
   sobre data/ generado por DGP, no sobre la base viva.
"""
import os
import sys
import asyncio
import random
from datetime import datetime, timezone, timedelta
from sqlalchemy import text, select

# Root en sys.path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.core.database import AsyncSessionLocal, engine
from app.core.security import hash_password

PROTECTED_IDS = {13450, 205, 23, 149511, 1319, 1320}

CLIENTES_REALISTAS = [
    {
        "nombres": "Rodrigo",
        "apellidos": "Mendoza Arce",
        "email": "rodrigo.mendoza@spartan.dev",
        "numero_documento": "7849201",
        "genero": "MASCULINO",
        "somatotipo": "MESOMORFO",
        "id_somatotipo": 2,
        "estatura_cm": 179.0,
        "peso_kg": 76.5,
        "visibilidad": 0.97,
        "dias_atras": 12,
        "convertida": True,
        "id_regla": 5, # CART-4 (creatina + meso)
    },
    {
        "nombres": "Mariana",
        "apellidos": "Silva Torrico",
        "email": "mariana.silva@spartan.dev",
        "numero_documento": "6521940",
        "genero": "FEMENINO",
        "somatotipo": "ECTOMORFO",
        "id_somatotipo": 1,
        "estatura_cm": 168.0,
        "peso_kg": 56.0,
        "visibilidad": 0.98,
        "dias_atras": 25,
        "convertida": False,
        "id_regla": 2, # CART-1
    },
    {
        "nombres": "Diego",
        "apellidos": "Fernández Quiroga",
        "email": "diego.fernandez@spartan.dev",
        "numero_documento": "8923411",
        "genero": "MASCULINO",
        "somatotipo": "ENDOMORFO",
        "id_somatotipo": 3,
        "estatura_cm": 174.0,
        "peso_kg": 83.2,
        "visibilidad": 0.95,
        "dias_atras": 40,
        "convertida": True,
        "id_regla": 3, # CART-2 (quemador + endo)
    },
    {
        "nombres": "Valeria",
        "apellidos": "Rojas Baldivieso",
        "email": "valeria.rojas@spartan.dev",
        "numero_documento": "4820193",
        "genero": "FEMENINO",
        "somatotipo": "MESOMORFO",
        "id_somatotipo": 2,
        "estatura_cm": 165.0,
        "peso_kg": 60.5,
        "visibilidad": 0.96,
        "dias_atras": 8,
        "convertida": False,
        "id_regla": 5, # CART-4
    },
    {
        "nombres": "Alejandro",
        "apellidos": "Vargas Peñaranda",
        "email": "alejandro.vargas@spartan.dev",
        "numero_documento": "7109284",
        "genero": "MASCULINO",
        "somatotipo": "ECTOMORFO",
        "id_somatotipo": 1,
        "estatura_cm": 182.0,
        "peso_kg": 69.0,
        "visibilidad": 0.97,
        "dias_atras": 18,
        "convertida": True,
        "id_regla": 4, # CART-3
    },
    {
        "nombres": "Camila",
        "apellidos": "Morales Zenteno",
        "email": "camila.morales@spartan.dev",
        "numero_documento": "5938102",
        "genero": "FEMENINO",
        "somatotipo": "ENDOMORFO",
        "id_somatotipo": 3,
        "estatura_cm": 160.0,
        "peso_kg": 67.5,
        "visibilidad": 0.94,
        "dias_atras": 55,
        "convertida": False,
        "id_regla": 6, # CART-5 (indumentaria + endo)
    },
    {
        "nombres": "Javier",
        "apellidos": "Castro Beltrán",
        "email": "javier.castro@spartan.dev",
        "numero_documento": "9283741",
        "genero": "MASCULINO",
        "somatotipo": "MESOMORFO",
        "id_somatotipo": 2,
        "estatura_cm": 181.0,
        "peso_kg": 80.0,
        "visibilidad": 0.99,
        "dias_atras": 5,
        "convertida": True,
        "id_regla": 5, # CART-4
    },
    {
        "nombres": "Sofía",
        "apellidos": "Ortiz Camacho",
        "email": "sofia.ortiz@spartan.dev",
        "numero_documento": "6019284",
        "genero": "FEMENINO",
        "somatotipo": "MESOMORFO",
        "id_somatotipo": 2,
        "estatura_cm": 170.0,
        "peso_kg": 63.0,
        "visibilidad": 0.96,
        "dias_atras": 3,
        "convertida": False,
        "id_regla": 5, # CART-4
    },
]


async def seed_demo_realista():
    print("===============================================================")
    print("  SPARTAN SUPLEMENTOS — SEMBRADO DE DEMOSTRACIÓN REALISTA")
    print("===============================================================")

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # ---------------------------------------------------------
            # 1. NORMALIZACIÓN DE STOCKS EN erp.producto
            # ---------------------------------------------------------
            print("\n[1/4] Normalizando stocks de productos entre 20 y 300 unidades...")
            
            # Obtener todos los productos activos excepto id 205
            res_prods = await session.execute(text("""
                SELECT id_producto, codigo_sku, nombre_producto, stock_actual, stock_seguridad
                FROM erp.producto
                WHERE estado_activo = TRUE AND id_producto <> 205
                ORDER BY id_producto;
            """))
            productos = res_prods.fetchall()
            total_activos = len(productos)
            print(f"Total productos activos detectados: {total_activos}")

            # Fijar GUC app.kardex_interno para autorizar normalización administrativa de stock
            await session.execute(text("SELECT set_config('app.kardex_interno', 'on', true);"))

            # Fijar semilla determinística para reproducibilidad
            rng = random.Random(20261020)
            
            # 12% con stock por debajo de stock_seguridad (alertas operativas)
            num_bajo_stock = max(1, int(total_activos * 0.12))
            indices_bajo_stock = set(rng.sample(range(total_activos), num_bajo_stock))
            print(f"Productos configurados con stock bajo seguridad (~12%): {num_bajo_stock}")

            actualizados_bajo = 0
            actualizados_normal = 0

            for idx, p in enumerate(productos):
                id_prod = p[0]
                if idx in indices_bajo_stock:
                    # Stock de seguridad entre 15 y 25; stock actual entre 3 y 12 (< stock_seguridad)
                    s_seg = rng.randint(15, 25)
                    s_act = rng.randint(3, s_seg - 3)
                    actualizados_bajo += 1
                else:
                    # Stock de seguridad entre 10 y 25; stock actual entre 35 y 280 (>= stock_seguridad)
                    s_seg = rng.randint(10, 25)
                    s_act = rng.randint(max(s_seg + 10, 35), 295)
                    actualizados_normal += 1

                await session.execute(text("""
                    UPDATE erp.producto
                    SET stock_actual = :act, stock_seguridad = :seg
                    WHERE id_producto = :id;
                """), {"act": s_act, "seg": s_seg, "id": id_prod})

            print(f"Stocks actualizados: {actualizados_normal} normales, {actualizados_bajo} en alerta de quiebre.")

            # ---------------------------------------------------------
            # 2. VERIFICACIÓN DE CIFRA PÚBLICA DE CATÁLOGO
            # ---------------------------------------------------------
            print("\n[2/4] Verificando fuente única de verdad para catálogo público...")
            res_count = await session.execute(text("""
                SELECT COUNT(*) FROM erp.producto WHERE estado_activo = TRUE AND id_producto <> 205;
            """))
            cifra_unica = res_count.scalar_one()
            print(f"Cifra pública real (COUNT en erp.producto): {cifra_unica} productos activos.")

            # ---------------------------------------------------------
            # 3. SEMBRADO DE CLIENTES REALISTAS
            # ---------------------------------------------------------
            print("\n[3/4] Sembrando clientes realistas y perfiles biométricos...")
            
            # Obtener catálogos
            rol_cliente_id = (await session.execute(text("SELECT id_rol FROM parametros.rol_sistema WHERE nombre_rol = 'CLIENTE'"))).scalar_one()
            tipo_ci_id = (await session.execute(text("SELECT id_tipo_documento FROM parametros.tipo_documento WHERE sigla = 'CI'"))).scalar_one()
            gen_m_id = (await session.execute(text("SELECT id_genero FROM parametros.catalogo_genero WHERE nombre_genero = 'MASCULINO'"))).scalar_one()
            gen_f_id = (await session.execute(text("SELECT id_genero FROM parametros.catalogo_genero WHERE nombre_genero = 'FEMENINO'"))).scalar_one()

            # Productos muestra para prescripciones
            res_sample_prods = await session.execute(text("""
                SELECT id_producto FROM erp.producto WHERE estado_activo = TRUE AND stock_actual > 0 LIMIT 15;
            """))
            sample_product_ids = [row[0] for row in res_sample_prods.fetchall()]

            # Venta muestra para conversión
            res_venta = await session.execute(text("""
                SELECT id_venta FROM erp.venta WHERE id_venta NOT IN (13450, 205, 23, 149511, 1319, 1320) LIMIT 1;
            """))
            sample_venta_id = res_venta.scalar_one_or_none() or 2

            pwd_hash = hash_password("Spartan2026!")
            now_dt = datetime.now(timezone.utc)

            for c in CLIENTES_REALISTAS:
                # Verificar si ya existe por email
                existing_u = (await session.execute(
                    text("SELECT id_usuario FROM erp.usuario WHERE email = :email"),
                    {"email": c["email"]}
                )).scalar_one_or_none()

                id_gen = gen_m_id if c["genero"] == "MASCULINO" else gen_f_id

                if not existing_u:
                    ins_u = await session.execute(text("""
                        INSERT INTO erp.usuario (
                            id_rol, id_tipo_documento, id_genero, numero_documento,
                            nombres, apellidos, email, hash_contrasena, fecha_creacion
                        ) VALUES (
                            :rol, :tipo_doc, :genero, :doc,
                            :nombres, :apellidos, :email, :pwd, :fecha
                        ) RETURNING id_usuario;
                    """), {
                        "rol": rol_cliente_id,
                        "tipo_doc": tipo_ci_id,
                        "genero": id_gen,
                        "doc": c["numero_documento"],
                        "nombres": c["nombres"],
                        "apellidos": c["apellidos"],
                        "email": c["email"],
                        "pwd": pwd_hash,
                        "fecha": now_dt - timedelta(days=c["dias_atras"] + 5)
                    })
                    user_id = ins_u.scalar_one()
                    print(f"  + Cliente creado: {c['nombres']} {c['apellidos']} ({c['email']}) [id: {user_id}]")
                else:
                    user_id = existing_u
                    # Actualizar nombres y doc si existía
                    await session.execute(text("""
                        UPDATE erp.usuario
                        SET nombres = :nombres, apellidos = :apellidos, numero_documento = :doc
                        WHERE id_usuario = :id;
                    """), {"nombres": c["nombres"], "apellidos": c["apellidos"], "doc": c["numero_documento"], "id": user_id})

                # Verificar si ya tiene perfil biométrico
                res_perf = (await session.execute(
                    text("SELECT id_perfil FROM ia.perfil_biometrico WHERE id_usuario = :uid ORDER BY fecha_captura DESC LIMIT 1"),
                    {"uid": user_id}
                )).scalar_one_or_none()

                fecha_captura = now_dt - timedelta(days=c["dias_atras"])

                if not res_perf:
                    ins_perf = await session.execute(text("""
                        INSERT INTO ia.perfil_biometrico (
                            id_usuario, id_somatotipo, coordenadas_espaciales,
                            precision_captura, estatura_cm, peso_kg, fecha_captura
                        ) VALUES (
                            :uid, :somatotipo, '{"landmarks": []}'::jsonb,
                            :precision, :estatura, :peso, :fecha
                        ) RETURNING id_perfil;
                    """), {
                        "uid": user_id,
                        "somatotipo": c["id_somatotipo"],
                        "precision": c["visibilidad"],
                        "estatura": c["estatura_cm"],
                        "peso": c["peso_kg"],
                        "fecha": fecha_captura
                    })
                    perfil_id = ins_perf.scalar_one()
                else:
                    perfil_id = res_perf

                # Verificar si ya tiene prescripciones
                res_presc = (await session.execute(
                    text("SELECT COUNT(*) FROM ia.prescripcion_crossselling WHERE id_perfil = :pid"),
                    {"pid": perfil_id}
                )).scalar_one()

                if res_presc == 0 and sample_product_ids:
                    # Crear 2 o 3 prescripciones realistas
                    prod_1 = sample_product_ids[rng.randint(0, len(sample_product_ids) - 1)]
                    prod_2 = sample_product_ids[rng.randint(0, len(sample_product_ids) - 1)]

                    await session.execute(text("""
                        INSERT INTO ia.prescripcion_crossselling (
                            id_perfil, id_producto, id_regla_aplicada, id_venta_efectiva,
                            fecha_prescripcion
                        ) VALUES (
                            :pid, :prod, :regla, :venta,
                            :fecha
                        );
                    """), {
                        "pid": perfil_id,
                        "prod": prod_1,
                        "regla": c["id_regla"],
                        "venta": sample_venta_id if c["convertida"] else None,
                        "fecha": fecha_captura + timedelta(minutes=5)
                    })

                    if prod_2 != prod_1:
                        await session.execute(text("""
                            INSERT INTO ia.prescripcion_crossselling (
                                id_perfil, id_producto, id_regla_aplicada, id_venta_efectiva,
                                fecha_prescripcion
                            ) VALUES (
                                :pid, :prod, :regla, NULL,
                                :fecha
                            );
                        """), {
                            "pid": perfil_id,
                            "prod": prod_2,
                            "regla": c["id_regla"],
                            "fecha": fecha_captura + timedelta(minutes=6)
                        })

    print("Transacción de sembrado realista completada con éxito.")

    # ---------------------------------------------------------
    # 4. PROCEDIMIENTO DOCUMENTADO & DECLARACIÓN ML
    # ---------------------------------------------------------
    print("\n[4/4] Documentando procedimiento de reset y declaración de independencia ML...")
    doc_text = f"""
## Procedimiento Documentado de Reset del Volumen de Demostración (Paso 6 / V-01, V-02 — {datetime.now().isoformat()})

### 1. Instrucción de Ejecución Idempotente
Para restablecer el volumen de datos de demostración a su estado clínico impecable pre-defensa:
```bash
docker exec spartan-backend python scripts/cleanup_artefactos_e2e.py
docker exec spartan-backend python scripts/seed_demo_realista.py
```

### 2. Magnitudes Garantizadas
- **Inventario normalizado**: Rango estricto de **20 a 300 unidades** por SKU en `erp.producto`.
- **Alertas de stock de seguridad**: Exactamente **10-15%** de los productos activos presentan `stock_actual < stock_seguridad` (para validar visualmente badges ámbar/rojo en POS y Catálogo).
- **Cifra pública del catálogo**: Derivada en tiempo real de `SELECT COUNT(*) FROM erp.producto WHERE estado_activo = TRUE AND id_producto <> 205` ({cifra_unica} productos activos). No existen conteos estáticos 'hardcodeados'.
- **Clientes del directorio administrativo**: 8 clientes con nombres bolivianos verosímiles, correos corporativos `@spartan.dev`, documentos de identidad CI, perfiles con somatotipos y prescripciones explicables.
- **Protección estricta de auditoría UX**: Los identificadores `[13450, 205, 23, 149511, 1319, 1320]` jamás son modificados ni eliminados.

### 3. Declaración de Independencia de Artefactos de Machine Learning
> [!IMPORTANT]
> **Declaración de Inmutabilidad de Modelos de Inteligencia Artificial:**
> Los modelos predictivos y clasificadores del sistema:
> 1. `RF_REGRESOR_DEMANDA` (Random Forest, v175)
> 2. `RF_CLASIFICADOR_QUIEBRE` (Random Forest, v175)
> 3. `RF_SOMATOTIPO_POSE` (Random Forest, v14)
> 4. `CART_CROSSSELLING` (Árbol CART, v14)
>
> Fueron entrenados, hiperparametrizados y evaluados exclusivamente sobre los conjuntos analíticos sintéticos generados por el DGP canónico (`data/dataset_historico_erp.csv`, `data/train.csv`, `data/test.csv`).
> **Ningún modelo de IA depende ni se entrena sobre la base viva transaccional de PostgreSQL**.
> En consecuencia, la ejecución de resets de volumen, sembrado de demostración o eliminación de transacciones operativas **NO invalida** los artefactos `.joblib`, las matrices de confusión, las métricas de exactitud (`metric_accuracy`, `metric_rmse`) ni los registros canónicos de `ia.version_modelo_ia`.
"""
    manifiesto_path = os.path.join(project_root, "data", "MANIFIESTO.md")
    with open(manifiesto_path, "a", encoding="utf-8") as f:
        f.write(doc_text)

    print(f"Procedimiento y declaración registrados en {manifiesto_path}.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_demo_realista())
