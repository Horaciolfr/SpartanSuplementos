"""Módulo de ejercicios, plantillas de rutinas y puente plantilla_ejercicio (Bloque 37).

Revision ID: b370001
Revises: b360001
"""

from typing import Sequence, Union
from alembic import op

revision: str = "b370001"
down_revision: Union[str, Sequence[str], None] = "b360001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Crear tabla parametros.ejercicio
    op.execute("""
        CREATE TABLE IF NOT EXISTS parametros.ejercicio (
            id_ejercicio SERIAL PRIMARY KEY,
            codigo VARCHAR(10) UNIQUE NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            categoria VARCHAR(30) NOT NULL,
            somatotipo_afin VARCHAR(30) NOT NULL,
            objetivo VARCHAR(10) NOT NULL,
            grupo_muscular VARCHAR(100) NULL,
            instrucciones TEXT NULL,
            url_gif VARCHAR(255) NULL,
            disclaimer TEXT NOT NULL DEFAULT 'Contenido de entrenamiento ilustrativo; consulte a un profesional antes de ejecutar.',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_ejercicio_codigo ON parametros.ejercicio(codigo);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_ejercicio_cat_soma_obj ON parametros.ejercicio(categoria, somatotipo_afin, objetivo);")

    # 2. Crear tabla parametros.rutina_plantilla
    op.execute("""
        CREATE TABLE IF NOT EXISTS parametros.rutina_plantilla (
            id_plantilla SERIAL PRIMARY KEY,
            nombre VARCHAR(120) NOT NULL,
            somatotipo_afin VARCHAR(30) NOT NULL,
            objetivo VARCHAR(10) NOT NULL,
            frecuencia VARCHAR(80) NOT NULL,
            enfoque VARCHAR(150) NOT NULL,
            descanso_general VARCHAR(150) NOT NULL,
            dias_semana INT NOT NULL DEFAULT 3,
            disclaimer TEXT NOT NULL DEFAULT 'Contenido de entrenamiento informativo por somatotipo; no constituye asesoría médica ni prescripción física profesional.',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_rutina_plantilla_soma_obj ON parametros.rutina_plantilla(somatotipo_afin, objetivo);")

    # 3. Crear tabla parametros.plantilla_ejercicio
    op.execute("""
        CREATE TABLE IF NOT EXISTS parametros.plantilla_ejercicio (
            id_plantilla INT NOT NULL REFERENCES parametros.rutina_plantilla(id_plantilla) ON DELETE CASCADE,
            id_ejercicio INT NOT NULL REFERENCES parametros.ejercicio(id_ejercicio) ON DELETE CASCADE,
            dia INT NOT NULL,
            orden INT NOT NULL,
            series INT NOT NULL DEFAULT 3,
            repeticiones VARCHAR(30) NOT NULL DEFAULT '10-12',
            descanso_seg INT NOT NULL DEFAULT 60,
            nota_tecnica TEXT NULL,
            PRIMARY KEY (id_plantilla, id_ejercicio, dia, orden)
        );
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_plantilla_ejercicio_plantilla ON parametros.plantilla_ejercicio(id_plantilla);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_plantilla_ejercicio_ejercicio ON parametros.plantilla_ejercicio(id_ejercicio);")

    # 4. Asegurar columna objetivo en erp.usuario
    op.execute("ALTER TABLE erp.usuario ADD COLUMN IF NOT EXISTS objetivo VARCHAR(10) NULL;")
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

    # 5. Seed idempotente de los 20 ejercicios ordenados (EJ-001 a EJ-020)
    op.execute("""
        INSERT INTO parametros.ejercicio (
            codigo, nombre, categoria, somatotipo_afin, objetivo, grupo_muscular, disclaimer
        ) VALUES
        ('EJ-001', 'Sentadilla trasera con barra', 'PIERNAS', 'MESO', 'GM', 'Cuádriceps, Glúteos, Cadena posterior', 'Ejecutar con control excéntrico y apoyo plantar completo.'),
        ('EJ-002', 'Peso muerto convencional', 'TIRON', 'MESO', 'GM', 'Isquiosurales, Glúteos, Espalda baja, Dorsales', 'Mantener columna neutra y barra pegada a las espinillas.'),
        ('EJ-003', 'Press de banca con barra', 'EMPUJE', 'MESO', 'GM', 'Pectorales, Deltoides anterior, Tríceps', 'Retraer escápulas y controlar la fase excéntrica hasta el esternón.'),
        ('EJ-004', 'Dominadas estrictas', 'TIRON', 'ECT-MESO', 'GM', 'Dorsal ancho, Bíceps, Redondo mayor', 'Rango completo sin balanceo ni impulso lumbar.'),
        ('EJ-005', 'Flexiones de pecho', 'EMPUJE', 'ECT-MESO', 'MANT', 'Pectorales, Tríceps, Deltoides anterior, Core', 'Mantener alineación tronco-cadera con core activo en todo momento.'),
        ('EJ-006', 'Fondos en paralelas', 'EMPUJE', 'MESO', 'GM', 'Pectorales inferiores, Tríceps, Deltoides anterior', 'Descender hasta 90 grados en codos evitando hiperextensión de hombros.'),
        ('EJ-007', 'Sit-up / crunch', 'CORE', 'ENDO', 'PP', 'Recto abdominal, Flexores de cadera', 'Flexión controlada con activación diafragmática sin tirar del cuello.'),
        ('EJ-008', 'Salto de cuerda', 'CONDICION', 'ENDO', 'PP', 'Gemelos, Sóleo, Sistema cardiovascular', 'Impacto suave con el antepié y cadencia constante.'),
        ('EJ-009', 'Burpees', 'CONDICION', 'MESO-ENDO', 'PP', 'Cuerpo completo, Capacidad aeróbica y anaeróbica', 'Transición fluida sin colapsar la zona lumbar en la caída.'),
        ('EJ-010', 'Bipedestación activa / evaluación postural', 'MOVILIDAD', 'TODOS', 'MANT', 'Erectores espinales, Estabilizadores escapulares', 'Alineación occipucio-escápula-sacro con pelvis neutra.'),
        ('EJ-011', 'Remo con barra', 'TIRON', 'MESO', 'GM', 'Dorsales, Romboides, Trapecios, Bíceps', 'Torso a 45 grados y tracción firme hacia la cadera baja.'),
        ('EJ-012', 'Press militar de pie', 'EMPUJE', 'MESO', 'GM', 'Deltoides medio y anterior, Tríceps, Serratos', 'Glúteos y abdomen contraídos para proteger la lordosis lumbar.'),
        ('EJ-013', 'Zancadas caminando', 'PIERNAS', 'MESO-ENDO', 'PP', 'Cuádriceps, Glúteos, Isquiotibiales', 'Paso amplio controlando que la rodilla delantera no se desvíe en valgo.'),
        ('EJ-014', 'Peso muerto rumano', 'PIERNAS', 'MESO', 'GM', 'Isquiosurales, Glúteo mayor, Erectores espinales', 'Bisagra de cadera pronunciada con rodillas semirrígidas.'),
        ('EJ-015', 'Curl de bíceps con barra', 'TIRON', 'ECT-MESO', 'GP', 'Bíceps braquial, Braquial anterior', 'Codos estables pegados al torso sin balanceo compensatorio.'),
        ('EJ-016', 'Extensión de tríceps en polea', 'EMPUJE', 'MESO', 'MANT', 'Tríceps braquial (cabeza lateral y medial)', 'Extensión completa con bloqueo de codos en posición vertical.'),
        ('EJ-017', 'Plancha frontal', 'CORE', 'ENDO', 'PP', 'Recto abdominal, Transverso abdominal, Oblicuos', 'Tensión isométrica global con retroversión pélvica leve.'),
        ('EJ-018', 'Elevaciones laterales', 'EMPUJE', 'MESO', 'GM', 'Deltoides lateral', 'Elevación hasta la altura de los hombros guiando con el codo.'),
        ('EJ-019', 'Bicicleta estática intervalos', 'CONDICION', 'ENDO', 'PP', 'Cuádriceps, Gemelos, Capacidad aeróbica', 'Intervalos HIIT de 30s de cadencia máxima por 30s de recuperación activa.'),
        ('EJ-020', 'Hip thrust', 'PIERNAS', 'MESO', 'GM', 'Glúteo mayor, Isquiosurales', 'Apoyo en borde inferior escapular con retroversión y bloqueo apical.')
        ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            categoria = EXCLUDED.categoria,
            somatotipo_afin = EXCLUDED.somatotipo_afin,
            objetivo = EXCLUDED.objetivo,
            grupo_muscular = EXCLUDED.grupo_muscular;
    """)

    # 6. Seed idempotente de las 8 plantillas de rutina
    op.execute("""
        INSERT INTO parametros.rutina_plantilla (
            id_plantilla, nombre, somatotipo_afin, objetivo, frecuencia, enfoque, descanso_general, dias_semana
        ) VALUES
        (1, 'Ectomorfo Hipertrofia y Superávit', 'ECT', 'GP', '3 días por semana (Full Body / Tensión Mecánica)', 'Sobrecarga Progresiva y Estímulo Hipertrófico', '90-120 seg para regeneración de fosfágenos', 3),
        (2, 'Ectomorfo Fuerza Funcional y Tono', 'ECT', 'MANT', '3 días por semana (Fuerza Relativa y Estabilidad)', 'Fuerza Muscular y Adaptación Neuro-muscular', '60-90 seg entre series controladas', 3),
        (3, 'Ecto-Mesomorfo Densidad Sarcomérica', 'ECT-MESO', 'GM', '4 días por semana (Torso / Pierna Ondulante)', 'Volumen Efectivo e Hipertrofia Miofibrilar', '75-90 seg para balance fatiga/tensión', 4),
        (4, 'Mesomorfo Hipertrofia PPL Progresiva', 'MESO', 'GM', '3 días por semana (Push / Pull / Legs)', 'Tensión Mecánica Alta y Daño Muscular Óptimo', '60-90 seg con foco en técnica estricta', 3),
        (5, 'Mesomorfo Recomposición y Rendimiento', 'MESO', 'MANT', '3 días por semana (Full Body Atlético)', 'Equilibrio Metabólico y Densidad Muscular', '60-75 seg entre series compuestas', 3),
        (6, 'Meso-Endomorfo Potencia y Gasto Metabólico', 'MESO-ENDO', 'PP', '3 días por semana (Complejos Metabólicos)', 'Preservación Magra y Oxidación Lipídica', '45-60 seg para sostener pulso elevado', 3),
        (7, 'Endomorfo Quema Lipídica e Intervalos', 'ENDO', 'PP', '3 días por semana (Circuito Metabólico HIIT)', 'Densidad de Trabajo y Gasto Energético Elevado', '30-45 seg con alta demanda cardiovascular', 3),
        (8, 'Endomorfo Control Metabólico y Resistencia', 'ENDO', 'MANT', '3 días por semana (Fuerza Resistencia)', 'Soporte Metabólico y Sensibilidad Insulínica', '45-60 seg con control de esfuerzo', 3)
        ON CONFLICT (id_plantilla) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            somatotipo_afin = EXCLUDED.somatotipo_afin,
            objetivo = EXCLUDED.objetivo,
            frecuencia = EXCLUDED.frecuencia,
            enfoque = EXCLUDED.enfoque,
            descanso_general = EXCLUDED.descanso_general,
            dias_semana = EXCLUDED.dias_semana;
    """)

    # 7. Seed idempotente de los ejercicios por plantilla (plantilla_ejercicio)
    op.execute("""
        INSERT INTO parametros.plantilla_ejercicio (
            id_plantilla, id_ejercicio, dia, orden, series, repeticiones, descanso_seg, nota_tecnica
        ) VALUES
        -- Plantilla 1: ECT GP (3 días x 4 ejercicios = 12)
        (1, 3, 1, 1, 4, '8-10', 90, 'Controlar descenso en 3 segundos; empuje explosivo sin despegar glúteos.'),
        (1, 15, 1, 2, 3, '10-12', 60, 'Mantener codos fijos a los costados; evitar flexión lumbar compensatoria.'),
        (1, 16, 1, 3, 3, '10-12', 60, 'Extensión terminal estricta; mantener muñecas alineadas con antebrazo.'),
        (1, 10, 1, 4, 3, '30 seg', 45, 'Alineación axial activa contra pared; estabilizar escápulas y pelvis.'),
        (1, 1, 2, 1, 4, '8-10', 120, 'Descenso profundo controlado; romper paralelo con rodillas alineadas.'),
        (1, 14, 2, 2, 3, '10-12', 90, 'Bisagra de cadera pura; sentir estiramiento controlado en isquiosurales.'),
        (1, 17, 2, 3, 3, '45 seg', 60, 'Isometría firme; mantener línea recta talón-cadera-hombro.'),
        (1, 13, 2, 4, 3, '12 por lado', 60, 'Zancada amplia; torso erguido con centro de gravedad bajo.'),
        (1, 4, 3, 1, 4, '6-8', 90, 'Agarre prono amplio; barbilla sobre la barra sin hiperextender cuello.'),
        (1, 11, 3, 2, 4, '8-10', 90, 'Torso a 45 grados; tracción hacia ombligo juntando escápulas al final.'),
        (1, 12, 3, 3, 3, '8-10', 90, 'Empuje vertical estricto; bloqueo de glúteos para estabilidad espinal.'),
        (1, 18, 3, 4, 3, '12-15', 60, 'Guía de movimiento con codos; pausa isométrica de 1s en paralelo.'),

        -- Plantilla 2: ECT MANT (3 días x 3 ejercicios = 9)
        (2, 5, 1, 1, 4, '12-15', 60, 'Rango completo tocando pecho al suelo; empuje firme con codos a 45°.'),
        (2, 4, 1, 2, 3, '8-10', 90, 'Descenso controlado de 2s; pecho buscando la barra.'),
        (2, 10, 1, 3, 3, '45 seg', 45, 'Consciencia postural y respiración costodiafragmática profunda.'),
        (2, 1, 2, 1, 3, '10-12', 90, 'Peso en talón y mediopié; tronco estable sin colapso torácico.'),
        (2, 13, 2, 2, 3, '12 por lado', 60, 'Rodilla trasera a 2 cm del suelo; cadera cuadrada al frente.'),
        (2, 17, 2, 3, 3, '60 seg', 60, 'Activar serrato anterior empujando activamente el suelo con antebrazos.'),
        (2, 12, 3, 1, 3, '10-12', 60, 'Recorrido limpio sin arquear espalda baja.'),
        (2, 11, 3, 2, 3, '10-12', 60, 'Mantener curvatura lumbar neutra durante todo el recorrido.'),
        (2, 7, 3, 3, 3, '15-20', 45, 'Contracción abdominal rítmica sin impulso de brazos.'),

        -- Plantilla 3: ECT-MESO GM (4 días x 3 ejercicios = 12)
        (3, 3, 1, 1, 4, '6-8', 90, 'Barra a línea mamilar; impulso con retracción escapular activa.'),
        (3, 6, 1, 2, 3, '8-10', 75, 'Inclinación de 15° para enfatizar fibras esternocostales.'),
        (3, 18, 1, 3, 4, '12-15', 60, 'Control excéntrico sin rebote; tensión constante en deltoides medio.'),
        (3, 4, 2, 1, 4, '8-10', 90, 'Tracción explosiva; cadencia 2-0-1-0.'),
        (3, 11, 2, 2, 4, '8-10', 90, 'Mantener espalda fija; tirar llevando codos atrás de las costillas.'),
        (3, 15, 2, 3, 3, '10-12', 60, 'Supinación completa; contracción isométrica en punto de máxima flexión.'),
        (3, 1, 3, 1, 4, '8-10', 120, 'Cadencia 3-1-1-0; soporte respiratorio intraabdominal (Valsalva moderado).'),
        (3, 20, 3, 2, 4, '10-12', 90, 'Pies a 90° respecto a rodillas en el punto más alto; retroversión final.'),
        (3, 14, 3, 3, 3, '8-10', 90, 'Sentir elongación isquiotibial profunda antes de extender cadera.'),
        (3, 12, 4, 1, 4, '8-10', 90, 'Presionar barra en vertical recta pasando rasante a la frente.'),
        (3, 2, 4, 2, 3, '5-6', 120, 'Tensión previa en la barra ("quitar la holgura") antes de despegar.'),
        (3, 16, 4, 3, 3, '12-15', 60, 'Extender tríceps manteniendo codos pegados a costillas.'),

        -- Plantilla 4: MESO GM (3 días x 4 ejercicios = 12)
        (4, 3, 1, 1, 4, '6-8', 90, 'Pesado con RPE 8-8.5; control estricto de la barra en la bajada.'),
        (4, 12, 1, 2, 4, '8-10', 90, 'Fuerza balística concéntrica y descenso controlado en 2 segundos.'),
        (4, 6, 1, 3, 3, '10-12', 75, 'Bajar hasta 90 grados; extensión potente sin hiperextender codos.'),
        (4, 18, 1, 4, 4, '12-15', 60, 'Series efectivas al fallo técnico en repetición 15.'),
        (4, 2, 2, 1, 3, '5', 120, 'Levantamiento pesado de potencia; empujar activamente el suelo con los pies.'),
        (4, 11, 2, 2, 4, '6-8', 90, 'Tracción pesada con barra rígida; tensión en cadena posterior.'),
        (4, 4, 2, 3, 4, '8', 90, 'Dominadas con pausa de 1 segundo arriba; descenso lento.'),
        (4, 15, 2, 4, 3, '10', 60, 'Movimiento aislado sin compensación dorsal.'),
        (4, 1, 3, 1, 4, '6-8', 120, 'Sentadilla pesada; activar glúteos en la salida del agujero.'),
        (4, 20, 3, 2, 4, '8-10', 90, 'Carga pesada con almohadilla; aguantar 2 segundos en contracción máxima.'),
        (4, 14, 3, 3, 3, '8-10', 90, 'Cadencia lenta en descenso; mantener hombros alejados de orejas.'),
        (4, 13, 3, 4, 3, '12 por lado', 60, 'Equilibrio y zancada dinámica para hipertrofia de piernas completas.'),

        -- Plantilla 5: MESO MANT (3 días x 4 ejercicios = 12)
        (5, 3, 1, 1, 3, '10-12', 75, 'Mantener ritmo fluido y tempo controlado 2-0-1.'),
        (5, 11, 1, 2, 3, '10-12', 75, 'Foco en hipertrofia funcional de espalda media.'),
        (5, 16, 1, 3, 3, '12', 60, 'Trabajo accesorio de tríceps con polea.'),
        (5, 10, 1, 4, 2, '60 seg', 45, 'Reajuste postural y movilidad torácica activa.'),
        (5, 1, 2, 1, 3, '8-10', 90, 'Profundidad simétrica; control de cargas medias.'),
        (5, 20, 2, 2, 3, '10-12', 75, 'Estímulo de glúteo e isquiotibiales sin fatiga excesiva.'),
        (5, 17, 2, 3, 3, '60 seg', 45, 'Resistencia estática abdominal y estabilización torácica.'),
        (5, 8, 2, 4, 3, '2 min', 60, 'Salto continuo a ritmo medio para activación vascular.'),
        (5, 12, 3, 1, 3, '8-10', 75, 'Press de hombros fluido protegiendo articulación glenohumeral.'),
        (5, 5, 3, 2, 3, '15-20', 60, 'Trabajo de resistencia en empuje horizontal.'),
        (5, 14, 3, 3, 3, '10', 75, 'Elongación activa de femorales.'),
        (5, 18, 3, 4, 3, '12', 45, 'Aislamiento de hombro con técnica impecable.'),

        -- Plantilla 6: MESO-ENDO PP (3 días x 4 ejercicios = 12)
        (6, 1, 1, 1, 4, '10-12', 75, 'Sentadilla dinámica para elevar gasto energético inicial.'),
        (6, 9, 1, 2, 4, '12', 60, 'Transición rápida suelo-salto con máxima potencia.'),
        (6, 13, 1, 3, 3, '14 por lado', 60, 'Tensión constante en cuádriceps y glúteos.'),
        (6, 8, 1, 4, 3, '3 min', 45, 'Salto de cuerda a ritmo competitivo para aceleración de FC.'),
        (6, 3, 2, 1, 4, '10', 75, 'Press banca con peso moderado y poco descanso.'),
        (6, 11, 2, 2, 4, '10', 75, 'Remo denso manteniendo pulso cardíaco en zona aeróbica alta.'),
        (6, 7, 2, 3, 4, '15-20', 45, 'Flexiones abdominales cortas y continuas.'),
        (6, 19, 2, 4, 1, '15 min', 60, 'Intervalos en bici estática (40s rápido / 20s descanso).'),
        (6, 14, 3, 1, 4, '10', 75, 'Cadena posterior activa con estímulo metabólico elevado.'),
        (6, 6, 3, 2, 3, '10-12', 60, 'Fondos a peso corporal con velocidad controlada.'),
        (6, 17, 3, 3, 4, '45 seg', 45, 'Plancha firme con respiración diafragmática sostenida.'),
        (6, 9, 3, 4, 3, '10', 45, 'Finalizador metabólico en circuito.'),

        -- Plantilla 7: ENDO PP (3 días x 4 ejercicios = 12)
        (7, 13, 1, 1, 4, '12 por lado', 45, 'Movimiento continuo y fluido para maximizar flujo sanguíneo.'),
        (7, 8, 1, 2, 4, '3 min', 45, 'Cuerda continua con paso ligero sobre la punta de pies.'),
        (7, 7, 1, 3, 4, '20', 30, 'Abdomen en compresión continua sin tirones cervicales.'),
        (7, 19, 1, 4, 1, '20 min', 60, 'Cardio interválico en bicicleta estática (Zona 3-4).'),
        (7, 5, 2, 1, 4, '12-15', 45, 'Flexiones con pausas mínimas para fatiga metabólica.'),
        (7, 9, 2, 2, 4, '12', 45, 'Burpees a ritmo sostenible sin pausas entre fases.'),
        (7, 17, 2, 3, 4, '60 seg', 30, 'Tensión central máxima y glúteos firmes.'),
        (7, 10, 2, 4, 3, '45 seg', 30, 'Descanso activo con descompresión postural.'),
        (7, 20, 3, 1, 3, '12-15', 60, 'Contracción fuerte de glúteo en cada repetición.'),
        (7, 11, 3, 2, 3, '12', 45, 'Remo controlado cuidando la técnica lumbar ante fatiga.'),
        (7, 7, 3, 3, 4, '20', 30, 'Circuito abdominal denso de alta frecuencia.'),
        (7, 8, 3, 4, 4, '2 min', 45, 'Cierre vascular con salto a la comba.'),

        -- Plantilla 8: ENDO MANT (3 días x 4 ejercicios = 12)
        (8, 1, 1, 1, 3, '10-12', 60, 'Sentadilla fluida a ritmo controlado 2-1-1.'),
        (8, 5, 1, 2, 3, '12-15', 60, 'Flexiones estrictas en rango articular completo.'),
        (8, 17, 1, 3, 3, '60 seg', 45, 'Fuerza isométrica del cinturón lumbopélvico.'),
        (8, 19, 1, 4, 1, '15 min', 60, 'Pedaleo continuo en zona 2 para eficiencia aeróbica.'),
        (8, 14, 2, 1, 3, '10-12', 60, 'Énfasis en flexión de cadera y activación de glúteo.'),
        (8, 11, 2, 2, 3, '10-12', 60, 'Remo con barra cuidando no elevar trapecios.'),
        (8, 7, 2, 3, 3, '15-20', 45, 'Fortalecimiento de la pared anterior del abdomen.'),
        (8, 8, 2, 4, 3, '2 min', 45, 'Activación vascular sin impacto articular excesivo.'),
        (8, 12, 3, 1, 3, '10', 60, 'Press vertical con postura erguida impecable.'),
        (8, 13, 3, 2, 3, '12 por lado', 60, 'Estabilidad de rodilla y tobillo en cada paso.'),
        (8, 10, 3, 3, 3, '45 seg', 30, 'Restablecimiento de patrones posturales de pie.'),
        (8, 16, 3, 4, 3, '12-15', 45, 'Aislamiento de brazos y tríceps en polea.')
        ON CONFLICT (id_plantilla, id_ejercicio, dia, orden) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS parametros.plantilla_ejercicio CASCADE;")
    op.execute("DROP TABLE IF EXISTS parametros.rutina_plantilla CASCADE;")
    op.execute("DROP TABLE IF EXISTS parametros.ejercicio CASCADE;")
