import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { Producto, VentaResponse } from '../types';
import { getErrorMessage } from '../utils/errors';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  User,
  ArrowRight,
  RotateCcw,
  Tag,
} from 'lucide-react';
import { getProductImage } from '../utils/productImages';
import { ReceiptModal } from '../components';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

export const POS: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [idCliente, setIdCliente] = useState<number | null>(null);

  // States for response & errors
  const [stockError, setStockError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reciboVenta, setReciboVenta] = useState<VentaResponse | null>(null);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Producto[]>('/catalogo/productos');
      setProductos(res.data.filter((p) => p.estado_activo));
    } catch (err: any) {
      setStockError(getErrorMessage(err, 'Error al cargar productos en la caja'));
      toast.error('No se pudo sincronizar el inventario de la tienda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const addToCart = (producto: Producto) => {
    setStockError(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.producto.id_producto === producto.id_producto);
      if (existing) {
        if (existing.cantidad >= producto.stock_actual) {
          toast.warning(`Stock máximo alcanzado (${producto.stock_actual} uds)`);
          return prev;
        }
        toast.info(`Cantidad actualizada (+1)`);
        return prev.map((item) =>
          item.producto.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      toast.success(`Añadido: ${producto.nombre_producto.slice(0, 26)}`);
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const updateQuantity = (id_producto: number, delta: number) => {
    setStockError(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.producto.id_producto === id_producto) {
            const newQty = item.cantidad + delta;
            if (newQty > item.producto.stock_actual) {
              toast.warning(`Stock insuficiente (máximo ${item.producto.stock_actual} uds)`);
              return item;
            }
            return newQty > 0 ? { ...item, cantidad: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (id_producto: number) => {
    setStockError(null);
    setCart((prev) => prev.filter((item) => item.producto.id_producto !== id_producto));
    toast.info('Producto removido de la orden');
  };

  const clearCart = () => {
    setCart([]);
    setStockError(null);
    toast.info('Carrito vaciado');
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setStockError(null);
    setSubmitting(true);

    try {
      const payload = {
        id_cliente: idCliente,
        items: cart.map((it) => ({
          id_producto: it.producto.id_producto,
          cantidad: it.cantidad,
        })),
      };

      const res = await apiClient.post<VentaResponse>('/pos/ventas', payload);
      setReciboVenta(res.data);
      clearCart();
      toast.success(`¡Venta realizada con éxito! Recibo N° ${res.data.id_venta}`);
      fetchProductos();
    } catch (err: any) {
      const msg = getErrorMessage(err, 'Error al procesar la venta');
      setStockError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Extraer categorías únicas
  const categories = Array.from(
    new Set(productos.map((p) => p.categoria?.nombre_categoria).filter(Boolean))
  ) as string[];

  const filteredProducts = productos.filter((p) => {
    const matchesSearch =
      p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' || p.categoria?.nombre_categoria === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const cartTotal = cart.reduce(
    (acc, item) => acc + Number(item.producto.precio_unitario) * item.cantidad,
    0
  );

  const cartTotalItems = cart.reduce((acc, item) => acc + item.cantidad, 0);

  return (
    <div className="space-y-8 font-['Hanken_Grotesk'] text-[#e2e2e2]">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1A1A1A] pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-6 w-6 text-[#f2e500]" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500] font-bold">
              Punto de Venta Spartan
            </span>
          </div>
          <h1 className="font-['Anybody'] text-3xl md:text-4xl text-white uppercase font-bold tracking-tight">
            Caja y Ventas Rápidas
          </h1>
          <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab] mt-1">
            Ventas ágiles en caja, cobro seguro y emisión de recibo digital al instante.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border border-[#1A1A1A] bg-[#0D0D0D] px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab]">
              Sistema: <strong className="text-emerald-400 font-bold">En Línea</strong>
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={fetchProductos}
            title="Refrescar catálogo y existencias"
            className="flex h-11 w-11 items-center justify-center border border-[#1A1A1A] bg-black text-[#ccc7ab] hover:text-[#f2e500] hover:border-[#f2e500]/40 transition-colors cursor-pointer"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin text-[#f2e500]' : ''}`} />
          </motion.button>
        </div>
      </header>

      {/* Main Grid: Catalog (2 Cols) + Sticky Cart (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Search, Filters & Catalog */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Bar & Category Chips */}
          <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-5 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                placeholder="BUSCAR SUPLEMENTO O SKU (EJ. CREATINA, WHEY)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black border border-[#2a2a2a] text-xs font-['JetBrains_Mono'] text-white uppercase placeholder-[#737373] pl-11 pr-4 py-3 outline-none focus:border-[#f2e500] transition-colors"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer interactive-press ${
                  selectedCategory === 'ALL'
                    ? 'bg-[#f2e500] text-black font-black'
                    : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                }`}
              >
                Todos ({productos.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer interactive-press ${
                    selectedCategory === cat
                      ? 'bg-[#f2e500] text-black font-black'
                      : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="flex h-72 items-center justify-center border border-[#1A1A1A] bg-[#0D0D0D]">
              <div className="flex flex-col items-center gap-3 text-[#f2e500]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f2e500] border-t-transparent" />
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest">
                  Consultando disponibilidad en tienda...
                </span>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center border border-[#1A1A1A] bg-[#0D0D0D] p-8 text-center">
              <Tag className="h-8 w-8 text-[#737373] mb-3" />
              <p className="font-['Anybody'] text-base uppercase text-white font-bold">
                No se encontraron productos
              </p>
              <p className="font-['Hanken_Grotesk'] text-xs text-[#ccc7ab] mt-1">
                Verifica el término de búsqueda o selecciona otra categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_actual <= 0;
                const isLowStock = p.stock_actual <= p.stock_seguridad;
                const cartQty = cart.find((it) => it.producto.id_producto === p.id_producto)?.cantidad || 0;
                const pImg = getProductImage(p.codigo_sku, p.categoria?.nombre_categoria, p.imagen_url);

                return (
                  <motion.div
                    key={p.id_producto}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`group relative flex flex-col justify-between border bg-[#0D0D0D] p-4 transition-all ${
                      isOutOfStock
                        ? 'border-red-950/40 opacity-50 cursor-not-allowed'
                        : 'border-[#1A1A1A] hover:border-[#f2e500] cursor-pointer'
                    }`}
                  >
                    {/* Top Yellow Corner Accent */}
                    <div className="absolute top-0 left-0 w-4 h-[2px] bg-[#f2e500] group-hover:w-full transition-all duration-300 z-10" />

                    {/* Stock & Cart Indicator Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#f2e500] truncate">
                        [{p.codigo_sku}]
                      </span>
                      <span
                        className={`text-[9px] font-['JetBrains_Mono'] font-bold uppercase px-1.5 py-0.5 ${
                          isOutOfStock
                            ? 'bg-red-950 text-red-400'
                            : isLowStock
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-[#141414] text-emerald-400'
                        }`}
                      >
                        {isOutOfStock ? 'Agotado' : `${p.stock_actual} uds`}
                      </span>
                    </div>

                    {/* Image Thumbnail */}
                    <div className="relative aspect-square w-full bg-black mb-3 overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={pImg}
                        alt={p.nombre_producto}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {cartQty > 0 && (
                        <div className="absolute top-1 right-1 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-lg">
                          {cartQty}
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <h3 className="font-['Anybody'] text-xs font-bold uppercase text-white line-clamp-2 mb-3 leading-snug group-hover:text-[#f2e500] transition-colors">
                      {p.nombre_producto}
                    </h3>

                    {/* Price & Action Button */}
                    <div className="pt-2 border-t border-[#1A1A1A] flex items-center justify-between">
                      <span className="font-['JetBrains_Mono'] text-sm font-black text-white">
                        Bs. {Number(p.precio_unitario).toFixed(2)}
                      </span>
                      <button
                        disabled={isOutOfStock}
                        className="flex h-7 w-7 items-center justify-center bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] group-hover:bg-[#f2e500] group-hover:text-black group-hover:border-[#f2e500] transition-all disabled:opacity-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Sticky Cart & Checkout Panel */}
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-6 shadow-2xl relative sticky top-24">
          {/* Top Yellow Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500]" />

          {/* Cart Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1A1A1A] mb-5">
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="h-5 w-5 text-[#f2e500]" />
              <h2 className="font-['Anybody'] text-xl text-white uppercase font-bold tracking-tight">
                Orden de Venta
              </h2>
              {cart.length > 0 && (
                <span className="bg-[#f2e500] text-black font-['JetBrains_Mono'] text-[10px] font-black px-2 py-0.5 uppercase">
                  {cartTotalItems} {cartTotalItems === 1 ? 'Ítem' : 'Ítems'}
                </span>
              )}
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="font-['JetBrains_Mono'] text-[11px] text-[#737373] hover:text-red-400 uppercase tracking-wider transition-colors cursor-pointer"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Stock Error Alert */}
          {stockError && (
            <div className="mb-5 flex items-start gap-3 border border-red-500/50 bg-red-950/20 p-4 text-xs text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <strong className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-wider block text-red-400 mb-0.5">
                  Aviso de Inventario
                </strong>
                <span>{stockError}</span>
              </div>
            </div>
          )}

          {/* Customer Selection */}
          <div className="mb-5">
            <label className="block font-['JetBrains_Mono'] text-[10px] font-bold text-[#ccc7ab] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#f2e500]" />
              <span>Cliente Asociado</span>
            </label>
            <select
              value={idCliente || ''}
              onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : null)}
              className="w-full border border-[#2a2a2a] bg-black py-2.5 px-3 text-xs font-['JetBrains_Mono'] text-white outline-none focus:border-[#f2e500] transition-colors cursor-pointer uppercase"
            >
              <option value="">Consumidor Final (Venta al paso)</option>
              <option value="3">Cliente Registrado (cliente@spartan.dev)</option>
            </select>
          </div>

          {/* Cart Itemized List with Framer Motion AnimatePresence */}
          <div className="overflow-y-auto max-h-80 divide-y divide-[#1A1A1A] mb-5 border-y border-[#1A1A1A]">
            {cart.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingCart className="h-8 w-8 text-[#2a2a2a] mx-auto mb-2" />
                <p className="font-['Anybody'] text-sm uppercase text-[#737373] font-bold">
                  Carrito Vacío
                </p>
                <p className="font-['Hanken_Grotesk'] text-xs text-[#555] mt-1">
                  Agrega suplementos del catálogo para generar la venta.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.producto.id_producto}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="py-3.5 flex items-center justify-between gap-3"
                  >
                    <img
                      src={getProductImage(item.producto.codigo_sku, item.producto.categoria?.nombre_categoria, item.producto.imagen_url)}
                      alt={item.producto.nombre_producto}
                      className="h-10 w-10 object-contain p-0.5 bg-black border border-[#2a2a2a] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#f2e500] block">
                        [{item.producto.codigo_sku}]
                      </span>
                      <p className="font-['Anybody'] text-xs font-bold text-white uppercase truncate tracking-tight">
                        {item.producto.nombre_producto}
                      </p>
                      <span className="font-['JetBrains_Mono'] text-[11px] text-[#ccc7ab]">
                        Bs. {Number(item.producto.precio_unitario).toFixed(2)} c/u
                      </span>
                    </div>

                    {/* Quantity Actions */}
                    <div className="flex items-center gap-1.5">
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => updateQuantity(item.producto.id_producto, -1)}
                        className="flex h-7 w-7 items-center justify-center border border-[#2a2a2a] bg-[#141414] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white transition-colors cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </motion.button>
                      <span className="font-['JetBrains_Mono'] text-xs font-bold text-white w-6 text-center">
                        {item.cantidad}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => updateQuantity(item.producto.id_producto, 1)}
                        className="flex h-7 w-7 items-center justify-center border border-[#2a2a2a] bg-[#141414] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </motion.button>
                      <button
                        onClick={() => removeFromCart(item.producto.id_producto)}
                        title="Quitar ítem"
                        className="p-1 text-[#737373] hover:text-red-400 transition-colors ml-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between font-['JetBrains_Mono'] text-xs text-[#ccc7ab]">
              <span>Subtotal estimado:</span>
              <span>Bs. {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-['JetBrains_Mono'] text-xs text-[#ccc7ab]">
              <span>Impuestos / Retenciones:</span>
              <span>Bs. 0.00</span>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-[#1A1A1A]">
              <span className="font-['Anybody'] text-sm uppercase text-white font-bold tracking-tight">
                Total a Cobrar:
              </span>
              <span className="font-['JetBrains_Mono'] text-2xl font-black text-[#f2e500]">
                Bs. {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout CTA */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            className="flex w-full items-center justify-center gap-2 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs font-black uppercase tracking-wider py-4 hover:bg-white transition-colors cursor-pointer shadow-xl disabled:opacity-30 disabled:pointer-events-none"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Procesando cobro seguro...</span>
              </div>
            ) : (
              <>
                <span>Emitir Venta & Recibo</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </>
            )}
          </motion.button>

          <p className="mt-3 text-[10px] font-['JetBrains_Mono'] text-[#737373] text-center uppercase tracking-wider">
            * Stock verificado y actualizado automáticamente al cobrar.
          </p>
        </div>
      </div>

      {/* Comprobante Térmico Digital Oficial */}
      <ReceiptModal recibo={reciboVenta} onClose={() => setReciboVenta(null)} />
    </div>
  );
};
