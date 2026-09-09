import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Producto } from '../../types';
import { getProductImage } from '../../utils/productImages';

interface InventoryTableProps {
  productos: Producto[];
  onSelectProduct: (prod: Producto) => void;
  onDeleteProduct: (id: number) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  productos,
  onSelectProduct,
  onDeleteProduct,
}) => {
  return (
    <div className="bg-[#0D0D0D] border border-[#1A1A1A] overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-['JetBrains_Mono']">
          <thead className="bg-black border-b border-[#1A1A1A] text-[#737373] uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4 font-bold">Foto</th>
              <th className="py-3.5 px-4 font-bold">SKU</th>
              <th className="py-3.5 px-4 font-bold">Nombre Producto</th>
              <th className="py-3.5 px-4 font-bold">Categoría</th>
              <th className="py-3.5 px-4 font-bold text-right">Precio Oficial</th>
              <th className="py-3.5 px-4 font-bold text-center">Stock</th>
              <th className="py-3.5 px-4 font-bold text-center">Estado</th>
              <th className="py-3.5 px-4 font-bold text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {productos.map((p) => {
              const isOutOfStock = p.stock_actual <= 0;
              const isLowStock = p.stock_actual <= p.stock_seguridad;
              const pImg = getProductImage(
                p.codigo_sku,
                p.categoria?.nombre_categoria,
                p.imagen_url
              );

              return (
                <tr key={p.id_producto} className="hover:bg-[#141414] transition-colors">
                  <td className="py-3 px-4">
                    <div
                      onClick={() => onSelectProduct(p)}
                      className="h-12 w-12 bg-black border border-[#2a2a2a] p-1 flex items-center justify-center overflow-hidden cursor-pointer"
                    >
                      <img
                        src={pImg}
                        alt={p.nombre_producto}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#f2e500]">[{p.codigo_sku}]</td>
                  <td className="py-3 px-4 text-white font-['Anybody'] text-sm font-bold max-w-xs truncate">
                    {p.nombre_producto}
                  </td>
                  <td className="py-3 px-4 text-[#ccc7ab]">
                    {p.categoria?.nombre_categoria || 'SIN ASIGNAR'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-white">
                    Bs. {Number(p.precio_unitario).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center font-bold">
                    <span
                      className={
                        isOutOfStock
                          ? 'text-red-400'
                          : isLowStock
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      {p.stock_actual} uds
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                        p.estado_activo
                          ? 'bg-emerald-950/60 text-emerald-400'
                          : 'bg-red-950/60 text-red-400'
                      }`}
                    >
                      {p.estado_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onDeleteProduct(p.id_producto)}
                      className="p-1.5 text-[#737373] hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                      title="Desactivar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
