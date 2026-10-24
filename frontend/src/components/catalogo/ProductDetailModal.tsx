import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Award, Check, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { Producto } from '../../types';
import { getProductImage } from '../../utils/productImages';

interface ProductDetailModalProps {
  producto: Producto | null;
  onClose: () => void;
  role?: string | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  producto,
  onClose,
  role,
}) => {
  const navigate = useNavigate();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!producto) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [producto, onClose]);

  if (!producto) return null;

  const imgSrc = getProductImage(
    producto.codigo_sku,
    producto.categoria?.nombre_categoria,
    producto.imagen_url
  );

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-detail-title"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="w-full max-w-2xl spartan-glass shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col md:flex-row rounded-3xl max-h-[90vh] overflow-y-auto border-white/15"
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8dc00] z-20" />
          
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha del producto"
            className="absolute top-4 right-4 z-30 p-2 text-white/70 hover:text-white transition-colors cursor-pointer spartan-glass-pill rounded-full hover:border-[#e8dc00]/60 shadow-md"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Image Preview */}
          <div className="md:w-1/2 aspect-square sm:aspect-auto h-52 sm:h-64 md:h-auto bg-black/40 backdrop-blur-sm relative overflow-hidden flex items-center justify-center p-4 sm:p-6 border-b md:border-b-0 md:border-r border-white/10 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none shrink-0">
            <img
              src={imgSrc}
              alt={producto.nombre_producto}
              width="480"
              height="480"
              decoding="async"
              className="max-h-[190px] sm:max-h-[260px] md:max-h-[380px] w-auto object-contain drop-shadow-2xl"
            />
          </div>

          {/* Modal Product Details */}
          <div className="md:w-1/2 p-6 flex flex-col justify-between">
            <div>
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#e8dc00] uppercase tracking-wider block mb-1">
                [{producto.codigo_sku}]
              </span>
              <h3 id="product-detail-title" className="font-['Anybody'] text-2xl font-bold text-white uppercase tracking-tight mb-2">
                {producto.nombre_producto}
              </h3>
              <span className="inline-block px-3 py-1 spartan-glass-pill text-zinc-200 font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider mb-4 rounded-full font-bold">
                {producto.categoria?.nombre_categoria || 'GENERAL'}
              </span>

              {producto.descripcion && (
                <p className="text-xs text-zinc-200 font-['Hanken_Grotesk'] leading-relaxed mb-4 spartan-glass-subtle p-3.5 border-white/10 rounded-2xl">
                  {producto.descripcion}
                </p>
              )}

              <div className="space-y-2 text-xs font-['Hanken_Grotesk'] text-zinc-300 mb-6 border-y border-white/10 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#e8dc00]" />
                  <span>Garantía de originalidad y stock físico en tienda.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#e8dc00]" />
                  <span>Certificación de pureza internacional.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Disponible para despacho inmediato en tienda.</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-4 p-3 spartan-glass-subtle rounded-xl border-white/10">
                <span className="font-['JetBrains_Mono'] text-xs text-zinc-400 uppercase font-semibold">
                  Precio Oficial:
                </span>
                <span className="font-['JetBrains_Mono'] text-3xl font-black text-[#e8dc00] tabular-nums">
                  Bs. {Number(producto.precio_unitario).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3">
                {role === 'CAJERO' || role === 'ADMINISTRADOR' ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/pos')}
                    className="w-full spartan-btn-primary py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-lg"
                  >
                    <ShoppingCart className="h-4 w-4 stroke-[3]" />
                    <span>Ir al Punto de Venta</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      toast.info('Para adquirir este producto, acércate a cualquiera de nuestras sucursales Spartan o inicia sesión.');
                      onClose();
                    }}
                    className="w-full spartan-btn-primary py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-lg"
                  >
                    <span>Consultar en Sucursal</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
