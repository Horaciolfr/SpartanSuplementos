import pytest
from httpx import AsyncClient
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.core.security import create_access_token


def auth_bearer(user_id: int, role: str, email: str) -> dict[str, str]:
    token = create_access_token(data={"sub": str(user_id), "rol": role, "email": email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def setup_cliente_con_captura_y_prescripcion():
    """Asegura que el cliente 4 tenga al menos un perfil biométrico y una prescripción para pruebas."""
    async with AsyncSessionLocal() as session:
        # Verificar o crear perfil biométrico para cliente 4 (somatotipo 2 = MESOMORFO)
        res_pb = await session.execute(
            text("SELECT id_perfil FROM ia.perfil_biometrico WHERE id_usuario = 4 ORDER BY fecha_captura DESC LIMIT 1")
        )
        row_pb = res_pb.first()
        if row_pb:
            id_perfil = row_pb[0]
        else:
            ins_pb = await session.execute(
                text("""
                    INSERT INTO ia.perfil_biometrico (
                        id_usuario, id_somatotipo, coordenadas_espaciales, precision_captura, estatura_cm, peso_kg, fecha_captura
                    ) VALUES (
                        4, 2, '{"landmarks": []}'::jsonb, 0.950000, 178.00, 75.00, CURRENT_TIMESTAMP
                    ) RETURNING id_perfil
                """)
            )
            id_perfil = ins_pb.scalar_one()

        # Verificar o crear una prescripción para este perfil
        res_pr = await session.execute(
            text("SELECT id_prescripcion FROM ia.prescripcion_crossselling WHERE id_perfil = :id_perfil LIMIT 1"),
            {"id_perfil": id_perfil}
        )
        row_pr = res_pr.first()
        if not row_pr:
            # Obtener primer producto y primera regla
            id_prod = (await session.execute(text("SELECT id_producto FROM erp.producto LIMIT 1"))).scalar_one()
            id_regla = (await session.execute(text("SELECT id_regla FROM ia.regla_inferencia_cart LIMIT 1"))).scalar_one_or_none()
            await session.execute(
                text("""
                    INSERT INTO ia.prescripcion_crossselling (
                        id_perfil, id_producto, id_regla_aplicada, fecha_prescripcion
                    ) VALUES (
                        :id_perfil, :id_prod, :id_regla, CURRENT_TIMESTAMP
                    )
                """),
                {"id_perfil": id_perfil, "id_prod": id_prod, "id_regla": id_regla}
            )

        await session.commit()
    return 4


@pytest.mark.asyncio
async def test_admin_clientes_lista_payload_y_conteo_sql(client: AsyncClient, setup_cliente_con_captura_y_prescripcion):
    """(a) ADMINISTRADOR 200 con payload completo y conteos coherentes contra SQL."""
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")
    response = await client.get("/admin/clientes", headers=headers_admin)
    assert response.status_code == 200
    data = response.json()

    assert "total" in data
    assert "pagina" in data
    assert "tamano" in data
    assert "items" in data

    # Validar contra SQL directo
    async with AsyncSessionLocal() as session:
        sql_total = (await session.execute(
            text("SELECT count(*) FROM erp.usuario u INNER JOIN parametros.rol_sistema r ON u.id_rol = r.id_rol WHERE r.nombre_rol = 'CLIENTE'")
        )).scalar_one()
    assert data["total"] == sql_total

    # Validar estructura de items
    for item in data["items"]:
        assert "id_usuario" in item
        assert "nombres" in item
        assert "apellidos" in item
        assert "email" in item
        assert "numero_documento" in item
        assert "prescripciones" in item
        assert "total" in item["prescripciones"]
        assert "convertidas" in item["prescripciones"]

        if item["ultimo_perfil"] is not None:
            up = item["ultimo_perfil"]
            assert "id_perfil" in up
            assert "somatotipo" in up
            assert "estatura_cm" in up
            assert "peso_kg" in up
            assert "visibilidad_media" in up
            assert "fecha_captura" in up


@pytest.mark.asyncio
async def test_admin_clientes_filtros_y_orden(client: AsyncClient, setup_cliente_con_captura_y_prescripcion):
    """(b) Filtros: somatotipo reduce el conjunto, conversion, q por email y orden verificable."""
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")

    # 1. Filtro q por email
    res_q = await client.get("/admin/clientes?q=cliente@spartan.dev", headers=headers_admin)
    assert res_q.status_code == 200
    data_q = res_q.json()
    assert data_q["total"] >= 1
    assert all("cliente@spartan.dev" in it["email"] for it in data_q["items"])

    # 2. Filtro somatotipo (id=2 MESOMORFO)
    res_soma = await client.get("/admin/clientes?somatotipo=2", headers=headers_admin)
    assert res_soma.status_code == 200
    data_soma = res_soma.json()
    for it in data_soma["items"]:
        assert it["ultimo_perfil"] is not None
        assert it["ultimo_perfil"]["somatotipo"] == "MESOMORFO"

    # 3. Filtro conversión = true
    res_conv = await client.get("/admin/clientes?conversion=true", headers=headers_admin)
    assert res_conv.status_code == 200
    data_conv = res_conv.json()
    for it in data_conv["items"]:
        assert it["prescripciones"]["convertidas"] > 0

    # 4. Orden por registro reciente vs antiguo
    res_ord_rec = await client.get("/admin/clientes?orden=registro_reciente&tamano=5", headers=headers_admin)
    res_ord_ant = await client.get("/admin/clientes?orden=registro_antiguo&tamano=5", headers=headers_admin)
    items_rec = res_ord_rec.json()["items"]
    items_ant = res_ord_ant.json()["items"]
    if len(items_rec) >= 2:
        assert items_rec[0]["fecha_creacion"] >= items_rec[1]["fecha_creacion"]
    if len(items_ant) >= 2:
        assert items_ant[0]["fecha_creacion"] <= items_ant[1]["fecha_creacion"]


@pytest.mark.asyncio
async def test_admin_clientes_paginacion_sin_solapamiento(client: AsyncClient):
    """(c) Paginación: tamano=2 con total correcto y sin solapamiento entre páginas."""
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")
    res_p1 = await client.get("/admin/clientes?pagina=1&tamano=2", headers=headers_admin)
    res_p2 = await client.get("/admin/clientes?pagina=2&tamano=2", headers=headers_admin)

    assert res_p1.status_code == 200
    assert res_p2.status_code == 200
    d1 = res_p1.json()
    d2 = res_p2.json()

    assert d1["total"] == d2["total"]
    ids_p1 = {it["id_usuario"] for it in d1["items"]}
    ids_p2 = {it["id_usuario"] for it in d2["items"]}
    if len(ids_p1) > 0 and len(ids_p2) > 0:
        assert len(ids_p1.intersection(ids_p2)) == 0, "No debe haber solapamiento de IDs entre páginas"


@pytest.mark.asyncio
async def test_admin_clientes_valida_filtros_y_rango_de_fechas(client: AsyncClient):
    """Los filtros de listado solo aceptan valores soportados y fechas coherentes."""
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")

    invalid_order = await client.get("/admin/clientes?orden=sql_invalido", headers=headers_admin)
    assert invalid_order.status_code == 422

    invalid_conversion = await client.get("/admin/clientes?conversion=tal_vez", headers=headers_admin)
    assert invalid_conversion.status_code == 422

    invalid_range = await client.get(
        "/admin/clientes?desde=2026-12-31&hasta=2026-01-01",
        headers=headers_admin,
    )
    assert invalid_range.status_code == 422


@pytest.mark.asyncio
async def test_admin_clientes_seguridad_rbac(client: AsyncClient):
    """(d) CAJERO, EMPLEADO y CLIENTE reciben 403; sin token 401."""
    # Sin token -> 401
    res_no_auth = await client.get("/admin/clientes")
    assert res_no_auth.status_code == 401

    res_no_auth_det = await client.get("/admin/clientes/4")
    assert res_no_auth_det.status_code == 401

    # CAJERO / EMPLEADO -> 403
    headers_cajero = auth_bearer(3, "CAJERO", "cajero@spartan.dev")
    res_cajero = await client.get("/admin/clientes", headers=headers_cajero)
    assert res_cajero.status_code == 403

    res_cajero_det = await client.get("/admin/clientes/4", headers=headers_cajero)
    assert res_cajero_det.status_code == 403

    headers_empleado = auth_bearer(3, "EMPLEADO", "cajero@spartan.dev")
    res_emp = await client.get("/admin/clientes", headers=headers_empleado)
    assert res_emp.status_code == 403

    # CLIENTE -> 403
    headers_cliente = auth_bearer(4, "CLIENTE", "cliente@spartan.dev")
    res_cli = await client.get("/admin/clientes", headers=headers_cliente)
    assert res_cli.status_code == 403

    res_cli_det = await client.get("/admin/clientes/4", headers=headers_cliente)
    assert res_cli_det.status_code == 403


@pytest.mark.asyncio
async def test_admin_clientes_detalle_no_cliente_y_reglas(client: AsyncClient, setup_cliente_con_captura_y_prescripcion):
    """(e) Detalle de usuario no cliente -> 404; detalle de cliente incluye reglas y conversión."""
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")

    # Usuario 2 es ADMINISTRADOR -> 404
    res_admin_user = await client.get("/admin/clientes/2", headers=headers_admin)
    assert res_admin_user.status_code == 404

    # Usuario inexistente -> 404
    res_nonexistent = await client.get("/admin/clientes/999999", headers=headers_admin)
    assert res_nonexistent.status_code == 404

    # Cliente 4 -> 200 con ficha completa
    res_cli = await client.get("/admin/clientes/4", headers=headers_admin)
    assert res_cli.status_code == 200
    detalle = res_cli.json()

    assert detalle["id_usuario"] == 4
    assert len(detalle["perfiles"]) >= 1
    assert "estatura_cm" in detalle["perfiles"][0]
    assert "peso_kg" in detalle["perfiles"][0]

    if len(detalle["prescripciones"]) > 0:
        pr = detalle["prescripciones"][0]
        assert "producto" in pr
        assert "sku" in pr["producto"]
        assert "stock_actual" in pr["producto"]
        assert "conversion" in pr
        assert "estado" in pr["conversion"]
        assert "regla" in pr

    if detalle["plan_nutricional"] is not None:
        plan = detalle["plan_nutricional"]
        assert "nombre_plan" in plan
        assert "distribucion_macronutrientes" in plan
        assert "pautas" in plan
        assert "comidas_sugeridas" in plan
        assert "disclaimer" in plan
        assert "Contenido informativo por somatotipo" in plan["disclaimer"]


@pytest.mark.asyncio
async def test_admin_clientes_sin_capturas_null_safe(client: AsyncClient):
    """(f) Cliente sin capturas: ultimo_perfil null y plan null, sin error 500."""
    headers_admin = auth_bearer(2, "ADMINISTRADOR", "admin@spartan.dev")

    # Crear cliente sin capturas
    email_test = "cliente_sin_capturas_test@spartan.dev"
    async with AsyncSessionLocal() as session:
        # Verificar si ya existe
        res_check = await session.execute(
            text("SELECT id_usuario FROM erp.usuario WHERE email = :email"),
            {"email": email_test}
        )
        existing = res_check.scalar_one_or_none()
        if existing:
            id_nuevo = existing
        else:
            ins = await session.execute(
                text("""
                    INSERT INTO erp.usuario (
                        id_rol, id_tipo_documento, numero_documento, nombres, apellidos, email, hash_contrasena, esta_verificado
                    ) VALUES (
                        3, 1, 'DOC_SINC_999', 'Cliente', 'Sin Captura', :email, 'hash_placeholder', TRUE
                    ) RETURNING id_usuario
                """),
                {"email": email_test}
            )
            id_nuevo = ins.scalar_one()
            await session.commit()

    # 1. Listado filtrado por este usuario
    res_list = await client.get(f"/admin/clientes?q={email_test}", headers=headers_admin)
    assert res_list.status_code == 200
    data_list = res_list.json()
    assert data_list["total"] >= 1
    item = next(it for it in data_list["items"] if it["id_usuario"] == id_nuevo)
    assert item["ultimo_perfil"] is None
    assert item["plan_nutricional"] is None
    assert item["prescripciones"]["total"] == 0

    # 2. Detalle de este usuario
    res_det = await client.get(f"/admin/clientes/{id_nuevo}", headers=headers_admin)
    assert res_det.status_code == 200
    det_data = res_det.json()
    assert det_data["id_usuario"] == id_nuevo
    assert det_data["perfiles"] == []
    assert det_data["prescripciones"] == []
    assert det_data["plan_nutricional"] is None
