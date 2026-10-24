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
  X,
} from 'lucide-react';
import { getProductImage } from '../utils/productImages';
import { ReceiptModal } from '../components';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

interface CartItem {
  producto: Producto;
  cantidad: number;
  agotado?: boolean;
}

export const POS: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [idCliente, setIdCliente] = useState<number | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // States for response & errors
  const [stockError, setStockError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reciboVenta, setReciboVenta] = useState<VentaResponse | null>(null);

  const fetchProductos = async () => {
    try {
      const res = await apiClient.get<Producto[]>('/catalogo/productos');
      setProductos(res.data.filter((p) => p.estado_activo));
    } catch (err: any) {
      setStockError(getErrorMessage(err, 'Error al cargar productos en la caja'));
      toast.error('No se pudo sincronizar el inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = window.setTimeout(() => void fetchProductos(), 0);
    return () => window.clearTimeout(requestId);
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
  };

  const clearCart = () => {
    setCart([]);
    setStockError(null);
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
      setMobileCartOpen(false);
      toast.success(`Venta realizada — Recibo N° ${res.data.id_venta}`);
      fetchProductos();
    } catch (err: any) {
      const isConflict = err.response?.status === 409;
      const msg = getErrorMessage(err, 'Error al procesar la venta');
      setStockError(msg);
      // Q3: Una sola notificación ante 409; el interceptor ya emitió la notificación global
      if (!isConflict) {
        toast.error(msg);
      } else {
        try {
          const res = await apiClient.get<Producto[]>('/catalogo/productos');
          const freshCatalog = res.data;
          setProductos(freshCatalog.filter((p) => p.estado_activo));
          setCart((prevCart) =>
            prevCart.map((item) => {
              const fresh = freshCatalog.find((p) => p.id_producto === item.producto.id_producto);
              const freshStock = fresh ? fresh.stock_actual : 0;
              const isAgotado = freshStock === 0 || item.cantidad > freshStock;
              return {
                ...item,
                producto: fresh ? { ...item.producto, stock_actual: freshStock } : item.producto,
                agotado: isAgotado,
              };
            })
          );
        } catch (refreshErr) {
          console.error('Error al sincronizar inventario tras 409:', refreshErr);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Categorías únicas
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
    <div className="space-y-6 font-['Hanken_Grotesk'] text-[#e2e2e2] relative overflow-hidden">
      {/* Ambient background glows for optical glass refraction */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="spartan-ambient-glow w-[500px] h-[500px] -top-20 -left-36 opacity-30" />
        <div className="spartan-ambient-glow w-[600px] h-[600px] top-[40%] -right-48 opacity-20" />
        <div className="spartan-ambient-glow w-[450px] h-[450px] bottom-10 left-[30%] opacity-15" />
      </div>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-white/10 relative z-10">
        <div>
          <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#e8dc00] block mb-1">
            Punto de Venta
          </span>
          <h1 className="font-['Anybody'] text-2xl md:text-3xl text-white uppercase font-bold tracking-tight">
            Caja
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={() => setMobileCartOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-[#e8dc00] text-black text-xs font-bold font-['JetBrains_Mono'] rounded-xl shadow-md cursor-pointer animate-pulse"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="tabular-nums">{cartTotalItems}</span>
            </button>
          )}



          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-xl text-[11px] font-['JetBrains_Mono'] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Terminal Conectada</span>
          </div>

          <button
            onClick={fetchProductos}
            title="Refrescar catálogo"
            className="flex h-8 w-8 items-center justify-center spartan-glass-subtle text-[#ccc7ab] hover:text-[#e8dc00] hover:border-[#e8dc00]/50 transition-colors cursor-pointer rounded-xl border-white/10"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Grid: Catalog + Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative z-10">
        {/* Left: Product Catalog */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filters with Translucent Glass */}
          <div className="spartan-glass p-4 space-y-3 rounded-2xl shadow-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                placeholder="Buscar suplemento o SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full spartan-glass-input text-xs font-['JetBrains_Mono'] placeholder-[#666] pl-10 pr-4 py-2 outline-none rounded-xl"
              />
            </div>

            <div className="relative">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none flex-nowrap sm:flex-wrap pr-8 sm:pr-0">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3.5 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer rounded-xl shrink-0 ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#e8dc00] text-black shadow-md'
                      : 'spartan-glass-pill text-zinc-300 hover:border-[#e8dc00] hover:text-white'
                  }`}
                >
                  Todos ({productos.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer rounded-xl shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#e8dc00] text-black shadow-md'
                        : 'spartan-glass-pill text-zinc-300 hover:border-[#e8dc00] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[#080808]/90 to-transparent pointer-events-none sm:hidden rounded-r-xl" />
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="flex h-48 items-center justify-center spartan-glass-subtle rounded-2xl">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e8dc00] border-t-transparent" />
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#ccc7ab]">
                  Cargando...
                </span>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center spartan-glass-subtle rounded-2xl">
              <p className="text-sm text-white font-medium">No se encontraron productos</p>
              <p className="text-xs text-[#737373] mt-1">Intenta cambiar los filtros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_actual <= 0;
                const isLowStock = p.stock_actual <= p.stock_seguridad;
                const cartQty = cart.find((it) => it.producto.id_producto === p.id_producto)?.cantidad || 0;
                const pImg = getProductImage(p.codigo_sku, p.categoria?.nombre_categoria, p.imagen_url);

                return (
                  <div
                    key={p.id_producto}
                    role="button"
                    tabIndex={isOutOfStock ? -1 : 0}
                    aria-label={`Añadir ${p.nombre_producto} a la venta. Precio: Bs. ${Number(p.precio_unitario).toFixed(2)}`}
                    aria-disabled={isOutOfStock}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    onKeyDown={(e) => {
                      if (!isOutOfStock && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        addToCart(p);
                      }
                    }}
                    className={`group relative flex flex-col spartan-glass-card p-3.5 transition-all duration-200 rounded-2xl shadow-lg ${
                      isOutOfStock
                        ? 'opacity-40 cursor-not-allowed border-white/5'
                        : 'cursor-pointer'
                    }`}
                  >
                    {/* SKU & Stock */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span 
                        title={`SKU: ${p.codigo_sku}`}
                        className="font-['JetBrains_Mono'] text-[10px] text-[#e8dc00] font-bold truncate cursor-help"
                      >
                        {p.codigo_sku}
                      </span>
                      <span
                        className={`text-[9px] font-['JetBrains_Mono'] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isOutOfStock
                            ? 'bg-red-950/80 text-red-400 border border-red-800/40'
                            : isLowStock
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-700/40'
                            : 'spartan-glass-pill text-[#ccc7ab]'
                        }`}
                      >
                        {isOutOfStock ? 'Agotado' : `${p.stock_actual} uds`}
                      </span>
                    </div>

                    {/* Image */}
                    <div className="relative aspect-square w-full bg-black/40 mb-2 overflow-hidden flex items-center justify-center p-2 rounded-xl border border-white/5">
                      <img
                        src={pImg}
                        alt={p.nombre_producto}
                        title={`SKU: ${p.codigo_sku} • ${p.nombre_producto}`}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                      {cartQty > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-[#e8dc00] text-black font-['JetBrains_Mono'] text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-md">
                          {cartQty}
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    <h3 
                      title={p.nombre_producto}
                      className="font-['Anybody'] text-xs font-bold uppercase text-white line-clamp-2 mb-2 leading-snug group-hover:text-[#e8dc00] transition-colors"
                    >
                      {p.nombre_producto}
                    </h3>

                    {/* Price */}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between mt-auto">
                      <span className="font-['JetBrains_Mono'] text-sm font-black text-white tabular-nums">
                        Bs. {Number(p.precio_unitario).toFixed(2)}
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center spartan-glass-pill text-zinc-300 group-hover:bg-[#e8dc00] group-hover:text-black group-hover:border-[#e8dc00] transition-colors rounded-lg">
                        <Plus className="h-3 w-3 stroke-[2.5]" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Cart (Desktop only, sticky side panel) */}
        <div
          id="pos-cart-panel"
          className="hidden lg:block spartan-glass p-5 relative lg:sticky lg:top-20 rounded-3xl shadow-2xl scroll-mt-24 border-white/15"
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-[#e8dc00]" />
              <h2 className="font-['Anybody'] text-lg text-white uppercase font-bold tracking-tight">
                Orden
              </h2>
              {cart.length > 0 && (
                <span className="bg-[#e8dc00] text-black font-['JetBrains_Mono'] text-[10px] font-black px-2 py-0.5 rounded-full shadow-md tabular-nums">
                  {cartTotalItems}
                </span>
              )}
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                aria-label="Vaciar carrito de compras"
                className="font-['JetBrains_Mono'] text-[10px] text-white/70 hover:text-white uppercase transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-red-950/30"
              >
                Vaciar
              </button>
            )}
          </div>

          {/* Stock Error */}
          {stockError && (
            <div className="mb-4 flex items-start gap-2 border border-red-500/40 bg-red-950/20 p-3 text-xs text-red-300 rounded-xl">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
              <span>{stockError}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="mb-4">
            <label className="block font-['JetBrains_Mono'] text-[10px] text-zinc-300 uppercase mb-1.5 flex items-center gap-1 font-bold">
              <User className="h-3 w-3 text-[#e8dc00]" />
              <span>Cliente</span>
            </label>
            <select
              value={idCliente || ''}
              onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : null)}
              className="w-full spartan-glass-input py-2.5 px-3 text-xs font-['JetBrains_Mono'] outline-none cursor-pointer rounded-xl"
            >
              <option value="" className="bg-[#121212] text-white">Consumidor Final</option>
            </select>
          </div>

          {/* Cart Items */}
          <div className="overflow-y-auto max-h-72 divide-y divide-white/10 mb-4 border-y border-white/10 pr-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingCart className="h-6 w-6 text-[#333] mx-auto mb-2" />
                <p className="text-xs text-zinc-400">Agrega productos para generar la venta.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.producto.id_producto}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.18 }}
                    className="py-3 flex items-center justify-between gap-2"
                  >
                    <img
                      src={getProductImage(item.producto.codigo_sku, item.producto.categoria?.nombre_categoria, item.producto.imagen_url)}
                      alt={item.producto.nombre_producto}
                      className="h-9 w-9 object-contain p-0.5 bg-black/60 border border-white/10 rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-['Anybody'] text-[11px] font-bold text-white uppercase truncate">
                        {item.producto.nombre_producto}
                      </p>
                      <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-300 tabular-nums">
                        Bs. {Number(item.producto.precio_unitario).toFixed(2)} c/u
                      </span>
                      {item.agotado && (
                        <span className="block mt-1 text-[9px] font-['JetBrains_Mono'] text-red-300 bg-red-950/80 border border-red-500/50 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                          [Agotado] Stock disp: {item.producto.stock_actual}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.producto.id_producto, -1)}
                        aria-label={`Disminuir cantidad de ${item.producto.nombre_producto}`}
                        className="flex h-6 w-6 items-center justify-center spartan-glass-pill text-zinc-300 hover:border-[#e8dc00] hover:text-white transition-colors cursor-pointer rounded-lg"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="font-['JetBrains_Mono'] text-xs font-bold text-white w-5 text-center tabular-nums">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.producto.id_producto, 1)}
                        aria-label={`Aumentar cantidad de ${item.producto.nombre_producto}`}
                        className="flex h-6 w-6 items-center justify-center spartan-glass-pill text-zinc-300 hover:border-[#e8dc00] hover:text-white transition-colors cursor-pointer rounded-lg"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.producto.id_producto)}
                        aria-label={`Eliminar ${item.producto.nombre_producto} del carrito`}
                        className="p-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1.5 mb-4 pt-3 border-t border-white/[0.06]">
            <div className="flex justify-between items-center gap-2 text-xs text-[#a3a3a3]">
              <span>Subtotal:</span>
              <span className="tabular-nums font-mono font-medium text-white">Bs. {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-baseline gap-2 pt-2 border-t border-white/[0.08]">
              <span className="text-sm uppercase text-white font-bold tracking-tight">Total:</span>
              <span className="font-mono text-xl font-bold text-white tabular-nums">
                Bs. {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Checkout */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            aria-label="Cobrar y Emitir Venta"
            className="flex w-full items-center justify-center gap-2 spartan-btn-primary py-3.5 text-xs cursor-pointer disabled:opacity-30 disabled:pointer-events-none rounded-xl shadow-lg"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Procesando...</span>
              </div>
            ) : (
              <>
                <span className="font-bold">COBRAR Bs. {cartTotal.toFixed(2)}</span>
                <span className="sr-only">Emitir Venta</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Sticky Bottom Bar for Mobile Viewports (< lg) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 spartan-glass border-[#e8dc00]/60 p-3 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.95)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#e8dc00] text-black flex items-center justify-center font-bold shadow-md shrink-0">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-300 block leading-none tabular-nums">
                {cartTotalItems} {cartTotalItems === 1 ? 'unidad' : 'unidades'}
              </span>
              <span className="font-['JetBrains_Mono'] text-sm font-black text-[#e8dc00] tabular-nums">
                Bs. {cartTotal.toFixed(2)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileCartOpen(true)}
            className="spartan-btn-primary px-4 py-2 text-xs flex items-center gap-1.5 rounded-xl cursor-pointer shadow-md shrink-0"
          >
            <span>Ver Orden</span>
            <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Sheet Drawer (< lg) */}
      <AnimatePresence>
        {mobileCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileCartOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 spartan-glass border-t border-white/20 rounded-t-3xl p-5 shadow-[0_-15px_40px_rgba(0,0,0,0.85)] max-h-[86vh] flex flex-col lg:hidden"
            >
              {/* Handle bar */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-[#e8dc00]" />
                  <h2 className="font-['Anybody'] text-base text-white uppercase font-bold tracking-tight">
                    Orden de Venta
                  </h2>
                  {cart.length > 0 && (
                    <span className="bg-[#e8dc00] text-black font-['JetBrains_Mono'] text-[10px] font-black px-2 py-0.5 rounded-full shadow-md tabular-nums">
                      {cartTotalItems}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      aria-label="Vaciar carrito de compras"
                      className="font-['JetBrains_Mono'] text-[10px] text-white/70 hover:text-white uppercase transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-red-950/30"
                    >
                      Vaciar
                    </button>
                  )}
                  <button
                    onClick={() => setMobileCartOpen(false)}
                    aria-label="Cerrar carrito"
                    className="p-1.5 text-zinc-400 hover:text-white rounded-full bg-white/5 border border-white/10 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Stock Error */}
              {stockError && (
                <div className="mb-3 flex items-start gap-2 border border-red-500/40 bg-red-950/20 p-2.5 text-xs text-red-300 rounded-xl shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
                  <span>{stockError}</span>
                </div>
              )}

              {/* Customer Selection */}
              <div className="mb-3 shrink-0">
                <label className="block font-['JetBrains_Mono'] text-[10px] text-zinc-300 uppercase mb-1 flex items-center gap-1 font-bold">
                  <User className="h-3 w-3 text-[#e8dc00]" />
                  <span>Cliente</span>
                </label>
                <select
                  value={idCliente || ''}
                  onChange={(e) => setIdCliente(e.target.value ? Number(e.target.value) : null)}
                  className="w-full spartan-glass-input py-2 px-3 text-xs font-['JetBrains_Mono'] outline-none cursor-pointer rounded-xl"
                >
                  <option value="" className="bg-[#121212] text-white">Consumidor Final</option>
                </select>
              </div>

              {/* Items list */}
              <div className="overflow-y-auto flex-1 divide-y divide-white/10 mb-3 border-y border-white/10 pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center">
                    <ShoppingCart className="h-6 w-6 text-[#333] mx-auto mb-2" />
                    <p className="text-xs text-zinc-400">Agrega productos para generar la venta.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={`mobile-cart-${item.producto.id_producto}`}
                      className="py-2.5 flex items-center justify-between gap-2"
                    >
                      <img
                        src={getProductImage(item.producto.codigo_sku, item.producto.categoria?.nombre_categoria, item.producto.imagen_url)}
                        alt={item.producto.nombre_producto}
                        className="h-9 w-9 object-contain p-0.5 bg-black/60 border border-white/10 rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-['Anybody'] text-[11px] font-bold text-white uppercase truncate">
                          {item.producto.nombre_producto}
                        </p>
                        <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-300 tabular-nums">
                          Bs. {Number(item.producto.precio_unitario).toFixed(2)} c/u
                        </span>
                        {item.agotado && (
                          <span className="block mt-1 text-[9px] font-['JetBrains_Mono'] text-red-300 bg-red-950/80 border border-red-500/50 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                            [Agotado] Stock disp: {item.producto.stock_actual}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.producto.id_producto, -1)}
                          aria-label={`Disminuir cantidad de ${item.producto.nombre_producto}`}
                          className="flex h-6 w-6 items-center justify-center spartan-glass-pill text-zinc-300 hover:border-[#e8dc00] hover:text-white transition-colors cursor-pointer rounded-lg"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-['JetBrains_Mono'] text-xs font-bold text-white w-5 text-center tabular-nums">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.producto.id_producto, 1)}
                          aria-label={`Aumentar cantidad de ${item.producto.nombre_producto}`}
                          className="flex h-6 w-6 items-center justify-center spartan-glass-pill text-zinc-300 hover:border-[#e8dc00] hover:text-white transition-colors cursor-pointer rounded-lg"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.producto.id_producto)}
                          aria-label={`Eliminar ${item.producto.nombre_producto} del carrito`}
                          className="p-1 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals & Checkout */}
              <div className="space-y-2 mb-3 shrink-0">
                <div className="flex justify-between font-['JetBrains_Mono'] text-[11px] text-zinc-300">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">Bs. {cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                  <span className="font-['Anybody'] text-sm uppercase text-white font-bold">Total:</span>
                  <span className="font-['JetBrains_Mono'] text-xl font-black text-[#e8dc00] tabular-nums">
                    Bs. {cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
                className="flex w-full items-center justify-center gap-2 spartan-btn-primary py-3 text-xs cursor-pointer disabled:opacity-30 disabled:pointer-events-none rounded-xl shadow-lg shrink-0"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                    <span>Procesando...</span>
                  </div>
                ) : (
                  <>
                    <span>Emitir Venta</span>
                    <ArrowRight className="h-3.5 w-3.5 stroke-[3]" />
                  </>
                )}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Recibo */}
      <ReceiptModal recibo={reciboVenta} onClose={() => setReciboVenta(null)} />
    </div>
  );
};
