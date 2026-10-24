import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import {
  Users,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

interface UltimoPerfilResumen {
  id_perfil: number;
  somatotipo: string | null;
  estatura_cm: number | null;
  peso_kg: number | null;
  visibilidad_media: number | null;
  fecha_captura: string;
}

interface PrescripcionesResumen {
  total: number;
  convertidas: number;
  ultima_fecha: string | null;
}

interface PlanNutricionalResumen {
  nombre_plan: string;
}

interface ClienteListItem {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  email: string;
  numero_documento: string;
  esta_verificado: boolean;
  fecha_creacion: string;
  ultimo_perfil: UltimoPerfilResumen | null;
  prescripciones: PrescripcionesResumen;
  plan_nutricional: PlanNutricionalResumen | null;
}

interface ClientesPaginadosResponse {
  total: number;
  pagina: number;
  tamano: number;
  items: ClienteListItem[];
}

export const ClientesAdmin: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parámetros derivados de URL (URL compartible y recargable)
  const q = searchParams.get('q') || '';
  const somatotipoParam = searchParams.get('somatotipo') || '';
  const somatotipo = ['1', '2', '3'].includes(somatotipoParam) ? somatotipoParam : '';
  const conversion = searchParams.get('conversion') || 'any';
  const desde = searchParams.get('desde') || '';
  const hasta = searchParams.get('hasta') || '';
  const orden = searchParams.get('orden') || 'registro_reciente';
  const requestedPage = Number.parseInt(searchParams.get('pagina') || '1', 10);
  const pagina = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const tamano = 20;

  // Estados de datos y vista
  const [data, setData] = useState<ClientesPaginadosResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buffer local para input de búsqueda
  const [searchInput, setSearchInput] = useState(q);
  const latestRequestRef = useRef(0);

  // Sincronizar input local si cambia URL
  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  const updateParam = useCallback(
    (key: string, value: string, resetPage = true) => {
      const newParams = new URLSearchParams(searchParams);
      if (value && value !== 'any') {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      if (resetPage) {
        newParams.set('pagina', '1');
      }
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams({ pagina: '1', orden: 'registro_reciente' }));
  };

  const fetchClientes = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        pagina,
        tamano,
        orden,
        conversion: conversion || 'any',
      };
      if (q) params.q = q;
      if (somatotipo) params.somatotipo = parseInt(somatotipo, 10);
      if (desde) params.desde = desde;
      if (hasta) params.hasta = hasta;

      const res = await apiClient.get<ClientesPaginadosResponse>('/admin/clientes', { params });
      if (requestId === latestRequestRef.current) {
        setData(res.data);
      }
    } catch (err: any) {
      if (requestId !== latestRequestRef.current) return;
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string'
        ? detail
        : 'No fue posible cargar el directorio de clientes. Verifica la conexión e inténtalo nuevamente.');
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, [pagina, tamano, orden, conversion, q, somatotipo, desde, hasta]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / tamano)) : 1;

  useEffect(() => {
    if (data && pagina > totalPages) {
      updateParam('pagina', String(totalPages), false);
    }
  }, [data, pagina, totalPages, updateParam]);

  const getSomatotipoBadge = (soma: string | null) => {
    if (!soma) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
          Sin Captura
        </span>
      );
    }
    const s = soma.toUpperCase();
    if (s.includes('ECTO')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 font-bold">
          Ectomorfo
        </span>
      );
    }
    if (s.includes('MESO')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-bold">
          Mesomorfo
        </span>
      );
    }
    if (s.includes('ENDO')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider bg-amber-950/60 text-amber-400 border border-amber-800/60 font-bold">
          Endomorfo
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider bg-purple-950/60 text-purple-400 border border-purple-800/60">
        {soma}
      </span>
    );
  };

  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#e8dc00]/10 border border-[#e8dc00]/30 text-[#e8dc00]">
              <Users className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-['Inter'] tracking-tight text-white">
              Administración de Clientes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-['Inter']">
            Directorio consolidado de atletas, perfiles antropométricos de visión y prescripciones nutricionales.
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-['JetBrains_Mono'] text-white">
            <span className="text-[#e8dc00] font-bold">{data.total}</span>
            <span className="text-zinc-400">atletas registrados</span>
          </div>
        )}
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-4 rounded-2xl bg-[#0c0c0c] border border-white/[0.07] space-y-3 shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-3">
          {/* Input de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, apellido, email o documento..."
              aria-label="Buscar clientes"
              className="w-full pl-10 pr-4 py-2.5 bg-[#111111] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#e8dc00]/60 transition-colors font-['Inter']"
            />
          </div>

          {/* Selectores de Filtro */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Somatotipo */}
            <select
              value={somatotipo}
              onChange={(e) => updateParam('somatotipo', e.target.value)}
              className="px-3 py-2 bg-[#111111] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#e8dc00]/60"
              aria-label="Filtrar por somatotipo"
            >
              <option value="">Somatotipo: Todos</option>
              <option value="1">Ectomorfo</option>
              <option value="2">Mesomorfo</option>
              <option value="3">Endomorfo</option>
            </select>

            {/* Conversión */}
            <select
              value={conversion}
              onChange={(e) => updateParam('conversion', e.target.value)}
              className="px-3 py-2 bg-[#111111] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#e8dc00]/60"
              aria-label="Filtrar por conversión"
            >
              <option value="any">Conversión: Todas</option>
              <option value="true">Con Conversión POS</option>
              <option value="false">Sin Conversión</option>
            </select>

            {/* Ordenación */}
            <select
              value={orden}
              onChange={(e) => updateParam('orden', e.target.value)}
              className="px-3 py-2 bg-[#111111] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#e8dc00]/60"
              aria-label="Ordenar clientes"
            >
              <option value="registro_reciente">Registro: Más reciente</option>
              <option value="registro_antiguo">Registro: Más antiguo</option>
              <option value="nombre_asc">Nombre: A → Z</option>
              <option value="nombre_desc">Nombre: Z → A</option>
              <option value="ultima_captura">Última Captura IA</option>
            </select>

            {/* Botón Reset */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-xs text-zinc-300 hover:text-white transition-all cursor-pointer font-['JetBrains_Mono']"
              title="Restablecer todos los filtros"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpiar</span>
            </button>
          </div>
        </form>

        {/* Fila secundaria: Fechas */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06] text-xs text-zinc-400 font-['JetBrains_Mono']">
          <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
            <Calendar className="h-3.5 w-3.5" /> Rango de Registro:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={desde}
              onChange={(e) => updateParam('desde', e.target.value)}
              max={hasta || undefined}
              className="px-2.5 py-1 bg-[#111111] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#e8dc00]/50"
              title="Fecha de registro desde"
              aria-label="Fecha de registro desde"
            />
            <span>hasta</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => updateParam('hasta', e.target.value)}
              min={desde || undefined}
              className="px-2.5 py-1 bg-[#111111] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#e8dc00]/50"
              title="Fecha de registro hasta"
              aria-label="Fecha de registro hasta"
            />
          </div>
        </div>
      </div>

      {/* Mensaje de Error con Reintento */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 text-red-300 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchClientes}
            className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 border border-red-700 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla Principal */}
      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c0c] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-4 font-semibold">Cliente</th>
                <th className="py-3.5 px-4 font-semibold">Registro</th>
                <th className="py-3.5 px-4 font-semibold">Somatotipo</th>
                <th className="py-3.5 px-4 font-semibold">Última Captura</th>
                <th className="py-3.5 px-4 font-semibold">Prescripciones</th>
                <th className="py-3.5 px-4 font-semibold">Plan Nutricional</th>
                <th className="py-3.5 px-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-xs font-['Inter']">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 animate-spin border-2 border-[#e8dc00] border-t-transparent rounded-full" />
                      <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider">
                        Consultando directorio de clientes...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : data && data.items.length > 0 ? (
                data.items.map((c) => (
                  <tr
                    key={c.id_usuario}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Columna Cliente */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white text-sm group-hover:text-[#e8dc00] transition-colors font-['Inter']">
                          {c.nombres} {c.apellidos}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-['JetBrains_Mono'] text-zinc-500 mt-0.5">
                          <span>{c.email}</span>
                          <span className="text-zinc-700">•</span>
                          <span>Doc: {c.numero_documento}</span>
                        </div>
                      </div>
                    </td>

                    {/* Columna Registro */}
                    <td className="py-4 px-4 text-zinc-400 font-['JetBrains_Mono'] text-[11px]">
                      {formatDate(c.fecha_creacion)}
                    </td>

                    {/* Columna Somatotipo */}
                    <td className="py-4 px-4">
                      {getSomatotipoBadge(c.ultimo_perfil?.somatotipo || null)}
                    </td>

                    {/* Columna Última Captura */}
                    <td className="py-4 px-4">
                      {c.ultimo_perfil ? (
                        <div className="flex flex-col font-['JetBrains_Mono'] text-[11px]">
                          <span className="text-zinc-300">
                            {formatDate(c.ultimo_perfil.fecha_captura)}
                          </span>
                          <span className="text-[10px] text-zinc-500">
                            Vis: {c.ultimo_perfil.visibilidad_media ? `${Math.round(c.ultimo_perfil.visibilidad_media * 100)}%` : 'N/D'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-['JetBrains_Mono'] text-[11px]">
                          —
                        </span>
                      )}
                    </td>

                    {/* Columna Prescripciones */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/10">
                          {c.prescripciones.total} tot
                        </span>
                        {c.prescripciones.convertidas > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-bold">
                            {c.prescripciones.convertidas} conv
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                            0 conv
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Columna Plan Nutricional */}
                    <td className="py-4 px-4">
                      {c.plan_nutricional ? (
                        <span className="text-zinc-300 text-xs font-medium line-clamp-1 max-w-[220px]" title={c.plan_nutricional.nombre_plan}>
                          {c.plan_nutricional.nombre_plan}
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs italic">
                          Sin plan asignado
                        </span>
                      )}
                    </td>

                    {/* Columna Acciones */}
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/admin/clientes/${c.id_usuario}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#e8dc00]/40 text-zinc-300 hover:text-white border border-white/10 text-xs font-['JetBrains_Mono'] uppercase tracking-wider font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ficha</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 rounded-full bg-white/[0.04] border border-white/10 text-zinc-400">
                        <Users className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-white">
                        Sin clientes que cumplan el filtro
                      </span>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        Modifique los criterios de búsqueda o somatotipo para explorar otros registros.
                      </p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white transition-colors cursor-pointer font-['JetBrains_Mono'] uppercase tracking-wider font-bold"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data && data.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-white/10 bg-white/[0.01] text-xs font-['JetBrains_Mono'] text-zinc-400">
            <div>
              Mostrando{' '}
              <span className="text-white font-bold">
                {Math.min((pagina - 1) * tamano + 1, data.total)}
              </span>{' '}
              a{' '}
              <span className="text-white font-bold">
                {Math.min(pagina * tamano, data.total)}
              </span>{' '}
              de <span className="text-[#e8dc00] font-bold">{data.total}</span> clientes
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={pagina <= 1}
                onClick={() => updateParam('pagina', String(pagina - 1), false)}
                className="p-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="px-2 text-white">
                Página <span className="text-[#e8dc00] font-bold">{pagina}</span> de {totalPages}
              </span>

              <button
                disabled={pagina >= totalPages}
                onClick={() => updateParam('pagina', String(pagina + 1), false)}
                className="p-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientesAdmin;
