import React from 'react';
import type { Producto } from '../types';
import { getProductImage } from '../utils/productImages';
import { Eye, ArrowUpRight } from 'lucide-react';

interface ProductCardProps {
  producto: Producto;
  onOpenModal: (p: Producto) => void;
  animationDelay?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  producto,
  onOpenModal,
  animationDelay = 0,
}) => {
  const isOutOfStock = producto.stock_actual <= 0;
  const isLowStock = producto.stock_actual <= producto.stock_seguridad;
  const productImg = getProductImage(
    producto.codigo_sku,
    producto.categoria?.nombre_categoria,
    producto.imagen_url
  );

  const openProduct = () => {
    if (!isOutOfStock) onOpenModal(producto);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (isOutOfStock || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    openProduct();
  };

  return (
    <article
      onClick={openProduct}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isOutOfStock ? -1 : 0}
      aria-disabled={isOutOfStock}
      aria-label={`${producto.nombre_producto}. ${isOutOfStock ? 'Producto agotado' : 'Abrir ficha del producto'}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      className={`stagger-card group relative flex flex-col overflow-hidden bg-[#111111] border border-white/[0.07] hover:border-white/[0.16] rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8dc00] ${
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed border-white/5'
          : 'cursor-pointer hover:-translate-y-1'
      }`}
    >
      {/* Accent Line on Hover */}
      {!isOutOfStock && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#e8dc00] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left z-20" />
      )}

      {/* Image Container */}
      <div className="relative aspect-square w-full bg-[#090909] flex items-center justify-center p-5 overflow-hidden rounded-t-xl">
        <img
          src={productImg}
          alt={producto.nombre_producto}
          loading="lazy"
          decoding="async"
          width="480"
          height="480"
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out z-0"
        />

        {/* Semantic Stock Status Tag */}
        <div
          className={`absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium tracking-wide rounded-full backdrop-blur-md border ${
            isOutOfStock
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : isLowStock
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isOutOfStock
                ? 'bg-rose-400'
                : isLowStock
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
          />
          <span>{isOutOfStock ? 'Agotado' : isLowStock ? 'Pocas unidades' : 'En stock'}</span>
        </div>

        {/* Hover Action */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-[2px] z-20">
          <span className="flex items-center gap-1.5 bg-[#e8dc00] text-black text-xs font-semibold px-4 py-2 rounded-lg shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-200 ease-out">
            <Eye className="h-4 w-4" />
            <span>Ver Ficha</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-[#111111]">
        <div>
          <div className="flex items-center justify-between text-[11px] text-[#6f6f6f] mb-1 font-mono">
            <span>{producto.categoria?.nombre_categoria || 'Suplementos'}</span>
            <span className="text-[10px] text-[#a3a3a3] opacity-75">{producto.codigo_sku}</span>
          </div>
          <h3 className="font-['Inter',sans-serif] text-sm font-semibold text-[#f5f5f5] line-clamp-2 leading-snug group-hover:text-[#e8dc00] transition-colors duration-150">
            {producto.nombre_producto}
          </h3>
        </div>

        <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="block text-[10px] text-[#6f6f6f] uppercase tracking-wider font-medium">Precio</span>
            <span className="text-base font-bold text-white tabular-nums">
              Bs. {Number(producto.precio_unitario).toFixed(2)}
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#a3a3a3] bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-md">
            Disponible
          </span>
        </div>
      </div>
    </article>
  );
};
