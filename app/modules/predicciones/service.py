"""Predicción de ventas con validación temporal y trazabilidad de fuentes.

La proyección publicada procede del mismo modelo que se evalúa. No se usan
factores comerciales manuales ni ruido aleatorio para dibujar la curva.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error

from app.modules.predicciones.schemas import (
    DashboardPrediccionesResponse,
    FuenteDatos,
    InsightEstrategico,
    MetricasModelo,
    ProyeccionCategoria,
    ProyeccionDiaria,
    SucursalResumen,
)

PROJECT_ROOT = Path(__file__).resolve().parents[3]

CENTRAL_PATHS = [
    PROJECT_ROOT / "data" / "ventas_spartan_512_actualizado.xlsx",
    PROJECT_ROOT / "data" / "registro_ventas_spartan.csv",
    PROJECT_ROOT / "data" / "ventas_spartan_suplementos_oficial.xlsx",
]
SANTA_CRUZ_PATHS = [
    PROJECT_ROOT / "data" / "ventas_spartan_santa_cruz_fuente.xlsx",
    PROJECT_ROOT / "data" / "registro_ventas_santa_cruz.csv",
    PROJECT_ROOT / "data" / "ventas_spartan_santa_cruz.xlsx",
]

SUCURSAL_CENTRAL = "Sucursal Central (La Paz)"
SUCURSAL_SANTA_CRUZ = "Sucursal Santa Cruz (Equipetrol)"
SUCURSALES = (SUCURSAL_CENTRAL, SUCURSAL_SANTA_CRUZ)
DIAS_SEMANA_ES = ("Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo")

FEATURES_NUMERICAS = (
    "dia_semana", "mes", "dia_mes", "semana_anio", "es_fin_semana",
    "es_fin_mes", "t", "lag1", "lag2", "lag3", "lag7", "lag14",
    "lag28", "mm7", "mm14", "mm28",
)


class PrediccionVentasService:
    """Entrena, valida y publica una única proyección reproducible."""

    def __init__(self) -> None:
        self._df_ventas: Optional[pd.DataFrame] = None
        self._model: Optional[RandomForestRegressor] = None
        self._metricas: Optional[MetricasModelo] = None
        self._feature_columns: List[str] = []
        self._series_by_branch: Dict[str, pd.Series] = {}
        self._residual_bounds: Dict[str, Tuple[float, float]] = {}
        self._fuentes: List[FuenteDatos] = []
        self._last_loaded: Optional[datetime] = None

    @staticmethod
    def _sha256_corto(path: Path) -> str:
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(block)
        return digest.hexdigest()[:12]

    @staticmethod
    def _leer_fuente(paths: List[Path]) -> Tuple[pd.DataFrame, Path]:
        errors: List[str] = []
        for path in paths:
            if not path.exists():
                continue
            try:
                if path.suffix.lower() == ".csv":
                    return pd.read_csv(path, encoding="latin-1"), path
                excel = pd.ExcelFile(path)
                sheet = "Datos_Machine_Learning" if "Datos_Machine_Learning" in excel.sheet_names else excel.sheet_names[0]
                return pd.read_excel(path, sheet_name=sheet), path
            except Exception as exc:  # pragma: no cover - diagnóstico de fuentes alternativas
                errors.append(f"{path.name}: {exc}")
        detail = "; ".join(errors) if errors else "ninguna ruta disponible"
        raise FileNotFoundError(f"No se pudo cargar una fuente de ventas ({detail}).")

    @staticmethod
    def _normalizar_dataset(df: pd.DataFrame, branch: str) -> pd.DataFrame:
        central_columns = [
            "id_transaccion", "fecha", "hora", "codigo_sku", "nombre_producto",
            "categoria", "subcategoria", "precio_unitario", "cantidad", "subtotal_bs",
            "descuento_bs", "total_bs", "metodo_pago", "cliente", "caja", "estado",
        ]
        santa_columns = [
            "id_transaccion", "fecha", "hora", "codigo_sku", "nombre_producto",
            "categoria", "subcategoria", "precio_unitario", "cantidad", "subtotal_bs",
            "descuento_bs", "total_bs", "metodo_pago", "cliente", "sucursal_origen", "caja", "estado",
        ]
        normalized = df.copy()
        normalized.columns = [str(column).strip().lower() for column in normalized.columns]
        if len(normalized.columns) == len(central_columns):
            normalized.columns = central_columns
        elif len(normalized.columns) == len(santa_columns):
            normalized.columns = santa_columns

        required = {
            "id_transaccion", "fecha", "codigo_sku", "nombre_producto", "categoria",
            "subcategoria", "precio_unitario", "cantidad", "total_bs", "descuento_bs",
            "metodo_pago", "estado",
        }
        missing = sorted(required.difference(normalized.columns))
        if missing:
            raise ValueError(f"La fuente de {branch} no contiene: {', '.join(missing)}")

        normalized["sucursal"] = branch
        normalized["fecha_dt"] = pd.to_datetime(normalized["fecha"], errors="coerce")
        normalized["total_bs"] = pd.to_numeric(normalized["total_bs"], errors="coerce").fillna(0.0)
        normalized["cantidad"] = pd.to_numeric(normalized["cantidad"], errors="coerce").fillna(0).astype(int)
        normalized["descuento_bs"] = pd.to_numeric(normalized["descuento_bs"], errors="coerce").fillna(0.0)
        normalized["estado"] = normalized["estado"].astype(str).str.strip().str.upper()
        return normalized.dropna(subset=["fecha_dt"]).reset_index(drop=True)

    def cargar_datos(self) -> pd.DataFrame:
        """Carga exactamente los dos datasets entregados y registra su procedencia."""
        central_raw, central_path = self._leer_fuente(CENTRAL_PATHS)
        santa_raw, santa_path = self._leer_fuente(SANTA_CRUZ_PATHS)
        central = self._normalizar_dataset(central_raw, SUCURSAL_CENTRAL)
        santa = self._normalizar_dataset(santa_raw, SUCURSAL_SANTA_CRUZ)
        combined = pd.concat([central, santa], ignore_index=True)

        if combined.duplicated(subset=["sucursal", "id_transaccion"]).any():
            raise ValueError("Se detectaron transacciones duplicadas dentro de una sucursal.")

        self._fuentes = [
            FuenteDatos(
                nombre=central_path.name,
                sucursal="La Paz",
                registros=len(central),
                fecha_inicio=str(central["fecha_dt"].min().date()),
                fecha_fin=str(central["fecha_dt"].max().date()),
                sha256_corto=self._sha256_corto(central_path),
            ),
            FuenteDatos(
                nombre=santa_path.name,
                sucursal="Santa Cruz",
                registros=len(santa),
                fecha_inicio=str(santa["fecha_dt"].min().date()),
                fecha_fin=str(santa["fecha_dt"].max().date()),
                sha256_corto=self._sha256_corto(santa_path),
            ),
        ]
        self._df_ventas = combined
        self._model = None
        self._metricas = None
        self._last_loaded = datetime.now()
        return combined

    def obtener_dataframe(self) -> pd.DataFrame:
        return self.cargar_datos() if self._df_ventas is None else self._df_ventas

    @staticmethod
    def _es_completada(series: pd.Series) -> pd.Series:
        return series.astype(str).str.upper().eq("COMPLETADA")

    def _construir_panel(self, df: pd.DataFrame) -> pd.DataFrame:
        completed = df[self._es_completada(df["estado"])].copy()
        start_date = completed["fecha_dt"].min()
        end_date = completed["fecha_dt"].max()
        dates = pd.date_range(start_date, end_date, freq="D")
        frames: List[pd.DataFrame] = []
        self._series_by_branch = {}
        for branch in SUCURSALES:
            daily = (
                completed[completed["sucursal"] == branch]
                .groupby("fecha_dt")["total_bs"]
                .sum()
                .reindex(dates, fill_value=0.0)
                .astype(float)
            )
            self._series_by_branch[branch] = daily.copy()
            frame = pd.DataFrame({"fecha_dt": dates, "ventas_bs": daily.values, "sucursal": branch})
            frames.append(frame)

        panel = pd.concat(frames, ignore_index=True).sort_values(["sucursal", "fecha_dt"]).reset_index(drop=True)
        panel["dia_semana"] = panel["fecha_dt"].dt.day_of_week
        panel["mes"] = panel["fecha_dt"].dt.month
        panel["dia_mes"] = panel["fecha_dt"].dt.day
        panel["semana_anio"] = panel["fecha_dt"].dt.isocalendar().week.astype(int)
        panel["es_fin_semana"] = panel["dia_semana"].isin([4, 5, 6]).astype(int)
        panel["es_fin_mes"] = panel["fecha_dt"].dt.is_month_end.astype(int)
        panel["t"] = (panel["fecha_dt"] - start_date).dt.days
        grouped = panel.groupby("sucursal", sort=False)["ventas_bs"]
        for lag in (1, 2, 3, 7, 14, 28):
            panel[f"lag{lag}"] = grouped.shift(lag)
        for window in (7, 14, 28):
            panel[f"mm{window}"] = grouped.transform(
                lambda values: values.shift(1).rolling(window, min_periods=window).mean()
            )
        return panel.dropna().reset_index(drop=True)

    def _matriz_features(self, frame: pd.DataFrame) -> pd.DataFrame:
        matrix = pd.get_dummies(
            frame[list(FEATURES_NUMERICAS) + ["sucursal"]],
            columns=["sucursal"],
            dtype=int,
        )
        if self._feature_columns:
            matrix = matrix.reindex(columns=self._feature_columns, fill_value=0)
        return matrix

    @staticmethod
    def _wape(real: pd.Series | np.ndarray, predicted: np.ndarray) -> float:
        real_array = np.asarray(real, dtype=float)
        denominator = max(float(np.abs(real_array).sum()), 1.0)
        return float(np.abs(real_array - predicted).sum() / denominator * 100.0)

    def entrenar_modelo_predictivo(self) -> Tuple[RandomForestRegressor, MetricasModelo]:
        """Valida sobre los últimos 60 días y luego reajusta con todo el histórico."""
        panel = self._construir_panel(self.obtener_dataframe())
        self._feature_columns = []
        matrix = self._matriz_features(panel)
        self._feature_columns = list(matrix.columns)
        target = panel["ventas_bs"].astype(float)

        validation_start = panel["fecha_dt"].max() - pd.Timedelta(days=59)
        train_mask = panel["fecha_dt"] < validation_start
        validation_mask = ~train_mask
        if train_mask.sum() < 120 or validation_mask.sum() < 30:
            raise ValueError("El histórico no alcanza para una validación temporal confiable.")

        candidate = RandomForestRegressor(
            n_estimators=400, max_depth=10, min_samples_leaf=2,
            max_features=0.8, random_state=42, n_jobs=1,
        )
        candidate.fit(matrix.loc[train_mask], target.loc[train_mask])
        predicted = candidate.predict(matrix.loc[validation_mask])
        real = target.loc[validation_mask]
        baseline = panel.loc[validation_mask, "mm7"].to_numpy(dtype=float)

        rmse = float(root_mean_squared_error(real, predicted))
        mae = float(mean_absolute_error(real, predicted))
        wape = self._wape(real, predicted)
        nonzero = real > 50
        mape = float(np.mean(np.abs((real[nonzero] - predicted[nonzero]) / real[nonzero])) * 100) if nonzero.any() else 0.0
        r2 = float(r2_score(real, predicted))
        baseline_rmse = float(root_mean_squared_error(real, baseline))
        baseline_mae = float(mean_absolute_error(real, baseline))
        baseline_wape = self._wape(real, baseline)
        improvement = ((baseline_rmse - rmse) / baseline_rmse * 100.0) if baseline_rmse else 0.0

        validation_rows = panel.loc[validation_mask, ["sucursal"]].copy()
        validation_rows["residuo"] = real.to_numpy() - predicted
        all_residuals = validation_rows["residuo"].to_numpy(dtype=float)
        global_bounds = tuple(float(value) for value in np.quantile(all_residuals, [0.05, 0.95]))
        self._residual_bounds = {}
        for branch in SUCURSALES:
            residuals = validation_rows.loc[validation_rows["sucursal"] == branch, "residuo"].to_numpy(dtype=float)
            self._residual_bounds[branch] = (
                tuple(float(value) for value in np.quantile(residuals, [0.05, 0.95]))
                if len(residuals) >= 20 else global_bounds
            )
        lower = predicted + global_bounds[0]
        upper = predicted + global_bounds[1]
        coverage = float(np.mean((real.to_numpy() >= lower) & (real.to_numpy() <= upper)) * 100.0)

        data_cut = panel["fecha_dt"].max().date()
        age_days = (datetime.now().date() - data_cut).days
        freshness = "ACTUALIZADA" if age_days <= 60 else "DESACTUALIZADA"
        validation_state = "ACEPTABLE" if improvement >= 10.0 and wape <= 35.0 else "REFERENCIAL"
        warnings: List[str] = []
        if validation_state == "REFERENCIAL":
            warnings.append(
                "El error fuera de muestra es alto o la mejora frente al promedio móvil es menor al 10%; úsese para orientación, no como compromiso de venta."
            )
        if freshness == "DESACTUALIZADA":
            warnings.append(f"El último registro es del {data_cut.isoformat()}; incorpore ventas recientes antes de una decisión operativa.")

        metrics = MetricasModelo(
            algoritmo="Random Forest de facturación diaria con rezagos",
            r2_score=round(r2, 4), rmse_bs=round(rmse, 2), mape_pct=round(mape, 2),
            confianza_intervalo_pct=90.0, muestras_entrenamiento=int(train_mask.sum()),
            mae_bs=round(mae, 2), wape_pct=round(wape, 2),
            baseline_rmse_bs=round(baseline_rmse, 2), baseline_mae_bs=round(baseline_mae, 2),
            baseline_wape_pct=round(baseline_wape, 2), mejora_vs_baseline_pct=round(improvement, 2),
            muestras_validacion=int(validation_mask.sum()),
            inicio_validacion=str(panel.loc[validation_mask, "fecha_dt"].min().date()),
            fin_validacion=str(panel.loc[validation_mask, "fecha_dt"].max().date()),
            estado_validacion=validation_state, cobertura_intervalo_pct=round(coverage, 2),
            vigencia_datos=freshness, advertencia=" ".join(warnings) or None,
            fuentes_datos=self._fuentes, objetivo_unidades="Facturación diaria agregada (Bs.)",
            r2_monetario_rotulo="R² fuera de muestra sobre facturación diaria",
            corte_serie=str(data_cut),
        )

        final_model = RandomForestRegressor(
            n_estimators=400, max_depth=10, min_samples_leaf=2,
            max_features=0.8, random_state=42, n_jobs=1,
        )
        final_model.fit(matrix, target)
        self._model = final_model
        self._metricas = metrics
        return final_model, metrics

    def _proyectar_sucursal(self, branch: str, horizon: int) -> List[Dict[str, Any]]:
        if self._model is None:
            raise RuntimeError("El modelo debe entrenarse antes de proyectar.")
        history = list(self._series_by_branch[branch].astype(float).values)
        start_date = self._series_by_branch[branch].index.min()
        last_date = self._series_by_branch[branch].index.max()
        residual_low, residual_high = self._residual_bounds[branch]
        historical_q75 = float(self._series_by_branch[branch].quantile(0.75))
        results: List[Dict[str, Any]] = []
        for step in range(1, horizon + 1):
            future_date = last_date + timedelta(days=step)
            row: Dict[str, Any] = {
                "dia_semana": future_date.day_of_week, "mes": future_date.month,
                "dia_mes": future_date.day, "semana_anio": int(future_date.isocalendar().week),
                "es_fin_semana": int(future_date.day_of_week in (4, 5, 6)),
                "es_fin_mes": int(future_date.is_month_end), "t": (future_date - start_date).days,
                "sucursal": branch,
            }
            for lag in (1, 2, 3, 7, 14, 28):
                row[f"lag{lag}"] = history[-lag]
            for window in (7, 14, 28):
                row[f"mm{window}"] = float(np.mean(history[-window:]))
            prediction = max(0.0, float(self._model.predict(self._matriz_features(pd.DataFrame([row])))[0]))
            history.append(prediction)
            results.append({
                "fecha": future_date, "prediccion": prediction,
                "inferior": max(0.0, prediction + residual_low),
                "superior": max(0.0, prediction + residual_high),
                "pico": prediction >= historical_q75,
            })
        return results

    def _proyecciones(self, filtro: str, horizon: int, completed: pd.DataFrame) -> List[ProyeccionDiaria]:
        branches = [SUCURSAL_CENTRAL] if filtro == "CENTRAL" else (
            [SUCURSAL_SANTA_CRUZ] if filtro == "SANTA_CRUZ" else list(SUCURSALES)
        )
        forecasts = [self._proyectar_sucursal(branch, horizon) for branch in branches]
        historical = completed[completed["sucursal"].isin(branches)]
        revenue_per_unit = float(historical["total_bs"].sum() / max(int(historical["cantidad"].sum()), 1))
        result: List[ProyeccionDiaria] = []
        for index in range(horizon):
            rows = [forecast[index] for forecast in forecasts]
            future_date = rows[0]["fecha"]
            prediction = sum(float(row["prediccion"]) for row in rows)
            result.append(ProyeccionDiaria(
                fecha=future_date.strftime("%Y-%m-%d"), dia_semana=DIAS_SEMANA_ES[future_date.day_of_week],
                es_fin_de_semana=future_date.day_of_week in (4, 5, 6), es_fin_de_mes=bool(future_date.is_month_end),
                prediccion_bs=round(prediction, 2),
                limite_inferior_bs=round(sum(float(row["inferior"]) for row in rows), 2),
                limite_superior_bs=round(sum(float(row["superior"]) for row in rows), 2),
                unidades_estimadas=max(0, int(round(prediction / max(revenue_per_unit, 1.0)))),
                es_pico_esperado=any(bool(row["pico"]) for row in rows),
            ))
        return result

    @staticmethod
    def _resumen_sucursales(df: pd.DataFrame) -> List[SucursalResumen]:
        completed_all = df[PrediccionVentasService._es_completada(df["estado"])]
        total_revenue = float(completed_all["total_bs"].sum())
        definitions = (
            ("CENTRAL", SUCURSAL_CENTRAL, "La Paz"),
            ("SANTA_CRUZ", SUCURSAL_SANTA_CRUZ, "Santa Cruz"),
        )
        summaries: List[SucursalResumen] = []
        for code, name, city in definitions:
            branch = df[df["sucursal"] == name]
            completed = branch[PrediccionVentasService._es_completada(branch["estado"])]
            revenue = float(completed["total_bs"].sum())
            top_payment = str(completed["metodo_pago"].mode().iloc[0]) if not completed.empty else "Sin datos"
            summaries.append(SucursalResumen(
                codigo=code, nombre=name, ciudad=city, total_transacciones=len(branch),
                completadas=len(completed), canceladas=len(branch) - len(completed),
                con_descuento=int((branch["descuento_bs"] > 0).sum()),
                facturacion_total_bs=round(revenue, 2),
                ticket_promedio_bs=round(revenue / max(len(completed), 1), 2),
                unidades_vendidas=int(completed["cantidad"].sum()), metodo_pago_lider=top_payment,
                participacion_pct=round(revenue / max(total_revenue, 1.0) * 100.0, 2),
            ))
        return summaries

    @staticmethod
    def _proyeccion_categorias(completed: pd.DataFrame, projected_revenue: float) -> List[ProyeccionCategoria]:
        if completed.empty:
            return []
        cut = completed["fecha_dt"].max()
        recent_start = cut - pd.Timedelta(days=59)
        previous_start = recent_start - pd.Timedelta(days=60)
        recent = completed[completed["fecha_dt"] >= recent_start]
        previous = completed[(completed["fecha_dt"] >= previous_start) & (completed["fecha_dt"] < recent_start)]
        stats = recent.groupby(["categoria", "subcategoria"]).agg(
            unidades_hist=("cantidad", "sum"), ingresos_hist=("total_bs", "sum"),
        ).reset_index()
        previous_revenue = previous.groupby(["categoria", "subcategoria"])["total_bs"].sum()
        recent_total = max(float(stats["ingresos_hist"].sum()), 1.0)
        projections: List[ProyeccionCategoria] = []
        for _, row in stats.iterrows():
            key = (row["categoria"], row["subcategoria"])
            share = float(row["ingresos_hist"]) / recent_total
            category_projection = projected_revenue * share
            price = float(row["ingresos_hist"]) / max(int(row["unidades_hist"]), 1)
            previous_value = float(previous_revenue.get(key, 0.0))
            change = (float(row["ingresos_hist"]) - previous_value) / max(previous_value, 1.0)
            trend = "ALZA" if change > 0.15 else ("BAJA" if change < -0.15 else "ESTABLE")
            projections.append(ProyeccionCategoria(
                categoria=str(row["categoria"]), subcategoria=str(row["subcategoria"]),
                unidades_historicas=int(row["unidades_hist"]),
                ingresos_historicos_bs=round(float(row["ingresos_hist"]), 2),
                unidades_proyectadas=max(0, int(round(category_projection / max(price, 1.0)))),
                ingresos_proyectados_bs=round(category_projection, 2),
                participacion_pct=round(share * 100.0, 2), tendencia=trend,
            ))
        return sorted(projections, key=lambda item: item.ingresos_proyectados_bs, reverse=True)

    def generar_dashboard(
        self, sucursal_filtro: str = "TODAS", horizonte_dias: int = 14,
        version_activa: Optional[Mapping[str, Any]] = None,
    ) -> DashboardPrediccionesResponse:
        filter_code = sucursal_filtro.upper()
        if filter_code not in {"TODAS", "CENTRAL", "SANTA_CRUZ"}:
            raise ValueError("Sucursal inválida. Use TODAS, CENTRAL o SANTA_CRUZ.")
        df = self.obtener_dataframe()
        if self._model is None or self._metricas is None:
            self.entrenar_modelo_predictivo()
        if self._metricas is None:
            raise RuntimeError("No fue posible obtener las métricas del modelo.")

        completed = df[self._es_completada(df["estado"])].copy()
        branches = [SUCURSAL_CENTRAL] if filter_code == "CENTRAL" else (
            [SUCURSAL_SANTA_CRUZ] if filter_code == "SANTA_CRUZ" else list(SUCURSALES)
        )
        filtered_completed = completed[completed["sucursal"].isin(branches)]
        projections = self._proyecciones(filter_code, horizonte_dias, completed)
        projected_revenue = sum(item.prediccion_bs for item in projections)
        total_revenue = float(completed["total_bs"].sum())
        metric_values = self._metricas.model_dump()
        if version_activa:
            metric_values.update({
                "id_version": int(version_activa["id_version"]) if version_activa.get("id_version") is not None else None,
                "hash_artefacto": str(version_activa["hash_archivo"]) if version_activa.get("hash_archivo") else None,
                "hash_corto": str(version_activa["hash_archivo"])[:8] if version_activa.get("hash_archivo") else None,
                "metric_rmse_unidades": float(version_activa["metric_rmse"]) if version_activa.get("metric_rmse") is not None else None,
                "metric_accuracy": float(version_activa["metric_accuracy"]) if version_activa.get("metric_accuracy") is not None else None,
            })
        final_metrics = MetricasModelo(**metric_values)
        insights = [InsightEstrategico(
            tipo="VALIDACION", titulo="Resultado de la validación temporal",
            descripcion=(f"El modelo obtuvo WAPE de {final_metrics.wape_pct:.1f}% y una mejora de "
                         f"{final_metrics.mejora_vs_baseline_pct:.1f}% frente al promedio móvil de 7 días."),
            impacto_estimado=final_metrics.estado_validacion,
        )]
        if final_metrics.vigencia_datos == "DESACTUALIZADA":
            insights.append(InsightEstrategico(
                tipo="CALIDAD_DATOS", titulo="Histórico pendiente de actualización",
                descripcion=f"La serie termina el {final_metrics.corte_serie}; la proyección representa el periodo inmediatamente posterior a ese corte.",
                impacto_estimado="Actualizar antes de usar en operación",
            ))

        return DashboardPrediccionesResponse(
            resumen_general={
                "total_transacciones_historicas": len(df), "transacciones_completadas": len(completed),
                "transacciones_canceladas": len(df) - len(completed),
                "total_ingresos_historicos_bs": round(total_revenue, 2),
                "ticket_promedio_bs": round(total_revenue / max(len(completed), 1), 2),
                "total_unidades_vendidas": int(completed["cantidad"].sum()),
                "periodo_analizado": f"{df['fecha_dt'].min().date()} al {df['fecha_dt'].max().date()}",
                "sucursales_activas": 2,
            },
            sucursales=self._resumen_sucursales(df), metricas_modelo=final_metrics,
            proyecciones_diarias=projections,
            proyecciones_categoria=self._proyeccion_categorias(filtered_completed, projected_revenue),
            alertas_inventario=[], insights=insights, sucursal_filtrada=filter_code,
            horizonte_dias=horizonte_dias,
        )


predicciones_service = PrediccionVentasService()
