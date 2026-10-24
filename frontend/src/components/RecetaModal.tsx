import React from 'react';
import { X, Sparkles, Utensils, ShieldAlert } from 'lucide-react';

export interface RecetaItemData {
  id_receta: number;
  codigo: string;
  nombre: string;
  categoria: string;
  somatotipo_afin: string;
  objetivo: string;
  ingredientes: string[];
  macronutrientes: Record<string, any>;
  instrucciones?: string | null;
  disclaimer: string;
  url_imagen?: string | null;
  placeholder?: boolean;
  placeholder_texto?: string;
  regla_aplicada?: string;
}

interface RecetaModalProps {
  receta: RecetaItemData | null;
  onClose: () => void;
}

export const RecetaModal: React.FC<RecetaModalProps> = ({ receta, onClose }) => {
  if (!receta) return null;

  const objetivoEtiqueta = ({
    PP: 'pérdida de grasa',
    GM: 'ganancia muscular',
    GP: 'ganancia de peso',
    MANT: 'mantenimiento',
  } as Record<string, string>)[receta.objetivo] || receta.objetivo.toLowerCase();

  const somatotipoEtiqueta = receta.somatotipo_afin
    .replace('ECT-MESO', 'ectomorfo–mesomorfo')
    .replace('MESO-ENDO', 'mesomorfo–endomorfo')
    .replace('ECTO', 'ectomorfo')
    .replace('ECT', 'ectomorfo')
    .replace('MESOMORFO', 'mesomorfo')
    .replace('MESO', 'mesomorfo')
    .replace('ENDOMORFO', 'endomorfo')
    .replace('ENDO', 'endomorfo');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receta-modal-title"
    >
      <div 
        className="relative w-full max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-['JetBrains_Mono'] text-zinc-400 uppercase tracking-wider">
              {receta.categoria}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar detalle de receta"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-zinc-200">
          {/* Imagen o Placeholder */}
          <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-zinc-900">
            {receta.url_imagen ? (
              <>
                <img
                  src={receta.url_imagen}
                  alt={receta.nombre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-md bg-black/75 px-2.5 py-1 text-[10px] text-zinc-300 font-['Inter']">
                  <Sparkles className="h-3 w-3" />
                  <span>Imagen ilustrativa</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 bg-zinc-900/90">
                <Utensils className="h-10 w-10 text-zinc-600" />
                <span className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-400">
                  {receta.placeholder_texto || "Imagen en preparación"}
                </span>
              </div>
            )}
          </div>

          {/* Título y Tags */}
          <div>
            <h2 id="receta-modal-title" className="text-xl font-bold font-['Anybody'] text-white tracking-tight">
              {receta.nombre}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400 font-['Inter']">
              Seleccionada para un perfil {somatotipoEtiqueta} con objetivo de {objetivoEtiqueta}.
            </p>
          </div>

          {/* Ingredientes si existen */}
          {receta.ingredientes && receta.ingredientes.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-['JetBrains_Mono'] uppercase text-zinc-400 font-bold block">
                Ingredientes Principales
              </span>
              <ul className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {receta.ingredientes.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-300 font-['Inter']">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#e8dc00]" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer Clínico */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-300/80 text-[11px] font-['Inter'] leading-relaxed">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{receta.disclaimer}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#141414] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
