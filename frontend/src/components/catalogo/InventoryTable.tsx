import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Producto } from '../../types';
import { getProductImage } from '../../utils/productImages';

interface InventoryTableProps {
  productos: Producto[];
  onSelectProduct: (prod: Producto) => void;
  onDeleteProduct: (id: number) => void;
  isAdmin?: boolean;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  productos,
  onSelectProduct,
  onDeleteProduct,
  isAdmin = false,
}) => {
  return (
    <div className="bg-[#111111] border border-white/[0.07] overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs font-['Inter',sans-serif]">
          <thead className="sticky top-0 z-10 bg-[#0c0c0c] border-b border-white/[0.08] text-[#a3a3a3] uppercase text-[11px] font-semibold tracking-wider">
            <tr>
              <th className="py-3.5 px-4 font-semibold w-16">Foto</th>
              <th className="py-3.5 px-4 font-semibold w-36">SKU</th>
              <th className="py-3.5 px-4 font-semibold">Producto</th>
              <th className="py-3.5 px-4 font-semibold">Categoría</th>
              <th className="py-3.5 px-4 font-semibold text-right">Precio</th>
              <th className="py-3.5 px-4 font-semibold text-center">Stock Físico</th>
              <th className="py-3.5 px-4 font-semibold text-center">Estado</th>
              {isAdmin && <th className="py-3.5 px-4 font-semibold text-center w-20">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {productos.map((p) => {
              const isOutOfStock = p.stock_actual <= 0;
              const isLowStock = p.stock_actual <= p.stock_seguridad;
              const pImg = getProductImage(
                p.codigo_sku,
                p.categoria?.nombre_categoria,
                p.imagen_url
              );

              return (
                <tr key={p.id_producto} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-3.5 px-4">
                    <div
                      onClick={() => onSelectProduct(p)}
                      className="h-12 w-12 bg-[#090909] border border-white/[0.08] p-1 flex items-center justify-center overflow-hidden cursor-pointer rounded-lg hover:border-white/20 transition-colors"
                      title="Ver detalle del producto"
                    >
                      <img
                        src={pImg}
                        alt={p.nombre_producto}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-[#a3a3a3]">{p.codigo_sku}</td>
                  <td className="py-3.5 px-4">
                    <span
                      onClick={() => onSelectProduct(p)}
                      className="text-[#f5f5f5] font-medium text-[13px] hover:text-[#e8dc00] cursor-pointer transition-colors max-w-sm truncate block"
                    >
                      {p.nombre_producto}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#a3a3a3]">
                    {p.categoria?.nombre_categoria || 'Sin Asignar'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                    Bs. {Number(p.precio_unitario).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`font-mono text-xs font-semibold ${
                        isOutOfStock
                          ? 'text-rose-400'
                          : isLowStock
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {p.stock_actual.toLocaleString('es-BO')} u.
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full ${
                        p.estado_activo
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {p.estado_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteProduct(p.id_producto)}
                        className="p-1.5 text-[#6f6f6f] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer rounded-lg opacity-60 group-hover:opacity-100"
                        title="Desactivar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
