import pytest
from httpx import AsyncClient
from sqlalchemy import text
from app.core.database import engine
from app.core.security import create_access_token


def auth_bearer(user_id: int, role: str, email: str) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def setup_test_perfil():
    """Garantiza la existencia de un perfil biométrico para el usuario 4 (CLIENTE)."""
    async with engine.begin() as conn:
        res = await conn.execute(
            text("""
                SELECT id_perfil, id_usuario, id_somatotipo
                FROM ia.perfil_biometrico
                WHERE id_usuario = 4
                ORDER BY fecha_captura DESC
                LIMIT 1
            """)
        )
        row = res.fetchone()
        if row:
            id_perfil = row[0]
        else:
            ins = await conn.execute(
                text("""
                    INSERT INTO ia.perfil_biometrico (
                        id_usuario, id_somatotipo, coordenadas_espaciales, precision_captura, estatura_cm, peso_kg, fecha_captura
                    ) VALUES (
                        4, 2, '{"landmarks": []}'::jsonb, 0.95, 178.0, 75.0, CURRENT_TIMESTAMP
                    )
                    RETURNING id_perfil
                """)
            )
            id_perfil = ins.scalar_one()

    return id_perfil


@pytest.mark.asyncio
async def test_a_propiedad_ninguna_prescripcion_con_stock_menor_o_igual_a_cero(client: AsyncClient, setup_test_perfil):
    """
    (a) Propiedad innegociable de inventario:
    Fuerza el stock de un producto candidato a 0 y verifica que el motor de prescripción
    lo excluye categóricamente mediante el gate en la consulta SQL (stock_actual > 0).
    """
    id_perfil = setup_test_perfil

    # 1. Obtener una prescripción inicial para identificar un producto candidato
    headers = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")
    resp_init = await client.post(f"/ia/prescripcion/{id_perfil}/generar", headers=headers)
    assert resp_init.status_code == 200, resp_init.text
    data_init = resp_init.json()
    assert len(data_init["prescripciones"]) > 0

    producto_a_agotar = data_init["prescripciones"][0]["id_producto"]

    # 2. Forzar stock_actual = 0 en base de datos de forma transaccional autorizada
    async with engine.begin() as conn:
        await conn.execute(text("SET LOCAL app.kardex_interno = 'on'"))
        stock_previo_res = await conn.execute(
            text("SELECT stock_actual FROM erp.producto WHERE id_producto = :id"),
            {"id": producto_a_agotar}
        )
        stock_original = stock_previo_res.scalar_one()

        await conn.execute(
            text("UPDATE erp.producto SET stock_actual = 0 WHERE id_producto = :id"),
            {"id": producto_a_agotar}
        )

    try:
        # 3. Regenerar prescripción y verificar exclusión estricta
        resp_recalc = await client.post(f"/ia/prescripcion/{id_perfil}/generar", headers=headers)
        assert resp_recalc.status_code == 200
        data_recalc = resp_recalc.json()

        ids_prescritos = [p["id_producto"] for p in data_recalc["prescripciones"]]
        assert producto_a_agotar not in ids_prescritos, (
            f"VIOLACIÓN DE GATE: Producto {producto_a_agotar} con stock 0 fue prescrito."
        )

        for p in data_recalc["prescripciones"]:
            assert p["stock_actual"] > 0, f"Producto {p['id_producto']} con stock {p['stock_actual']} <= 0"

    finally:
        # 4. Restaurar stock original
        async with engine.begin() as conn:
            await conn.execute(text("SET LOCAL app.kardex_interno = 'on'"))
            await conn.execute(
                text("UPDATE erp.producto SET stock_actual = :stock WHERE id_producto = :id"),
                {"stock": stock_original, "id": producto_a_agotar}
            )


@pytest.mark.asyncio
async def test_b_solo_reglas_de_version_aprobada(client: AsyncClient, setup_test_perfil):
    """
    (b) Verifica que todas las recomendaciones provengan exclusivamente
    de las reglas asociadas a la versión de CART aprobada en producción.
    """
    id_perfil = setup_test_perfil
    headers = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")

    resp = await client.post(f"/ia/prescripcion/{id_perfil}/generar", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["prescripciones"]) > 0

    # Consultar id_version aprobada
    async with engine.connect() as conn:
        ver_res = await conn.execute(
            text("""
                SELECT id_version FROM ia.version_modelo_ia
                WHERE algoritmo = 'CART_CROSSSELLING' AND aprobado_produccion = TRUE
                ORDER BY id_version DESC LIMIT 1
            """)
        )
        id_version_activa = ver_res.scalar_one()

        reglas_activas_res = await conn.execute(
            text("SELECT id_regla FROM ia.regla_inferencia_cart WHERE id_version = :ver"),
            {"ver": id_version_activa}
        )
        reglas_validas = {row[0] for row in reglas_activas_res.fetchall()}

    for item in data["prescripciones"]:
        assert item["id_regla_aplicada"] in reglas_validas, (
            f"Regla {item['id_regla_aplicada']} no pertenece a la versión activa {id_version_activa}"
        )


@pytest.mark.asyncio
async def test_c_conversion_materializa_id_venta_efectiva(client: AsyncClient, setup_test_perfil):
    """
    (c) Conversión en POS: tras commit de la venta de un producto prescrito
    a un cliente con perfil reciente, id_venta_efectiva se materializa
    y estado_conversion pasa a TRUE.
    """
    id_perfil = setup_test_perfil
    headers_cliente = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")

    # 1. Asegurar prescripción abierta para el cliente 4
    resp_presc = await client.post(f"/ia/prescripcion/{id_perfil}/generar", headers=headers_cliente)
    assert resp_presc.status_code == 200
    presc_data = resp_presc.json()
    assert len(presc_data["prescripciones"]) > 0

    primer_item = presc_data["prescripciones"][0]
    id_producto_prescrito = primer_item["id_producto"]
    id_prescripcion_esperada = primer_item["id_prescripcion"]

    # 2. Sesión con rol CAJERO para registrar la venta. El permiso se prueba
    # de forma aislada, sin depender de la contraseña de una cuenta demo.
    headers_cajero = auth_bearer(3, "CAJERO", "cajero@spartan.dev")

    # 3. Realizar venta del producto prescrito al cliente 4
    payload_venta = {
        "id_cliente": 4,
        "items": [
            {"id_producto": id_producto_prescrito, "cantidad": 1}
        ]
    }
    resp_venta = await client.post("/pos/ventas", json=payload_venta, headers=headers_cajero)
    assert resp_venta.status_code == 201, resp_venta.text
    venta_data = resp_venta.json()
    id_venta_generada = venta_data["id_venta"]

    # 4. Verificar en base de datos que la prescripción quedó convertida
    async with engine.connect() as conn:
        res = await conn.execute(
            text("""
                SELECT id_venta_efectiva, estado_conversion
                FROM ia.prescripcion_crossselling
                WHERE id_prescripcion = :id_presc
            """),
            {"id_presc": id_prescripcion_esperada}
        )
        row = res.fetchone()
        assert row is not None
        id_venta_efectiva, estado_conversion = row
        assert id_venta_efectiva == id_venta_generada, (
            f"id_venta_efectiva={id_venta_efectiva}, esperado {id_venta_generada}"
        )
        assert estado_conversion is True, "estado_conversion debe ser TRUE tras la venta"


@pytest.mark.asyncio
async def test_d_control_acceso_rbac_prescripcion(client: AsyncClient, setup_test_perfil):
    """
    (d) Control de acceso RBAC:
    - Sin token -> 401 Unauthorized
    - Token de cliente ajeno -> 403 Forbidden
    - Token del titular o ADMIN -> 200 OK
    """
    id_perfil = setup_test_perfil

    # Sin token
    r_unauth = await client.get(f"/ia/prescripcion/{id_perfil}")
    assert r_unauth.status_code == 401

    # Token de otro cliente (ej. usuario 5 intentando ver perfil de usuario 4)
    headers_ajeno = auth_bearer(5, "CLIENTE", "ajeno@spartan.dev")
    r_forbidden = await client.get(f"/ia/prescripcion/{id_perfil}", headers=headers_ajeno)
    assert r_forbidden.status_code == 403

    # Token del titular (usuario 4)
    headers_titular = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")
    r_ok = await client.get(f"/ia/prescripcion/{id_perfil}", headers=headers_titular)
    assert r_ok.status_code == 200

    # Token de Administrador (usuario 2)
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")
    r_admin_ok = await client.get(f"/ia/prescripcion/{id_perfil}", headers=headers_admin)
    assert r_admin_ok.status_code == 200


@pytest.mark.asyncio
async def test_e_doble_get_idempotente_sin_duplicar_filas(client: AsyncClient, setup_test_perfil):
    """
    (e) Verificación de idempotencia estricta en GET /ia/prescripcion/{id} (F-04):
    Múltiples lecturas consecutivas no ejecutan mutación ni alteran el conteo
    de filas en ia.prescripcion_crossselling.
    """
    id_perfil = setup_test_perfil
    headers_titular = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")

    # 1. Asegurar estado inicial con POST /generar
    resp_gen = await client.post(f"/ia/prescripcion/{id_perfil}/generar", headers=headers_titular)
    assert resp_gen.status_code == 200

    # 2. Medir conteo inicial de prescripciones en BD
    async with engine.connect() as conn:
        res_count = await conn.execute(
            text("SELECT count(*) FROM ia.prescripcion_crossselling WHERE id_perfil = :id"),
            {"id": id_perfil}
        )
        count_inicial = res_count.scalar_one()
        assert count_inicial > 0

    # 3. Primer GET (lectura)
    resp_get_1 = await client.get(f"/ia/prescripcion/{id_perfil}", headers=headers_titular)
    assert resp_get_1.status_code == 200
    data_1 = resp_get_1.json()

    # 4. Segundo GET (lectura repetida)
    resp_get_2 = await client.get(f"/ia/prescripcion/{id_perfil}", headers=headers_titular)
    assert resp_get_2.status_code == 200
    data_2 = resp_get_2.json()

    # Los datos deben ser idénticos
    assert data_1 == data_2

    # 5. Medir conteo posterior en BD y certificar idempotencia
    async with engine.connect() as conn:
        res_count_post = await conn.execute(
            text("SELECT count(*) FROM ia.prescripcion_crossselling WHERE id_perfil = :id"),
            {"id": id_perfil}
        )
        count_post = res_count_post.scalar_one()

    assert count_inicial == count_post, (
        f"VIOLACIÓN DE IDEMPOTENCIA: El conteo de filas cambió de {count_inicial} a {count_post} tras doble GET."
    )

