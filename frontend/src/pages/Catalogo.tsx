import React, { useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import type { Producto, Categoria } from '../types';
import { getErrorMessage } from '../utils/errors';
import {
  Plus,
  Search,
  Layers,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  Award,
  Check,
  ShoppingCart,
  LayoutGrid,
  Table,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getProductImage } from '../utils/productImages';

export const Catalogo: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setError(null);
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
      setError(getErrorMessage(err, 'Error al cargar datos del catálogo'));
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
      setSku('');
      setNombre('');
      setPrecio('');
      fetchData();
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al crear producto'));
    }
  };

  // Manejador de creación de categoría (Admin)
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

  // Desactivación de producto (Admin)
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

    // Ordenar para que aparezcan en orden lógico: Creatinas, Proteínas, Pre-entrenos, Gainers, Aminoácidos, Quemadores, Salud
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
        return 'Potencia anaeróbica explosiva, resíntesis acelerada de fosfocreatina ATP e hipertrofia celular.';
      case 'SUPLEMENTOS PROTEICOS':
        return 'Aislados (Isolates) y concentrados microfiltrados de máxima absorción y balance de nitrógeno.';
      case 'PRE-ENTRENOS & ENERGIA':
        return 'Complejos con cafeína anhidra, beta-alanina y vasodilatadores de óxido nítrico para entrenamientos extremos.';
      case 'GANADORES DE MASA (MASS GAINERS)':
        return 'Fórmulas hipercalóricas con carbohidratos complejos, BCAAs y perfil lipídico para superávit calórico.';
      case 'AMINOACIDOS & RECUPERACION':
        return 'Leucina, isoleucina, valina (2:1:1) y glutamina micronizada para frenar el catabolismo muscular.';
      case 'QUEMADORES & DEFINICION':
        return 'Termogénicos y lipotrópicos con L-Carnitina para acelerar el metabolismo y preservación magra.';
      case 'SALUD, VITAMINAS & ARTICULACIONES':
        return 'Omega 3 premium, colágeno hidrolizado, magnesio y adaptógenos para longevidad articular y hormonal.';
      default:
        return 'Formulaciones certificadas de nutrición deportiva de grado élite con control físico en Kárdex.';
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#e2e2e2] flex flex-col font-['Hanken_Grotesk']">
      <Navbar />

      <main className="flex-1 max-w-[1360px] mx-auto px-6 py-10 w-full">
        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-950/40 border border-red-500/50 p-4 text-xs font-['JetBrains_Mono'] text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-950/40 border border-emerald-500/50 p-4 text-xs font-['JetBrains_Mono'] text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 pb-8 border-b border-[#1A1A1A]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[#f2e500]" />
              <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
                Catálogo Maestro Autorizado — Bolivia 2026
              </span>
            </div>
            <h1 className="font-['Anybody'] text-4xl sm:text-5xl font-black text-white uppercase tracking-tight">
              Catálogo por <span className="text-[#f2e500]">Secciones</span>
            </h1>
            <p className="text-sm text-[#ccc7ab] mt-2 max-w-2xl leading-relaxed">
              Explora las {productos.length} referencias de suplementos nutricionales de grado élite, agrupadas rigurosamente por su objetivo metabólico y composición química.
            </p>
          </div>

          {/* View Mode Switcher (para Administrador) o Contador para público */}
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
                  <span>Tabla de Inventario</span>
                </button>
              </div>
            )}

            {role === 'ADMINISTRADOR' && viewMode === 'TABLE' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCatModal(true)}
                  className="spartan-btn-secondary px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer interactive-press"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nueva Categoría</span>
                </button>
                <button
                  onClick={() => setShowProductModal(true)}
                  className="spartan-btn-primary px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer interactive-press shadow-md"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nuevo Producto</span>
                </button>
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
              <button
                onClick={() => setSelectedCat('ALL')}
                className={`px-3.5 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer interactive-press ${
                  selectedCat === 'ALL'
                    ? 'bg-[#f2e500] text-black font-black'
                    : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                }`}
              >
                Todas ({productos.length})
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id_categoria}
                  onClick={() => setSelectedCat(c.id_categoria)}
                  className={`px-3.5 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer interactive-press ${
                    selectedCat === c.id_categoria
                      ? 'bg-[#f2e500] text-black font-black'
                      : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                  }`}
                >
                  {c.nombre_categoria}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center text-[#ccc7ab] flex flex-col items-center justify-center gap-4 bg-[#0D0D0D] border border-[#1A1A1A]">
            <div className="h-9 w-9 animate-spin border-2 border-[#f2e500] border-t-transparent rounded-full" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
              Consultando inventario en tiempo real...
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
          /* MODO 2: TABLA MAESTRA DE INVENTARIO (Solo Administrador)  */
          /* ========================================================== */
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
                  {filteredProducts.map((p) => {
                    const isOutOfStock = p.stock_actual <= 0;
                    const isLowStock = p.stock_actual <= p.stock_seguridad;
                    const pImg = getProductImage(p.codigo_sku, p.categoria?.nombre_categoria, p.imagen_url);

                    return (
                      <tr key={p.id_producto} className="hover:bg-[#141414] transition-colors">
                        <td className="py-3 px-4">
                          <div
                            onClick={() => setSelectedProductModal(p)}
                            className="h-12 w-12 bg-black border border-[#2a2a2a] p-1 flex items-center justify-center overflow-hidden cursor-pointer"
                          >
                            <img src={pImg} alt={p.nombre_producto} className="max-h-full max-w-full object-contain" />
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
                              p.estado_activo ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/60 text-red-400'
                            }`}
                          >
                            {p.estado_activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteProduct(p.id_producto)}
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
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#0D0D0D] border border-[#1A1A1A] shadow-2xl relative overflow-hidden flex flex-col md:flex-row modal-enter">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500] z-20" />
            <button
              onClick={() => setSelectedProductModal(null)}
              className="absolute top-4 right-4 z-30 p-2 text-[#737373] hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Image */}
            <div className="md:w-1/2 aspect-square md:aspect-auto bg-black relative overflow-hidden flex items-center justify-center p-6">
              <img
                src={getProductImage(
                  selectedProductModal.codigo_sku,
                  selectedProductModal.categoria?.nombre_categoria,
                  selectedProductModal.imagen_url
                )}
                alt={selectedProductModal.nombre_producto}
                className="max-h-[380px] w-auto object-contain drop-shadow-2xl"
              />
            </div>

            {/* Modal Details */}
            <div className="md:w-1/2 p-6 flex flex-col justify-between">
              <div>
                <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#f2e500] uppercase tracking-wider block mb-1">
                  [{selectedProductModal.codigo_sku}]
                </span>
                <h3 className="font-['Anybody'] text-2xl font-bold text-white uppercase tracking-tight mb-2">
                  {selectedProductModal.nombre_producto}
                </h3>
                <span className="inline-block px-2.5 py-1 bg-[#1A1A1A] text-[#ccc7ab] font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider mb-4 border border-[#2a2a2a]">
                  {selectedProductModal.categoria?.nombre_categoria || 'GENERAL'}
                </span>

                {selectedProductModal.descripcion && (
                  <p className="text-xs text-[#ccc7ab] font-['Hanken_Grotesk'] leading-relaxed mb-4 bg-[#141414] p-3 border border-[#222]">
                    {selectedProductModal.descripcion}
                  </p>
                )}

                <div className="space-y-2 text-xs font-['Hanken_Grotesk'] text-[#ccc7ab] mb-6 border-y border-[#1A1A1A] py-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#f2e500]" />
                    <span>Control de stock serializado bajo PostgreSQL ACID.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-[#f2e500]" />
                    <span>Certificación de pureza internacional.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Disponible para despacho inmediato en tienda.</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-['JetBrains_Mono'] text-xs text-[#737373] uppercase">Precio Oficial:</span>
                  <span className="font-['JetBrains_Mono'] text-3xl font-black text-[#f2e500]">
                    Bs. {Number(selectedProductModal.precio_unitario).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3">
                  {role === 'CAJERO' || role === 'ADMINISTRADOR' ? (
                    <button
                      onClick={() => navigate('/pos')}
                      className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShoppingCart className="h-4 w-4 stroke-[3]" />
                      <span>Ir al Punto de Venta</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        alert(
                          'Para adquirir este producto, acércate a cualquiera de nuestras sucursales Spartan Bolivia o inicia sesión como usuario registrado.'
                        );
                        setSelectedProductModal(null);
                      }}
                      className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Consultar en Sucursal</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin: Modal Crear Producto */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0D0D0D] border border-[#1A1A1A] p-6 shadow-2xl relative modal-enter">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-['Anybody'] text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#f2e500]" />
              <span>Registrar Nuevo Suplemento</span>
            </h3>

            <form onSubmit={handleCreateProduct} className="space-y-4 font-['JetBrains_Mono'] text-xs">
              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Código SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="EJ. SKU-PROT-099"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="EJ. ISOLATE WHEY 5LB"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Categoría *</label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(parseInt(e.target.value, 10))}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none uppercase"
                >
                  {categorias.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      {c.nombre_categoria}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#ccc7ab] mb-1 uppercase">Precio (Bs) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    placeholder="350.00"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#ccc7ab] mb-1 uppercase">Stock Inicial</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#ccc7ab] mb-1 uppercase">Mínimo</label>
                  <input
                    type="number"
                    value={stockSeguridad}
                    onChange={(e) => setStockSeguridad(e.target.value)}
                    className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="spartan-btn-secondary px-4 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="spartan-btn-primary px-5 py-2 cursor-pointer">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Modal Crear Categoría */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0D0D0D] border border-[#1A1A1A] p-6 shadow-2xl relative modal-enter">
            <button
              onClick={() => setShowCatModal(false)}
              className="absolute top-4 right-4 text-[#737373] hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="font-['Anybody'] text-xl font-bold text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-[#f2e500]" />
              <span>Nueva Categoría</span>
            </h3>

            <form onSubmit={handleCreateCategoria} className="space-y-4 font-['JetBrains_Mono'] text-xs">
              <div>
                <label className="block text-[#ccc7ab] mb-1 uppercase">Nombre de Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="EJ. BARRAS & SNACKS"
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white p-2.5 outline-none uppercase"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="spartan-btn-secondary px-4 py-2 cursor-pointer"
                >
                  Cancelar
                </button>
                <button type="submit" className="spartan-btn-primary px-5 py-2 cursor-pointer">
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
