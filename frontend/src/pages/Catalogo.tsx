import React, { useCallback, useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import type { Producto, Categoria } from '../types';
import { getErrorMessage } from '../utils/errors';
import {
  Plus,
  Search,
  LayoutGrid,
  Table,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import {
  Navbar,
  ProductCard,
  ProductDetailModal,
  CreateProductModal,
  CreateCategoryModal,
  InventoryTable,
} from '../components';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export const Catalogo: React.FC = () => {
  const { role } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');

  // View Mode: 'SECTIONS' (Public categorized showcase) vs 'TABLE' (Admin Inventory Manager)
  const [viewMode, setViewMode] = useState<'SECTIONS' | 'TABLE'>('SECTIONS');

  // Product Detail Modal
  const [selectedProductModal, setSelectedProductModal] = useState<Producto | null>(null);

  // Admin Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  // Admin Form states
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState<number>(0);
  const [precio, setPrecio] = useState<string>('');
  const [stock, setStock] = useState<string>('50');
  const [stockSeguridad, setStockSeguridad] = useState<string>('10');
  const [nuevaCatNombre, setNuevaCatNombre] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    try {
      const prodRes = await apiClient.get<Producto[]>('/catalogo/productos');
      const active = prodRes.data.filter((p) => p.estado_activo);
      setProductos(active);

      const catMap = new Map<number, Categoria>();
      active.forEach((p) => {
        if (p.categoria) {
          catMap.set(p.categoria.id_categoria, p.categoria);
        }
      });
      const derived = Array.from(catMap.values());
      setCategorias(derived);

      if (derived.length > 0) {
        setCategoriaId(derived[0].id_categoria);
      }

      // Si es administrador, intentar cargar catálogo administrativo para el formulario
      if (role === 'ADMINISTRADOR') {
        try {
          const catRes = await apiClient.get<Categoria[]>('/catalogo/categorias');
          if (catRes.data?.length > 0) {
            setCategorias(catRes.data);
          }
        } catch {
          // Mantener categorías derivadas
        }
      }
    } catch (err: any) {
      setCatalogError(getErrorMessage(err, 'No pudimos conectar con el catálogo.'));
      toast.error(getErrorMessage(err, 'Error al cargar catálogo'));
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    const requestId = window.setTimeout(() => void fetchData(), 0);
    return () => window.clearTimeout(requestId);
  }, [fetchData]);

  // Manejador de creación de producto (Admin)
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(precio);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('El precio unitario debe ser un número mayor a 0');
      return;
    }

    const targetCatId = categoriaId !== 0 ? categoriaId : categorias[0]?.id_categoria;
    if (!targetCatId) {
      toast.error('Debes crear o seleccionar al menos una categoría válida antes de registrar un producto');
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
      toast.success(`Producto ${sku} registrado exitosamente`);
      setShowProductModal(false);
      setSku('');
      setNombre('');
      setPrecio('');
      fetchData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Error al crear producto'));
    }
  };

  // Manejador de creación de categoría (Admin)
  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevaCatNombre.trim()) {
      toast.error('El nombre de la categoría no puede estar vacío');
      return;
    }

    try {
      await apiClient.post('/catalogo/categorias', {
        nombre_categoria: nuevaCatNombre.trim(),
      });
      toast.success(`Categoría "${nuevaCatNombre}" creada exitosamente`);
      setNuevaCatNombre('');
      setShowCatModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Error al crear categoría'));
    }
  };

  // Desactivación de producto (Admin)
  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('¿Confirmas la desactivación de este producto?')) return;
    try {
      await apiClient.delete(`/catalogo/productos/${id}`);
      toast.success('Producto desactivado exitosamente');
      fetchData();
    } catch (err: any) {
      toast.error(getErrorMessage(err, 'Error al desactivar producto'));
    }
  };

  // Filtrado de productos por búsqueda
  const filteredProducts = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch =
        p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.categoria?.nombre_categoria || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCat === 'ALL' || p.id_categoria === selectedCat;
      return matchSearch && matchCategory;
    });
  }, [productos, search, selectedCat]);

  // Agrupación por Secciones de Categoría
  const categorizedSections = useMemo(() => {
    const groups: { [catName: string]: { cat: Categoria | null; items: Producto[] } } = {};

    filteredProducts.forEach((p) => {
      const catName = p.categoria?.nombre_categoria || 'OTRAS CATEGORÍAS';
      if (!groups[catName]) {
        groups[catName] = { cat: p.categoria || null, items: [] };
      }
      groups[catName].items.push(p);
    });

    const preferredOrder = [
      'CREATINAS & FUERZA',
      'SUPLEMENTOS PROTEICOS',
      'PRE-ENTRENOS & ENERGIA',
      'GANADORES DE MASA (MASS GAINERS)',
      'AMINOACIDOS & RECUPERACION',
      'QUEMADORES & DEFINICION',
      'SALUD, VITAMINAS & ARTICULACIONES',
    ];

    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const idxA = preferredOrder.indexOf(a);
      const idxB = preferredOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((k) => ({
      categoryName: k,
      category: groups[k].cat,
      items: groups[k].items,
    }));
  }, [filteredProducts]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#e2e2e2] flex flex-col font-['Hanken_Grotesk'] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="spartan-ambient-glow w-[600px] h-[600px] -top-32 -right-32 opacity-25" />
      <div className="spartan-ambient-glow w-[500px] h-[500px] top-1/2 -left-48 opacity-20" />
      <div className="spartan-ambient-glow w-[600px] h-[600px] -bottom-32 right-1/4 opacity-20" />

      <Navbar />

      <main id="contenido-principal" tabIndex={-1} className="flex-1 max-w-[1280px] mx-auto px-6 py-8 w-full relative z-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 pb-6 border-b border-[#1A1A1A]">
          <div>
            <h1 className="font-['Anybody'] text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
              Productos
            </h1>
            <p className="text-sm text-[#ccc7ab] mt-1">
              Consulta productos, precios y disponibilidad registrada.
            </p>
          </div>

          {/* View Mode Switcher + Admin Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {(role === 'ADMINISTRADOR' || role === 'EMPLEADO' || role === 'CAJERO') && (
              <div className="flex items-center bg-white/[0.03] border border-white/[0.08] backdrop-blur-md p-1 rounded-xl shadow-inner">
                <button
                  onClick={() => setViewMode('SECTIONS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer rounded-lg ${
                    viewMode === 'SECTIONS' ? 'bg-[#e8dc00] text-black shadow-[0_0_12px_rgba(242,229,0,0.3)]' : 'text-[#ccc7ab] hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer rounded-lg ${
                    viewMode === 'TABLE' ? 'bg-[#e8dc00] text-black shadow-[0_0_12px_rgba(242,229,0,0.3)]' : 'text-[#ccc7ab] hover:text-white'
                  }`}
                >
                  <Table className="h-3 w-3" />
                  <span>Stock</span>
                </button>
              </div>
            )}

            {role === 'ADMINISTRADOR' && viewMode === 'TABLE' && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowCatModal(true)}
                  className="spartan-btn-secondary px-3.5 py-2 text-[11px] flex items-center gap-1 cursor-pointer rounded-xl backdrop-blur-md"
                >
                  <Plus className="h-3 w-3" />
                  <span>Categoría</span>
                </button>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="spartan-btn-primary px-3.5 py-2 text-[11px] flex items-center gap-1 cursor-pointer rounded-xl shadow-[0_0_15px_rgba(242,229,0,0.3)]"
                >
                  <Plus className="h-3 w-3" />
                  <span>Producto</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filters with Translucent Glass */}
        <div className="spartan-glass p-4 mb-8 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto o SKU..."
                aria-label="Buscar por producto o SKU"
                className="w-full spartan-glass-input pl-10 pr-4 py-2 text-xs outline-none font-['JetBrains_Mono'] placeholder-[#555] rounded-xl"
              />
            </div>

            <div className="relative max-w-full overflow-hidden w-full md:w-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap pr-8 sm:pr-0">
                <button
                  onClick={() => setSelectedCat('ALL')}
                  aria-pressed={selectedCat === 'ALL'}
                  className={`px-3.5 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer rounded-xl shrink-0 ${
                    selectedCat === 'ALL'
                      ? 'bg-[#e8dc00] text-black shadow-[0_0_12px_rgba(242,229,0,0.3)]'
                      : 'spartan-glass-pill text-zinc-300 hover:border-[#e8dc00]/60 hover:text-white'
                  }`}
                >
                  Todos ({productos.length})
                </button>
                {categorias.map((c) => (
                  <button
                    key={c.id_categoria}
                    onClick={() => setSelectedCat(c.id_categoria)}
                    aria-pressed={selectedCat === c.id_categoria}
                    className={`px-3.5 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer rounded-xl shrink-0 ${
                      selectedCat === c.id_categoria
                        ? 'bg-[#e8dc00] text-black shadow-[0_0_12px_rgba(242,229,0,0.3)]'
                        : 'spartan-glass-pill text-zinc-300 hover:border-[#e8dc00]/60 hover:text-white'
                    }`}
                  >
                    {c.nombre_categoria}
                  </button>
                ))}
              </div>
              {/* Fade gradient cue for mobile horizontal scroll */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#121212] to-transparent pointer-events-none sm:hidden rounded-r-xl" />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin border-2 border-[#e8dc00] border-t-transparent rounded-full" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-zinc-300">
              Cargando catálogo...
            </span>
          </div>
        ) : catalogError ? (
          <div className="flex flex-col items-center rounded-2xl border border-red-500/20 bg-red-950/20 px-6 py-14 text-center" role="alert">
            <WifiOff className="mb-4 h-8 w-8 text-red-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Inventario temporalmente no disponible</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-red-100/75">{catalogError}</p>
            <button type="button" onClick={() => void fetchData()} className="spartan-btn-secondary mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-xs">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Volver a intentar
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 px-6 text-center border border-white/10 bg-[#0D0D0D]/60 backdrop-blur-md rounded-2xl">
            <p className="text-sm text-white font-medium">No encontramos productos con esos criterios</p>
            <p className="text-xs text-zinc-400 mt-1">Prueba otra búsqueda o restablece los filtros para ver todo el catálogo.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedCat('ALL');
              }}
              className="spartan-btn-secondary mt-5 px-4 py-2 text-xs"
            >
              Restablecer filtros
            </button>
          </div>
        ) : viewMode === 'SECTIONS' ? (
          <div className="space-y-12">
            {categorizedSections.map((section) => (
              <section key={section.categoryName}>
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-[#1A1A1A] mb-5">
                  <div className="w-1 h-5 bg-[#e8dc00]" />
                  <h2 className="font-['Anybody'] text-lg sm:text-xl font-black text-white uppercase tracking-tight">
                    {section.categoryName}
                  </h2>
                  <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-400 uppercase font-semibold tabular-nums">
                    {section.items.length} productos
                  </span>
                </div>

                {/* Section Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {section.items.map((p, pIdx) => (
                    <ProductCard
                      key={p.id_producto}
                      producto={p}
                      onOpenModal={setSelectedProductModal}
                      animationDelay={Math.min(pIdx, 8) * 30}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <InventoryTable
            productos={filteredProducts}
            onSelectProduct={setSelectedProductModal}
            onDeleteProduct={handleDeleteProduct}
            isAdmin={role === 'ADMINISTRADOR'}
          />
        )}
      </main>

      {/* Modal Ficha Técnica del Producto */}
      <ProductDetailModal
        producto={selectedProductModal}
        onClose={() => setSelectedProductModal(null)}
        role={role}
      />

      {/* Admin: Modal Crear Producto */}
      <CreateProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleCreateProduct}
        sku={sku}
        setSku={setSku}
        nombre={nombre}
        setNombre={setNombre}
        categoriaId={categoriaId}
        setCategoriaId={setCategoriaId}
        precio={precio}
        setPrecio={setPrecio}
        stock={stock}
        setStock={setStock}
        stockSeguridad={stockSeguridad}
        setStockSeguridad={setStockSeguridad}
        categorias={categorias}
      />

      {/* Admin: Modal Crear Categoría */}
      <CreateCategoryModal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        onSubmit={handleCreateCategoria}
        nombre={nuevaCatNombre}
        setNombre={setNuevaCatNombre}
      />
    </div>
  );
};
