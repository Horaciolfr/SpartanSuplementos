# Clasificación de warnings de service-ia

Fecha: 2026-10-07.

## Diagnóstico

La ejecución inicial emitía 10 instancias de InconsistentVersionWarning de
scikit-learn. No eran DeprecationWarning: los artefactos de clasificador,
regresor y scaler biométricos habían sido serializados con scikit-learn 1.9.0
y se cargaban con 1.9.1.

Clasificación: crítico para reproducibilidad e integridad de inferencia. La
documentación de scikit-learn no garantiza compatibilidad binaria entre
versiones.

## Corrección

- Se fijó scikit-learn==1.9.1 en services/ia/requirements_ia.txt.
- Se reentrenaron y serializaron los tres artefactos con 1.9.1 y semilla 42.
- El generador quedó archivado en
  scripts/_deprecated/train_somatotype_model.py.

## Evidencia

Comando independiente:

    python -m pytest services/ia/tests -W error::DeprecationWarning -v

Resultado: 14 passed; cero DeprecationWarning y cero
InconsistentVersionWarning.
