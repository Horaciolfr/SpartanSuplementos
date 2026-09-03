# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Atletas y Clientes Finales (Consumidor Deportivo en Bolivia)**: Deportistas de alto rendimiento, culturistas, practicantes de crossfit y fitness que buscan suplementación 100% auténtica y certificada. Exploran el catálogo interactivo, consultan fichas técnicas nutricionales detalladas (Whey, Creatinas Creapure®, Pre-entrenos, Ganadores de Masa) y verifican precios autorizados en moneda nacional.
- **Cajeros / Vendedores de Tienda**: Operadores del Punto de Venta (POS) en tiempo real, responsables de registrar ventas de alta velocidad, evitar sobreventa mediante control de inventario atómico y emitir comprobantes térmicos certificados.
- **Administradores y Auditores de Negocio**: Responsables del control maestro de inventario, seguimiento físico de Kárdex inmutable, reabastecimiento, altas y bajas de productos y auditoría financiera.
- **Tribunal Académico / Evaluadores**: Docentes y evaluadores del Proyecto de Grado que auditan la arquitectura desacoplada en tres dominios físicos, la integridad transaccional ACID y la calidad de ingeniería de software.

## Product Purpose
Proveer a Spartan Suplementos Bolivia de un ecosistema digital integral que fusiona una plataforma de comercio/catálogo público de lujo atlético (Dark Luxury High-Performance) con un ERP y Punto de Venta robusto, garantizando trazabilidad física estricta de inventario mediante PostgreSQL ACID y una experiencia de usuario de élite.

## Positioning
A diferencia de las tiendas de suplementos convencionales con interfaces genéricas o sin control de stock en tiempo real, Spartan Suplementos Bolivia garantiza autenticidad absoluta con más de 198 referencias fotográficas reales de marcas internacionales líderes (ADN, Dragon Pharma, Evogen, Insane Labz, MuscleTech, Nutrex, RCSS, etc.), fichas técnicas nutricionales completas, control de inventario transaccional serializado mediante bloqueo pesimista (FOR UPDATE) y emisión de recibos térmicos con trazabilidad digital.

## Operating Context
- **Punto de Venta Físico en Bolivia**: Terminales de caja con escáner/búsqueda rápida de SKU, impresoras de recibos térmicos (58mm/80mm), transacciones instantáneas en efectivo o QR bancario en Bolivianos (Bs.).
- **Exploración Digital Web**: Acceso desde escritorio y dispositivos móviles modernos a través de Chrome, Edge y navegadores móviles; catálogo fluido con animaciones de alto calibre, filtros instantáneos por categoría y visualización de stock real.

## Capabilities and Constraints
- **Capacidades**:
  - Monorepo físico desacoplado en 3 dominios: ERP Gateway (FastAPI), Microservicio de IA (FastAPI) y SPA Cliente (React 19 + TypeScript + Vite).
  - Catálogo maestro de 200+ suplementos activos con fotografías reales de alta definición, categorización especializada (Proteínas, Creatinas, Pre-entrenos, Gainers, Aminoácidos, Quemadores, Salud/Vitaminas).
  - Punto de Venta con validación de stock atómico, cálculo de cambio, auditoría de Kárdex físico y modal de recibo térmico con logotipo corporativo.
  - Autenticación JWT con control de acceso basado en roles (ADMINISTRADOR, CAJERO, CLIENTE).
- **Restricciones Técnicas**:
  - Moneda oficial: Bolivianos (Bs.).
  - Bloqueo pesimista `SELECT ... FOR UPDATE` en PostgreSQL para prevenir condiciones de carrera y saldos negativos.
  - Restricción de integridad check en Kárdex (`num_nonnulls(id_venta, id_compra) = 1`).
  - Almacenamiento y optimización de imágenes en el directorio público de Vite (`/products/`) para máxima velocidad de carga.

## Brand Commitments
- **Nombre de Marca**: SPARTAN Suplementos Bolivia.
- **Logotipo Oficial**: Casco espartano amarillo sobre fondo negro (`logo.jpg`).
- **Identidad Visual**: Estética "Dark Athletic Luxury" con fondo negro azabache (`#080808`, `#0D0D0D`), acentos en amarillo neón institucional (`#f2e500`), tipografía display *Anybody*, tipografía de cuerpo editorial *Hanken Grotesk* y datos técnicos en *JetBrains Mono*.
- **Tono y Voz**: Enérgico, disciplinado, autoritario, respaldado por la ciencia y la potencia espartana ("Despierta tu poder espartano", "Nutrición de Grado Élite").

## Evidence on Hand
- 198 fotografías reales de suplementos comerciales en `recursos/` y `frontend/public/products/`.
- Logotipo oficial verificado en `recursos/logo.jpg` e integrado en `Navbar.tsx`, `Inicio.tsx`, `Login.tsx`, `POS.tsx` e `index.html`.
- Base de datos PostgreSQL con esquemas `erp`, `ia`, `parametros` y datos de productos sembrados y operativos.
- Suite de pruebas automatizadas con 13/13 tests en pytest (`tests/`).
- Evidencias de auditoría visual y grabaciones de interacción con Playwright en `qa_testing/recordings/`.

## Product Principles
1. **Integridad Transaccional Innegociable**: Ninguna venta o ajuste puede ocurrir sin certificación ACID en PostgreSQL y actualización inmutable en el Kárdex físico.
2. **Estética de Lujo y Máximo Rendimiento**: La interfaz debe impresionar desde el primer segundo con contraste nítido, imágenes fotográficas de producto y microinteracciones de nivel Awwwards.
3. **Velocidad y Agilidad Operativa**: Cero fricción para el cajero y el cliente; búsqueda instantánea, respuesta en milisegundos y carga diferida de assets.
4. **Verdad y Transparencia Nutricional**: Cada producto muestra su composición real, modo de uso y especificaciones sin datos ficticios o inventados.

## Accessibility & Inclusion
- Cumplimiento de estándares de contraste en modo oscuro (WCAG AA para texto sobre fondo negro).
- Tipografía legible con soporte monoespaciado para cifras numéricas, precios y códigos SKU.
- Indicadores visuales claros para estados de stock (Sin stock en rojo, bajo stock en ámbar, óptimo en esmeralda).
