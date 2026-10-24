import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import type { Categoria } from '../../types';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  sku: string;
  setSku: (val: string) => void;
  nombre: string;
  setNombre: (val: string) => void;
  categoriaId: number;
  setCategoriaId: (val: number) => void;
  precio: string;
  setPrecio: (val: string) => void;
  stock: string;
  setStock: (val: string) => void;
  stockSeguridad: string;
  setStockSeguridad: (val: string) => void;
  categorias: Categoria[];
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sku,
  setSku,
  nombre,
  setNombre,
  categoriaId,
  setCategoriaId,
  precio,
  setPrecio,
  stock,
  setStock,
  stockSeguridad,
  setStockSeguridad,
  categorias,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="w-full max-w-md spartan-glass p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative rounded-3xl border-white/15"
        >
          {/* Top Gold Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8dc00]" />

          <button
            onClick={onClose}
            aria-label="Cerrar modal de creación de producto"
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors cursor-pointer spartan-glass-pill rounded-full hover:border-[#e8dc00]/60 shadow-md"
          >
            <X className="h-4 w-4" />
          </button>
          <h3 className="font-['Anybody'] text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-[#e8dc00]" />
            <span>Registrar Nuevo Suplemento</span>
          </h3>

          <form onSubmit={onSubmit} className="space-y-4 font-['JetBrains_Mono'] text-xs">
            <div>
              <label className="block text-[#ccc7ab] mb-1 uppercase">Código SKU *</label>
              <input
                type="text"
                required
                placeholder="EJ. SKU-PROT-099"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full spartan-glass-input p-2.5 outline-none uppercase rounded-xl transition-colors"
              />
            </div>

            <div>
              <label className="block text-[#ccc7ab] mb-1 uppercase">Nombre Comercial *</label>
              <input
                type="text"
                required
                placeholder="EJ. ISOLATE WHEY 5LB"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full spartan-glass-input p-2.5 outline-none uppercase rounded-xl transition-colors"
              />
            </div>

            <div>
              <label className="block text-[#ccc7ab] mb-1 uppercase">Categoría *</label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(parseInt(e.target.value, 10))}
                className="w-full spartan-glass-input p-2.5 outline-none uppercase rounded-xl transition-colors cursor-pointer"
              >
                {categorias.map((c) => (
                  <option key={c.id_categoria} value={c.id_categoria} className="bg-zinc-900 text-white dark:bg-zinc-900">
                    {c.nombre_categoria}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Precio (Bs) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  placeholder="350.00"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full spartan-glass-input p-2.5 outline-none rounded-xl transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Stock Inicial</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full spartan-glass-input p-2.5 outline-none rounded-xl transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Mínimo</label>
                <input
                  type="number"
                  value={stockSeguridad}
                  onChange={(e) => setStockSeguridad(e.target.value)}
                  className="w-full spartan-glass-input p-2.5 outline-none rounded-xl transition-colors"
                />
              </div>
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
                Guardar Producto
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
