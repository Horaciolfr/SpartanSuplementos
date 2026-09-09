import React from 'react';
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

  if (!producto) return null;

  const imgSrc = getProductImage(
    producto.codigo_sku,
    producto.categoria?.nombre_categoria,
    producto.imagen_url
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="w-full max-w-2xl bg-[#0D0D0D] border border-[#1A1A1A] shadow-2xl relative overflow-hidden flex flex-col md:flex-row"
        >
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500] z-20" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-30 p-2 text-[#737373] hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Modal Image Preview */}
          <div className="md:w-1/2 aspect-square md:aspect-auto bg-black relative overflow-hidden flex items-center justify-center p-6">
            <img
              src={imgSrc}
              alt={producto.nombre_producto}
              className="max-h-[380px] w-auto object-contain drop-shadow-2xl"
            />
          </div>

          {/* Modal Product Details */}
          <div className="md:w-1/2 p-6 flex flex-col justify-between">
            <div>
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#f2e500] uppercase tracking-wider block mb-1">
                [{producto.codigo_sku}]
              </span>
              <h3 className="font-['Anybody'] text-2xl font-bold text-white uppercase tracking-tight mb-2">
                {producto.nombre_producto}
              </h3>
              <span className="inline-block px-2.5 py-1 bg-[#1A1A1A] text-[#ccc7ab] font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider mb-4 border border-[#2a2a2a]">
                {producto.categoria?.nombre_categoria || 'GENERAL'}
              </span>

              {producto.descripcion && (
                <p className="text-xs text-[#ccc7ab] font-['Hanken_Grotesk'] leading-relaxed mb-4 bg-[#141414] p-3 border border-[#222]">
                  {producto.descripcion}
                </p>
              )}

              <div className="space-y-2 text-xs font-['Hanken_Grotesk'] text-[#ccc7ab] mb-6 border-y border-[#1A1A1A] py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#f2e500]" />
                  <span>Garantía de originalidad y stock físico en tienda.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#f2e500]" />
                  <span>Certificación de pureza internacional.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Disponible para despacho inmediato en tienda.</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-baseline mb-4">
                <span className="font-['JetBrains_Mono'] text-xs text-[#737373] uppercase">
                  Precio Oficial:
                </span>
                <span className="font-['JetBrains_Mono'] text-3xl font-black text-[#f2e500]">
                  Bs. {Number(producto.precio_unitario).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3">
                {role === 'CAJERO' || role === 'ADMINISTRADOR' ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/pos')}
                    className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
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
                    className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
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
