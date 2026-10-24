import React, { useState } from 'react';
import { Dumbbell, Clock, Info } from 'lucide-react';
import type { EjercicioRutinaData } from './EjercicioModal';

interface EjercicioCardProps {
  ejercicio: EjercicioRutinaData;
  onOpenModal?: (ejercicio: EjercicioRutinaData) => void;
}

export const EjercicioCard: React.FC<EjercicioCardProps> = ({ ejercicio, onOpenModal }) => {
  const [imgError, setImgError] = useState(false);

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

  const hasValidGif = ejercicio.url_gif && !ejercicio.placeholder && !imgError;

  return (
    <article 
      className="flex flex-col justify-between bg-[#111111] border border-white/[0.07] hover:border-[#e8dc00]/40 transition-all rounded-2xl overflow-hidden shadow-lg group print:border-zinc-300 print:bg-white print:text-black"
    >
      <div>
        {/* Stage de Animación GIF o Placeholder */}
        <div 
          className="relative aspect-video w-full bg-zinc-950 overflow-hidden flex items-center justify-center border-b border-white/[0.05]"
        >
          {hasValidGif ? (
            <img
              src={ejercicio.url_gif!}
              alt={`Animación del ejercicio ${ejercicio.nombre}`}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-4 text-center bg-zinc-900/90 text-zinc-500">
              <Dumbbell className="h-8 w-8 text-zinc-600 mb-1" />
              <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/10 text-[10px] font-['JetBrains_Mono'] text-zinc-400 font-semibold uppercase">
                {ejercicio.placeholder_texto || "Animación en preparación"}
              </span>
              <span className="text-[10px] text-zinc-600">Asset biomecánico pendiente</span>
            </div>
          )}

          {/* Badge de Categoría Superior Izquierdo */}
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md border text-[10px] font-['JetBrains_Mono'] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
            <span className={getCategoriaBadge(ejercicio.categoria)}>
              {ejercicio.categoria}
            </span>
          </div>

          {/* Código Superior Derecho */}
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-[#e8dc00]/90 text-black font-['JetBrains_Mono'] font-bold text-[10px] uppercase shadow-sm">
            {ejercicio.codigo}
          </div>
        </div>

        {/* Información del Ejercicio */}
        <div className="p-4 space-y-3">
          <div>
            <h4 className="text-sm font-bold text-white line-clamp-1 font-['Inter'] leading-snug group-hover:text-[#e8dc00] transition-colors print:text-black">
              {ejercicio.nombre}
            </h4>
            {ejercicio.grupo_muscular && (
              <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-400 uppercase block mt-0.5">
                {ejercicio.grupo_muscular}
              </span>
            )}
          </div>

          {/* Dosificación: Series, Reps, Descanso */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-['JetBrains_Mono']">
            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white font-semibold">
              {ejercicio.series} series × {ejercicio.repeticiones}
            </span>
            <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-cyan-400 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{ejercicio.descanso_seg}s</span>
            </span>
          </div>

          {/* Nota Técnica / Foco Biomecánico */}
          {ejercicio.nota_tecnica && (
            <p className="text-xs text-zinc-400 line-clamp-2 font-['Inter'] leading-relaxed">
              {ejercicio.nota_tecnica}
            </p>
          )}
        </div>
      </div>

      {/* Footer de Tarjeta con Botón de Técnica */}
      <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-white/[0.05] mt-1 print:hidden">
        <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500">
          Orden #{ejercicio.orden}
        </span>
        <button
          onClick={() => onOpenModal && onOpenModal(ejercicio)}
          className="spartan-btn-secondary px-3 py-1.5 text-xs font-['JetBrains_Mono'] font-bold uppercase rounded-xl flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white hover:border-[#e8dc00]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#e8dc00]"
          title={`Ver técnica detallada de ${ejercicio.nombre}`}
        >
          <Info className="h-3.5 w-3.5 text-[#e8dc00]" />
          <span>Técnica</span>
        </button>
      </div>
    </article>
  );
};
