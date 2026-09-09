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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-[#0D0D0D] border border-[#1A1A1A] p-6 shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#737373] hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          <h3 className="font-['Anybody'] text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-[#f2e500]" />
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
                className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none uppercase"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="spartan-btn-secondary px-4 py-2 cursor-pointer"
              >
                Cancelar
              </button>
              <button type="submit" className="spartan-btn-primary px-5 py-2 cursor-pointer">
                Crear Categoría
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
