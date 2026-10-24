import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../api/client';

interface FuenteDatos {
  nombre: string;
  sucursal: string;
  registros: number;
  fecha_inicio: string;
  fecha_fin: string;
  sha256_corto: string;
}

interface SucursalResumen {
  codigo: string;
  nombre: string;
  ciudad: string;
  total_transacciones: number;
  completadas: number;
  canceladas: number;
  facturacion_total_bs: number;
  ticket_promedio_bs: number;
  unidades_vendidas: number;
  participacion_pct: number;
}

interface ProyeccionDiaria {
  fecha: string;
  dia_semana: string;
  prediccion_bs: number;
  limite_inferior_bs: number;
  limite_superior_bs: number;
  unidades_estimadas: number;
}

interface ProyeccionCategoria {
  categoria: string;
  subcategoria: string;
  unidades_proyectadas: number;
  ingresos_proyectados_bs: number;
  participacion_pct: number;
  tendencia: 'ALZA' | 'BAJA' | 'ESTABLE';
}

interface MetricasModelo {
  algoritmo: string;
  r2_score: number;
  rmse_bs: number;
  mae_bs: number;
  wape_pct: number;
  baseline_rmse_bs: number;
  baseline_mae_bs: number;
  baseline_wape_pct: number;
  mejora_vs_baseline_pct: number;
  muestras_entrenamiento: number;
  muestras_validacion: number;
  inicio_validacion: string | null;
  fin_validacion: string | null;
  estado_validacion: 'ACEPTABLE' | 'REFERENCIAL';
  cobertura_intervalo_pct: number;
  confianza_intervalo_pct: number;
  vigencia_datos: 'ACTUALIZADA' | 'DESACTUALIZADA' | 'DESCONOCIDA';
  advertencia: string | null;
  fuentes_datos: FuenteDatos[];
  corte_serie: string | null;
}

interface DashboardData {
  resumen_general: {
    total_transacciones_historicas: number;
    transacciones_completadas: number;
    total_ingresos_historicos_bs: number;
    ticket_promedio_bs: number;
    periodo_analizado: string;
  };
  sucursales: SucursalResumen[];
  metricas_modelo: MetricasModelo;
  proyecciones_diarias: ProyeccionDiaria[];
  proyecciones_categoria: ProyeccionCategoria[];
  sucursal_filtrada: string;
  horizonte_dias: number;
}

const money = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'BOB',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('es-BO');

const shortDate = (value: string) =>
  new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short' }).format(
    new Date(`${value}T12:00:00`),
  );

const fullDate = (value: string | null) => {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
};

export const PrediccionesVentas: React.FC = () => {
  const [sucursal, setSucursal] = useState('TODAS');
  const [horizonte, setHorizonte] = useState(14);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const fetchDashboard = async (branch: string, days: number, notify = false) => {
    setLoading(true);
    try {
      const response = await apiClient.get<DashboardData>('/predicciones/dashboard', {
        params: { sucursal: branch, horizonte_dias: days },
      });
      setData(response.data);
      if (notify) toast.success('Proyección actualizada');
    } catch (error) {
      console.error('Error cargando predicciones:', error);
      toast.error('No se pudo cargar la predicción de ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard(sucursal, horizonte);
  }, [sucursal, horizonte]);

  const totalProjected = useMemo(
    () => data?.proyecciones_diarias.reduce((total, day) => total + day.prediccion_bs, 0) ?? 0,
    [data],
  );

  const totalUnits = useMemo(
    () => data?.proyecciones_diarias.reduce((total, day) => total + day.unidades_estimadas, 0) ?? 0,
    [data],
  );

  const chart = useMemo(() => {
    const items = data?.proyecciones_diarias ?? [];
    if (!items.length) return null;
    const width = 960;
    const height = 320;
    const padding = { top: 28, right: 26, bottom: 48, left: 68 };
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;
    const maxValue = Math.max(...items.map((item) => item.limite_superior_bs), 1) * 1.05;
    const minValue = 0;
    const x = (index: number) =>
      padding.left + (items.length === 1 ? innerWidth / 2 : (index / (items.length - 1)) * innerWidth);
    const y = (value: number) =>
      padding.top + innerHeight - ((value - minValue) / (maxValue - minValue)) * innerHeight;
    const line = items.map((item, index) => `${x(index)},${y(item.prediccion_bs)}`).join(' ');
    const upper = items.map((item, index) => `${x(index)},${y(item.limite_superior_bs)}`);
    const lower = items
      .map((item, index) => `${x(index)},${y(item.limite_inferior_bs)}`)
      .reverse();
    return { width, height, padding, innerHeight, maxValue, x, y, line, interval: [...upper, ...lower].join(' ') };
  }, [data]);

  if (loading && !data) {
    return (
      <main className="min-h-[70vh] bg-[#080808] text-white grid place-items-center px-6">
        <div className="flex items-center gap-3 text-sm text-zinc-300">
          <RefreshCw className="h-5 w-5 animate-spin text-[#f2e500]" aria-hidden="true" />
          Validando el histórico y preparando la proyección…
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-[70vh] bg-[#080808] text-white grid place-items-center px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-amber-400" aria-hidden="true" />
          <h1 className="font-['Anybody'] text-2xl font-bold">No hay una proyección disponible</h1>
          <p className="mt-2 text-sm text-zinc-400">Revise la conexión con el servicio e intente nuevamente.</p>
          <button
            type="button"
            onClick={() => void fetchDashboard(sucursal, horizonte)}
            className="mt-6 rounded-xl bg-[#f2e500] px-4 py-2.5 text-sm font-bold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2e500]"
          >
            Reintentar
          </button>
        </div>
      </main>
    );
  }

  const metrics = data.metricas_modelo;
  const firstProjection = data.proyecciones_diarias.at(0);
  const lastProjection = data.proyecciones_diarias.at(-1);
  const modelStatusGood = metrics.estado_validacion === 'ACEPTABLE';

  return (
    <main className="min-h-screen bg-[#080808] text-zinc-100 selection:bg-[#f2e500] selection:text-black">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-[#f2e500]" aria-hidden="true" />
              <h1 className="font-['Anybody'] text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
                Predicción de ventas
              </h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Proyección de facturación basada en el histórico de La Paz y Santa Cruz, evaluada contra fechas que el modelo no utilizó durante su entrenamiento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
            <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
              Sucursal
              <select
                value={sucursal}
                onChange={(event) => setSucursal(event.target.value)}
                className="h-11 min-w-0 rounded-xl border border-white/15 bg-[#121212] px-3 text-sm text-white outline-none transition-colors focus:border-[#f2e500] sm:min-w-52"
              >
                <option value="TODAS">Consolidado</option>
                <option value="CENTRAL">La Paz</option>
                <option value="SANTA_CRUZ">Santa Cruz</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
              Horizonte
              <select
                value={horizonte}
                onChange={(event) => setHorizonte(Number(event.target.value))}
                className="h-11 rounded-xl border border-white/15 bg-[#121212] px-3 text-sm text-white outline-none transition-colors focus:border-[#f2e500]"
              >
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void fetchDashboard(sucursal, horizonte, true)}
              disabled={loading}
              aria-label="Actualizar proyección"
              className="col-span-2 flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2e500] sm:col-span-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Actualizar
            </button>
          </div>
        </header>

        <section
          className={`mt-6 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${
            modelStatusGood && metrics.vigencia_datos === 'ACTUALIZADA'
              ? 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-100'
              : 'border-amber-500/25 bg-amber-500/[0.07] text-amber-100'
          }`}
          aria-live="polite"
        >
          {modelStatusGood ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <div>
            <p className="font-bold">
              Resultado {metrics.estado_validacion.toLowerCase()} · datos {metrics.vigencia_datos.toLowerCase()}
            </p>
            <p className="mt-1 leading-5 text-current/80">
              {metrics.advertencia ?? 'La validación temporal cumple los criterios definidos para uso operativo.'}
            </p>
          </div>
        </section>

        <section className="mt-8 grid border-y border-white/10 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen de la proyección">
          <div className="border-b border-white/10 py-5 sm:border-r lg:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Venta proyectada</p>
            <p className="mt-2 font-['Anybody'] text-3xl font-black tabular-nums text-white">{money.format(totalProjected)}</p>
            <p className="mt-1 text-xs text-zinc-500">Durante {horizonte} días</p>
          </div>
          <div className="border-b border-white/10 py-5 sm:pl-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Promedio diario</p>
            <p className="mt-2 font-['Anybody'] text-3xl font-black tabular-nums text-white">{money.format(totalProjected / horizonte)}</p>
            <p className="mt-1 text-xs text-zinc-500">Estimación central</p>
          </div>
          <div className="border-b border-white/10 py-5 sm:border-b-0 sm:border-r lg:pl-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Unidades estimadas</p>
            <p className="mt-2 font-['Anybody'] text-3xl font-black tabular-nums text-white">{number.format(totalUnits)}</p>
            <p className="mt-1 text-xs text-zinc-500">Conversión según ticket por unidad</p>
          </div>
          <div className="py-5 sm:pl-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Error de validación</p>
            <p className="mt-2 font-['Anybody'] text-3xl font-black tabular-nums text-white">{metrics.wape_pct.toFixed(1)}%</p>
            <p className="mt-1 text-xs text-zinc-500">WAPE en datos no vistos</p>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="forecast-title">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="forecast-title" className="font-['Anybody'] text-2xl font-bold text-white">Facturación diaria estimada</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {firstProjection && lastProjection
                  ? `${fullDate(firstProjection.fecha)} — ${fullDate(lastProjection.fecha)}`
                  : `${horizonte} días`}
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs text-zinc-400">
              <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-[#f2e500]" />Estimación</span>
              <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-white/10" />Intervalo {metrics.confianza_intervalo_pct.toFixed(0)}%</span>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#0d0d0d] p-3 sm:p-5">
            {chart && (
              <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="min-w-[720px] w-full"
                role="img"
                aria-label="Gráfico de predicción diaria de ventas con intervalo de estimación"
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const value = chart.maxValue * (1 - ratio);
                  const y = chart.padding.top + chart.innerHeight * ratio;
                  return (
                    <g key={ratio}>
                      <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" />
                      <text x={chart.padding.left - 12} y={y + 4} textAnchor="end" fill="#71717a" fontSize="11">{money.format(value)}</text>
                    </g>
                  );
                })}
                <polygon points={chart.interval} fill="rgba(255,255,255,0.07)" />
                <polyline points={chart.line} fill="none" stroke="#f2e500" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                {data.proyecciones_diarias.map((day, index) => {
                  const x = chart.x(index);
                  const y = chart.y(day.prediccion_bs);
                  const showLabel = data.proyecciones_diarias.length <= 14 || index % 3 === 0 || index === data.proyecciones_diarias.length - 1;
                  return (
                    <g key={day.fecha} onMouseEnter={() => setHoveredIndex(index)} className="cursor-crosshair">
                      <rect x={x - 14} y={chart.padding.top} width="28" height={chart.innerHeight} fill="transparent" />
                      <circle cx={x} cy={y} r={hoveredIndex === index ? 5 : 3} fill="#f2e500" stroke="#080808" strokeWidth="2" />
                      {showLabel && <text x={x} y={chart.height - 18} textAnchor="middle" fill="#71717a" fontSize="11">{shortDate(day.fecha)}</text>}
                      {hoveredIndex === index && (
                        <g pointerEvents="none">
                          <rect x={Math.min(x + 10, chart.width - 170)} y={Math.max(y - 62, 8)} width="154" height="50" rx="8" fill="#18181b" stroke="rgba(255,255,255,0.16)" />
                          <text x={Math.min(x + 22, chart.width - 158)} y={Math.max(y - 39, 31)} fill="#a1a1aa" fontSize="11">{day.dia_semana} · {shortDate(day.fecha)}</text>
                          <text x={Math.min(x + 22, chart.width - 158)} y={Math.max(y - 21, 49)} fill="#ffffff" fontSize="13" fontWeight="700">{money.format(day.prediccion_bs)}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </section>

        <section className="mt-12 grid gap-10 xl:grid-cols-[1.25fr_0.75fr]" aria-labelledby="validation-title">
          <div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#f2e500]" aria-hidden="true" />
              <h2 id="validation-title" className="font-['Anybody'] text-2xl font-bold text-white">Validación del modelo</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Se reservan los últimos 60 días para evaluar el modelo. La referencia es un promedio móvil de siete días: si el modelo no mejora esa alternativa simple, no debe considerarse confiable.
            </p>

            <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.1em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Método</th>
                    <th className="px-4 py-3 text-right font-semibold">MAE</th>
                    <th className="px-4 py-3 text-right font-semibold">RMSE</th>
                    <th className="px-4 py-3 text-right font-semibold">WAPE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 tabular-nums">
                  <tr className="bg-[#f2e500]/[0.04]">
                    <td className="px-4 py-4 font-semibold text-white">Random Forest</td>
                    <td className="px-4 py-4 text-right">{money.format(metrics.mae_bs)}</td>
                    <td className="px-4 py-4 text-right">{money.format(metrics.rmse_bs)}</td>
                    <td className="px-4 py-4 text-right">{metrics.wape_pct.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-zinc-400">Promedio móvil 7 días</td>
                    <td className="px-4 py-4 text-right text-zinc-400">{money.format(metrics.baseline_mae_bs)}</td>
                    <td className="px-4 py-4 text-right text-zinc-400">{money.format(metrics.baseline_rmse_bs)}</td>
                    <td className="px-4 py-4 text-right text-zinc-400">{metrics.baseline_wape_pct.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-zinc-500">Mejora sobre referencia</dt>
                <dd className="font-semibold tabular-nums text-white">{metrics.mejora_vs_baseline_pct.toFixed(1)}%</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-zinc-500">Cobertura del intervalo</dt>
                <dd className="font-semibold tabular-nums text-white">{metrics.cobertura_intervalo_pct.toFixed(1)}%</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-zinc-500">Entrenamiento</dt>
                <dd className="font-semibold tabular-nums text-white">{number.format(metrics.muestras_entrenamiento)} días-sucursal</dd>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-3">
                <dt className="text-zinc-500">Validación</dt>
                <dd className="font-semibold tabular-nums text-white">{number.format(metrics.muestras_validacion)} días-sucursal</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs leading-5 text-zinc-500">
              Periodo de validación: {fullDate(metrics.inicio_validacion)} — {fullDate(metrics.fin_validacion)}. Las métricas se calculan únicamente sobre fechas posteriores al entrenamiento.
            </p>
          </div>

          <aside>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-[#f2e500]" aria-hidden="true" />
              <h2 className="font-['Anybody'] text-2xl font-bold text-white">Fuentes verificadas</h2>
            </div>
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {metrics.fuentes_datos.map((source) => (
                <div key={`${source.sucursal}-${source.sha256_corto}`} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{source.sucursal}</p>
                      <p className="mt-1 break-all text-xs text-zinc-500">{source.nombre}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-zinc-200">{number.format(source.registros)} registros</span>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {fullDate(source.fecha_inicio)} — {fullDate(source.fecha_fin)}
                  </p>
                </div>
              ))}
            </div>
            <details className="group mt-5 rounded-xl border border-white/10 bg-white/[0.025] p-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-200 marker:hidden">
                Metodología y trazabilidad
              </summary>
              <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-500">
                <p>{metrics.algoritmo}.</p>
                <p>Variables: calendario, rezagos de 1 a 28 días y promedios móviles retrospectivos. Ninguna variable utiliza ventas futuras.</p>
                <p>Huella de fuentes: {metrics.fuentes_datos.map((source) => source.sha256_corto).join(' · ')}.</p>
                <p>Corte de la serie: {fullDate(metrics.corte_serie)}.</p>
              </div>
            </details>
          </aside>
        </section>

        <section className="mt-12 grid gap-10 xl:grid-cols-2">
          <div>
            <h2 className="font-['Anybody'] text-2xl font-bold text-white">Desempeño histórico por sucursal</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs uppercase tracking-[0.1em] text-zinc-500">
                  <tr>
                    <th className="pb-3 font-semibold">Sucursal</th>
                    <th className="pb-3 text-right font-semibold">Ventas</th>
                    <th className="pb-3 text-right font-semibold">Facturación</th>
                    <th className="pb-3 text-right font-semibold">Ticket</th>
                    <th className="pb-3 text-right font-semibold">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 tabular-nums">
                  {data.sucursales.map((branch) => (
                    <tr key={branch.codigo}>
                      <td className="py-4 font-semibold text-white">{branch.ciudad}</td>
                      <td className="py-4 text-right text-zinc-300">{number.format(branch.completadas)}</td>
                      <td className="py-4 text-right text-zinc-300">{money.format(branch.facturacion_total_bs)}</td>
                      <td className="py-4 text-right text-zinc-300">{money.format(branch.ticket_promedio_bs)}</td>
                      <td className="py-4 text-right text-zinc-300">{branch.participacion_pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="font-['Anybody'] text-2xl font-bold text-white">Distribución por categoría</h2>
            <p className="mt-2 text-sm text-zinc-500">Asignación del total proyectado según la participación observada en los últimos 60 días.</p>
            <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
              {data.proyecciones_categoria.slice(0, 5).map((category) => (
                <div key={`${category.categoria}-${category.subcategoria}`} className="grid grid-cols-[1fr_auto] gap-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{category.subcategoria}</p>
                    <p className="mt-1 text-xs text-zinc-500">{category.participacion_pct.toFixed(1)}% del total · {category.tendencia.toLowerCase()}</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold text-white">{money.format(category.ingresos_proyectados_bs)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{number.format(category.unidades_proyectadas)} unidades</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-600">
          Esta proyección apoya la planificación; no sustituye el criterio comercial. Para una decisión de compra, actualice el histórico y confirme existencias reales en Inventario.
        </footer>
      </div>
    </main>
  );
};
