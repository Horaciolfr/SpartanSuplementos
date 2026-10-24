import React from 'react';
import { ArrowRight, Sparkles, Utensils } from 'lucide-react';
import type { RecetaItemData } from './RecetaModal';

interface RecetaCardProps {
  receta: RecetaItemData;
  onOpenModal?: (receta: RecetaItemData) => void;
}

export const RecetaCard: React.FC<RecetaCardProps> = ({ receta, onOpenModal }) => {
  const ingredientesResumen = receta.ingredientes?.slice(0, 3).join(' · ');

  return (
    <button
      type="button"
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111111] text-left transition-colors hover:border-[#e8dc00]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8dc00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808]"
      onClick={() => onOpenModal && onOpenModal(receta)}
      aria-label={`Ver receta: ${receta.nombre}`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#181818]">
        {receta.url_imagen ? (
          <img
            src={receta.url_imagen}
            alt={receta.nombre}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.025]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500">
            <Utensils className="h-7 w-7 text-zinc-600" />
            <span className="text-xs font-medium text-zinc-400">Imagen no disponible</span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-md bg-black/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white font-['JetBrains_Mono']">
          {receta.categoria}
        </span>
        {receta.url_imagen && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-md bg-black/75 px-2 py-1 text-[9px] text-zinc-300 font-['Inter']">
            <Sparkles className="h-2.5 w-2.5 text-[#e8dc00]" />
            Ilustración
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h4 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-[#e8dc00] font-['Inter']">
          {receta.nombre}
        </h4>
        {ingredientesResumen && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-400 font-['Inter']">
            {ingredientesResumen}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-[#e8dc00] font-['Inter']">
          Ver receta
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  );
};
