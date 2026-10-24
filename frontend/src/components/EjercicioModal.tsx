import React from 'react';
import { X, Dumbbell, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export interface EjercicioRutinaData {
  id_ejercicio: number;
  codigo: string;
  nombre: string;
  categoria: string;
  grupo_muscular?: string;
  dia: number;
  orden: number;
  series: number;
  repeticiones: string;
  descanso_seg: number;
  nota_tecnica?: string;
  url_gif?: string | null;
  placeholder?: boolean;
  placeholder_texto?: string;
  disclaimer: string;
}

interface EjercicioModalProps {
  ejercicio: EjercicioRutinaData | null;
  onClose: () => void;
}

export const EjercicioModal: React.FC<EjercicioModalProps> = ({ ejercicio, onClose }) => {
  if (!ejercicio) return null;

  const getCategoriaBadge = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'PIERNAS':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'EMPUJE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'TIRON':
      case 'TIRÓN':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'CORE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CONDICION':
      case 'CONDICIÓN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-ejercicio-title"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-md bg-[#e8dc00]/10 text-[#e8dc00] border border-[#e8dc00]/30 font-['JetBrains_Mono'] text-xs font-bold uppercase">
              {ejercicio.codigo}
            </span>
            <span className={`px-2.5 py-0.5 rounded-md border font-['JetBrains_Mono'] text-xs font-bold uppercase tracking-wider ${getCategoriaBadge(ejercicio.categoria)}`}>
              {ejercicio.categoria}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#e8dc00]"
            title="Cerrar modal"
            aria-label="Cerrar modal de técnica"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-zinc-200">
          {/* GIF animado o Placeholder */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-zinc-950 flex items-center justify-center">
            {ejercicio.url_gif ? (
              <img
                src={ejercicio.url_gif}
                alt={`Animación demostrativa del ejercicio ${ejercicio.nombre}`}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 bg-zinc-900/90 p-6 text-center">
                <Dumbbell className="h-10 w-10 text-zinc-600 mb-1" />
                <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-400 font-bold">
                  {ejercicio.placeholder_texto || "Animación en preparación"}
                </span>
                <span className="text-[11px] text-zinc-600 max-w-xs">
                  Asset biomecánico oficial en proceso de captura técnica
                </span>
              </div>
            )}
          </div>

          {/* Título y Target */}
          <div>
            <h2 id="modal-ejercicio-title" className="text-xl font-bold font-['Anybody'] uppercase text-white tracking-tight">
              {ejercicio.nombre}
            </h2>
            {ejercicio.grupo_muscular && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-['JetBrains_Mono'] text-zinc-400">
                <Activity className="h-3.5 w-3.5 text-[#e8dc00]" />
                <span>Grupo Muscular Principal:</span>
                <strong className="text-white uppercase">{ejercicio.grupo_muscular}</strong>
              </div>
            )}
          </div>

          {/* Dosificación Prescrita */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-black/60 border border-white/10 rounded-xl text-center font-['JetBrains_Mono']">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase">Series</div>
              <div className="text-base font-bold text-white mt-0.5">{ejercicio.series}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase">Repeticiones</div>
              <div className="text-base font-bold text-[#e8dc00] mt-0.5">{ejercicio.repeticiones}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 uppercase">Descanso</div>
              <div className="text-base font-bold text-cyan-400 mt-0.5">{ejercicio.descanso_seg}s</div>
            </div>
          </div>

          {/* Pauta y Nota Técnica */}
          {ejercicio.nota_tecnica && (
            <div className="p-4 bg-[#141414] border border-white/10 rounded-xl space-y-1.5">
              <div className="text-xs font-['JetBrains_Mono'] uppercase font-bold text-[#e8dc00] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Foco Biomecánico & Pauta de Ejecución</span>
              </div>
              <p className="text-xs text-zinc-300 font-['Inter'] leading-relaxed">
                {ejercicio.nota_tecnica}
              </p>
            </div>
          )}

          {/* Disclaimer Legal y de Seguridad */}
          <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-1.5 text-amber-200/90 text-xs font-['Inter']">
            <div className="flex items-center gap-2 font-bold font-['JetBrains_Mono'] uppercase text-amber-400 text-[11px]">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Precaución y Seguridad Biomecánica</span>
            </div>
            <p className="leading-relaxed text-[11px] text-zinc-400">
              {ejercicio.disclaimer}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="spartan-btn-primary px-5 py-2 text-xs font-bold font-['JetBrains_Mono'] uppercase rounded-xl cursor-pointer shadow-lg focus:outline-none focus:ring-2 focus:ring-[#e8dc00]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
