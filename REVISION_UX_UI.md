# Revisión UX/UI y calidad funcional — Spartan Suplementos

Pruebas: 13 de octubre de 2026; cierre documental: 14 de octubre de 2026, zona America/La_Paz. Modalidad: diagnóstico sin implementación.

## 1. Resumen ejecutivo

**Puntaje heurístico: 42,5/100, redondeado a 43/100.** Corresponde a una evaluación experta de los flujos inspeccionados, con rúbrica explícita en §3. No representa una medición estadística de usuarios ni una certificación WCAG.

**Veredicto de madurez:** demostrador funcional con identidad cromática reconocible; requiere correcciones antes de considerarse una interfaz operativa consistente. El catálogo, el acceso por roles, una venta controlada, el rechazo por stock y la inferencia con imagen de demostración funcionaron. Persisten discontinuidades de navegación, problemas de accesibilidad y datos presentados con significado incorrecto.

Los cinco hallazgos prioritarios son:

1. **Mayor — tema claro ilegible en predicciones:** texto oscuro sobre superficies oscuras; contraste del título cercano a 1,11:1.
2. **Mayor — significado engañoso de las predicciones:** se anuncian próximos días con fechas desde 2025-12-31; la tabla muestra como «Stock Actual» una estimación simulada.
3. **Mayor — selección incorrecta de cliente:** «Cliente Registrado» fija el identificador 3, correspondiente al rol EMPLEADO en este entorno.
4. **Mayor — pérdida de la orden al navegar:** salir de caja y volver elimina el carrito sin advertencia.
5. **Mayor — acceso por teclado incompleto:** las tarjetas del POS son contenedores con clic; controles de cantidad/eliminación carecen de nombre accesible.

La navegación de biometría añade una segunda cabecera a la estructura interna. Las etiquetas ACID, ASYNC, MediaPipe y ML Cross-Selling trasladan detalles de implementación a tareas comerciales. Frente a las referencias, faltan continuidad entre producto y acción, agrupación estable de tareas, lenguaje orientado al usuario y adaptación de tablas al teléfono.

**Alcance efectivamente ejecutado:** inspección del código actual; navegación pública y sesiones de demostración ADMINISTRADOR, EMPLEADO —alias de CAJERO— y CLIENTE; registro de una cuenta de auditoría; venta por Bs. 1 y conflicto HTTP 409 con producto exclusivo; biometría mediante Demo; prescripción propia de cliente y rechazo de perfil ajeno; filtros del dashboard; comprobaciones a 375 y 1440 CSS px; benchmarking de nueve referencias públicas.

**Límites:** no se completó la activación del auditor por falta de acceso al buzón; no se capturó una persona mediante cámara física; no se indujeron cortes de red/5xx ni se cubrieron todas las combinaciones ruta × estado × rol × tamaño. No se reentrenaron modelos ni se ejecutaron suites existentes. Los estados no ensayados se declaran en §3.4.

## 2. Inventario visual y de navegación actual

### 2.1 Entorno, autorización y trazabilidad

- Repositorio: `E:/PROYECTO DE GRADO/nuevo proyecto/Proyecto SS`.
- Aplicación inspeccionada: `http://localhost:5173`; API: `http://localhost:8000`.
- Servicios ya activos: frontend, backend, IA y PostgreSQL. No se reconstruyeron ni reiniciaron.
- Existían numerosos cambios previos, registrados en `../revision_ux_spartan/estado_git_inicial.txt`.
- Evidencias: `../revision_ux_spartan/`. El único documento añadido al repositorio por esta revisión es este informe.
- Se aplicó el estilo de `.agents/rules/redaccion_clinica.md`.
- Tras la consulta sobre accesos, se recibió la indicación de utilizar el botón Admin del login. Las operaciones internas se ejecutaron con esa cuenta de demostración, usuario 2. La cuenta solicitada `auditor_ux@spartan.dev`, usuario 23, se registró para ensayar el alta, pero quedó sin verificar. **Las ventas y la captura Demo no pertenecen al usuario 23**; la sustitución de sesión y los registros se declaran expresamente para evitar atribución incorrecta.
- No se aplicaron correcciones, migraciones, instalaciones, formateos ni operaciones Git de escritura. Las consultas SQL de comprobación se ejecutaron en transacciones `READ ONLY`.
- El frontend desplegado es un contenedor compilado. Se verificaron comportamientos en pantalla y se contrastaron con el árbol de trabajo; no se certificó correspondencia binaria exacta entre ese bundle y todos los archivos actuales.

Clasificación de evidencia: **O** = observado mediante interfaz o respuesta real; **C** = verificado por lectura de código; **I** = inferencia pendiente de reproducción. La fotografía Demo se tomó del recurso suministrado por el propio sistema; no se capturaron imágenes personales nuevas.

### 2.2 Mapa completo de rutas SPA

Fuente de enrutamiento: [App.tsx](frontend/src/App.tsx). La API de autenticación agrega `/auth/me` al iniciar una sesión almacenada y tras autenticar.

| Ruta | Componente / estructura | Acceso efectivo | Endpoints consumidos |
|---|---|---|---|
| `/` | Inicio; cabecera propia | Público | GET `/catalogo/productos` |
| `/inicio` | Inicio; alias de `/` | Público | GET `/catalogo/productos` |
| `/catalogo` | Catalogo + Navbar | Público; acciones de inventario para ADMINISTRADOR | GET `/catalogo/productos`; admin: GET/POST `/catalogo/categorias`, POST `/catalogo/productos`, DELETE `/catalogo/productos/{id}` |
| `/login` | Login | Público | POST `/auth/token`; GET `/auth/me` |
| `/registro` | Registro, datos y código | Público | POST `/auth/registro`, `/auth/verificar-codigo`, `/auth/reenviar-codigo`; GET `/auth/me` tras verificación |
| `/recuperar-password` | RecuperarPassword | Público | POST `/auth/solicitar-recuperacion`, `/auth/restablecer-password` |
| `/biometria` | Biometria dentro de Layout → EnterpriseLayout; añade Navbar | Autenticado | POST `/ia/pose/analizar`; GET estático `/sample_pose.jpg` al usar Demo |
| `/prescripcion` | Prescripcion + EnterpriseLayout | Autenticado | GET `/ia/perfiles?limit=1`; GET `/ia/prescripcion/{id}?regenerar=false`; recálculo con `regenerar=true` |
| `/prescripcion/:id` | Prescripcion + EnterpriseLayout | Autenticado; propiedad comprobada en API | GET `/ia/prescripcion/{id}` |
| `/pos` | POS + EnterpriseLayout | ADMINISTRADOR, EMPLEADO, CAJERO | GET `/catalogo/productos`; POST `/pos/ventas` |
| `/predicciones` | PrediccionesVentas + EnterpriseLayout | ADMINISTRADOR y EMPLEADO; CAJERO admitido por equivalencia | GET `/predicciones/dashboard?sucursal=…&horizonte_dias=…`; POST `/predicciones/reentrenar` solo autorizado por API para ADMINISTRADOR |
| `*` | Navigate | Cualquier acceso | Redirección silenciosa a `/`; no vista 404 |

Roles contrastados en base de datos: usuario 2 ADMINISTRADOR; usuario 3 EMPLEADO; usuario 4 CLIENTE; usuario 23 CLIENTE. El botón «Empleado» autentica al usuario cuyo nombre visible es Cajero. La equivalencia EMPLEADO/CAJERO figura tanto en ProtectedRoute como en `app/core/dependencies.py`.

Las rutas protegidas sin sesión redirigen a `/login`. No conservan el destino solicitado; Login decide el destino por rol. La denegación visual del cliente en `/pos` es una pantalla SPA 403; se distingue de una respuesta HTTP 403, que sí se observó al consultar `/prescripcion/149511` como cliente.

### 2.3 Árbol y continuidad de navegación

| Contexto | Organización | Profundidad / continuidad |
|---|---|---|
| Inicio público | Hero → disciplinas → muestra de catálogo; enlaces ancla | Acceder a catálogo completo requiere el enlace adicional de la sección; `/catalogo` también es accesible desde Navbar en otras vistas |
| Catálogo público | Buscar → categoría → ficha modal → consulta en sucursal | Dos niveles visuales; sin URL propia del producto; la consulta termina en un aviso |
| Área interna | Cabecera de dominios + lateral + contenido | Rutas principales a un clic en escritorio; menú desplegable en móvil |
| Biometría | Estructura interna + segunda Navbar + captura + cinco pestañas | Duplicación de navegación y cambio de vocabulario respecto al catálogo |
| Prescripción | Último perfil o ID → recomendaciones → catálogo genérico | Se pierde la selección del producto al seguir «Ver en Catálogo» |
| Caja | Búsqueda → agregar → orden → emitir → recibo | Carrito solo en estado del componente; se pierde al salir |
| Predicciones | Sucursal + horizonte + cuatro vistas | Parámetros en estado local; no aparecen en URL; al volver se recuperan los valores iniciales |

No se encontraron rutas principales completamente huérfanas en App.tsx. `/inicio` es un alias y `/prescripcion/:id` tiene una ruta válida, aunque el enlace desde biometría utiliza `/prescripcion` sin el ID recién capturado. No se identificó un historial navegable de capturas. No hay breadcrumbs generales; sí existen retorno al inicio, enlaces laterales y cierre de ficha por Escape. El estado activo del menú se trata principalmente mediante color, sin `aria-current` generalizado.

El tema y la autenticación se almacenan en localStorage. Búsquedas, filtros, carrito y pestañas se mantienen solo mientras permanece montada la vista. El scroll horizontal de categorías y tablas permite acceso al contenido, pero hace menos visibles las acciones y columnas alejadas. No se acreditó un bloqueo permanente del scroll. Se observó que un lateral abierto en escritorio permanece abierto al reducir el ancho y cubre el contenido hasta cerrarlo.

### 2.4 Inventario visual

Los recuentos siguientes son ocurrencias literales en archivos `.tsx`/`.css`, no cantidades de elementos renderizados. Evidencia: `inventario_tokens.json`.

| Capa | Valores observados |
|---|---|
| Acento | `#f2e500`, 359 ocurrencias; hover primario `#fff34a` |
| Superficies oscuras | `#080808`, `#101010`, `#171717`, `#121212`, `#131313`, `#0d0d0d`; dashboard `#070707` y zinc-950 translúcido |
| Texto oscuro | `#f4f4f2`, `#e2e2e2`, `#ccc7ab`, `#b7b5a8`; secundarios `#737373`, `#555555`, zinc/neutral |
| Tema claro | Base `#eef0f5`; texto `#0f172a`, `#1e293b`, `#334155`, `#475569`, `#64748b`; acento textual `#785600` |
| Estados | Peligro `#ef4444`; variantes red/amber/emerald; en claro `#b91c1c`, `#b45309`, `#047857` |
| Tipografía | Anybody para titulares; Hanken Grotesk para cuerpo; JetBrains Mono para navegación, precios y datos |
| Escala | 9 px: 22 ocurrencias; 10 px: 87; 11 px: 89; también 12/14/16 px y encabezados de 18–36 px; hero mayor y adaptable |
| Espaciado | Base frecuente de 4 px; gaps de 4, 6, 8, 12 y 16 px; rellenos de 10, 12, 14, 16, 20 y 24 px |
| Radios | Tokens 8/12/16 px; clases frecuentes 12 px (`rounded-xl`, 157), 16 px (55), 24 px (29) y cápsulas (69) |
| Sombras y superficies | `0 16px 40px -24px rgba(0,0,0,.9)`; múltiples brillos amarillos, sombras extensas, transparencias y desenfoque de 10–32 px |
| Iconografía | Lucide, habitualmente 14–20 px; SVG ocultos al lector cuando son decorativos; algunos botones de icono carecen de etiqueta |
| Retícula | Catálogo con máximo 1280 px y tarjetas 1/2/3/4 columnas; lateral interno de 256 px expandido o 64 px colapsado; caja con panel de orden y cajón móvil |

Hay tokens globales, pero conviven con colores y estilos literales en cada vista. La presencia de variables no equivale a aplicación uniforme. Prescripción y predicciones usan superficies neutral/zinc y gradientes que no reciben todas las adaptaciones del tema claro. Inicio, Navbar y EnterpriseLayout representan tres estructuras de navegación con nombres y controles diferentes.

### 2.5 Contraste y accesibilidad visual

Se aplicó la fórmula de luminancia relativa sRGB, `(Lmayor + 0,05)/(Lmenor + 0,05)`. Umbrales AA: 4,5:1 para texto normal y 3:1 para texto grande. Fuente: [W3C, contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

| Texto / fondo | Ratio | Resultado y alcance |
|---|---:|---|
| `#0f172a` / `#09090b` | 1,11:1 | Falla incluso como título grande. Título de predicciones en tema claro; texto computado 24 px/900 en móvil |
| `#475569` / `#09090b` | 2,63:1 | Falla en etiquetas de filtros y métricas del dashboard claro, de 11–12 px |
| `#785600` / `#09090b` | 2,97:1 | Falla para texto pequeño de acento cuando la superficie conserva el tono oscuro |
| `#555555` / `#101010` | 2,55:1 | Falla de placeholder del buscador oscuro; el fondo es compuesto, por lo que este valor es una aproximación de la superficie |
| `#737373` / `#080808` | 4,22:1 | Par presente en estilos; falla si se aplica a texto normal sobre esa base. No constituye por sí solo una infracción en todos sus usos, que incluyen iconos |
| `#000000` / `#f2e500` | 15,98:1 | Botón primario: supera AA |
| `#f2e500` / `#080808` | 15,24:1 | Acento oscuro: supera AA |
| `#ccc7ab` / `#080808` | 11,75:1 | Texto principal secundario oscuro: supera AA |

El fondo de predicciones combina zinc-950 con alfa de 0,7–0,9 sobre `#070707`; `#09090b` aproxima la composición y el desenfoque. Los valores de fallo permanecen ampliamente por debajo del umbral. Se conservaron estilos computados y capas en `*_mediciones.json`. El placeholder `#555555` tiene como máximo aproximadamente 2,82:1 incluso contra negro puro, de modo que el diagnóstico no depende de elegir exactamente `#101010`.

No se certifican colores sobre fotografías, todos los estados hover ni una conformidad global. Se constató foco global de 2 px y enlace de salto; el indicador amarillo sobre blanco tendría 1,31:1 y requiere comprobación contextual adicional. La hoja contempla reducción de movimiento en algunas clases, sin demostrar cobertura de todas las animaciones de Framer Motion.

## 3. Hallazgos por fase

### 3.1 Rúbrica y diez heurísticas

Severidad: **Crítica** impide operación segura o expone acceso privilegiado; **Mayor** afecta una tarea principal o la interpretación de información; **Menor** agrega esfuerzo recuperable; **Cosmética** afecta presentación sin impedir tarea.

Rúbrica propia por heurística: 0 ausente/bloqueada, 1 deficiencia extensa, 2 cumplimiento parcial, 3 cumplimiento con fricción localizada, 4 cumplimiento en los casos revisados. Puntaje = suma/40 × 100. Los casos no ensayados no se consideran aprobados. Marco: [Nielsen Norman Group, diez heurísticas](https://www.nngroup.com/articles/ten-usability-heuristics/).

| Heurística | Puntaje /4 | Evidencia principal |
|---|---:|---|
| Visibilidad del estado | 2 | Carga y recibo visibles; stock queda desactualizado tras 409; HUD permanece en espera durante Demo |
| Correspondencia con el mundo real | 1 | ACID/ASYNC y nombres de algoritmos; «Stock Actual» simulado y «Precisión» como visibilidad de puntos |
| Control y libertad | 1 | Escape funciona en ficha; carrito se pierde al navegar y no hay recuperación de orden |
| Consistencia y estándares | 1 | Tres cabeceras; doble menú en biometría; tema claro parcial |
| Prevención de errores | 2 | Bloqueo de stock y validación de contraseña; selección fija de cliente y datos biométricos precargados |
| Reconocimiento sobre recuerdo | 2 | Precio/stock en tarjetas; nombres técnicos y filtros sin estado en URL |
| Flexibilidad y eficiencia | 2 | Búsqueda por producto/SKU; falta ordenación, persistencia y acceso completo por teclado |
| Estética y diseño mínimo | 2 | Jerarquía de títulos reconocible; alta densidad de microtexto y telemetría en vistas de negocio |
| Reconocimiento y recuperación de errores | 2 | Errores 401/403/409 legibles; 409 duplica avisos y no reconcilia existencias |
| Ayuda y documentación | 2 | Instrucciones de captura y verificación; consulta comercial sin contacto y ayuda centrada en arquitectura |
| **Total** | **17/40** | **42,5/100** |

### 3.2 Defectos observados y reproducción

**UX-01 — Mayor, O+C. Tema claro incompleto.** Ruta `/predicciones`. Pasos: Admin → Predicciones → alternar tema. Esperado: superficies y textos con contraste AA. Observado: base `#070707` y paneles oscuros con texto `#0f172a`/`#475569`. Evidencias: `predicciones_claro_375.png`, `predicciones_claro_1440.png`, estilos computados. Código: PrediccionesVentas.tsx:207 y reglas `.light` de index.css. Afecta identidad global y componentes del dashboard.

**UX-02 — Mayor, O+C. Datos presentados como actuales o futuros sin serlo.** Ruta `/predicciones`. Pasos: abrir proyección por defecto y luego Alertas de Stock. Esperado: fecha de corte visible y distinción entre inventario real y estimado. Observado: «Próximos 14 días» desde 2025-12-31, nueve meses antes de la revisión; columna «Stock Actual» proviene de una simulación. Código: `app/modules/predicciones/service.py:255,274,353–377`, PrediccionesVentas.tsx:858. Evidencias: `predicciones_actual_1440.png`, `predicciones_stock_375.png`, `predicciones_1440_dom.txt`. No se cuestiona aquí la exactitud científica del modelo; se constata una discrepancia entre etiqueta, período y fuente.

**UX-03 — Mayor, O+C. Cliente no seleccionable de forma real.** Ruta `/pos`. Pasos: abrir orden → Cliente. Esperado: identificar un cliente concreto y verificar su identidad antes de emitir. Observado: solo Consumidor Final y Cliente Registrado; este último fija `id_cliente=3`, rol EMPLEADO confirmado por consulta de lectura. Código POS.tsx:387,585. Evidencia: `pos_carrito_1440.png`, `roles_verificados.txt`. No se emitió una venta asignada a ese empleado. El defecto técnico se reitera en §3.5.

**UX-04 — Mayor, O+C. Carrito descartado al navegar.** Ruta `/pos` ↔ `/catalogo`. Pasos: añadir un producto → Catálogo & Stock → POS. Esperado: conservar borrador o advertir antes de perderlo. Observado: orden vacía y total cero; también se reinician búsquedas/filtros. Evidencia: `pos_carrito_1440_mediciones.json`, `pos_carrito_perdido_1440.png`; POS.tsx:29. No fue necesario emitir venta para reproducirlo.

**UX-05 — Mayor, O+C. Semántica y teclado incompletos.** Rutas `/pos`, `/` y formularios. Pasos: inspeccionar controles de orden y navegar por teclado. Esperado: tarjetas operables con teclado y nombres que indiquen aumentar, disminuir o retirar el producto. Observado: tarjetas POS como `motion.div` con `onClick`, sin mecanismo equivalente; tres controles sin nombre en la orden. En disciplinas, «Ver Ficha» pertenece a otro contenedor con clic. En Registro y alta de producto, varias etiquetas visibles no están asociadas programáticamente al campo. Código POS.tsx:278,425–443; DisciplinesSection.tsx:245–252. Evidencia: DOM y mediciones de POS. El botón de eliminación mide 20×20 px; su conformidad de tamaño AA requiere considerar las excepciones de separación, no solo esa medida.

**UX-06 — Mayor, O+C. Navegación interna duplicada y vocabulario técnico.** Ruta `/biometria`; también `/prescripcion`, `/predicciones`. Pasos: entrar a biometría como usuario autenticado. Esperado: una navegación estable por tareas. Observado: EnterpriseLayout más Navbar dentro del contenido, dos controles de tema y dos salidas de sesión en escritorio. Menús ACID/IA y ML Cross-Selling; prescripción aparece bajo «Zona Transaccional» porque el dominio solo reconoce `/biometria`. Evidencias: `biometria_inicial_375.png`, `biometria_inicial_1440.png`, `prescripcion_actual_1440.png`. Código Biometria.tsx:428; EnterpriseLayout.tsx:40 y siguientes.

**UX-07 — Mayor, O+C. Recuperación de stock insuficiente tras HTTP 409.** Ruta `/pos`. Pasos: abrir dos órdenes con la misma unidad del producto AUD-UX-20261013 → emitir primera → emitir segunda. Esperado: conservar la orden, informar un único conflicto y actualizar disponibilidad/acciones. Observado: servidor rechaza correctamente la segunda venta; aparecen dos notificaciones y un mensaje en la orden; la tarjeta conserva «1 uds» y Emitir Venta sigue habilitado. Evidencias: `pos_conflicto_409_1280.png`, `pos_conflicto_409_375.png`, `http_pruebas.txt`. Causa: notificación global en api/client.ts:44 más local en POS.tsx:127–130, sin refresco en el bloque de error.

**UX-08 — Menor, O+C. Consulta comercial sin continuación.** Ruta `/catalogo`, ficha pública. Pasos: abrir ficha → Consultar en Sucursal. Esperado: datos de sucursal, contacto o una acción de consulta explícita. Observado: la ficha se cierra y se muestra un aviso genérico; no hay dirección ni vínculo de contacto. Evidencia `catalogo_consulta_375.png`; ProductDetailModal.tsx:163 y siguientes. No se considera obligatorio incorporar compra en línea; sí completar la acción que el botón ofrece.

**UX-09 — Mayor, O+C. «Precisión» y recomendaciones sin explicación suficiente.** Ruta `/biometria`. Pasos: Demo → Diagnóstico. Esperado: separar calidad de captura, probabilidad del clasificador y recomendación; indicar unidades y límites de interpretación. Observado: «Precisión Media 83,5%», «Confianza…97%» y afinidades comerciales posteriores; el primer indicador se calcula como promedio de visibilidad de landmarks, no exactitud diagnóstica. Código `services/ia/pose_service.py:112,131`; Biometria.tsx:787. Evidencia `biometria_resultado_1440.png`. No se evaluó validez clínica ni se emitieron recomendaciones de salud.

**UX-10 — Menor, O+C. Telemetría que no representa la operación.** Rutas internas. Pasos: ejecutar Demo y observar la cabecera durante «Analizando». Esperado: estado consistente entre cabecera y captura. Observado: «IA WORKER: EN ESPERA» permanece visible; la barra muestra latencia fija «<40ms». EnterpriseLayout escucha eventos `ai-infer-start/complete`, pero Biometria no los emite. Evidencia `biometria_procesando_1440.png`; EnterpriseLayout.tsx:57–86,424. POS también presenta «En Línea» como texto fijo. No se indujo desconexión para probar este último caso.

**UX-11 — Menor, O+C. Filtros y tablas no priorizan información móvil.** Rutas `/catalogo`, `/predicciones`. Pasos: abrir Stock o filtros a 375 px. Esperado: producto, disponibilidad y acción reconocibles antes del desplazamiento lateral. Observado: inventario empieza por foto y SKU largo; precio/stock/acciones quedan fuera del área inicial. Filtros de sucursal y horizonte se comprimen o se extienden dentro de un panel recortado. Evidencias `catalogo_stock_1440.png`, `predicciones_claro_375.png`, `predicciones_stock_375.png`; la captura móvil de inventario quedó transitoria y no acredita su dimensión. No se constató desbordamiento horizontal de toda la página; el problema es contenido oculto dentro de contenedores.

**UX-12 — Menor, O+C. El producto recomendado pierde su contexto.** Ruta `/prescripcion` → `/catalogo`. Pasos: seguir «Ver en Catálogo». Esperado: abrir o seleccionar el producto recomendado. Observado: todos los enlaces apuntan al catálogo general sin SKU/ID, obligando a buscar nuevamente. En la ficha del administrador, «Ir al Punto de Venta» tampoco transporta el producto. Evidencia `prescripcion_1440_dom.txt`, Prescripcion.tsx y ProductDetailModal.tsx. La ausencia de ruta de detalle también limita compartir una ficha.

**UX-13 — Mayor, O+C. Retorno de autenticación y verificación incompleto.** Rutas protegidas → `/login`, y `/registro`. Pasos: entrar sin sesión a biometría; intentar login con auditor pendiente. Esperado: explicar el motivo, recordar destino y ofrecer reanudar verificación. Observado: redirección sin destino de retorno; error de cuenta no verificada sin acceso directo al ingreso del código. Registro completó el alta y rechazó `000000`; la activación válida no pudo verificarse sin buzón. Evidencias `biometria_visitante_redireccion_login_1440.png`, `login_auditor_no_verificado_1440.png`, `registro_codigo_invalido_375.png`. ProtectedRoute.tsx:26 y Login.tsx:47–51.

**UX-14 — Menor, O+C. Contención de foco desigual en modales.** Ruta `/catalogo`. Pasos: abrir ficha → Tab desde cerrar → Tab desde Consultar. Esperado: foco retenido dentro de diálogo mientras permanece abierto. Observado: foco llega al body; falta ciclo de tabulación. La ficha sí posee `role=dialog`, `aria-modal`, Escape, foco inicial y restauración. Otros modales no mantienen este mismo contrato. Evidencia: inspección de teclado y ProductDetailModal.tsx:24–44. No se confundió bloqueo de scroll con bloqueo de foco.

**UX-15 — Menor, O+C. Búsqueda con baja legibilidad y recuperación limitada.** Ruta `/catalogo`. Pasos: buscar un término sin coincidencias. Esperado: placeholder legible y acción de limpiar filtros. Observado: texto del placeholder `#555555`, estado vacío informativo sin botón para limpiar; no hay ordenación ni paginación en la lista de 198 productos iniciales. Evidencias `catalogo_vacio_375.png`, `catalogo_vacio_1440.png`, `contraste_buscador.json`.

**UX-16 — Menor, C. Error inicial del dashboard no tiene estado durable.** Ruta `/predicciones`. En `fetchDashboard` se emite un toast pero no se conserva error; los valores alternativos R²=0,62 y RMSE=540 pueden aparecer sin datos o reemplazar un cero legítimo. Código PrediccionesVentas.tsx:116–126,366–369. **No se reprodujo caída del servicio**; no se presenta como fallo observado. Se requiere un estado de error con reintento y ausencia explícita de métricas.

**UX-17 — Menor, O+C. Acciones visibles incompatibles con el rol.** Ruta `/predicciones` para EMPLEADO. Se observó acceso al dashboard y botón Recalcular Modelo, aunque la API restringe reentrenamiento a ADMINISTRADOR. No se pulsó: reentrenar alteraría artefactos de modelos. En cliente, el conmutador ACID sigue conduciendo a POS denegado. Evidencias `predicciones_cajero_1440.png`, App.tsx, `app/modules/predicciones/router.py:103` y EnterpriseLayout.tsx:94–98.

**UX-18 — Cosmética, O+C. Microtexto y denominaciones inconsistentes.** Rutas públicas e internas. Se mezclan Grid/Stock, Empleado/Cajero/Operador Comercial, «1 productos», SKU dominante y «Antropometría Tarea 7». Los tamaños de 9–11 px aparecen ampliamente en menús y metadatos. Evidencias de catálogo, biometría e inventario de tokens. El tamaño pequeño no constituye por sí mismo una infracción WCAG, pero aumenta el esfuerzo de lectura.

### 3.3 Resultados funcionales por rol

| Caso | Identidad | Resultado real | Evidencia |
|---|---|---|---|
| Catálogo, búsqueda y ficha | Visitante | Productos disponibles; búsqueda reduce resultados; estado vacío visible | `catalogo_actual_375.png`, `catalogo_busqueda_1440.png`, `catalogo_ficha_1440.png` |
| Login inválido | Auditor, credencial de prueba inválida | 401 y mensaje explícito; contraseña limpiada | `login_error_401_1440.png`, log HTTP |
| Alta / contraseñas distintas | Auditor | Validación local impide envío | `registro_error_confirmacion_1440.png` |
| Alta válida | Auditor 23 | Cuenta creada; etapa de verificación | `registro_verificacion_1440.png`, `registros_creados.txt` |
| Código erróneo | Auditor 23 | Rechazo del código; cuenta continúa sin verificar | `registro_codigo_invalido_375.png` |
| Login sin verificar | Auditor 23 | HTTP 403 y explicación; no sesión | `login_auditor_no_verificado_1440.png` |
| Login Admin | Administrador 2 | Acceso a catálogo y módulos internos | `catalogo_admin_1440.png` |
| Venta controlada | Administrador 2 | HTTP 201, venta 13450, Bs. 1, stock 0, recibo | `pos_venta_exito_1440.png`, datos SQL |
| Orden con stock obsoleto | Administrador 2, segunda pestaña | HTTP 409; no segunda venta para el producto | `pos_conflicto_409_1280.png`, `pos_conflicto_409_375.png` |
| Navegar con orden | Administrador 2 | Carrito desaparece al volver | `pos_carrito_perdido_1440.png` |
| Captura Demo | Administrador 2 | Inferencia exitosa; perfil 149511, precisión visual 83,5%, somatotipo mostrado MESOMORFO | `biometria_resultado_1440.png` |
| Prescripción de captura | Administrador 2 | Dos recomendaciones, registros 1319 y 1320 | `prescripcion_actual_1440.png` |
| Prescripción propia | Cliente 4 | Perfil 129502 consultado; recomendaciones preexistentes 1301 y 1302 | `prescripcion_cliente_1440.png` |
| Perfil ajeno controlado | Cliente 4, perfil de auditoría 149511 | HTTP 403, error y acciones de retorno | `prescripcion_ajena_error_1440.png` |
| Ruta POS de cliente | Cliente 4 | Denegación visual 403 | `pos_cliente_403_375.png`, `pos_cliente_403_1440.png` |
| Login Empleado | Empleado 3 / Cajero | Acceso a POS y predicciones; no se emitió otra venta con este rol | `pos_empleado_1440.png`, `predicciones_cajero_1440.png` |
| Filtros de predicción | Administrador 2 | Cambian resultados al seleccionar La Paz y 7 días; no cambia la fecha histórica de inicio | `predicciones_filtro_lapaz_1440.png` |
| Cierre de sesiones | Demostraciones | Sesiones cerradas; vista final login y tema oscuro restaurado | Comprobación final de interfaz |

### 3.4 Cobertura de estados y límites de la evidencia

| Vista | Estados examinados | Pendientes |
|---|---|---|
| Inicio / alias | Contenido, navegación móvil, ancla de catálogo; carga observada | Alias `/inicio` identificado en código, no capturado por separado; error de red |
| Catálogo | Carga, contenido, filtro vacío, ficha, consulta, inventario, alta exitosa | Caída de servicio, catálogo global sin registros, alta duplicada |
| Login | Inicial, carga, éxito por los tres roles, 401, cuenta no verificada 403 | Expiración real durante transacción |
| Registro | Datos, validación local, verificación pendiente y código inválido | Código válido, entrega efectiva al buzón, reenvío |
| Recuperación | Formulario inicial en ambos anchos | Solicitud y cambio de contraseña; no se cambiaron credenciales |
| POS | Vacío, carga, carrito, recibo, 409, pérdida de borrador, 403 visual | Recibo móvil exacto; se conserva evidencia de escritorio; otros errores de API |
| Biometría | Cámara inactiva, procesamiento Demo, resultado y pestaña Métricas | Cámara física, permisos, ausencia de persona, imagen inválida, timeout |
| Prescripción | Carga, contenido propio/admin, 403 de perfil ajeno | Usuario sin ningún perfil, inexistente 404, recálculo |
| Predicciones | Carga, contenido, sucursal/horizonte, alertas, tema claro/oscuro | Servicio caído, dataset vacío, reentrenamiento |

Se solicitaron viewports de 375×812 y 1440×900 CSS px. Las imágenes pueden excluir barras de scroll y contener 370 o 1435 píxeles de ancho. La segunda pestaña del conflicto se capturó en escritorio de 1280 px y se identifica como tal; no se etiqueta falsamente como 1440. Las capturas de carga son estados transitorios; no prueban tiempos de respuesta. `capturas_dimensiones.json` documenta las dimensiones raster, y los JSON de mediciones registran viewports cuando fueron obtenidos.

Las suites pytest y Playwright presentes en el repositorio no se ejecutaron ni se utilizaron como sustituto de exploración. No se atribuye a esta auditoría ningún resultado histórico de esas suites.

### 3.5 Hallazgos fuera de alcance UX

No se implementó ninguna reparación.

| ID | Severidad | Hallazgo y evidencia | Alcance de la conclusión |
|---|---|---|---|
| F-01 | Crítica si el despliegue no es demostrativo | Botones públicos de login precargan una credencial reutilizable para Admin/Empleado/Cliente; el acceso admin funcionó. Login.tsx:61–65,213–227; security.ts desofusca en cliente | Confirmado en entorno local; no se comprobó exposición pública. La ofuscación no convierte una credencial incluida en frontend en secreta. No se reproduce la contraseña en el informe |
| F-02 | Mayor | Selección de cliente fija al empleado 3; POS.tsx:387,585 y consulta de roles | Defecto de integridad de atribución; no se generó venta con esa asociación |
| F-03 | Mayor | Predicción anclada a última fecha del dataset; inventario de alertas simulado con multiplicadores; service.py:255–274,353–377 | Confirmado por código y etiquetas desplegadas; no validación estadística del modelo |
| F-04 | Mayor | API de prescripciones permite generación/persistencia durante GET; `services/ia/main.py:299–314` | Riesgo de efectos laterales en consulta. Las consultas de cliente de esta revisión encontraron recomendaciones previas, confirmado por fecha |
| F-05 | Menor | `/prescripcion` de administrador solicita último perfil global sin `usuario_id`; después de otra captura podría abrir perfil distinto del recién analizado | Inferencia C/I a partir de Prescripcion.tsx:64 y gateway:164–191. No se reprodujo concurrencia biométrica |
| F-06 | Menor | Dashboard mantiene valores de sustitución numéricos tras error y muestra botón de reentrenar al empleado | Confirmación estática, con visibilidad del botón observada; no se ejecutó el reentrenamiento |

## 4. Benchmarking contra referencias

Consulta pública realizada el 13/10/2026. Se comparan patrones publicados, no implementaciones internas ni rendimiento de cuentas privadas. Gymshark sirve de referencia de comercio fitness, no de biometría. No se presupone que todos los sistemas compartan el mismo alcance comercial de Spartan.

| Referencia | Patrón documentado / observado | Fuente primaria |
|---|---|---|
| Gymshark | Navegación por audiencia, filtros y ordenación explícita | [Búsqueda y filtros](https://www.gymshark.com/en-US/search) |
| Optimum Nutrition | Colecciones por familia de producto; categorías reconocibles | [Colecciones](https://www.optimumnutrition.com/en-us/products) |
| MuscleTech | Filtros por categoría, objetivo, sabor y precio; ordenación; variantes y acciones de producto | [Catálogo](https://www.muscletech.com/collections/all); captura local de referencia |
| Mindbody | Indicadores de negocio y reportes de inventario con contexto comercial | [Reporting](https://www.mindbodyonline.com/en-au/business/reporting) |
| Glofox | Checkout que agrupa productos/servicios en una transacción | [Checkout](https://support.glofox.com/hc/en-us/articles/46456936560532-How-to-use-the-Checkout-feature) |
| Trainerize | Seguimiento en Progress, series de estadísticas corporales y comparación temporal | [Tracking and Measuring Client Progress](https://help.trainerize.com/hc/en-us/articles/360033938972-Tracking-and-Measuring-Client-Progress) |
| Everfit | Métricas con nombre, unidad, fecha, objetivos e historial; métricas fijadas en resumen | [Track Body Metrics](https://help.everfit.io/en/articles/2836313-track-body-metrics); captura local de documentación |
| MyFitnessPal | La pestaña Today sustituye al dashboard anterior; accesos a registro y resumen de nutrientes | [Today tab](https://support.myfitnesspal.com/hc/en-us/articles/39985611667341-Your-Today-tab) |
| Stripe Dashboard | Lateral por tareas, búsqueda, filtros y exportación de tablas; resumen configurable | [Web Dashboard](https://docs.stripe.com/dashboard/basics) |

| Dimensión | Patrón dominante en referencias consultadas | Estado actual de Spartan | Brecha | Severidad |
|---|---|---|---|---|
| Menú y estructura | Familias de producto en ON/MuscleTech; tareas en Stripe | Tres estructuras; doble cabecera biométrica; dominio técnico | Menú común con nombres de tarea y disponibilidad por rol | Mayor |
| Flujo checkout/POS | Orden agrupada y continuidad de selección, Glofox | Recibo y bloqueo de stock funcionan; carrito volátil | Borrador persistente y conciliación de stock | Mayor |
| Producto y disponibilidad | Variante, precio y estado junto a acción, MuscleTech | Buen precio/stock en tarjeta; consulta termina en aviso | Contacto concreto, disponibilidad contextual y destino por producto | Menor |
| Búsqueda/filtrado | Filtros y ordenación, Gymshark/MuscleTech | Texto y categoría; sin ordenación ni estado en URL | Filtros persistentes, limpiar y ordenación | Menor |
| Tablas y métricas | Columnas, filtros, detalle y exportación, Stripe/Mindbody | Tabla extensa y KPIs; sin exportación ni control de columnas | Priorizar columnas y permitir detalle contextual | Menor |
| Fuente y período | Métricas presentadas en contexto de seguimiento/reportes | Pronóstico pasado como futuro y stock estimado como actual | Corte, fuente y simulación identificados antes de interpretar valores | Mayor |
| Datos biométricos | Valor, unidad, fecha, progreso y objetivos, Everfit/Trainerize | Captura aislada, algoritmos y porcentajes ambiguos | Historial y distinción entre calidad, clasificación y recomendación | Mayor |
| Dashboard personal | Resumen de tarea y acceso al registro, MyFitnessPal Today | Cliente entra a panel de captura con telemetría | Resumen del perfil y siguiente acción comprensible | Menor |
| Vacíos/errores | Se toma como base la recuperación explícita de NN/G; no se ensayaron errores privados de todas las referencias | Algunos vacíos útiles; 409 duplicado; dashboard sin error durable | Un mensaje, siguiente acción y recuperación conservando trabajo | Mayor |
| Responsive | Interfaces de registro móvil en MyFitnessPal y Everfit; referencia web de catálogo MuscleTech | Tarjetas adaptables; tablas y filtros recortados | Priorización de datos, paneles y tamaños táctiles | Mayor |
| Lenguaje visual | Jerarquía centrada en contenido/producto en referencias públicas | Amarillo/negro reconocible; microtexto, brillos y capas múltiples | Simplificar superficies operativas y asegurar ambos temas | Mayor |

Las propuestas de estados de error y accesibilidad son criterios de auditoría, no afirmaciones de que las nueve referencias cumplan todos los criterios. Las referencias visuales capturadas son documentación y catálogo públicos; no representan sesiones privadas de sus aplicaciones.

## 5. Sugerencias detalladas y priorizadas

Estimaciones orientativas de trabajo por una persona con conocimiento del sistema, sujetas a dependencias y validación. No se implementó ninguna propuesta.

### 5.1 Quick wins — cada unidad estimada en un día o menos

| Prioridad / ID | Cambio concreto y vista | Referencia | Impacto y aceptación | Ámbito visual | Estimación |
|---|---|---|---|---|---|
| P0 / Q1 | Señalar corte de datos y «Simulación de inventario» en Predicciones; reemplazar «próximos» por rango explícito cuando sea histórico | Contexto de reportes Stripe/Mindbody; UX-02 | Evitar interpretación de valores como inventario o futuro actuales; fecha/fuente visibles junto a métricas | Componente puntual | 0,5–1 día |
| P0 / Q2 | Retirar temporalmente la opción fija Cliente Registrado hasta disponer de selección real | Checkout Glofox; UX-03 | Impedir atribución al empleado; conservar Consumidor Final como única opción válida provisional | Componente puntual | 0,5 día |
| P1 / Q3 | Unificar notificación 409 y añadir recuperación «Actualizar existencias» sin perder la orden | Recuperación NN/G; UX-07 | Una notificación; nuevo stock visible; producto agotado marcado en orden | Componente puntual | 1 día |
| P1 / Q4 | Etiquetar botones de cantidad, eliminar y cerrar; convertir tarjetas POS/disciplinas en controles de teclado | WCAG y navegación de tareas; UX-05 | Operar selección y cantidades con Tab/Enter/Espacio; nombres de acción verificables | Componentes puntuales | 1 día |
| P1 / Q5 | Quitar la segunda Navbar de biometría y renombrar menús a Caja, Catálogo, Mi análisis, Mis recomendaciones y Predicciones | Stripe, Everfit; UX-06 | Una cabecera; la misma etiqueta conduce a la misma tarea; enlace activo identificable | Navegación global, sin cambiar identidad cromática | 1 día |
| P1 / Q6 | Cambiar «Precisión» por «Visibilidad media de puntos» y separar confianza del modelo; identificar Demo y valores precargados | Métricas con significado y unidades, Everfit/Trainerize; UX-09 | Ningún porcentaje de captura se presenta como exactitud clínica; dato de prueba distinguible | Componente puntual | 0,5–1 día |
| P1 / Q7 | Recordar destino de login y ofrecer «Verificar cuenta» ante 403 de cuenta pendiente | Login y recuperación de Glofox; UX-13 | Tras autenticar se retoma una ruta permitida; verificación se reanuda sin repetir alta | Flujo y componentes puntuales | 1 día |
| P2 / Q8 | Añadir limpiar filtros y sustituir placeholder por un tono de al menos 4,5:1 | Gymshark; UX-15 | Recuperar lista con una acción; campo identificable con etiqueta persistente | Token de texto secundario + buscador | 0,5 día |
| P2 / Q9 | Cambiar consulta en sucursal por un panel con dirección, horario y contacto confirmado | Continuidad comercial de ON/MuscleTech; UX-08 | La acción permite continuar sin depender de recordar un toast | Componente puntual | 0,5–1 día, si existen datos de contacto |
| P2 / Q10 | Ocultar reentrenamiento a roles no autorizados, y conmutador POS a clientes | Navegación por tareas/roles de Stripe; UX-17 | No presentar acciones que necesariamente terminan denegadas | Componentes de navegación | 0,5 día |
| P2 / Q11 | Corregir singular/plural, Grid → Tarjetas, «Tarea 7» y etiquetas técnicas de estado | Vocabulario comercial de ON/Mindbody; UX-18 | Terminología uniforme y sin referencias de desarrollo | Contenido puntual | 0,5 día |

### 5.2 Estructurales — más de un día

| Orden / ID | Propuesta de componentes y flujo | Referencia / hallazgos | Impacto y aceptación | Ámbito | Riesgo funcional y estimación |
|---|---|---|---|---|---|
| 1 / E1 | Consolidar tokens semánticos de fondo, texto, borde, estado y foco para ambos temas; migrar primero predicciones/prescripción; matriz de componentes en normal, foco, hover, seleccionado y deshabilitado | WCAG; UX-01/15/18 | Cada combinación real cumple contraste; componentes no requieren excepciones por clase literal | Identidad global: color, tipografía, espaciado | Regresiones de contraste y estados; 2–4 días |
| 2 / E2 | Mantener una orden borrador por operador/caja con cliente, cantidades y estado de validación; retorno a caja restaura orden; emisión reconcilia stock y confirma resultado | Glofox; UX-04/07 | Navegar y recargar no destruye trabajo; no se reutilizan órdenes emitidas | Flujo POS y estado compartido | Duplicación de venta, concurrencia y borradores de otra sesión; 2–4 días |
| 3 / E3 | Selector de cliente real con búsqueda, identificación mínima y confirmación; conservar consumidor final; aclarar medio/estado de pago en revisión previa a emisión | Glofox/Mindbody; UX-03 | Venta asignada a identidad correcta; total, cliente y estado revisables | Componentes POS | Acceso a datos personales y atribución de ventas; 2–3 días |
| 4 / E4 | Separar métricas históricas, pronóstico y alertas reales; mostrar fecha base, actualización y procedencia; inventario simulado en modo demostración rotulado | Stripe/Mindbody; UX-02/16 | Ningún número de sustitución aparece como resultado; error persistente con reintento; inventario real trazable | Dashboard y flujo de datos | Cambio de contrato API y consultas costosas; 3–5 días |
| 5 / E5 | Estructura única por tareas y rol; versión móvil con menú accesible, cierre al navegar, foco contenido y retorno; prescripción y biometría dentro del mismo grupo comprensible | Stripe, MyFitnessPal Today; UX-06/11/17 | Una estructura estable; acceso a cada módulo permitido en una o dos acciones | Navegación global | Rutas protegidas, foco y cierre de sesión; 2–3 días |
| 6 / E6 | Ficha de producto con URL y retorno al filtro; producto recomendado abre su ficha; derivación a caja conserva SKU, sin emitir automáticamente | MuscleTech/ON; UX-08/12 | Continuidad desde recomendación hasta consulta/venta; enlace compartible | Flujo de producto | Stock obsoleto y diferencia de permisos público/POS; 2–3 días |
| 7 / E7 | Flujo biométrico: preparar captura → revisar datos → procesar → calidad del resultado → recomendaciones → historial por fecha; elegir explícitamente perfil del usuario | Everfit/Trainerize; UX-09/10, F-05 | Perfiles y fuentes identificados; demo separada; reintento sin ambigüedad; telemetría técnica en vista secundaria | Componentes biométricos, historial | Privacidad, asociación al perfil y consultas con efectos laterales; 3–5 días |
| 8 / E8 | Patrón común de tabla adaptable: identidad del producto, stock y acción primero; detalle expandible, ordenación y filtros; para gráficos, tabla alternativa y selección por teclado | Stripe/Mindbody; UX-05/11/15 | Tareas principales realizables a 375 px sin buscar columnas fuera de vista | Componentes de datos y espaciado | Ocultar datos necesarios o cambiar orden de lectura; 2–4 días |

Dependencias sugeridas: Q1/Q2 antes de decisiones operativas; E1 antes de extender estilos; E2 y E3 antes de ampliar ventas por cliente; E4 antes de utilizar alertas para reposición; E5/E6/E7/E8 en iteraciones con pruebas por rol. F-01 debe resolverse antes de exponer un entorno no demostrativo, mediante un trabajo técnico separado.

## 6. Anexos

### 6.1 Registros creados y limpieza posterior

No se borró ningún registro. El producto de auditoría quedó activo y agotado. La venta fue un registro de prueba local, sin pasarela de pago ni cobro externo. La aplicación la almacena como PAGADO y la suma a sus datos; debe excluirse de análisis operativos hasta su limpieza.

| Entidad | Identificador | Contenido / relación |
|---|---|---|
| Usuario de prueba | `erp.usuario.id_usuario=23` | `auditor_ux@spartan.dev`; Auditor UX / Prueba 20261013; CLIENTE; `esta_verificado=false` |
| Producto de prueba | `erp.producto.id_producto=205` | SKU `AUD-UX-20261013`; «AUDITORIA UX - NO VENDER - auditor_ux@spartan.dev»; precio Bs. 1; stock inicial 1, final 0 |
| Venta | `erp.venta.id_venta=13450` | Recibo `REC-D464BE29`; Bs. 1; cajero 2; consumidor final; PAGADO |
| Detalle de venta | `erp.detalle_venta.id_detalle_venta=26455` | Venta 13450, producto 205, cantidad 1 |
| Movimiento de inventario | `erp.kardex_fisico.id_kardex=26428` | Venta 13450, producto 205, movimiento 1, saldo 0 |
| Perfil biométrico Demo | `ia.perfil_biometrico.id_perfil=149511` | Usuario 2; muestra del sistema; creado 13/10/2026 22:49:46, hora de La Paz |
| Prescripciones Demo | `ia.prescripcion_crossselling.id_prescripcion=1319,1320` | Perfil 149511; productos 29 y 13 |

Los registros 1301/1302 del perfil cliente 129502 eran anteriores a esta revisión y **no corresponden a limpieza de auditoría**. Las pruebas 401/403/409 no deben confundirse con nuevos registros de venta. La segunda emisión fue rechazada; se comprobó una sola venta asociada al producto 205.

La limpieza posterior debe respetar claves foráneas, triggers y saldos: revisar dependencias de venta/detalle/kárdex conjuntamente; prescripciones antes del perfil; usuario 23 por separado. No se aporta ni ejecuta una eliminación automática. También pueden existir logs ordinarios y un mensaje de verificación dirigido al correo de prueba. La contraseña temporal no se incluye en evidencias.

### 6.2 Catálogo de capturas y evidencia auxiliar

El catálogo completo, con nombre, dimensiones y estado de validez, se conserva en [catálogo de evidencias](../revision_ux_spartan/CATALOGO_EVIDENCIAS.md). Las imágenes originales del navegador son JPEG; se generaron copias PNG sin alterar el contenido para ajustarse al formato solicitado. La conversión no recupera detalle perdido en la compresión original.

| Grupo | Evidencias principales; carpeta `../revision_ux_spartan/` |
|---|---|
| Inicio | `inicio_actual_1440.png`, `inicio_actual_375.png`, `inicio_menu_375.png`, `inicio_catalogo_ancla_375.png` |
| Catálogo | `catalogo_actual_375.png`, `catalogo_admin_1440.png`, `catalogo_busqueda_1440.png`, `catalogo_vacio_1440.png`, `catalogo_vacio_375.png` |
| Ficha / consulta | `catalogo_ficha_1440.png`, `catalogo_consulta_375.png` |
| Inventario / alta | `catalogo_stock_1440.png`, `catalogo_alta_auditoria_1440.png`, `catalogo_alta_exito_1440.png` |
| Login | `login_inicial_1440.png`, `login_inicial_375.png`, `login_error_401_1440.png`, `login_error_401_375.png`, `login_auditor_no_verificado_1440.png` |
| Registro | `registro_inicial_1440.png`, `registro_inicial_375.png`, `registro_error_confirmacion_1440.png`, `registro_verificacion_1440.png`, `registro_verificacion_375.png`, `registro_codigo_invalido_375.png` |
| Recuperación | `recuperar_password_inicial_1440.png`, `recuperar_password_inicial_375.png` |
| Caja | `pos_inicial_1440.png`, `pos_inicial_375.png`, `pos_carrito_1440.png`, `pos_carrito_abierto_375.png`, `pos_carrito_perdido_1440.png` |
| Venta y conflicto | `pos_venta_exito_1440.png`, `pos_conflicto_409_1280.png`, `pos_conflicto_409_375.png` |
| Roles | `pos_cliente_403_1440.png`, `pos_cliente_403_375.png`, `pos_empleado_1440.png`, `predicciones_cajero_1440.png` |
| Biometría | `biometria_inicial_1440.png`, `biometria_inicial_375.png`, `biometria_procesando_1440.png`, `biometria_resultado_1440.png`, `biometria_resultado_375.png`, `biometria_metricas_375.png` |
| Prescripción | `prescripcion_actual_1440.png`, `prescripcion_actual_375.png`, `prescripcion_cliente_1440.png`, `prescripcion_ajena_error_1440.png`, `prescripcion_ajena_error_375.png` |
| Predicciones | `predicciones_actual_1440.png`, `predicciones_filtro_lapaz_1440.png`, `predicciones_stock_375.png`, `predicciones_claro_1440.png`, `predicciones_claro_375.png` |
| Referencias | `referencia_everfit_documentacion.png`, `referencia_muscletech_catalogo.png` |

Apoyo: `integridad_inicial.json`, `verificacion_integridad.json`, `estado_git_inicial.txt`, `estado_git_final.txt`, `http_pruebas.txt`, `registros_creados.txt`, `verificacion_prescripciones.txt`, `roles_verificados.txt`, `producto_prueba.json`, `inventario_tokens.json`, `contrastes_calculados.json`, `contraste_buscador.json`, `contraste_titulo.json`, `*_mediciones.json`, `*_dom.txt` y `capturas_dimensiones.json`.

Las capturas tomadas durante ajustes de tamaño que no representan el viewport solicitado se identifican como transitorias en el catálogo; no se usan para acreditar esa dimensión. Se preserva esta limitación en lugar de presentar una cobertura exhaustiva inexistente.

### 6.3 Verificación de preservación de archivos

El estado inicial y las huellas SHA-256 de archivos versionados y no ignorados se registraron antes de las pruebas. La comparación final se documenta en `verificacion_integridad.json`. Este procedimiento verifica contenido y presencia, sin revertir cambios previos. No incluye datos de PostgreSQL ni todos los archivos ignorados por Git; las modificaciones de datos realizadas se enumeran en §6.1. Resultado final: **1.614 archivos comparados; cero modificaciones de contenido y cero ausencias respecto al inventario inicial.** El único archivo creado por esta revisión dentro del repositorio es `REVISION_UX_UI.md`. Se detectaron además cuatro archivos con nombres acentuados que no figuraban en el inventario inicial; sus fechas de modificación son anteriores al inicio, pero sus contenidos iniciales no pueden compararse. Se documentan por separado, junto con una eliminación ya existente en el índice Git. La verificación no certifica el contenido previo de esos cuatro archivos.

Al cierre del 14/10/2026 Docker Desktop no estaba activo. No se reiniciaron servicios; las pruebas funcionales y consultas de datos corresponden a la sesión anterior y sus evidencias conservadas. La consulta final de roles no pudo repetirse. Se mantienen pendientes los escenarios declarados en §3.4 y la captura móvil válida de inventario/ficha, que presenta un ajuste transitorio en los archivos originales.
