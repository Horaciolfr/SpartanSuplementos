# Protocolo de Pruebas y Validación del Sistema

Cada vez que el usuario solicite realizar pruebas, verificaciones o auditorías sobre el sistema web:
1. **Uso Mandatorio de Playwright / Browser Tools:**
   - Emplear las herramientas de automatización de navegador de Playwright para interactuar en vivo con la aplicación (`http://localhost:5173`).
   - Ejecutar los flujos completos de extremo a extremo:
     - Autenticación y control de acceso basado en roles (`/login`).
     - Gestión del catálogo de inventario (`/catalogo`).
     - Transacciones en el Punto de Venta con validación de Kárdex y stock pesimista (`/pos`).
2. **Registro y Evidencia:**
   - Capturar evidencia visual (capturas de pantalla y grabaciones WebP).
   - Guardar copias en `qa_testing/recordings/` para consulta inmediata del usuario.
   - Reportar una tabla resumen con el estado (código HTTP, tiempos de respuesta, consistencia en base de datos).
