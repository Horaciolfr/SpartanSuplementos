import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import {
  ArrowLeft,
  User,
  Mail,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Scan,
  Sparkles,
  AlertTriangle,
  Utensils,
  BookOpen,
  PieChart,
  ShieldAlert,
} from 'lucide-react';

interface PerfilBiometricoDetalle {
  id_perfil: number;
  id_somatotipo: number | null;
  somatotipo: string | null;
  estatura_cm: number | null;
  peso_kg: number | null;
  precision_captura: number | null;
  fecha_captura: string;
}

interface ProductoPrescripcion {
  id_producto: number;
  sku: string;
  nombre: string;
  precio: number;
  stock_actual: number;
}

interface ReglaPrescripcion {
  id_regla: number;
  codigo: string;
  descripcion: string | null;
}

interface ConversionPrescripcion {
  id_venta_efectiva: number | null;
  estado: boolean;
}

interface PrescripcionDetalle {
  id_prescripcion: number;
  id_perfil: number;
  fecha_prescripcion: string;
  producto: ProductoPrescripcion;
  regla: ReglaPrescripcion | null;
  conversion: ConversionPrescripcion;
}

interface ComidaSugerida {
  comida?: string;
  momento?: string;
  sugerencia?: string;
  opcion?: string;
  timing?: string;
}

interface PlanNutricionalCompleto {
  id_plan: number;
  id_somatotipo: number;
  nombre_plan: string;
  objetivo: string | null;
  distribucion_macronutrientes: {
    proteina_pct: number;
    carbohidratos_pct: number;
    grasas_pct: number;
  };
  pautas: string[];
  comidas_sugeridas: ComidaSugerida[];
  disclaimer: string;
}

interface ClienteDetalleResponse {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
  numero_documento: string;
  esta_verificado: boolean;
  fecha_creacion: string;
  genero: string | null;
  tipo_documento: string | null;
  perfiles: PerfilBiometricoDetalle[];
  prescripciones: PrescripcionDetalle[];
  plan_nutricional: PlanNutricionalCompleto | null;
}

export const ClienteDetalleAdmin: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [cliente, setCliente] = useState<ClienteDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCliente = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ClienteDetalleResponse>(`/admin/clientes/${id}`);
      setCliente(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('El cliente solicitado no existe o no cuenta con rol de cliente en el sistema.');
      } else {
        setError('No fue posible consultar la ficha técnica del cliente. Intente nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCliente();
  }, [fetchCliente]);

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  const getSomatotipoBadge = (soma: string | null) => {
    if (!soma) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-['JetBrains_Mono'] uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
          Sin Somatotipo
        </span>
      );
    }
    const s = soma.toUpperCase();
    if (s.includes('ECTO')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-['JetBrains_Mono'] uppercase tracking-wider bg-cyan-950/70 text-cyan-400 border border-cyan-700/60 font-bold">
          Ectomorfo
        </span>
      );
    }
    if (s.includes('MESO')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-['JetBrains_Mono'] uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-700/60 font-bold">
          Mesomorfo
        </span>
      );
    }
    if (s.includes('ENDO')) {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-['JetBrains_Mono'] uppercase tracking-wider bg-amber-950/70 text-amber-400 border border-amber-700/60 font-bold">
          Endomorfo
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-['JetBrains_Mono'] uppercase tracking-wider bg-purple-950/70 text-purple-400 border border-purple-700/60">
        {soma}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <div className="h-8 w-8 animate-spin border-2 border-[#e8dc00] border-t-transparent rounded-full" />
        <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider">
          Cargando ficha técnica del cliente...
        </span>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="w-full max-w-[800px] mx-auto px-4 py-16 space-y-4">
        <div className="p-6 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-200 space-y-3">
          <div className="flex items-center gap-2.5 text-base font-bold text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>Error de Consulta</span>
          </div>
          <p className="text-xs sm:text-sm text-red-300">
            {error || 'No se pudo cargar la información del cliente.'}
          </p>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={fetchCliente}
              className="px-4 py-2 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Reintentar
            </button>
            <Link
              to="/admin/clientes"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white transition-colors cursor-pointer font-['JetBrains_Mono']"
            >
              Volver al Directorio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const macros = cliente.plan_nutricional?.distribucion_macronutrientes;

  return (
    <div className="w-full max-w-[1300px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Botón Volver y Encabezado */}
      <div className="space-y-4">
        <Link
          to="/admin/clientes"
          className="inline-flex items-center gap-2 text-xs font-['JetBrains_Mono'] text-zinc-400 hover:text-white transition-colors uppercase tracking-wider font-semibold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Directorio de Clientes</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-[#121212]/90 border border-white/10 backdrop-blur-md shadow-xl">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#e8dc00]/10 border border-[#e8dc00]/30 text-[#e8dc00]">
              <User className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black font-['Anybody'] uppercase tracking-tight text-white">
                  {cliente.nombres} {cliente.apellidos}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/20 text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-300">
                  ID: #{cliente.id_usuario}
                </span>
                {cliente.esta_verificado ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 text-[10px] font-['JetBrains_Mono'] uppercase font-bold">
                    <CheckCircle2 className="h-3 w-3" /> Verificado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-800/60 text-[10px] font-['JetBrains_Mono'] uppercase font-bold">
                    <Clock className="h-3 w-3" /> Pendiente
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-['JetBrains_Mono'] text-zinc-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" /> {cliente.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-zinc-500" /> {cliente.tipo_documento || 'Doc'}: {cliente.numero_documento}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" /> Registrado: {formatDate(cliente.fecha_creacion)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columnas para Perfiles y Prescripciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sección: Línea de Tiempo de Perfiles Biométricos */}
        <div className="p-6 rounded-2xl bg-[#0e0e0e]/90 border border-white/10 shadow-lg backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-[#e8dc00]" />
              <h2 className="text-base font-bold font-['Anybody'] uppercase tracking-tight text-white">
                Historial Biométrico ({cliente.perfiles.length})
              </h2>
            </div>
            <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-500">
              MediaPipe Vision
            </span>
          </div>

          {cliente.perfiles.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-['JetBrains_Mono']">
              No se registran capturas biométricas para este cliente.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {cliente.perfiles.map((p, idx) => (
                <div
                  key={p.id_perfil}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500 font-bold">
                        #{idx + 1}
                      </span>
                      {getSomatotipoBadge(p.somatotipo)}
                    </div>
                    <span className="text-[11px] font-['JetBrains_Mono'] text-zinc-400">
                      {formatDate(p.fecha_captura)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-['JetBrains_Mono'] text-zinc-300 pt-1">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">Estatura</span>
                      <span className="font-bold">{p.estatura_cm ? `${p.estatura_cm} cm` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">Peso</span>
                      <span className="font-bold">{p.peso_kg ? `${p.peso_kg} kg` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase">Visibilidad Puntos</span>
                      <span className="font-bold text-[#e8dc00]">
                        {p.precision_captura ? `${Math.round(p.precision_captura * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección: Prescripciones y Conversión POS */}
        <div className="p-6 rounded-2xl bg-[#0e0e0e]/90 border border-white/10 shadow-lg backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#e8dc00]" />
              <h2 className="text-base font-bold font-['Anybody'] uppercase tracking-tight text-white">
                Prescripciones & Conversión ({cliente.prescripciones.length})
              </h2>
            </div>
            <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-500">
              Reglas CART & POS
            </span>
          </div>

          {cliente.prescripciones.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs font-['JetBrains_Mono']">
              No se han generado prescripciones para este cliente.
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {cliente.prescripciones.map((pr) => (
                <div
                  key={pr.id_prescripcion}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] hover:border-white/20 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-xs sm:text-sm">
                        {pr.producto.nombre}
                      </div>
                      <div className="text-[11px] font-['JetBrains_Mono'] text-zinc-400">
                        SKU: {pr.producto.sku} • {pr.producto.precio.toFixed(2)} Bs. • Stock:{' '}
                        <span className={pr.producto.stock_actual > 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {pr.producto.stock_actual} un.
                        </span>
                      </div>
                    </div>

                    {pr.conversion.estado ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-700/60 text-[10px] font-['JetBrains_Mono'] uppercase font-bold shrink-0">
                        Convertida (Venta #{pr.conversion.id_venta_efectiva})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-['JetBrains_Mono'] uppercase shrink-0">
                        Pendiente
                      </span>
                    )}
                  </div>

                  {pr.regla && (
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] text-[11px] font-['JetBrains_Mono'] space-y-0.5">
                      <div className="text-[#e8dc00] font-bold">
                        Regla: {pr.regla.codigo}
                      </div>
                      {pr.regla.descripcion && (
                        <div className="text-zinc-400 font-['Hanken_Grotesk'] text-xs">
                          {pr.regla.descripcion}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[10px] font-['JetBrains_Mono'] text-zinc-500 text-right">
                    Emitida: {formatDate(pr.fecha_prescripcion)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sección Completa: Plan Nutricional por Somatotipo */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#121212]/90 border border-white/10 shadow-xl backdrop-blur-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#e8dc00]/10 border border-[#e8dc00]/30 text-[#e8dc00]">
              <Utensils className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-['Anybody'] uppercase tracking-tight text-white">
                Plan Nutricional Asignado
              </h2>
              <p className="text-xs text-zinc-400">
                Pauta alimentaria adaptada al somatotipo de la última captura biométrica.
              </p>
            </div>
          </div>

          {cliente.plan_nutricional && (
            <span className="self-start sm:self-auto px-3 py-1 rounded-xl bg-[#e8dc00] text-black font-bold font-['JetBrains_Mono'] text-xs uppercase tracking-wider shadow-sm">
              {cliente.plan_nutricional.nombre_plan}
            </span>
          )}
        </div>

        {!cliente.plan_nutricional ? (
          <div className="py-12 text-center text-zinc-500 text-xs font-['JetBrains_Mono'] space-y-2">
            <p>Sin plan nutricional activo.</p>
            <p className="text-zinc-600">
              El plan se determina automáticamente a partir del somatotipo calculado en la captura de visión.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Objetivo del Plan */}
            {cliente.plan_nutricional.objetivo && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                <span className="text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-400 block mb-1 font-semibold">
                  Objetivo Fisiológico:
                </span>
                <p className="text-sm text-white font-medium">
                  {cliente.plan_nutricional.objetivo}
                </p>
              </div>
            )}

            {/* Distribución de Macronutrientes */}
            {macros && (
              <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between text-xs font-['JetBrains_Mono']">
                  <span className="uppercase tracking-wider font-bold text-white flex items-center gap-1.5">
                    <PieChart className="h-4 w-4 text-[#e8dc00]" /> Distribución de Macronutrientes
                  </span>
                  <span className="text-zinc-400">
                    Suma Total:{' '}
                    <strong className="text-white">
                      {macros.proteina_pct + macros.carbohidratos_pct + macros.grasas_pct}%
                    </strong>
                  </span>
                </div>

                {/* Barra de progreso de 3 colores */}
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-black/60 border border-white/10">
                  <div
                    style={{ width: `${macros.proteina_pct}%` }}
                    className="bg-blue-500 h-full transition-all"
                    title={`Proteínas: ${macros.proteina_pct}%`}
                  />
                  <div
                    style={{ width: `${macros.carbohidratos_pct}%` }}
                    className="bg-[#e8dc00] h-full transition-all"
                    title={`Carbohidratos: ${macros.carbohidratos_pct}%`}
                  />
                  <div
                    style={{ width: `${macros.grasas_pct}%` }}
                    className="bg-emerald-500 h-full transition-all"
                    title={`Grasas: ${macros.grasas_pct}%`}
                  />
                </div>

                {/* Leyenda de Macronutrientes */}
                <div className="grid grid-cols-3 gap-3 pt-1 text-center font-['JetBrains_Mono'] text-xs">
                  <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40">
                    <span className="text-[10px] text-blue-300 block uppercase">Proteínas</span>
                    <span className="text-sm font-bold text-blue-400">{macros.proteina_pct}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-yellow-950/40 border border-yellow-800/40">
                    <span className="text-[10px] text-yellow-300 block uppercase">Carbohidratos</span>
                    <span className="text-sm font-bold text-[#e8dc00]">{macros.carbohidratos_pct}%</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                    <span className="text-[10px] text-emerald-300 block uppercase">Grasas Saludables</span>
                    <span className="text-sm font-bold text-emerald-400">{macros.grasas_pct}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pautas y Comidas Sugeridas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pautas */}
              <div className="space-y-3">
                <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider font-bold text-white flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-[#e8dc00]" /> Pautas Generales
                </span>
                <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                  {cliente.plan_nutricional.pautas.map((pauta, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#e8dc00] mt-1.5 shrink-0" />
                      <span>{pauta}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Comidas Sugeridas */}
              <div className="space-y-3">
                <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider font-bold text-white flex items-center gap-1.5">
                  <Utensils className="h-4 w-4 text-[#e8dc00]" /> Comidas Sugeridas
                </span>
                <div className="space-y-2">
                  {cliente.plan_nutricional.comidas_sugeridas.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs space-y-1">
                      <div className="flex items-center justify-between text-zinc-400 font-['JetBrains_Mono']">
                        <span className="font-bold text-white uppercase">
                          {item.comida || item.momento || `Momento ${idx + 1}`}
                        </span>
                        {item.timing && (
                          <span className="text-[10px] text-[#e8dc00]">{item.timing}</span>
                        )}
                      </div>
                      <p className="text-zinc-300 text-xs font-['Hanken_Grotesk']">
                        {item.sugerencia || item.opcion || JSON.stringify(item)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Disclaimer Obligatorio */}
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-600/50 flex items-start gap-3 text-amber-200">
              <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <span className="font-bold font-['JetBrains_Mono'] uppercase tracking-wider block text-amber-300">
                  Aviso de Responsabilidad Nutricional
                </span>
                <p className="text-amber-200/90 leading-relaxed font-['Hanken_Grotesk']">
                  {cliente.plan_nutricional.disclaimer}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteDetalleAdmin;
