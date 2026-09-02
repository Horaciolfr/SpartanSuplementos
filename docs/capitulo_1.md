# CAPÍTULO I: PLANTEAMIENTO DEL ESTUDIO

## 1.1. Planteamiento del Problema

### 1.1.1. Contextualización y Realidad Problemática
En la última década, la industria del acondicionamiento físico, la salud preventiva y el rendimiento deportivo ha experimentado una expansión cuantitativa sin precedentes a nivel global. En este ecosistema, las tiendas especializadas en suplementación fitness constituyen un nodo crítico para la provisión de macronutrientes, micronutrientes, ergogénicos y productos coadyuvantes del entrenamiento. Sin embargo, en el ámbito local y regional, la gran mayoría de estos establecimientos operan bajo paradigmas tradicionales caracterizados por dos deficiencias estructurales acopladas: la administración manual o semi-automatizada del inventario y la recomendación empírica de productos en el punto de venta.

En primer lugar, la gestión de inventarios basada en métodos manuales, hojas de cálculo aisladas o registros estáticos carece de mecanismos de control transaccional estricto y de políticas dinámicas de reposición. Esta condición propicia discrepancias sistemáticas entre el inventario físico y el inventario lógico, generando pérdidas económicas directas atribuibles a la sobreacumulación de referencias de baja rotación y, críticamente, a la recurrencia de quiebres de stock (*stockouts*) en productos de alta demanda. La rotura de inventario no solo representa una pérdida inmediata de ingresos comerciales, sino que erosiona la fidelización del cliente y degrada la predictibilidad operativa del negocio.

En segundo lugar, la prescripción y venta de suplementos deportivos en tiendas comerciales se fundamenta predominantemente en el criterio subjetivo del personal de ventas o en la autopercepción desinformada del consumidor. La evaluación antropométrica y el perfilamiento morfofisiológico (somatotipo, complexión física, composición corporal y objetivos atléticos) son omitidos o evaluados cualitativamente sin rigor científico. Esta práctica conduce a prescripciones inadecuadas, incompatibles con las demandas metabólicas reales del usuario, propiciando el consumo ineficaz de suplementos, insatisfacción en el logro de metas físicas e incluso potenciales riesgos a la salud del deportista.

La intersección de ambas problemáticas consolida un ciclo operativo deficiente: el personal comercial recomienda productos que frecuentemente carecen de pertinencia fisiológica para el usuario o que se encuentran desabastecidos en bodega por fallas en la sincronización del inventario, impidiendo una correspondencia armónica entre la oferta de productos y las necesidades biométricas del consumidor.

### 1.1.2. Formulación del Problema

#### Pregunta General
¿Cuál es el efecto de la gestión manual de inventarios y del perfilamiento empírico del cliente sobre la incidencia de quiebres de stock y la pertinencia de la prescripción de suplementación fitness en tiendas especializadas de [CIUDAD], 2026?

#### Preguntas Específicas
* **PE1:** ¿Cuál es la incidencia actual de quiebres de stock y el nivel de error en la prescripción de suplementos en el escenario previo a la automatización del proceso?
* **PE2:** ¿Qué nivel de precisión diagnóstica y ajuste métrico alcanza un modelo computacional basado en visión artificial y algoritmos de clasificación supervisada para la determinación del biotipo corporal?
* **PE3:** ¿Cuál es el comportamiento y la latencia operativa del sistema de procesamiento transaccional y analítico cuando es sometido a flujos de concurrencia masiva?
* **PE4:** ¿En qué medida difiere la tasa de quiebres de stock y el porcentaje de pertinencia/conversión de prescripción antes y después de la implementación del sistema automatizado?

---

## 1.2. Objetivos de la Investigación

### 1.2.1. Objetivo General
Desarrollar un sistema de gestión de inventarios e inteligencia comercial basado en visión artificial y árboles de decisión para la prescripción personalizada de entrenamiento, nutrición y suplementación fitness, y determinar su efecto sobre la reducción de quiebres de stock y la pertinencia de la prescripción en tiendas especializadas de [CIUDAD], 2026.

### 1.2.2. Objetivos Específicos
* **OE1:** Diagnosticar la incidencia de quiebres de stock y errores de prescripción en el estado actual (pretest).
* **OE2:** Determinar la precisión del modelo predictivo de biotipo mediante *Accuracy* y *RMSE* sobre el conjunto de prueba.
* **OE3:** Evaluar el desempeño del sistema bajo carga concurrente mediante el percentil 95 de latencia de los endpoints críticos.
* **OE4:** Establecer el efecto del sistema comparando pretest-postest sobre quiebres de stock y pertinencia de prescripción.

---

## 1.3. Justificación de la Investigación

### 1.3.1. Justificación Teórica
La investigación contribuye al cuerpo de conocimiento interdisciplinario que converge entre la ingeniería de software aplicada, la visión computacional y las ciencias de la nutrición deportiva. Desde una perspectiva computacional, formaliza la aplicación de modelos de estimación postural y geometría morfométrica tridimensional combinados con árboles de decisión (clasificadores inductivos tipo CART) para el razonamiento biométrico reproducible. Teóricamente, se demuestra que la extracción determinística de relaciones anatómicas supera la subjetividad humana en la clasificación somatotípica, proporcionando un modelo explicable y científicamente sustentado para la prescripción nutricional personalizada.

### 1.3.2. Justificación Práctica
En el contexto comercial y de gestión, la investigación aporta una solución directa y medible a las ineficiencias de abastecimiento y ventas que aquejan a las micro y medianas empresas del sector fitness en [CIUDAD]. La sincronización en tiempo real del Kárdex bajo control transaccional estricto elimina los desfases de stock, mientras que el módulo de inteligencia comercial automatiza la recomendación de suplementos con base en datos objetivos del cliente. Esto incrementa la productividad operativa, disminuye las pérdidas financieras por ventas no concretadas y protege la integridad de los consumidores al prescribir suplementos ajustados a sus características biológicas.

### 1.3.3. Justificación Metodológica y Tecnológica
La investigación se sustenta en un diseño cuasi-experimental cuantitativo con un estándar metodológico riguroso: todos los instrumentos de recolección de datos y auditoría son **estrictamente automatizados**, erradicando el sesgo del evaluador. La captura de métricas se ejecuta mediante consultas directas a los registros inmutables de persistencia relacional (`erp.kardex_fisico` y `ia.prescripcion_crossselling`), suites automatizadas de prueba unitaria (*PyTest*) y protocolos de inyección de carga concurrente (*JMeter/Locust*), garantizando la reproducibilidad matemática y la validez interna de los resultados empíricos.

---

## 1.4. Delimitación del Estudio

* **Delimitación Espacial:** La investigación se circunscribe a tiendas especializadas en nutrición y suplementación deportiva fitness ubicadas en el área metropolitana de [CIUDAD].
* **Delimitación Temporal:** El estudio, levantamiento de línea base (pretest), despliegue y medición de impacto (postest) se desarrolla durante el periodo académico y fiscal correspondiente al año 2026.
* **Delimitación Conceptual:** El estudio aborda la ingeniería de persistencia transaccional relacional (integridad ACID, Kárdex físico), el control de concurrencia, la inferencia biométrica mediante visión por computadora (extracción de landmarks anatómicos) y la clasificación de prescripción mediante reglas inductivas de decisión.

---

## 1.5. Hipótesis de la Investigación

### 1.5.1. Hipótesis General
* **$H_1$:** La implementación de un sistema de gestión de inventarios e inteligencia comercial basado en visión artificial y árboles de decisión reduce significativamente la incidencia de quiebres de stock y aumenta significativamente la pertinencia de la prescripción de suplementación fitness en tiendas especializadas de [CIUDAD], 2026.
* **$H_0$:** La implementación del sistema no produce una variación estadísticamente significativa sobre la incidencia de quiebres de stock ni sobre la pertinencia de la prescripción de suplementación fitness en las tiendas evaluadas.

---

## 1.6. Operacionalización de Variables

A continuación se detalla la matriz normativa de operacionalización de variables, estructurada bajo instrumentos exclusivamente automatizados:

| Variable | Dimensión | Indicador | Escala de Medición | Técnica de Recolección | Instrumento Automatizado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Variable Independiente (VI):**<br>Sistema basado en visión artificial y árboles de decisión | **Desempeño Predictivo** | • Exactitud de clasificación (*Accuracy*, %)<br>• Error cuadrático medio (*RMSE*) | Razón | Prueba algorítmica automatizada | Script *PyTest* + `scikit-learn.metrics` sobre *test set* |
| | **Desempeño del Sistema** | • Latencia en percentil 95 (*P95*, ms)<br>• Tasa de rendimiento (*Throughput*, req/s) | Razón | Prueba de esfuerzo y estrés concurrente | Plan *JMeter / Locust* + Reporte de logs cuantitativos *JTL* |
| **Variable Dependiente (VD):**<br>Eficiencia de gestión de inventarios y prescripción | **Disponibilidad de Inventario** | • Porcentaje de quiebres de stock por periodo (%) | Razón | Medición cuasi-experimental pretest-postest | Extracción SQL automatizada y auditada sobre `erp.kardex_fisico` |
| | **Pertinencia de Prescripción** | • Tasa de error en prescripción pretest (%)<br>• Tasa de conversión efectiva postest (%) | Razón | Medición cuasi-experimental pretest-postest | Extracción SQL automatizada sobre `ia.prescripcion_crossselling` |

---

## 1.7. Referencias Bibliográficas (Normas APA 7ma Edición)

* American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). https://doi.org/10.1037/0000165-000
* Breiman, L., Friedman, J., Stone, C. J., & Olshen, R. A. (1984). *Classification and Regression Trees*. CRC Press.
* Carter, J. E. L., & Heath, B. H. (1990). *Somatotyping: Development and applications*. Cambridge University Press.
* Chopra, S., & Meindl, P. (2016). *Supply chain management: Strategy, planning, and operation* (6th ed.). Pearson.
* Luger, C., & Luger, M. (2022). High-throughput concurrent transaction processing in decoupled modern architectures. *Journal of Systems and Software*, 188, 111267. https://doi.org/10.1016/j.jss.2022.111267
* Lugaresi, C., Tang, J., Nash, H., McClanahan, C., Uboweja, E., Hays, M., Zhang, F., Chang, C.-L., Yong, M. G., Lee, J., Chang, W.-T., Hua, W., Georg, M., & Grundmann, M. (2019). MediaPipe: A framework for building perception pipelines. *arXiv preprint arXiv:1906.08172*. https://doi.org/10.48550/arXiv.1906.08172
* Russell, S., & Norvig, P. (2020). *Artificial intelligence: A modern approach* (4th ed.). Pearson.
* Silver, E. A., Pyke, D. F., & Thomas, D. J. (2016). *Inventory and production management in supply chains* (4th ed.). CRC Press.
