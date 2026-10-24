-- ==========================================
-- FASE 1: ESQUEMAS (Desacople Arquitectónico)
-- ==========================================
CREATE SCHEMA IF NOT EXISTS parametros;
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS ia;

-- ==========================================
-- FASE 2: CATÁLOGOS Y PARÁMETROS (parametros)
-- ==========================================
CREATE TABLE parametros.rol_sistema (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE parametros.tipo_documento (
    id_tipo_documento SERIAL PRIMARY KEY,
    sigla VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE parametros.tipo_operacion_kardex (
    id_tipo_operacion SERIAL PRIMARY KEY,
    nombre_operacion VARCHAR(50) NOT NULL,
    multiplicador INT NOT NULL CHECK (multiplicador IN (-1, 1))
);

CREATE TABLE parametros.catalogo_somatotipo (
    id_somatotipo SERIAL PRIMARY KEY,
    nombre_somatotipo VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE parametros.catalogo_genero (
    id_genero SERIAL PRIMARY KEY,
    nombre_genero VARCHAR(20) UNIQUE NOT NULL
);

-- ==========================================
-- FASE 3: ERP TRANSACCIONAL (erp)
-- ==========================================
CREATE TABLE erp.usuario (
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

CREATE TABLE erp.proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    razon_social VARCHAR(150) UNIQUE NOT NULL,
    nit VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE erp.categoria_producto (
    id_categoria SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE erp.producto (
    id_producto SERIAL PRIMARY KEY,
    id_categoria INT NOT NULL REFERENCES erp.categoria_producto(id_categoria),
    codigo_sku VARCHAR(50) UNIQUE NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_seguridad INT NOT NULL DEFAULT 0,
    estado_activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE erp.compra (
    id_compra BIGSERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL REFERENCES erp.proveedor(id_proveedor),
    id_usuario_registro INT NOT NULL REFERENCES erp.usuario(id_usuario),
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    total_compra DECIMAL(12,2) NOT NULL,
    estado_compra VARCHAR(20) NOT NULL CHECK (estado_compra IN ('RECIBIDO', 'ANULADO')),
    fecha_hora_compra TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE erp.detalle_compra (
    id_detalle_compra BIGSERIAL PRIMARY KEY,
    id_compra BIGINT NOT NULL REFERENCES erp.compra(id_compra),
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    costo_unitario DECIMAL(10,2) NOT NULL
);

CREATE TABLE erp.venta (
    id_venta BIGSERIAL PRIMARY KEY,
    id_cliente INT REFERENCES erp.usuario(id_usuario),
    id_cajero INT NOT NULL REFERENCES erp.usuario(id_usuario),
    numero_recibo VARCHAR(50) UNIQUE NOT NULL,
    total_transaccion DECIMAL(12,2) NOT NULL,
    estado_pago VARCHAR(20) NOT NULL CHECK (estado_pago IN ('PENDIENTE', 'PAGADO', 'ANULADO')),
    fecha_hora_venta TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE erp.detalle_venta (
    id_detalle_venta BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL REFERENCES erp.venta(id_venta),
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_historico DECIMAL(10,2) NOT NULL
);

CREATE TABLE erp.kardex_fisico (
    id_kardex BIGSERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    id_compra BIGINT REFERENCES erp.compra(id_compra),
    id_venta BIGINT REFERENCES erp.venta(id_venta),
    id_tipo_operacion INT NOT NULL REFERENCES parametros.tipo_operacion_kardex(id_tipo_operacion),
    cantidad_movimiento INT NOT NULL,
    saldo_resultante INT NOT NULL,
    fecha_registro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_origen_kardex CHECK (num_nonnulls(id_venta, id_compra) = 1)
);

-- ==========================================
-- FASE 4: DOMINIO IA (ia)
-- ==========================================
CREATE TABLE ia.version_modelo_ia (
    id_version SERIAL PRIMARY KEY,
    algoritmo VARCHAR(100),
    hash_archivo VARCHAR(255) NOT NULL,
    metric_accuracy DECIMAL(5,4),
    metric_rmse DECIMAL(5,4),
    aprobado_produccion BOOLEAN DEFAULT FALSE,
    fecha_entrenamiento TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_version_modelo_ia_activa_algoritmo
    ON ia.version_modelo_ia (algoritmo)
    WHERE aprobado_produccion = TRUE;

CREATE TABLE ia.regla_inferencia_cart (
    id_regla SERIAL PRIMARY KEY,
    id_version INT NOT NULL REFERENCES ia.version_modelo_ia(id_version),
    codigo_regla VARCHAR(50) NOT NULL,
    descripcion_tecnica TEXT,
    umbral_decision DECIMAL(5,2)
);

CREATE TABLE ia.perfil_biometrico (
    id_perfil BIGSERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES erp.usuario(id_usuario),
    id_somatotipo INT REFERENCES parametros.catalogo_somatotipo(id_somatotipo),
    coordenadas_espaciales JSONB NOT NULL,
    precision_captura DECIMAL(8,6),
    estatura_cm DECIMAL(5,2),
    peso_kg DECIMAL(5,2),
    fecha_captura TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ia.prescripcion_crossselling (
    id_prescripcion BIGSERIAL PRIMARY KEY,
    id_perfil BIGINT NOT NULL REFERENCES ia.perfil_biometrico(id_perfil),
    id_producto INT NOT NULL REFERENCES erp.producto(id_producto),
    id_regla_aplicada INT REFERENCES ia.regla_inferencia_cart(id_regla),
    id_venta_efectiva BIGINT REFERENCES erp.venta(id_venta),
    -- Columna computada: Garantiza integridad sin triggers adicionales
    estado_conversion BOOLEAN GENERATED ALWAYS AS (id_venta_efectiva IS NOT NULL) STORED,
    fecha_prescripcion TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- FASE 5: ÍNDICES (Rendimiento y Regla 2.2)
-- ==========================================
-- Índice GIN obligatorio para tensores JSONB
CREATE INDEX idx_landmarks_gin ON ia.perfil_biometrico USING GIN (coordenadas_espaciales jsonb_path_ops);

-- Índices para FK y prevención de Deadlocks en concurrencia
CREATE INDEX idx_erp_kardex_producto_fecha ON erp.kardex_fisico (id_producto, fecha_registro DESC);
CREATE INDEX idx_erp_venta_cliente_fecha ON erp.venta (id_cliente, fecha_hora_venta DESC);
CREATE INDEX idx_erp_detalle_venta_venta ON erp.detalle_venta (id_venta);
CREATE INDEX idx_ia_prescripcion_perfil ON ia.prescripcion_crossselling (id_perfil);

-- ==========================================
-- FASE 6: TRIGGERS (Integridad ACID de Inventario)
-- ==========================================
CREATE OR REPLACE FUNCTION erp.fn_procesar_venta() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE 
    v_saldo INT;
    v_operacion_id INT := 2; -- Asumiendo ID 2 para 'VENTA'
BEGIN
    SELECT stock_actual INTO v_saldo FROM erp.producto WHERE id_producto = NEW.id_producto FOR UPDATE;
    IF v_saldo < NEW.cantidad THEN
        RAISE EXCEPTION 'Quiebre de stock: producto %', NEW.id_producto;
    END IF;
    UPDATE erp.producto SET stock_actual = stock_actual - NEW.cantidad WHERE id_producto = NEW.id_producto;
    INSERT INTO erp.kardex_fisico (id_producto, id_venta, id_tipo_operacion, cantidad_movimiento, saldo_resultante)
    VALUES (NEW.id_producto, NEW.id_venta, v_operacion_id, NEW.cantidad, v_saldo - NEW.cantidad);
    RETURN NEW;
END $$;

CREATE TRIGGER trg_kardex_detalle_venta
AFTER INSERT ON erp.detalle_venta FOR EACH ROW EXECUTE FUNCTION erp.fn_procesar_venta();

CREATE OR REPLACE FUNCTION erp.fn_procesar_compra() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE 
    v_saldo INT;
    v_operacion_id INT := 1; -- Asumiendo ID 1 para 'COMPRA'
BEGIN
    SELECT stock_actual INTO v_saldo FROM erp.producto WHERE id_producto = NEW.id_producto FOR UPDATE;
    UPDATE erp.producto SET stock_actual = stock_actual + NEW.cantidad WHERE id_producto = NEW.id_producto;
    INSERT INTO erp.kardex_fisico (id_producto, id_compra, id_tipo_operacion, cantidad_movimiento, saldo_resultante)
    VALUES (NEW.id_producto, NEW.id_compra, v_operacion_id, NEW.cantidad, v_saldo + NEW.cantidad);
    RETURN NEW;
END $$;

CREATE TRIGGER trg_kardex_detalle_compra
AFTER INSERT ON erp.detalle_compra FOR EACH ROW EXECUTE FUNCTION erp.fn_procesar_compra();
