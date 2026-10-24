"""
Contrato Estricto JSONB para coordenadas_espaciales en ia.perfil_biometrico.

PAQUETE 12: Tarea 8
Define la estructura inmutable y la función de validación fail-fast usando jsonschema.
Prohibido persistir listas sueltas o claves ad-hoc fuera de este contrato.
"""

import logging
from typing import Dict, Any
import jsonschema

logger = logging.getLogger("services.ia.jsonb_schema")

COORDENADAS_ESPACIALES_SCHEMA: Dict[str, Any] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "CoordenadasEspacialesContrato",
    "type": "object",
    "required": [
        "frame_id",
        "precision",
        "landmarks",
        "world_landmarks",
        "metricas",
        "metadata"
    ],
    "additionalProperties": False,
    "properties": {
        "frame_id": {
            "type": "string",
            "minLength": 1
        },
        "precision": {
            "type": "number",
            "minimum": 0.0,
            "maximum": 1.0
        },
        "landmarks": {
            "type": "array",
            "minItems": 33,
            "maxItems": 33,
            "items": {
                "type": "object",
                "required": ["ix", "nombre", "x", "y", "z", "visibility"],
                "additionalProperties": False,
                "properties": {
                    "ix": {"type": "integer", "minimum": 0, "maximum": 32},
                    "nombre": {"type": "string", "minLength": 1},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "z": {"type": "number"},
                    "visibility": {"type": "number", "minimum": 0.0, "maximum": 1.0}
                }
            }
        },
        "world_landmarks": {
            "type": "array",
            "minItems": 33,
            "maxItems": 33,
            "items": {
                "type": "object",
                "required": ["ix", "x", "y", "z"],
                "additionalProperties": False,
                "properties": {
                    "ix": {"type": "integer", "minimum": 0, "maximum": 32},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "z": {"type": "number"}
                }
            }
        },
        "metricas": {
            "type": "object",
            "required": [
                "v_taper",
                "ancho_hombros_m",
                "ancho_cadera_m",
                "torso_length_m",
                "simetria",
                "postura"
            ],
            "additionalProperties": False,
            "properties": {
                "v_taper": {"type": "number"},
                "ancho_hombros_m": {"type": "number"},
                "ancho_cadera_m": {"type": "number"},
                "torso_length_m": {"type": "number"},
                "simetria": {"type": "number", "minimum": 0.0, "maximum": 1.0},
                "postura": {"type": "string", "minLength": 1}
            }
        },
        "metadata": {
            "type": "object",
            "required": ["mediapipe_version", "model", "timestamp_utc"],
            "additionalProperties": False,
            "properties": {
                "mediapipe_version": {"type": "string", "minLength": 1},
                "model": {"type": "string", "enum": ["pose_landmarker_lite"]},
                "timestamp_utc": {"type": "string", "minLength": 1}
            }
        }
    }
}


def validar_coordenadas_espaciales(payload: Dict[str, Any]) -> None:
    """
    Valida el payload contra el esquema formal JSONB.
    Lanza jsonschema.ValidationError si la estructura no cumple estrictamente el contrato.
    """
    try:
        jsonschema.validate(instance=payload, schema=COORDENADAS_ESPACIALES_SCHEMA)
    except jsonschema.ValidationError as err:
        logger.error(
            "Violación de contrato JSONB: %s | Ruta: %s",
            err.message,
            list(err.path),
            extra={"error_message": err.message, "path": list(err.path)}
        )
        raise
