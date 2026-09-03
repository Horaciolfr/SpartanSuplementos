-- ==========================================================
-- SPARTAN SUPLEMENTOS BOLIVIA — DDL INICIAL DE BASE DE DATOS
-- 3 Esquemas Físicamente Desacoplados: parametros, erp, ia
-- ==========================================================

-- 1. Creación de Esquemas
CREATE SCHEMA IF NOT EXISTS parametros;
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS ia;

-- ==========================================================
-- 2. ESQUEMA: parametros (Catálogos y Reglas)
-- ==========================================================
CREATE TABLE IF NOT EXISTS parametros.rol_sistema (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS parametros.tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    sigla VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS parametros.tipo_operacion_kardex (
    id_tipo_operacion SERIAL PRIMARY KEY,
    nombre_operacion VARCHAR(50) NOT NULL,
    multiplicador INT NOT NULL CHECK (multiplicador IN (-1, 1))
);

CREATE TABLE IF NOT EXISTS parametros.catalogo_somatotipo (
    id_somatotipo SERIAL PRIMARY KEY,
    nombre_somatotipo VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS parametros.catalogo_genero (
    id_genero SERIAL PRIMARY KEY,
    nombre_genero VARCHAR(20) UNIQUE NOT NULL
);

-- ==========================================================
-- 3. ESQUEMA: erp (Módulo Transaccional y Kárdex Físico)
-- ==========================================================
CREATE TABLE IF NOT EXISTS erp.usuario (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES parametros.rol_sistema(id_rol),
    id_tipo_documento INT NOT NULL REFERENCES parametros.tipo_documento(id_tipo_documento),
    id_genero INT REFERENCES parametros.catalogo_genero(id_genero),
    numero_documento VARCHAR(20) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    hash_contrasena VARCHAR(255) NOT NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp.proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    razon_social VARCHAR(150) UNIQUE NOT NULL,
    nit VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.categoria_producto (
    id_categoria SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp.producto (
    id_producto SERIAL PRIMARY KEY,
    id_categoria INT NOT NULL REFERENCES erp.categoria_producto(id_categoria),
    codigo_sku VARCHAR(50) UNIQUE NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_seguridad INT NOT NULL DEFAULT 0,
    estado_activo BOOLEAN NOT NULL DEFAULT TRUE,
    imagen_url VARCHAR(500),
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp.compra (
    id_compra BIGSERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL REFERENCES erp.proveedor(id_proveedor),
    id_usuario_registro INT NOT NULL REFERENCES erp.usuario(id_usuario),
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    total_compra DECIMAL(12,2) NOT NULL,
    estado_compra VARCHAR(20) NOT NULL CHECK (estado_compra IN ('RECIBIDO', 'ANULADO')),
    fecha_hora_compra TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp.detalle_compra (
    id_detalle_compra BIGSERIAL PRIMARY KEY,
    id_compra BIGINT NOT NULL REFERENCES erp.compra(id_compra) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    costo_unitario DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.venta (
    id_venta BIGSERIAL PRIMARY KEY,
    id_cliente INT REFERENCES erp.usuario(id_usuario),
    id_cajero INT NOT NULL REFERENCES erp.usuario(id_usuario),
    numero_recibo VARCHAR(50) UNIQUE NOT NULL,
    total_transaccion DECIMAL(12,2) NOT NULL,
    estado_pago VARCHAR(20) NOT NULL CHECK (estado_pago IN ('PENDIENTE', 'PAGADO', 'ANULADO')),
    fecha_hora_venta TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS erp.detalle_venta (
    id_detalle_venta BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL REFERENCES erp.venta(id_venta) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_historico DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS erp.kardex_fisico (
    id_kardex BIGSERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    id_tipo_operacion INT NOT NULL REFERENCES parametros.tipo_operacion_kardex(id_tipo_operacion),
    id_compra BIGINT REFERENCES erp.compra(id_compra),
    id_venta BIGINT REFERENCES erp.venta(id_venta),
    cantidad_movimiento INT NOT NULL,
    saldo_resultante INT NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_origen_kardex CHECK (num_nonnulls(id_venta, id_compra) = 1)
);

-- ==========================================================
-- 4. ESQUEMA: ia (Visión Artificial y Recomendación)
-- ==========================================================
CREATE TABLE IF NOT EXISTS ia.version_modelo_ia (
    id_version SERIAL PRIMARY KEY,
    hash_archivo VARCHAR(255) UNIQUE NOT NULL,
    metric_accuracy DECIMAL(5,4),
    metric_rmse DECIMAL(5,4),
    aprobado_produccion BOOLEAN DEFAULT FALSE,
    fecha_entrenamiento TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ia.regla_inferencia_cart (
    id_regla SERIAL PRIMARY KEY,
    id_version INT NOT NULL REFERENCES ia.version_modelo_ia(id_version),
    codigo_regla VARCHAR(50) NOT NULL,
    descripcion_tecnica TEXT,
    umbral_decision DECIMAL(5,2)
);

CREATE TABLE IF NOT EXISTS ia.perfil_biometrico (
    id_perfil BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES erp.usuario(id_usuario),
    id_somatotipo INT REFERENCES parametros.catalogo_somatotipo(id_somatotipo),
    coordenadas_espaciales JSONB NOT NULL,
    precision_captura DECIMAL(5,4),
    estatura_cm DECIMAL(5,2),
    peso_kg DECIMAL(5,2),
    fecha_captura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ia.prescripcion_crossselling (
    id_prescripcion BIGSERIAL PRIMARY KEY,
    id_perfil BIGINT NOT NULL REFERENCES ia.perfil_biometrico(id_perfil),
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    id_regla_aplicada INT REFERENCES ia.regla_inferencia_cart(id_regla),
    id_venta_efectiva BIGINT REFERENCES erp.venta(id_venta),
    estado_conversion BOOLEAN GENERATED ALWAYS AS (id_venta_efectiva IS NOT NULL) STORED,
    fecha_prescripcion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 5. ÍNDICES DE RENDIMIENTO Y CONCURRENCIA
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_landmarks_gin ON ia.perfil_biometrico USING GIN (coordenadas_espaciales jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_erp_kardex_producto_fecha ON erp.kardex_fisico (id_producto, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_erp_venta_cliente_fecha ON erp.venta (id_cliente, fecha_hora_venta DESC);
CREATE INDEX IF NOT EXISTS idx_erp_detalle_venta_venta ON erp.detalle_venta (id_venta);
CREATE INDEX IF NOT EXISTS idx_ia_prescripcion_perfil ON ia.prescripcion_crossselling (id_perfil);

-- ==========================================================
-- 6. TRIGGERS: INTEGRIDAD TRANSACCIONAL ACID DE INVENTARIO
-- ==========================================================
CREATE OR REPLACE FUNCTION erp.fn_procesar_venta() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE 
    v_saldo INT;
    v_operacion_id INT := 2; -- ID 2 para 'VENTA'
BEGIN
    -- Bloqueo pesimista de fila para prevenir condición de carrera (Race Condition)
    SELECT stock_actual INTO v_saldo FROM erp.producto WHERE id_producto = NEW.id_producto FOR UPDATE;
    IF v_saldo < NEW.cantidad THEN
        RAISE EXCEPTION 'Quiebre de stock: producto %', NEW.id_producto;
    END IF;
    UPDATE erp.producto SET stock_actual = stock_actual - NEW.cantidad WHERE id_producto = NEW.id_producto;
    INSERT INTO erp.kardex_fisico (id_producto, id_venta, id_tipo_operacion, cantidad_movimiento, saldo_resultante)
    VALUES (NEW.id_producto, NEW.id_venta, v_operacion_id, NEW.cantidad, v_saldo - NEW.cantidad);
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_kardex_detalle_venta ON erp.detalle_venta;
CREATE TRIGGER trg_kardex_detalle_venta
AFTER INSERT ON erp.detalle_venta FOR EACH ROW EXECUTE FUNCTION erp.fn_procesar_venta();

CREATE OR REPLACE FUNCTION erp.fn_procesar_compra() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE 
    v_saldo INT;
    v_operacion_id INT := 1; -- ID 1 para 'COMPRA'
BEGIN
    SELECT stock_actual INTO v_saldo FROM erp.producto WHERE id_producto = NEW.id_producto FOR UPDATE;
    UPDATE erp.producto SET stock_actual = stock_actual + NEW.cantidad WHERE id_producto = NEW.id_producto;
    INSERT INTO erp.kardex_fisico (id_producto, id_compra, id_tipo_operacion, cantidad_movimiento, saldo_resultante)
    VALUES (NEW.id_producto, NEW.id_compra, v_operacion_id, NEW.cantidad, v_saldo + NEW.cantidad);
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_kardex_detalle_compra ON erp.detalle_compra;
CREATE TRIGGER trg_kardex_detalle_compra
AFTER INSERT ON erp.detalle_compra FOR EACH ROW EXECUTE FUNCTION erp.fn_procesar_compra();
