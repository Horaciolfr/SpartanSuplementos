import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  nombre: string;
  setNombre: (val: string) => void;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nombre,
  setNombre,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="w-full max-w-sm spartan-glass p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative rounded-3xl border-white/15"
        >
          {/* Top Gold Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8dc00]" />

          <button
            onClick={onClose}
            aria-label="Cerrar modal de categoría"
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors cursor-pointer spartan-glass-pill rounded-full hover:border-[#e8dc00]/60 shadow-md"
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-['Anybody'] text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#e8dc00]" />
            <span>Nueva Categoría</span>
          </h3>

          <form onSubmit={onSubmit} className="space-y-4 font-['JetBrains_Mono'] text-xs">
            <div>
              <label className="block text-[#ccc7ab] mb-1 uppercase">Nombre de Categoría *</label>
              <input
                type="text"
                required
                placeholder="EJ. BARRAS & SNACKS"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full spartan-glass-input p-2.5 outline-none uppercase rounded-xl transition-colors"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="spartan-btn-secondary px-5 py-2.5 cursor-pointer rounded-xl"
              >
                Cancelar
              </button>
              <button type="submit" className="spartan-btn-primary px-6 py-2.5 cursor-pointer rounded-xl shadow-lg">
                Crear Categoría
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
