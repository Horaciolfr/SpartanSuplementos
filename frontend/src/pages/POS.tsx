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
  CheckCircle2,
  AlertTriangle,
  Printer,
  User,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { getProductImage } from '../utils/productImages';

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
      // Mostrar solo productos activos
      setProductos(res.data.filter((p) => p.estado_activo));
    } catch (err: any) {
      setStockError(getErrorMessage(err, 'Error al cargar productos para la terminal'));
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
        return prev.map((item) =>
          item.producto.id_producto === producto.id_producto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
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
      // Éxito: el backend entrega el total calculado autoritativo y los detalles
      setReciboVenta(res.data);
      clearCart();
      // Refrescar productos desde el backend para ver stock actualizado
      fetchProductos();
    } catch (err: any) {
      setStockError(getErrorMessage(err, 'Error al procesar la venta'));
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
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
              Terminal Transaccional POS
            </span>
          </div>
          <h1 className="font-['Anybody'] text-3xl md:text-4xl text-white uppercase font-bold tracking-tight">
            Punto de Venta Spartan
          </h1>
          <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab] mt-1">
            Facturación rápida, cobro seguro y decremento atómico de Kárdex físico en PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 border border-[#1A1A1A] bg-[#0D0D0D] px-4 py-2.5">
            <ShieldCheck className="h-4 w-4 text-[#f2e500]" />
            <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab]">
              Motor ACID: <strong className="text-white">Conectado</strong>
            </span>
          </div>

          <button
            onClick={fetchProductos}
            title="Refrescar catálogo y existencias"
            className="flex h-11 w-11 items-center justify-center border border-[#1A1A1A] bg-black text-[#ccc7ab] hover:text-[#f2e500] hover:border-[#f2e500]/40 transition-colors cursor-pointer"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin text-[#f2e500]' : ''}`} />
          </button>
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="BUSCAR POR NOMBRE DE PRODUCTO O CÓDIGO SKU..."
                className="w-full border border-[#2a2a2a] bg-black py-3 pl-11 pr-4 text-xs font-['JetBrains_Mono'] text-white placeholder-[#737373] outline-none focus:border-[#f2e500] transition-colors uppercase"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1A1A1A]">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-colors cursor-pointer ${
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
                  className={`px-3.5 py-1.5 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-colors cursor-pointer ${
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
                  Consultando existencias en PostgreSQL...
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredProducts.map((p) => {
                const isLow = p.stock_actual <= p.stock_seguridad;
                const isOut = p.stock_actual === 0;

                return (
                  <div
                    key={p.id_producto}
                    className="bg-[#0D0D0D] border border-[#1A1A1A] hover:border-[#f2e500]/60 transition-all p-5 flex flex-col justify-between group relative overflow-hidden shadow-lg"
                  >
                    {/* Top corner accent line */}
                    <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#f2e500] group-hover:w-full transition-all duration-300" />

                    {/* Product Image Preview */}
                    <div className="relative aspect-[16/10] w-full bg-black overflow-hidden mb-3 img-vignette">
                      <img
                        src={getProductImage(p.codigo_sku, p.categoria?.nombre_categoria)}
                        alt={p.nombre_producto}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 font-['JetBrains_Mono'] text-[9px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          isOut
                            ? 'bg-red-950/80 text-red-400 border border-red-500/40'
                            : isLow
                            ? 'bg-amber-950/80 text-[#f2e500] border border-[#f2e500]/40'
                            : 'bg-black/80 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {isOut ? 'SIN STOCK' : `${p.stock_actual} UDS`}
                      </span>
                    </div>

                    <div>
                      {/* SKU & Stock Tag */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#f2e500] uppercase tracking-wider">
                          [{p.codigo_sku}]
                        </span>
                        <span className="font-['JetBrains_Mono'] text-[10px] text-[#ccc7ab] uppercase tracking-wider">
                          {p.categoria?.nombre_categoria || 'GENERAL'}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h3 className="font-['Anybody'] text-base font-bold text-white uppercase tracking-tight group-hover:text-[#f2e500] transition-colors line-clamp-2 mb-1">
                        {p.nombre_producto}
                      </h3>
                    </div>

                    {/* Price and Add to Cart Action */}
                    <div className="pt-4 border-t border-[#1A1A1A] flex items-center justify-between mt-3">
                      <div>
                        <span className="block font-['JetBrains_Mono'] text-[9px] uppercase tracking-widest text-[#737373]">
                          Precio Unitario
                        </span>
                        <span className="font-['JetBrains_Mono'] text-lg font-black text-white">
                          Bs. {Number(p.precio_unitario).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => addToCart(p)}
                        disabled={isOut}
                        className="flex items-center gap-1.5 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs font-black uppercase px-3.5 py-2 hover:bg-white transition-colors cursor-pointer shadow-md disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Agregar</span>
                      </button>
                    </div>
                  </div>
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
                  Rechazo Transaccional
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

          {/* Cart Itemized List */}
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
              cart.map((item) => (
                <div key={item.producto.id_producto} className="py-3.5 flex items-center justify-between gap-3">
                  <img
                    src={getProductImage(item.producto.codigo_sku, item.producto.categoria?.nombre_categoria)}
                    alt={item.producto.nombre_producto}
                    className="h-10 w-10 object-cover border border-[#2a2a2a] shrink-0"
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
                    <button
                      onClick={() => updateQuantity(item.producto.id_producto, -1)}
                      className="flex h-7 w-7 items-center justify-center border border-[#2a2a2a] bg-[#141414] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white transition-colors cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-['JetBrains_Mono'] text-xs font-bold text-white w-6 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.producto.id_producto, 1)}
                      className="flex h-7 w-7 items-center justify-center border border-[#2a2a2a] bg-[#141414] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.producto.id_producto)}
                      title="Quitar ítem"
                      className="p-1 text-[#737373] hover:text-red-400 transition-colors ml-1 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
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
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            className="flex w-full items-center justify-center gap-2 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs font-black uppercase tracking-wider py-4 hover:bg-white transition-colors cursor-pointer shadow-xl disabled:opacity-30 disabled:pointer-events-none"
          >
            {submitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span>Bloqueando stock en PostgreSQL...</span>
              </div>
            ) : (
              <>
                <span>Emitir Venta & Recibo</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </>
            )}
          </button>

          <p className="mt-3 text-[10px] font-['JetBrains_Mono'] text-[#737373] text-center uppercase tracking-wider">
            * Transacción atómica garantizada con SELECT FOR UPDATE en Kárdex.
          </p>
        </div>
      </div>

      {/* Official Certified Thermal Receipt Modal */}
      {reciboVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-[#1A1A1A] p-6 shadow-2xl relative">
            {/* Top Yellow Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500]" />

            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1A1A1A] mb-5">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-['Anybody'] text-base font-bold text-white uppercase tracking-tight">
                  Transacción Certificada
                </h3>
              </div>
              <span className="bg-emerald-950/50 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 font-['JetBrains_Mono'] text-[10px] font-bold uppercase">
                {reciboVenta.estado_pago}
              </span>
            </div>

            {/* Thermal Receipt Body */}
            <div className="bg-black border border-[#2a2a2a] p-5 space-y-3 font-['JetBrains_Mono'] text-xs mb-5">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-[#333]">
                <span className="font-['Anybody'] text-lg font-black text-[#f2e500] italic tracking-tight block">
                  SPARTAN BOLIVIA
                </span>
                <span className="text-[10px] text-[#737373] block uppercase tracking-widest">
                  Comprobante Oficial de Venta
                </span>
              </div>

              {/* Receipt Metadata */}
              <div className="space-y-1 text-[11px] pb-3 border-b border-dashed border-[#333]">
                <div className="flex justify-between">
                  <span className="text-[#737373]">N° RECIBO:</span>
                  <span className="font-bold text-[#f2e500]">{reciboVenta.numero_recibo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">ID TRANSACCIÓN:</span>
                  <span className="text-white font-bold">#{reciboVenta.id_venta}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">CAJERO:</span>
                  <span className="text-white">{reciboVenta.cajero}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">CLIENTE:</span>
                  <span className="text-white">{reciboVenta.cliente || 'Consumidor Final'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#737373]">FECHA / HORA:</span>
                  <span className="text-white">
                    {new Date(reciboVenta.fecha_hora_venta).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2 py-2 border-b border-dashed border-[#333] max-h-48 overflow-y-auto">
                {reciboVenta.detalles.map((d) => (
                  <div key={d.id_detalle_venta} className="flex justify-between items-start text-[11px]">
                    <div>
                      <span className="text-white font-bold block">{d.nombre_producto}</span>
                      <span className="text-[10px] text-[#737373]">
                        {d.cantidad} x Bs. {d.precio_historico.toFixed(2)} ({d.codigo_sku})
                      </span>
                    </div>
                    <span className="font-bold text-white">
                      Bs. {d.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Certified */}
              <div className="flex justify-between items-baseline pt-2">
                <span className="font-['Anybody'] text-sm uppercase text-white font-bold">
                  TOTAL CERTIFICADO:
                </span>
                <span className="text-xl font-black text-[#f2e500]">
                  Bs. {reciboVenta.total_transaccion.toFixed(2)}
                </span>
              </div>

              {/* Security Hash stub */}
              <div className="text-center pt-3 border-t border-dashed border-[#333]">
                <p className="text-[9px] text-[#555] tracking-widest uppercase">
                  ||||| | |||| || |||||| | ||||| ||||
                </p>
                <p className="text-[9px] text-[#737373] mt-1">
                  KÁRDEX FÍSICO ACTUALIZADO VÍA TRIGGER PG
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 border border-[#2a2a2a] bg-[#141414] py-3 text-xs font-['JetBrains_Mono'] uppercase font-bold text-[#ccc7ab] hover:border-[#f2e500] hover:text-white transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Imprimir</span>
              </button>
              <button
                onClick={() => setReciboVenta(null)}
                className="flex-1 bg-[#f2e500] text-black py-3 text-xs font-['JetBrains_Mono'] uppercase font-black hover:bg-white transition-colors cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
