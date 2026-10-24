import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import {
  ShieldCheck,
  Package,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Activity,
  Dumbbell,
  Code2,
  X,
  Calendar,
  User as UserIcon,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import { RecetaCard } from '../components/RecetaCard';
import { RecetaModal, type RecetaItemData } from '../components/RecetaModal';

interface PrescripcionItem {
  id_prescripcion: number;
  id_producto: number;
  codigo_sku: string;
  nombre_producto: string;
  precio_unitario: number;
  stock_actual: number;
  id_regla_aplicada: number;
  codigo_regla: string;
  descripcion_tecnica: string;
  umbral_decision: number | null;
  estado_conversion: boolean;
  id_venta_efectiva: number | null;
  fecha_prescripcion: string | null;
}

interface PrescripcionResponse {
  id_perfil: number;
  id_usuario: number;
  nombre_cliente?: string;
  fecha_captura?: string;
  somatotipo: string;
  objetivo?: string | null;
  precision_captura: number | null;
  prescripciones: PrescripcionItem[];
}

export const formatearReglaNatural = (desc: string): string => {
  if (!desc) return '';
  const upper = desc.toUpperCase();
  if (upper.includes('CREATINA') && upper.includes('MESOMORFO')) {
    return 'Su categoría presenta afinidad con el perfil corporal estimado y cuenta con disponibilidad actual.';
  }
  if (upper.includes('CREATINA') && (upper.includes('SOMATOTIPO!=MESOMORFO') || upper.includes('SOMATOTIPO != MESOMORFO'))) {
    return 'Su categoría presenta afinidad con el perfil corporal estimado y cuenta con disponibilidad actual.';
  }
  if (upper.includes('QUEMADORES') && upper.includes('ENDOMORFO')) {
    return 'El motor de recomendación encontró afinidad entre esta categoría y el perfil registrado.';
  }
  if (upper.includes('INDUMENTARIA') && upper.includes('ENDOMORFO')) {
    return 'El motor de recomendación encontró afinidad entre esta categoría y el perfil registrado.';
  }
  if (upper.includes('SOMATOTIPO!=ENDOMORFO') || upper.includes('SOMATOTIPO != ENDOMORFO')) {
    return 'Su categoría es compatible con los criterios del perfil corporal registrado.';
  }

  return 'Seleccionado por afinidad con el perfil corporal registrado y disponibilidad actual.';
};

export const Prescripcion: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [data, setData] = useState<PrescripcionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Estados de modal técnico de arquitectura
  const [showTechModal, setShowTechModal] = useState<boolean>(false);
  const [selectedRegla, setSelectedRegla] = useState<PrescripcionItem | null>(null);

  // Estados de plan nutricional diario
  const [planDiario, setPlanDiario] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [selectedReceta, setSelectedReceta] = useState<RecetaItemData | null>(null);

  const fetchPlanDiario = async (somatotipo: string, obj?: string) => {
    try {
      setLoadingPlan(true);
      const params: Record<string, string> = { somatotipo };
      if (obj) params.objetivo = obj;
      const res = await apiClient.get('/nutricion/plan-diario', { params });
      setPlanDiario(res.data);
    } catch (e) {
      console.error('Error al cargar plan diario en prescripción:', e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchPrescripcion = async (profileId?: string | number, forzarGenerar: boolean = false) => {
    try {
      if (forzarGenerar) {
        setRecalculating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let targetId = profileId;

      // Si no se proporcionó ID en la ruta, obtener el perfil del usuario autenticado o user_id explícito (F-05)
      if (!targetId) {
        const explicitUserId = searchParams.get('user_id');
        let effectiveUserId: number | undefined;

        if (role === 'ADMINISTRADOR') {
          if (explicitUserId) {
            effectiveUserId = parseInt(explicitUserId, 10);
          } else if (user?.id_usuario) {
            effectiveUserId = user.id_usuario;
          }
        } else if (user?.id_usuario) {
          effectiveUserId = user.id_usuario;
        }

        const perfilesRes = await apiClient.get<any[]>('/ia/perfiles', {
          params: {
            limit: 1,
            ...(effectiveUserId ? { usuario_id: effectiveUserId } : {}),
          },
        });
        if (perfilesRes.data && perfilesRes.data.length > 0) {
          targetId = perfilesRes.data[0].id_perfil;
        } else {
          setLoading(false);
          setData(null);
          return;
        }
      }

      // F-04: Recálculo/generación vía POST; lectura idempotente vía GET
      let res;
      if (forzarGenerar) {
        res = await apiClient.post<PrescripcionResponse>(`/ia/prescripcion/${targetId}/generar`);
        toast.success('Prescripción recalculada con las reglas CART vigentes.');
      } else {
        res = await apiClient.get<PrescripcionResponse>(`/ia/prescripcion/${targetId}`);
        // Si no existen prescripciones previas persistidas, generar la primera prescripción vía POST
        if (!res.data.prescripciones || res.data.prescripciones.length === 0) {
          res = await apiClient.post<PrescripcionResponse>(`/ia/prescripcion/${targetId}/generar`);
        }
      }
      setData(res.data);
      if (res.data?.somatotipo) {
        fetchPlanDiario(res.data.somatotipo, res.data.objetivo || undefined);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'No se pudo cargar la prescripción de venta cruzada.';
      setError(msg);
      toast.error('Error al cargar prescripción', { description: msg });
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchPrescripcion(id);
  }, [id, searchParams.get('user_id'), user?.id_usuario]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e8dc00] border-t-transparent" />
        <p className="text-sm font-medium text-zinc-400 font-['Inter']">
          Consultando motor de prescripción explicable CART...
        </p>
      </div>
    );
  }

  if (!data && !error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0c0c0c] border border-white/[0.07] text-[#e8dc00]">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white font-['Inter']">
          Sin Perfil Biométrico Registrado
        </h2>
        <p className="mt-3 text-zinc-400 text-sm max-w-md mx-auto font-['Inter']">
          Para generar una prescripción de nutrición y suplementación deportiva con árbol CART,
          primero realiza un escaneo postural en el módulo de biometría.
        </p>
        <div className="mt-6">
          <Link
            to="/biometria"
            className="spartan-btn-primary px-6 py-3 text-xs inline-flex items-center gap-2 rounded-xl"
          >
            <Dumbbell className="h-4 w-4" />
            <span>Iniciar Escaneo Biométrico</span>
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white font-['Inter']">Error en Prescripción</h2>
        <p className="mt-2 text-zinc-400 text-sm">{error}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => fetchPrescripcion(id)}
            className="spartan-btn-secondary px-4 py-2 text-xs rounded-xl"
          >
            Reintentar
          </button>
          <button
            onClick={() => navigate('/biometria')}
            className="spartan-btn-primary px-4 py-2 text-xs rounded-xl"
          >
            Ir a Biometría
          </button>
        </div>
      </div>
    );
  }

  const fechaCapturaTexto = data.fecha_captura
    ? new Date(data.fecha_captura).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : 'Captura reciente';

  const nombreClienteTexto =
    data.nombre_cliente ||
    (user?.nombres ? `${user.nombres} ${user.apellidos || ''}`.trim() : 'Carlos Atleta');

  const prescripcionesDisponibles = data.prescripciones.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-['Inter']">
              Nutrición y suplementación para tu perfil
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 font-['Inter']">
              Plan alimentario orientativo y productos disponibles seleccionados a partir del análisis corporal registrado.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium font-['JetBrains_Mono'] text-xs">
                <Calendar className="h-3.5 w-3.5 text-[#e8dc00]" />
                Captura: {fechaCapturaTexto}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium font-['JetBrains_Mono'] text-xs">
                <UserIcon className="h-3.5 w-3.5 text-[#e8dc00]" />
                Cliente: {nombreClienteTexto}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-[#111111] px-4 py-2.5 text-center">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">Somatotipo</span>
              <div className="text-base font-bold text-[#e8dc00] font-mono">{data.somatotipo || 'NO DEFINIDO'}</div>
            </div>
            {data.precision_captura !== null && (
              <div className="rounded-xl border border-white/[0.07] bg-[#111111] px-4 py-2.5 text-center">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">VISIBILIDAD MEDIA DE PUNTOS</span>
                <div className="text-base font-bold text-white font-mono">
                  {(data.precision_captura * 100).toFixed(1)}%
                </div>
              </div>
            )}
            <button
              onClick={() => fetchPrescripcion(data.id_perfil, true)}
              disabled={recalculating}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-xs font-semibold text-white transition disabled:opacity-50"
              title="Recalcular con reglas aprobadas vigentes"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin' : ''}`} />
              Recalcular
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRegla(null);
                setShowTechModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold text-zinc-400 transition hover:text-[#e8dc00]"
              title="Consultar cómo se seleccionan las recomendaciones"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Cómo se seleccionan
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Productos Prescritos */}
      <div className="mt-8">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2 font-['Inter']">
              <Package className="h-4 w-4 text-[#e8dc00]" />
              Suplementos sugeridos
            </h2>
            <p className="mt-1 text-xs text-zinc-400 font-['Inter']">
              {prescripcionesDisponibles} {prescripcionesDisponibles === 1 ? 'opción disponible' : 'opciones disponibles'} para el perfil {data.somatotipo.toLowerCase()}.
            </p>
          </div>
          <span className="text-xs text-zinc-500">Solo productos con stock registrado</span>
        </div>

        {data.prescripciones.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-8 text-center text-zinc-400 font-['Inter']">
            No hay suplementos disponibles que coincidan con los criterios actuales. Revisa el catálogo o vuelve a intentarlo más tarde.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {data.prescripciones.map((item) => (
              <div
                key={item.id_prescripcion}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.07] bg-[#0c0c0c] p-5 transition-colors hover:border-white/[0.15]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-500">
                      {item.codigo_sku}
                    </span>
                    {item.estado_conversion && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Adquirido
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 text-base font-bold text-white line-clamp-2 font-['Inter']">
                    {item.nombre_producto}
                  </h3>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-white font-mono">
                      Bs. {item.precio_unitario.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-400 font-['Inter']">
                      {item.stock_actual} disponibles
                    </span>
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <p className="text-xs leading-relaxed text-zinc-300 font-['Inter']">
                      {formatearReglaNatural(item.descripcion_tecnica)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRegla(item);
                        setShowTechModal(true);
                      }}
                      className="mt-2 flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-[#e8dc00] font-['Inter']"
                    >
                      <Code2 className="h-3 w-3" />
                      <span>Por qué aparece</span>
                    </button>
                  </div>
                </div>

                <div className="mt-5 border-t border-white/[0.06] pt-3 flex items-center justify-end">
                  <Link
                    to="/catalogo"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#e8dc00] hover:underline underline-offset-4"
                  >
                    Ver producto
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan Dietético Diario Sugerido (6 Comidas Adaptadas) */}
      <div className="mt-10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.07] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-[#e8dc00]" />
              <h3 className="text-lg font-bold text-white font-['Inter']">
                Plan diario sugerido
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-['Inter']">
              Propuesta de comidas orientativa según el perfil registrado. No reemplaza la evaluación de un profesional de nutrición.
            </p>
          </div>
          <span className="self-start sm:self-auto px-3 py-1 text-xs font-['JetBrains_Mono'] font-bold uppercase bg-[#e8dc00]/10 text-[#e8dc00] border border-[#e8dc00]/30 rounded-full">
            {data.somatotipo} · {planDiario?.objetivo || 'Objetivo por definir'}
          </span>
        </div>

        {loadingPlan ? (
          <div className="p-8 text-center text-xs text-zinc-400 font-mono">
            Preparando el plan diario...
          </div>
        ) : planDiario?.comidas && planDiario.comidas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planDiario.comidas.map((comida: RecetaItemData) => (
              <RecetaCard
                key={comida.id_receta}
                receta={comida}
                onOpenModal={(r) => setSelectedReceta(r)}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 font-mono bg-[#0c0c0c] border border-white/5 rounded-2xl">
            Aún no hay un plan diario disponible para este perfil.
          </div>
        )}
      </div>

      {/* Detalle de los criterios de selección */}
      {showTechModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c0c0c] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#e8dc00]" />
                <h3 className="text-base font-bold text-white font-['Inter']">
                  Criterios de selección
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-3">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold font-mono">
                    Perfil Biométrico
                  </span>
                  <span className="font-mono text-sm font-bold text-[#e8dc00]">
                    #{data.id_perfil}
                  </span>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-3">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-semibold font-mono">
                    Usuario Cliente
                  </span>
                  <span className="font-mono text-sm font-bold text-white">
                    #{data.id_usuario}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-3">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1 font-semibold font-mono">
                  Método utilizado
                </span>
                <p className="text-zinc-300 text-xs font-['Inter']">
                  Árbol de decisión CART aprobado para recomendaciones complementarias.
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-3">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1.5 font-semibold text-zinc-300 font-mono">
                  Regla aplicada ({selectedRegla ? selectedRegla.codigo_regla : 'resumen del perfil'})
                </span>
                <pre className="font-mono text-[11px] text-emerald-400 bg-black/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap border border-white/5 leading-relaxed">
                  {selectedRegla
                    ? `${selectedRegla.codigo_regla}: ${selectedRegla.descripcion_tecnica}`
                    : data.prescripciones.map((p) => `${p.codigo_regla}: ${p.descripcion_tecnica}`).join('\n\n')}
                </pre>
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-[#111111] p-3">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1 font-semibold font-mono">
                  Disponibilidad verificada
                </span>
                <p className="text-zinc-400 text-xs">
                  Solo se muestran productos activos con unidades registradas en inventario al momento de la consulta.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTechModal(false)}
                className="spartan-btn-primary px-5 py-2 font-bold text-black rounded-xl text-xs"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Clínico de Detalle de Receta y Prompt Fotográfico */}
      <RecetaModal
        receta={selectedReceta}
        onClose={() => setSelectedReceta(null)}
      />
    </div>
  );
};

export default Prescripcion;
