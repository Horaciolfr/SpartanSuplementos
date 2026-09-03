import React from 'react';
import type { Producto } from '../types';
import { getProductImage } from '../utils/productImages';
import { Eye, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  const { role } = useAuth();
  const navigate = useNavigate();

  const isOutOfStock = producto.stock_actual <= 0;
  const isLowStock = producto.stock_actual <= producto.stock_seguridad;
  const productImg = getProductImage(
    producto.codigo_sku,
    producto.categoria?.nombre_categoria,
    producto.imagen_url
  );

  // Extraer marca sugerida del nombre si es posible (e.g. ADN, Dragon Pharma, Evogen, MuscleTech, Nutrex, etc.)
  const extractBrand = (name: string) => {
    const brands = [
      'Dragon Pharma',
      'MuscleTech',
      'Insane Labz',
      'Evogen',
      'Nutrex',
      'Finaflex',
      'Level Pro',
      'Ultimate Nutrition',
      'Orgain',
      'RCSS',
      'Syntrax',
      'ADN',
    ];
    for (const b of brands) {
      if (name.toLowerCase().includes(b.toLowerCase())) return b.toUpperCase();
    }
    return producto.categoria?.nombre_categoria || 'SPARTAN';
  };

  const brandTag = extractBrand(producto.nombre_producto);

  return (
    <div
      style={{ animationDelay: `${animationDelay}ms` }}
      className="group relative bg-gradient-to-b from-[#111111] via-[#0d0d0d] to-[#090909] border border-[#222222] hover:border-[#f2e500]/70 flex flex-col justify-between overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-black/90 transition-all duration-300 hover:-translate-y-1 stagger-card"
    >
      {/* Top Gold Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-[#f2e500] transition-colors duration-300 z-30" />

      {/* Product Image Stage */}
      <div
        onClick={() => onOpenModal(producto)}
        className="relative aspect-square w-full bg-gradient-to-b from-[#181818] to-[#0c0c0c] flex items-center justify-center p-5 overflow-hidden cursor-pointer img-vignette"
      >
        {/* Subtle Radial Glow on Bottle */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(242,229,0,0.08)_0%,transparent_70%)] opacity-40 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Brand Tag Pill */}
        <div className="absolute top-3 left-3 z-20">
          <span className="px-2 py-0.5 bg-black/80 backdrop-blur-md border border-[#333] text-[9px] font-['JetBrains_Mono'] font-bold text-[#f2e500] tracking-wider uppercase">
            {brandTag}
          </span>
        </div>

        {/* Stock Status Indicator Pill */}
        <div className="absolute top-3 right-3 z-20">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-['JetBrains_Mono'] font-bold uppercase tracking-wider backdrop-blur-md border ${
              isOutOfStock
                ? 'bg-red-950/80 text-red-400 border-red-500/40'
                : isLowStock
                ? 'bg-amber-950/80 text-[#f2e500] border-[#f2e500]/40'
                : 'bg-black/80 text-emerald-400 border-emerald-500/30'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOutOfStock ? 'bg-red-400' : isLowStock ? 'bg-[#f2e500]' : 'bg-emerald-400'
              }`}
            />
            {isOutOfStock ? 'Agotado' : `${producto.stock_actual} uds`}
          </span>
        </div>

        {/* High-res Product Photo */}
        <img
          src={productImg}
          alt={producto.nombre_producto}
          loading="lazy"
          className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] group-hover:scale-106 group-hover:drop-shadow-[0_12px_24px_rgba(0,0,0,0.95)] transition-all duration-400 ease-out z-10"
        />

        {/* Hover Quick View Trigger */}
        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs font-black uppercase px-4 py-2 shadow-2xl interactive-press">
            <Eye className="h-3.5 w-3.5 stroke-[3]" />
            <span>Ficha Técnica</span>
          </span>
        </div>
      </div>

      {/* Product Information Body */}
      <div className="p-5 flex-1 flex flex-col justify-between bg-[#0b0b0b]/90 border-t border-[#181818]">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-['JetBrains_Mono'] text-[10px] text-[#f2e500] font-bold uppercase tracking-wider">
              [{producto.codigo_sku}]
            </span>
            <span className="font-['JetBrains_Mono'] text-[9px] text-[#737373] uppercase truncate max-w-[140px]">
              {producto.categoria?.nombre_categoria || 'GENERAL'}
            </span>
          </div>

          <h3
            onClick={() => onOpenModal(producto)}
            className="font-['Anybody'] text-sm sm:text-base font-bold text-white uppercase tracking-tight group-hover:text-[#f2e500] transition-colors line-clamp-2 leading-snug cursor-pointer mb-2"
          >
            {producto.nombre_producto}
          </h3>

          {producto.descripcion && (
            <p className="text-[11px] font-['Hanken_Grotesk'] text-[#8a8a8a] line-clamp-1 mb-2">
              {producto.descripcion}
            </p>
          )}
        </div>

        {/* Price Tag & Action */}
        <div className="pt-3 border-t border-[#181818] mt-2 flex items-center justify-between gap-3">
          <div>
            <span className="text-[8px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#737373] block">
              Precio Autorizado
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-['JetBrains_Mono'] text-[11px] text-[#f2e500] font-bold">Bs.</span>
              <span className="font-['JetBrains_Mono'] text-xl font-black text-white group-hover:text-[#f2e500] transition-colors">
                {Number(producto.precio_unitario).toFixed(2)}
              </span>
            </div>
          </div>

          {role === 'CAJERO' || role === 'ADMINISTRADOR' ? (
            <button
              onClick={() => navigate('/pos')}
              className="spartan-btn-secondary px-3.5 py-2 text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md interactive-press"
              title="Vender en POS"
            >
              <ShoppingCart className="h-3 w-3" />
              <span className="hidden sm:inline">Vender</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenModal(producto)}
              className="spartan-btn-primary px-3.5 py-2 text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md interactive-press"
            >
              <Eye className="h-3 w-3 stroke-[3]" />
              <span className="hidden sm:inline">Detalles</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
