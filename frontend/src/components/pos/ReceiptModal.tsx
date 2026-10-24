import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Printer } from 'lucide-react';
import type { VentaResponse } from '../../types';
import { storeLogo } from '../../utils/productImages';

interface ReceiptModalProps {
  recibo: VentaResponse | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ recibo, onClose }) => {
  if (!recibo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-md spartan-glass p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative rounded-3xl border-white/15 overflow-hidden"
        >
          {/* Top Yellow Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8dc00]" />

          {/* Header Modal */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-['Anybody'] text-base uppercase font-bold text-white">
                Comprobante Oficial Emitido
              </span>
            </div>
            <span className="font-['JetBrains_Mono'] text-xs text-[#e8dc00] font-bold">
              N° {recibo.id_venta}
            </span>
          </div>

          {/* Visual Receipt Paper Preview */}
          <div className="spartan-glass-subtle p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] space-y-4 mb-6 shadow-inner rounded-2xl border-white/10">
            <div className="text-center border-b border-dashed border-[#444] pb-4">
              <img
                src={storeLogo}
                alt="Spartan Bolivia"
                className="h-16 w-auto mx-auto mb-2 object-contain"
              />
              <h4 className="font-['Anybody'] text-sm font-black text-white uppercase tracking-tight">
                SPARTAN SUPLEMENTOS BOLIVIA
              </h4>
              <p className="text-[10px] text-[#737373] mt-0.5">
                Nutrición Deportiva Certificada
              </p>
              <p className="text-[9px] text-[#555] mt-1">
                Fecha: {new Date(recibo.fecha_hora_venta).toLocaleString('es-BO')}
              </p>
              <p className="text-[9px] text-[#e8dc00] mt-0.5 font-bold">
                Comprobante: {recibo.numero_recibo}
              </p>
            </div>

            {/* Line Items */}
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-[10px] font-bold text-[#737373] uppercase border-b border-[#333] pb-1">
                <span>Cant. / Detalle</span>
                <span>Importe</span>
              </div>
              {recibo.detalles.map((det) => (
                <div key={det.id_detalle_venta} className="flex justify-between items-start gap-2 text-[11px]">
                  <div className="flex-1 truncate">
                    <span className="text-[#e8dc00] font-bold mr-1.5">{det.cantidad}x</span>
                    <span className="text-white">{det.nombre_producto}</span>
                    <div className="text-[9px] text-[#737373]">
                      @ Bs. {Number(det.precio_historico).toFixed(2)}
                    </div>
                  </div>
                  <span className="font-bold text-white">
                    Bs. {Number(det.subtotal).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-center border-t border-dashed border-[#444] pt-3">
              <span className="font-['Anybody'] text-xs uppercase font-bold text-white">
                TOTAL PAGADO:
              </span>
              <span className="text-xl font-black text-[#e8dc00]">
                Bs. {recibo.total_transaccion.toFixed(2)}
              </span>
            </div>

            {/* Security confirmation */}
            <div className="text-center pt-3 border-t border-dashed border-[#444]">
              <p className="text-[9px] text-[#555] tracking-widest uppercase">
                ||||| | |||| || |||||| | ||||| ||||
              </p>
              <p className="text-[9px] text-emerald-400 mt-1 font-bold">
                INVENTARIO ACTUALIZADO EN TIEMPO REAL
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 border border-white/15 bg-black/40 py-3 text-xs font-['JetBrains_Mono'] uppercase font-bold text-[#ccc7ab] hover:border-[#e8dc00] hover:text-white transition-colors cursor-pointer rounded-xl"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar comprobante de venta"
              className="flex-1 bg-[#e8dc00] text-black py-3 text-xs font-['JetBrains_Mono'] uppercase font-black hover:bg-white transition-colors cursor-pointer rounded-xl shadow-lg"
            >
              Listo / Nueva Venta
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
