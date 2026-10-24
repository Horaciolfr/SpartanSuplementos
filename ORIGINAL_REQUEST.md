# Original User Request

## Initial Request — 2026-09-23T16:03:34Z

Generar un dataset histórico sintético y realista de 12 meses de operaciones ERP (~1,123 transacciones) orientado al entrenamiento de modelos Random Forest para optimización de stock y prevención de quiebres, con exportación a CSV/Excel y verificación estadística estricta.

Working directory: e:/PROYECTO DE GRADO/nuevo proyecto/Proyecto SS
Integrity mode: development

## Requirements

### R1. Catálogo de Productos y Clientes con Somatotipo
- Definir un catálogo realista de 30 SKUs distribuidos en 'SUPLEMENTOS' (Whey Protein concentrada e isolatada, Creatina monohidratada, Quemadores termogénicos, Mass Gainer) e 'INDUMENTARIA' (Camisetas técnicas, Shorts de compresión), con costos unitarios, precios de venta en moneda local (Bs.) y stock de seguridad coherentes con el negocio.
- Generar una base de 500 clientes con asignación de somatotipo (ECTOMORFO, MESOMORFO, ENDOMORFO) simulando su evaluación previa por el módulo de visión artificial.

### R2. Simulación Transaccional y Reglas de Negocio
- Simular transacciones de venta a lo largo de un histórico de 12 meses con marcas temporales y cantidades realistas (1 a 4 unidades por transacción).
- Inyectar estacionalidad temporal: incremento promedio del 20% en volumen transaccional durante fines de semana (viernes a domingo) y cierres de mes (días 28 al 31).
- Inyectar afinidad estadística producto-somatotipo (señal no aleatoria para ML):
  - ECTOMORFO: Alta preferencia de compra en 'Mass Gainer' y 'Creatina'.
  - MESOMORFO: Alta preferencia de compra en 'Whey Protein' y 'Creatina'.
  - ENDOMORFO: Alta preferencia de compra en 'Quemadores' y 'Whey Isolatada'.
- Simular quiebres de stock en aproximadamente el 15% de las transacciones (demanda excede inventario disponible), registrando la incidencia de venta perdida / quiebre de stock.

### R3. Construcción de Features y Targets para Random Forest
- Estructurar el dataset analítico agregando features temporales e inventario por producto y día/período:
  - Predictoras: `stock_actual`, `stock_seguridad`, `ventas_ultimos_7_dias`, `ventas_ultimos_30_dias`, `categoria`, `dia_semana`, `somatotipo_predominante_comprador`, `precio_unitario`.
  - Targets:
    - `demanda_proxima_semana` (regresión continua para métrica RMSE en Tarea 12).
    - `riesgo_quiebre_stock` (clasificación binaria 0/1 para métrica Accuracy en Tarea 12).
- Garantizar reproducibilidad absoluta fijando la semilla global en 42 (`seed = 42`).

### R4. Exportación de Datos y Reportes
- Implementar la lógica en `scripts/generar_dataset_erp.py`.
- Generar `data/dataset_historico_erp.csv` con el conjunto de datos limpio para ML.
- Generar `data/reporte_dataset_erp.xlsx` con tres hojas de análisis:
  - Hoja 1 (`Resumen_Operaciones`): Métricas globales de transacciones, volumen total de ventas, transacciones con quiebre de stock y tasa efectiva de quiebres.
  - Hoja 2 (`Matriz_Afinidad_Somatotipo`): Tabla dinámica cruzada (Pivot Table) de Somatotipo vs Categoría/Producto más comprado, evidenciando las correlaciones aprendibles.
  - Hoja 3 (`Estadistica_Descriptiva`): Estadísticos descriptivos (media, desviación estándar, min, max, cuartiles) de todas las features numéricas del dataset.
- Instalar cualquier dependencia requerida en el entorno virtual (`venv`), tal como `openpyxl`.

### R5. Suite de Pruebas Automatizadas y Documentación
- Crear la suite `tests/test_dataset_erp.py` cubriendo:
  1. Reproducibilidad estricta: Cálculo de hash SHA-256 de `data/dataset_historico_erp.csv` garantizando identidad exacta en dos ejecuciones consecutivas independientes.
  2. Integridad referencial: Cada `id_producto` presente en las transacciones y agregados existe en el catálogo maestro.
  3. Validación de hipótesis estadística: Prueba de Chi-cuadrado (\(\chi^2\)) de independencia entre Somatotipo y Categoría de Producto adquirido, requiriendo \(p < 0.05\) para asegurar señal no aleatoria.
  4. Integridad de datos: Ausencia total de valores nulos o infinitos en las columnas críticas predictoras y en los targets.
- Ejecutar y reportar la salida completa de `pytest tests/test_dataset_erp.py -q` resultando 100% aprobada.
- Imprimir en consola la matriz de calor/afinidad Somatotipo vs Producto para verificación inmediata.
- Documentar detalladamente los resultados en `walkthrough.md` en la sección "Presentación del Dataset Oficial ERP" (Actividad 11 del cronograma).

## Acceptance Criteria

### Reproducibilidad e Integridad
- [ ] La ejecución doble de `scripts/generar_dataset_erp.py` genera archivos CSV con hash SHA-256 idéntico.
- [ ] Todos los productos registrados en ventas corresponden a IDs válidos del catálogo de 30 SKUs.
- [ ] Cero valores nulos (`NaN` / `None`) en las features predictoras y columnas target.

### Validación Estadística y ML
- [ ] Prueba Chi-cuadrado Somatotipo vs Producto arroja \(p < 0.05\), confirmando significancia estadística de los patrones de compra.
- [ ] La proporción de quiebres de stock se ubica en el intervalo [12%, 18%], coherente con el 15% objetivo.
- [ ] El dataset contiene features continuas y discretas listas para entrenamiento sin fuga de datos (*data leakage*).

### Artefactos Generados
- [ ] Archivo `data/dataset_historico_erp.csv` generado y no vacío.
- [ ] Archivo `data/reporte_dataset_erp.xlsx` generado con las 3 hojas formateadas correctamente.
- [ ] Matriz de contingencia Somatotipo-Producto impresa en consola.
- [ ] Suite de pruebas `pytest tests/test_dataset_erp.py -q` finaliza con código 0 y 100% tests pasados.
- [ ] Archivo `walkthrough.md` actualizado con la sección "Presentación del Dataset Oficial ERP".
