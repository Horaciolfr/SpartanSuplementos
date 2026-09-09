import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import type { Producto, Categoria } from '../types';
import { getErrorMessage } from '../utils/errors';
import {
  Plus,
  Search,
  Sparkles,
  LayoutGrid,
  Table,
} from 'lucide-react';
import {
  Navbar,
  ProductCard,
  ProductDetailModal,
  CreateProductModal,
  CreateCategoryModal,
  InventoryTable,
} from '../components';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export const Catalogo: React.FC = () => {
  const { role } = useAuth();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener productos activos de la API pública
      const prodRes = await apiClient.get<Producto[]>('/catalogo/productos');
      const active = prodRes.data.filter((p) => p.estado_activo);
      setProductos(active);

      // 2. Extraer categorías activas sin depender del endpoint protegido
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
      toast.error(getErrorMessage(err, 'Error al cargar catálogo'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [role]);

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

  // Subtítulos descriptivos por categoría
  const getCategoryDescription = (name: string) => {
    switch (name) {
      case 'CREATINAS & FUERZA':
        return 'Potencia muscular explosiva, máxima fuerza y aceleración en la recuperación física.';
      case 'SUPLEMENTOS PROTEICOS':
        return 'Aislados y concentrados microfiltrados de máxima absorción para crecimiento muscular magro.';
      case 'PRE-ENTRENOS & ENERGIA':
        return 'Complejos con cafeína, beta-alanina y vasodilatadores para entrenamientos de máxima intensidad.';
      case 'GANADORES DE MASA (MASS GAINERS)':
        return 'Fórmulas hipercalóricas enriquecidas con carbohidratos limpios y aminoácidos para volumen.';
      case 'AMINOACIDOS & RECUPERACION':
        return 'BCAAs y glutamina micronizada para frenar la fatiga y acelerar la reconstrucción de fibras.';
      case 'QUEMADORES & DEFINICION':
        return 'Termogénicos y L-Carnitina para optimizar la energía metabólica y definir la masa muscular.';
      case 'SALUD, VITAMINAS & ARTICULACIONES':
        return 'Omega 3, colágeno y multivitamínicos para cuidar articulaciones y mantener tu salud al 100%.';
      default:
        return 'Formulaciones certificadas de nutrición deportiva de grado élite disponibles en nuestras sucursales.';
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#e2e2e2] flex flex-col font-['Hanken_Grotesk']">
      <Navbar />

      <main className="flex-1 max-w-[1360px] mx-auto px-6 py-10 w-full">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-8 border-b border-[#1A1A1A]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[#f2e500]" />
              <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
                Catálogo Oficial Spartan — Bolivia 2026
              </span>
            </div>
            <h1 className="font-['Anybody'] text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">
              Catálogo por <span className="text-[#f2e500]">Secciones</span>
            </h1>
            <p className="text-sm text-[#ccc7ab] mt-2 max-w-2xl leading-relaxed">
              Explora nuestras {productos.length} referencias de suplementos nutricionales de grado élite, agrupadas por su objetivo deportivo y composición.
            </p>
          </div>

          {/* View Mode Switcher (para Administrador) */}
          <div className="flex flex-wrap items-center gap-3">
            {role === 'ADMINISTRADOR' && (
              <div className="flex items-center bg-[#141414] border border-[#2a2a2a] p-1">
                <button
                  onClick={() => setViewMode('SECTIONS')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer ${
                    viewMode === 'SECTIONS' ? 'bg-[#f2e500] text-black' : 'text-[#ccc7ab] hover:text-white'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Por Secciones</span>
                </button>
                <button
                  onClick={() => setViewMode('TABLE')}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer ${
                    viewMode === 'TABLE' ? 'bg-[#f2e500] text-black' : 'text-[#ccc7ab] hover:text-white'
                  }`}
                >
                  <Table className="h-3.5 w-3.5" />
                  <span>Gestión de Stock</span>
                </button>
              </div>
            )}

            {role === 'ADMINISTRADOR' && viewMode === 'TABLE' && (
              <div className="flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCatModal(true)}
                  className="spartan-btn-secondary px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nueva Categoría</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProductModal(true)}
                  className="spartan-btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nuevo Producto</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-5 mb-10 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="BUSCAR MARCA, SUPLEMENTO O SKU..."
                className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white pl-11 pr-4 py-3 text-xs outline-none font-['JetBrains_Mono'] placeholder-[#737373] transition-colors uppercase"
              />
            </div>

            {/* Category Anchor Pills */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedCat('ALL')}
                className={`px-3.5 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer ${
                  selectedCat === 'ALL'
                    ? 'bg-[#f2e500] text-black font-black'
                    : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                }`}
              >
                Todas ({productos.length})
              </motion.button>
              {categorias.map((c) => (
                <motion.button
                  key={c.id_categoria}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setSelectedCat(c.id_categoria)}
                  className={`px-3.5 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer ${
                    selectedCat === c.id_categoria
                      ? 'bg-[#f2e500] text-black font-black'
                      : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                  }`}
                >
                  {c.nombre_categoria}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center text-[#ccc7ab] flex flex-col items-center justify-center gap-4 bg-[#0D0D0D] border border-[#1A1A1A]">
            <div className="h-9 w-9 animate-spin border-2 border-[#f2e500] border-t-transparent rounded-full" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
              Consultando catálogo en tiempo real...
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center bg-[#0D0D0D] border border-[#1A1A1A]">
            <p className="text-sm font-['Anybody'] text-white uppercase font-bold">
              No se encontraron suplementos disponibles
            </p>
            <p className="font-['Hanken_Grotesk'] text-xs text-[#737373] mt-1">
              Prueba cambiando los filtros o el término de búsqueda.
            </p>
          </div>
        ) : viewMode === 'SECTIONS' ? (
          /* ========================================================== */
          /* MODO 1: VISTA POR SECCIONES CLASIFICADAS (Público & Admin) */
          /* ========================================================== */
          <div className="space-y-16">
            {categorizedSections.map((section) => (
              <section key={section.categoryName} className="relative">
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#222] mb-6">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-[#f2e500]" />
                      <h2 className="font-['Anybody'] text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                        {section.categoryName}
                      </h2>
                      <span className="px-2.5 py-0.5 bg-[#141414] border border-[#2a2a2a] text-[#f2e500] font-['JetBrains_Mono'] text-xs font-bold uppercase">
                        {section.items.length} {section.items.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    <p className="text-xs text-[#ccc7ab] mt-1.5 ml-4 font-['Hanken_Grotesk'] max-w-2xl">
                      {getCategoryDescription(section.categoryName)}
                    </p>
                  </div>
                </div>

                {/* Section Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          /* ========================================================== */
          /* MODO 2: TABLA DE STOCK (Solo Administrador)                */
          /* ========================================================== */
          <InventoryTable
            productos={filteredProducts}
            onSelectProduct={setSelectedProductModal}
            onDeleteProduct={handleDeleteProduct}
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
