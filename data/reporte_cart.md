# REPORTE DE CONSTRUCCIÓN DEL MOTOR DE REGLAS (CART)
**Proyecto:** Spartan Suplementos Bolivia — Motor de Cross-Selling Inteligente (Tarea 13)  
**Algoritmo:** `DecisionTreeClassifier` (Profundidad Máxima = 4, Min Samples Leaf = 20)  
**Semilla Determinista:** 42 | **Accuracy del Árbol:** 89.31%  
**Artefacto Persistido:** `modelo_cart_v1.joblib` (SHA-256: `7dc59ac0493e71274007d6f98e3079cb17b53888871cabee968fddb7f05696dc`)  
**ID Versión Registrada en BD:** 36 (aprobado_produccion = FALSE)  

---

## 1. Matriz de Afinidad (Somatotipo x Categoría) Normalizada
```text
categoria           CREATINA  INDUMENTARIA  MASS_GAINER  PROTEINAS  QUEMADORES
somatotipo_cliente                                                            
ECTOMORFO             0.2560        0.2126       0.2802     0.1377      0.1135
ENDOMORFO             0.0864        0.2591       0.0864     0.1409      0.4273
MESOMORFO             0.2352        0.2065       0.0900     0.3599      0.1084
```
*Umbral de corte (mediana):* 0.2352

---

## 2. Árbol de Decisión CART en Texto (`export_text`)
```text
|--- categoria_INDUMENTARIA <= 0.50
|   |--- categoria_CREATINA <= 0.50
|   |   |--- categoria_QUEMADORES <= 0.50
|   |   |   |--- somatotipo_ENDOMORFO <= 0.50
|   |   |   |   |--- class: 1
|   |   |   |--- somatotipo_ENDOMORFO >  0.50
|   |   |   |   |--- class: 0
|   |   |--- categoria_QUEMADORES >  0.50
|   |   |   |--- somatotipo_ENDOMORFO <= 0.50
|   |   |   |   |--- class: 0
|   |   |   |--- somatotipo_ENDOMORFO >  0.50
|   |   |   |   |--- class: 1
|   |--- categoria_CREATINA >  0.50
|   |   |--- somatotipo_MESOMORFO <= 0.50
|   |   |   |--- class: 1
|   |   |--- somatotipo_MESOMORFO >  0.50
|   |   |   |--- class: 1
|--- categoria_INDUMENTARIA >  0.50
|   |--- somatotipo_ENDOMORFO <= 0.50
|   |   |--- class: 0
|   |--- somatotipo_ENDOMORFO >  0.50
|   |   |--- class: 1

```

---

## 3. Desglose Estructurado de Hojas del Árbol CART (Paso C4)

El árbol entrenado produce un total de **8 hojas crudas**, de las cuales **3 hojas son podadas** (por predecir afinidad baja / soporte no calificado) y **5 hojas son exportadas** a la base de datos con soporte $\ge 20$:

| ID Hoja | Ruta Lógica (Condiciones Internas) | Clase | Soporte | Afinidad | Estado | Código Regla |
|:---:|---|:---:|:---:|:---:|:---:|:---:|
| **H1** | `INDUMENTARIA<=0.5 ∧ CREATINA<=0.5 ∧ QUEMADORES<=0.5 ∧ ENDOMORFO<=0.5` | 1 | 393 | 0.7430 | **Exportada** | **CART-1** |
| **H2** | `INDUMENTARIA<=0.5 ∧ CREATINA<=0.5 ∧ QUEMADORES<=0.5 ∧ ENDOMORFO>0.5` | 0 | 136 | 0.0864 | *Podada* (No afín / clase 0) | — |
| **H3** | `INDUMENTARIA<=0.5 ∧ CREATINA<=0.5 ∧ QUEMADORES>0.5 ∧ ENDOMORFO<=0.5` | 0 | 82 | 0.1100 | *Podada* (No afín / clase 0) | — |
| **H4** | `INDUMENTARIA<=0.5 ∧ CREATINA<=0.5 ∧ QUEMADORES>0.5 ∧ ENDOMORFO>0.5` | 1 | 94 | 1.0000 | **Exportada** | **CART-2** |
| **H5** | `INDUMENTARIA<=0.5 ∧ CREATINA>0.5 ∧ MESOMORFO<=0.5` | 1 | 125 | 0.8480 | **Exportada** | **CART-3** |
| **H6** | `INDUMENTARIA<=0.5 ∧ CREATINA>0.5 ∧ MESOMORFO>0.5` | 1 | 115 | 1.0000 | **Exportada** | **CART-4** |
| **H7** | `INDUMENTARIA>0.5 ∧ ENDOMORFO<=0.5` | 0 | 121 | 0.2090 | *Podada* (No afín / clase 0) | — |
| **H8** | `INDUMENTARIA>0.5 ∧ ENDOMORFO>0.5` | 1 | 57 | 1.0000 | **Exportada** | **CART-5** |

---

## 4. Tabla de Reglas de Inferencia Persistidas en BD (`ia.regla_inferencia_cart`)

| Código Regla | Hoja Origen | Descripción Técnica (Antecedente Completo) | Soporte ($N$) | Afinidad (Umbral) |
|---|:---:|---|:---:|:---:|
| **CART-1** | H1 | `SI categoria!=INDUMENTARIA Y categoria!=CREATINA Y categoria!=QUEMADORES Y somatotipo!=ENDOMORFO ENTONCES afinidad=ALTA` | 393 | 0.74 |
| **CART-2** | H4 | `SI categoria!=INDUMENTARIA Y categoria!=CREATINA Y categoria=QUEMADORES Y somatotipo=ENDOMORFO ENTONCES afinidad=ALTA` | 94 | 1.00 |
| **CART-3** | H5 | `SI categoria!=INDUMENTARIA Y categoria=CREATINA Y somatotipo!=MESOMORFO ENTONCES afinidad=ALTA` | 125 | 0.85 |
| **CART-4** | H6 | `SI categoria!=INDUMENTARIA Y categoria=CREATINA Y somatotipo=MESOMORFO ENTONCES afinidad=ALTA` | 115 | 1.00 |
| **CART-5** | H8 | `SI categoria=INDUMENTARIA Y somatotipo=ENDOMORFO ENTONCES afinidad=ALTA` | 57 | 1.00 |

*Garantía Metodológica:* El árbol cuenta con 8 hojas terminales totales, de las cuales se descartan 3 por carecer de soporte de afinidad positiva, exportándose exactamente 5 reglas discriminativas con soporte $\ge 20$ y confianza $\ge 0.74$. Cero reglas vacías.
