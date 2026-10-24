from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class SucursalResumen(BaseModel):
    codigo: str
    nombre: str
    ciudad: str
    total_transacciones: int
    completadas: int
    canceladas: int
    con_descuento: int
    facturacion_total_bs: float
    ticket_promedio_bs: float
    unidades_vendidas: int
    metodo_pago_lider: str
    participacion_pct: float


class ProyeccionDiaria(BaseModel):
    fecha: str
    dia_semana: str
    es_fin_de_semana: bool
    es_fin_de_mes: bool
    prediccion_bs: float
    limite_inferior_bs: float
    limite_superior_bs: float
    unidades_estimadas: int
    es_pico_esperado: bool


class ProyeccionCategoria(BaseModel):
    categoria: str
    subcategoria: str
    unidades_historicas: int
    ingresos_historicos_bs: float
    unidades_proyectadas: int
    ingresos_proyectados_bs: float
    participacion_pct: float
    tendencia: str


class AlertaReorden(BaseModel):
    codigo_sku: str
    nombre_producto: str
    subcategoria: str
    stock_actual_estimado: int
    demanda_proyectada_periodo: int
    dias_cobertura_restante: float
    nivel_urgencia: str  # 'CRITICO', 'MODERADO', 'OPTIMO'
    sugerencia_reorden: int


class FuenteDatos(BaseModel):
    nombre: str
    sucursal: str
    registros: int
    fecha_inicio: str
    fecha_fin: str
    sha256_corto: str


class MetricasModelo(BaseModel):
    algoritmo: str
    r2_score: float
    rmse_bs: float
    mape_pct: float
    confianza_intervalo_pct: float
    muestras_entrenamiento: int
    mae_bs: float = 0.0
    wape_pct: float = 0.0
    baseline_rmse_bs: float = 0.0
    baseline_mae_bs: float = 0.0
    baseline_wape_pct: float = 0.0
    mejora_vs_baseline_pct: float = 0.0
    muestras_validacion: int = 0
    inicio_validacion: Optional[str] = None
    fin_validacion: Optional[str] = None
    evaluacion: str = "Validación temporal sobre fechas posteriores no usadas en el entrenamiento"
    estado_validacion: str = "REFERENCIAL"
    cobertura_intervalo_pct: float = 0.0
    vigencia_datos: str = "DESCONOCIDA"
    advertencia: Optional[str] = None
    fuentes_datos: List[FuenteDatos] = Field(default_factory=list)
    # Trazabilidad estricta V-07
    id_version: Optional[int] = None
    hash_artefacto: Optional[str] = None
    hash_corto: Optional[str] = None
    objetivo_unidades: str = "Demanda diaria agregada (unidades)"
    metric_rmse_unidades: Optional[float] = None
    metric_accuracy: Optional[float] = None
    r2_monetario_rotulo: str = "R2 de proyección de facturación, recalculo sobre serie monetaria"
    corte_serie: Optional[str] = None


class InsightEstrategico(BaseModel):
    tipo: str  # 'OPORTUNIDAD', 'ALERTA', 'ESTACIONALIDAD', 'SUCURSAL'
    titulo: str
    descripcion: str
    impacto_estimado: str


class DashboardPrediccionesResponse(BaseModel):
    resumen_general: Dict[str, float | int | str]
    sucursales: List[SucursalResumen]
    metricas_modelo: MetricasModelo
    proyecciones_diarias: List[ProyeccionDiaria]
    proyecciones_categoria: List[ProyeccionCategoria]
    alertas_inventario: List[AlertaReorden]
    insights: List[InsightEstrategico]
    sucursal_filtrada: str
    horizonte_dias: int
