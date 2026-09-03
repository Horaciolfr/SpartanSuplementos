import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import type { Producto, Categoria } from '../types';
import { getErrorMessage } from '../utils/errors';
import { Package, Plus, Search, Layers, RefreshCw, AlertCircle, CheckCircle2, Trash2, X } from 'lucide-react';
import { getProductImage } from '../utils/productImages';

export const Catalogo: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  // Form states
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(0);
  const [precio, setPrecio] = useState<string>('');
  const [stock, setStock] = useState<string>('50');
  const [stockSeguridad, setStockSeguridad] = useState<string>('10');
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get<Producto[]>('/catalogo/productos'),
        apiClient.get<Categoria[]>('/catalogo/categorias'),
      ]);
      setProductos(prodRes.data);
      setCategorias(catRes.data);
      if (catRes.data.length > 0) {
        setCategoriaId((prev) => (prev === 0 ? catRes.data[0].id_categoria : prev));
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al cargar datos del catálogo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewProductModal = () => {
    if (categorias.length > 0 && categoriaId === 0) {
      setCategoriaId(categorias[0].id_categoria);
    }
    setShowProductModal(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const priceNum = parseFloat(precio);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('El precio unitario debe ser un número mayor a 0');
      return;
    }

    const targetCatId = categoriaId !== 0 ? categoriaId : categorias[0]?.id_categoria;
    if (!targetCatId) {
      setError('Debes crear o seleccionar al menos una categoría válida antes de registrar un producto');
      return;
    }

    try {
      await apiClient.post('/catalogo/productos', {
        id_categoria: targetCatId,
        codigo_sku: sku.trim(),
        nombre_producto: nombre.trim(),
        precio_unitario: priceNum,
        stock_actual: parseInt(stock, 10) || 0,
        stock_seguridad: parseInt(stockSeguridad, 10) || 0,
        estado_activo: true,
      });
      setSuccess(`Producto ${sku} registrado exitosamente`);
      setShowProductModal(false);
      // Reset form
      setSku('');
      setNombre('');
      setPrecio('');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al crear producto'));
    }
  };

  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nuevaCatNombre.trim()) {
      setError('El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      await apiClient.post('/catalogo/categorias', {
        nombre_categoria: nuevaCatNombre.trim(),
      });
      setSuccess(`Categoría "${nuevaCatNombre}" creada exitosamente`);
      setNuevaCatNombre('');
      setShowCatModal(false);
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al crear categoría'));
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Confirmas la desactivación de este producto?')) return;
    try {
      await apiClient.delete(`/catalogo/productos/${id}`);
      setSuccess('Producto desactivado exitosamente');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al desactivar producto'));
    }
  };

  const filteredProducts = productos.filter((p) => {
    const matchesSearch =
      p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || p.id_categoria === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8 font-['Hanken_Grotesk'] text-[#e2e2e2]">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#1A1A1A] pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-6 w-6 text-[#f2e500]" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
              Control Maestro de Inventario
            </span>
          </div>
          <h1 className="font-['Anybody'] text-3xl md:text-4xl text-white uppercase font-bold tracking-tight">
            Inventario & Catálogo
          </h1>
          <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab] mt-1">
            Gestión centralizada de SKUs, precios y stock de seguridad de Spartan Suplementos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowCatModal(true)}
            className="flex items-center justify-center gap-2 bg-[#141414] border border-[#2a2a2a] px-4 py-3 text-xs font-['JetBrains_Mono'] uppercase font-bold text-[#ccc7ab] hover:border-[#f2e500] hover:text-white transition-colors cursor-pointer"
          >
            <Layers className="h-4 w-4 text-[#f2e500]" />
            <span>Nueva Categoría</span>
          </button>

          <button
            onClick={openNewProductModal}
            className="flex items-center justify-center gap-2 bg-[#f2e500] text-black px-6 py-3 text-xs font-['JetBrains_Mono'] uppercase font-black hover:bg-white transition-colors cursor-pointer shadow-md"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Nuevo Producto</span>
          </button>

          <button
            onClick={fetchData}
            title="Refrescar catálogo"
            className="flex h-11 w-11 items-center justify-center border border-[#1A1A1A] bg-black text-[#ccc7ab] hover:text-[#f2e500] transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#f2e500]' : ''}`} />
          </button>
        </div>
      </header>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between border border-red-500/40 bg-red-950/20 p-4 text-xs text-red-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase underline hover:text-white">
            Cerrar
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between border border-emerald-500/40 bg-emerald-950/20 p-4 text-xs text-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase underline hover:text-white">
            Cerrar
          </button>
        </div>
      )}

      {/* Search & Filters Controls */}
      <section className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-[#131313] p-5 border border-[#1A1A1A]">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#ccc7ab]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por SKU o nombre..."
            className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white pl-10 pr-4 py-2.5 text-xs outline-none font-['Hanken_Grotesk'] placeholder-gray-600 transition-colors"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setSelectedCat('ALL')}
            className={`px-4 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-colors ${
              selectedCat === 'ALL'
                ? 'bg-[#f2e500] text-black'
                : 'bg-black border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
            }`}
          >
            Todos ({productos.length})
          </button>
          {categorias.map((c) => (
            <button
              key={c.id_categoria}
              onClick={() => setSelectedCat(c.id_categoria)}
              className={`px-4 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-colors ${
                selectedCat === c.id_categoria
                  ? 'bg-[#f2e500] text-black'
                  : 'bg-black border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
              }`}
            >
              {c.nombre_categoria}
            </button>
          ))}
        </div>
      </section>

      {/* Data Table (Bento Style) */}
      <div className="border border-[#1A1A1A] bg-[#0D0D0D] overflow-hidden w-full shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1A1A1A] bg-[#080808]">
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider">Código SKU</th>
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider">Producto</th>
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider">Categoría</th>
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider text-right">Precio</th>
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider">Stock (Nivel)</th>
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider text-center">Estado</th>
                <th className="p-5 font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#ccc7ab]">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-6 w-6 animate-spin border-2 border-[#f2e500] border-t-transparent rounded-full" />
                      <span className="font-['JetBrains_Mono'] text-xs uppercase">Cargando datos del inventario...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-500 font-['Hanken_Grotesk'] text-sm">
                    No se encontraron productos registrados con el criterio de búsqueda.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock_actual <= 0;
                  const isLowStock = p.stock_actual <= p.stock_seguridad;
                  const stockPercent = Math.min(100, Math.max(10, (p.stock_actual / (p.stock_seguridad * 3 || 30)) * 100));

                  return (
                    <tr key={p.id_producto} className="hover:bg-[#111111] transition-colors group">
                      {/* SKU */}
                      <td className="p-5 font-['JetBrains_Mono'] font-bold text-[#f2e500]">
                        {p.codigo_sku}
                      </td>

                      {/* Producto */}
                      <td className="p-5 font-bold text-white group-hover:text-[#f2e500] transition-colors">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={getProductImage(p.codigo_sku, p.categoria?.nombre_categoria, p.imagen_url)}
                            alt={p.nombre_producto}
                            className="h-11 w-11 object-contain p-0.5 bg-black border border-[#2a2a2a] shrink-0 group-hover:border-[#f2e500]/50 transition-colors"
                          />
                          <div>
                            <span className="block">{p.nombre_producto}</span>
                            <span className="text-[10px] font-['JetBrains_Mono'] text-[#737373] uppercase block font-normal">
                              Lote Certificado PG
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Categoría */}
                      <td className="p-5">
                        <span className="px-2.5 py-1 bg-black border border-[#2a2a2a] text-[#ccc7ab] font-['JetBrains_Mono'] text-[10px] uppercase">
                          {p.categoria?.nombre_categoria || 'N/A'}
                        </span>
                      </td>

                      {/* Precio */}
                      <td className="p-5 text-right font-['Anybody'] text-sm font-bold text-white">
                        Bs. {Number(p.precio_unitario).toFixed(2)}
                      </td>

                      {/* Stock Level Bar */}
                      <td className="p-5 w-64">
                        <div className="flex items-center justify-between mb-1.5 font-['JetBrains_Mono'] text-[11px]">
                          <span className={isOutOfStock ? 'text-red-400 font-bold' : isLowStock ? 'text-amber-300 font-bold' : 'text-white font-bold'}>
                            {p.stock_actual} uds
                          </span>
                          <span className={isOutOfStock ? 'text-red-400' : isLowStock ? 'text-amber-300' : 'text-emerald-400'}>
                            {isOutOfStock ? 'Agotado' : isLowStock ? 'Crítico' : 'Óptimo'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1A1A1A]">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isOutOfStock
                                ? 'bg-red-500 w-full'
                                : isLowStock
                                ? 'bg-amber-400'
                                : 'bg-[#f2e500]'
                            }`}
                            style={{ width: `${isOutOfStock ? 100 : stockPercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-['JetBrains_Mono'] text-gray-500 block mt-1">
                          Seguridad: {p.stock_seguridad} uds
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="p-5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-['JetBrains_Mono'] uppercase font-bold ${
                            p.estado_activo
                              ? 'border border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                              : 'border border-gray-700 text-gray-400 bg-black'
                          }`}
                        >
                          {p.estado_activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="p-5 text-right">
                        <button
                          onClick={() => handleDeleteProduct(p.id_producto)}
                          title="Desactivar producto"
                          className="border border-[#1A1A1A] bg-black p-2 text-[#ccc7ab] hover:border-red-500/50 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info bar */}
        <div className="p-4 flex items-center justify-between bg-[#080808] border-t border-[#1A1A1A] font-['JetBrains_Mono'] text-[11px] text-[#ccc7ab]">
          <span>MOSTRANDO {filteredProducts.length} DE {productos.length} PRODUCTOS REGISTRADOS</span>
          <span className="text-gray-500 uppercase">Spartan Logistics Engine</span>
        </div>
      </div>

      {/* Modal: Crear Producto */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-[#1A1A1A] bg-[#0D0D0D] p-8 shadow-2xl relative text-xs">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500]" />

            <div className="flex justify-between items-center mb-6">
              <h2 className="font-['Anybody'] text-xl uppercase font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#f2e500]" />
                <span>Registrar Nuevo Producto</span>
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Código SKU
                </label>
                <input
                  type="text"
                  required
                  placeholder="SKU-PROT-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['JetBrains_Mono']"
                />
              </div>

              <div>
                <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  required
                  placeholder="100% WHEY GOLD STANDARD 5LBS"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['Hanken_Grotesk']"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(Number(e.target.value))}
                    className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['Hanken_Grotesk']"
                  >
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria} className="bg-[#141414] text-white">
                        {c.nombre_categoria}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Precio Unitario (Bs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="250.00"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['JetBrains_Mono']"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['JetBrains_Mono']"
                  />
                </div>

                <div>
                  <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Stock de Seguridad
                  </label>
                  <input
                    type="number"
                    required
                    value={stockSeguridad}
                    onChange={(e) => setStockSeguridad(e.target.value)}
                    className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['JetBrains_Mono']"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[#1A1A1A] mt-6">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="border border-[#2a2a2a] px-4 py-2.5 font-['JetBrains_Mono'] text-xs font-bold text-[#ccc7ab] hover:bg-[#1A1A1A] hover:text-white uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#f2e500] text-black px-6 py-2.5 font-['JetBrains_Mono'] text-xs font-black uppercase hover:bg-white transition-colors cursor-pointer shadow-md"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Categoría */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-[#1A1A1A] bg-[#0D0D0D] p-8 shadow-2xl relative text-xs">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500]" />

            <div className="flex justify-between items-center mb-6">
              <h2 className="font-['Anybody'] text-xl uppercase font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-[#f2e500]" />
                <span>Nueva Categoría</span>
              </h2>
              <button
                onClick={() => setShowCatModal(false)}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategoria} className="space-y-4">
              <div>
                <label className="block font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  required
                  placeholder="AMINOÁCIDOS & BCAA"
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value.toUpperCase())}
                  className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-3.5 py-2.5 text-xs outline-none font-['JetBrains_Mono']"
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-[#1A1A1A] mt-6">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="border border-[#2a2a2a] px-4 py-2.5 font-['JetBrains_Mono'] text-xs font-bold text-[#ccc7ab] hover:bg-[#1A1A1A] hover:text-white uppercase transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#f2e500] text-black px-6 py-2.5 font-['JetBrains_Mono'] text-xs font-black uppercase hover:bg-white transition-colors cursor-pointer shadow-md"
                >
                  Crear Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
