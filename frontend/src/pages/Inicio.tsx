import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Producto, Categoria } from '../types';
import { getProductImage, storeLogo } from '../utils/productImages';
import heroCinematic from '../assets/hero_cinematic.jpg';
import {
  Search,
  ArrowRight,
  Flame,
  Sparkles,
  Layers,
  ShoppingCart,
  PackageCheck,
  LogIn,
  LogOut,
  ShieldCheck,
  Zap,
  Award,
  Check,
  X,
  Eye,
} from 'lucide-react';

export const Inicio: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');
  const [selectedProductModal, setSelectedProductModal] = useState<Producto | null>(null);

  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        const prodRes = await apiClient.get<Producto[]>('/catalogo/productos');
        const activeProds = prodRes.data.filter((p) => p.estado_activo);
        setProductos(activeProds);

        // Extraer categorías únicas de los productos activos
        const catsMap = new Map<number, Categoria>();
        activeProds.forEach((p) => {
          if (p.categoria) {
            catsMap.set(p.categoria.id_categoria, p.categoria);
          }
        });
        setCategorias(Array.from(catsMap.values()));
      } catch (err) {
        console.error('Error al cargar catálogo en Inicio:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalogData();
  }, []);

  const filteredProducts = productos.filter((p) => {
    const matchesSearch =
      p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || p.id_categoria === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-[#e2e2e2] font-['Hanken_Grotesk'] selection:bg-[#f2e500] selection:text-black">
      {/* Top Navigation Bar */}
      <nav
        className="w-full border-b border-[#1A1A1A] bg-[#0c0c0c]/85 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 shadow-2xl"
        id="main-nav"
      >
        <div className="max-w-[1360px] mx-auto px-6 h-20 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={storeLogo}
              alt="Spartan Suplementos Bolivia"
              className="h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <div className="hidden sm:block">
              <span className="font-['Anybody'] text-xl text-[#f2e500] italic font-black uppercase tracking-tighter block leading-none">
                SPARTAN
              </span>
              <span className="text-[9px] font-['JetBrains_Mono'] tracking-widest text-[#ccc7ab] uppercase block">
                Suplementos Bolivia
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-['JetBrains_Mono'] uppercase tracking-wider">
            <a href="#" className="text-white border-b-2 border-[#f2e500] pb-1 font-bold">
              Inicio
            </a>
            <a href="#catalogo" className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors">
              Catálogo Élite
            </a>
            <a href="#historia" className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors">
              Legado
            </a>
            {role === 'ADMINISTRADOR' && (
              <Link
                to="/catalogo"
                className="text-[#f2e500] hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Gestión ERP</span>
              </Link>
            )}
            {(role === 'CAJERO' || role === 'ADMINISTRADOR') && (
              <Link
                to="/pos"
                className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors flex items-center gap-1.5"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Punto de Venta</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#catalogo"
              className="text-[#e2e2e2] hover:text-[#f2e500] transition-colors p-2 cursor-pointer"
              title="Explorar Catálogo"
            >
              <Search className="h-4 w-4" />
            </a>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right text-xs">
                  <div className="font-bold text-white leading-tight">
                    {user.nombres} {user.apellidos}
                  </div>
                  <span className="inline-block text-[9px] font-['JetBrains_Mono'] uppercase px-1.5 py-0.5 bg-black border border-[#f2e500]/50 text-[#f2e500]">
                    {role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="border border-[#2a2a2a] bg-[#141414] p-2 text-[#ccc7ab] hover:text-red-400 hover:border-red-500/40 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="spartan-btn-primary px-6 py-2.5 text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <LogIn className="h-3.5 w-3.5 stroke-[3]" />
                <span>Acceso ERP</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section with Cinematic Background & Atmospheric Glow */}
      <section className="relative min-h-[90vh] flex items-center pt-16 pb-24 overflow-hidden border-b border-[#1A1A1A] bg-spartan-radial">
        <div className="absolute inset-0 z-0">
          <img
            src={heroCinematic}
            alt="Spartan Athletics Athlete"
            className="w-full h-full object-cover object-center opacity-45 mix-blend-luminosity scale-105 hover:scale-100 transition-transform duration-1000 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/85 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent z-10" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#f2e500]/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        </div>

        <div className="max-w-[1360px] mx-auto px-6 relative z-20 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black/80 border border-[#f2e500]/50 text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-8 backdrop-blur-md shadow-md">
              <Zap className="h-3.5 w-3.5 text-[#f2e500]" />
              <span>Estándar Nutricional de Grado Élite — Bolivia 2026</span>
            </div>

            <h1 className="font-['Anybody'] text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-white uppercase font-black mb-6 leading-none tracking-tight">
              DESPIERTA TU <br />
              <span className="text-[#f2e500] italic">PODER ESPARTANO</span>
            </h1>

            <p className="font-['Hanken_Grotesk'] text-lg md:text-xl text-[#ccc7ab] mb-10 max-w-2xl leading-relaxed">
              Suplementación con pureza garantizada, trazabilidad atómica en Kárdex físico y formulaciones diseñadas para atletas de alto rendimiento.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <a
                href="#catalogo"
                className="spartan-btn-primary px-8 py-4 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xl text-center"
              >
                <span>Explorar Catálogo Premium</span>
                <ArrowRight className="h-4 w-4 stroke-[3]" />
              </a>
              <a
                href="#historia"
                className="inline-flex items-center justify-center border border-[#333] bg-black/60 backdrop-blur-md text-white font-['JetBrains_Mono'] text-xs uppercase font-bold px-8 py-4 hover:border-[#f2e500] hover:text-[#f2e500] transition-colors text-center"
              >
                Filosofía de la Arena
              </a>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-[#1A1A1A] max-w-xl">
              <div>
                <span className="block font-['Anybody'] text-2xl sm:text-3xl font-black text-white">
                  100%
                </span>
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#737373] tracking-wider">
                  Pureza en Origen
                </span>
              </div>
              <div>
                <span className="block font-['Anybody'] text-2xl sm:text-3xl font-black text-[#f2e500]">
                  ACID
                </span>
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#737373] tracking-wider">
                  Kárdex Serializado
                </span>
              </div>
              <div>
                <span className="block font-['Anybody'] text-2xl sm:text-3xl font-black text-white">
                  +12K
                </span>
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#737373] tracking-wider">
                  Atletas Activos
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Showcase Section */}
      <section className="py-24 max-w-[1360px] mx-auto px-6 relative" id="catalogo">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[#f2e500]" />
              <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#f2e500]">
                Nutrición Deportiva Certificada
              </span>
            </div>
            <h2 className="font-['Anybody'] text-3xl sm:text-4xl md:text-5xl text-white uppercase font-bold tracking-tight">
              Catálogo <span className="text-[#f2e500]">Spartan</span>
            </h2>
            <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab] mt-2 max-w-xl">
              Cada lote cuenta con registro de kárdex, trazabilidad de lote y especificaciones de biodisponibilidad.
            </p>
          </div>

          {role === 'ADMINISTRADOR' && (
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase px-5 py-3 font-bold transition-all cursor-pointer shadow-md"
            >
              <Layers className="h-4 w-4 text-[#f2e500]" />
              <span>Control Maestro ERP</span>
            </Link>
          )}
        </div>

        {/* Search & Category Filter Bar */}
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-5 mb-10 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="BUSCAR SUPLEMENTO O CÓDIGO SKU..."
                className="w-full bg-black border border-[#2a2a2a] focus:border-[#f2e500] text-white pl-11 pr-4 py-3 text-xs outline-none font-['JetBrains_Mono'] placeholder-[#737373] transition-colors uppercase"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => setSelectedCat('ALL')}
                className={`px-4 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer interactive-press ${
                  selectedCat === 'ALL'
                    ? 'bg-[#f2e500] text-black font-black'
                    : 'bg-[#141414] border border-[#2a2a2a] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
                }`}
              >
                Todos ({productos.length})
              </button>
              {categorias.map((c) => (
                <button
                  key={c.id_categoria}
                  onClick={() => setSelectedCat(c.id_categoria)}
                  className={`px-4 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer interactive-press ${
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

        {/* Product Grid with High-Definition Photos */}
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((p, idx) => {
              const isOutOfStock = p.stock_actual <= 0;
              const isLowStock = p.stock_actual <= p.stock_seguridad;
              const productImg = getProductImage(p.codigo_sku, p.categoria?.nombre_categoria, p.imagen_url);

              return (
                <div
                  key={p.id_producto}
                  style={{ animationDelay: `${Math.min(idx, 16) * 35}ms` }}
                  className="spartan-glass flex flex-col justify-between group relative overflow-hidden shadow-2xl stagger-card"
                >
                  {/* Top Yellow Corner Accent */}
                  <div className="absolute top-0 left-0 w-8 h-[2px] bg-[#f2e500] group-hover:w-full transition-all duration-500 z-30" />

                  {/* Product Image Showcase */}
                  <div className="relative aspect-square w-full bg-black overflow-hidden img-vignette cursor-pointer flex items-center justify-center p-3" onClick={() => setSelectedProductModal(p)}>
                    <img
                      src={productImg}
                      alt={p.nombre_producto}
                      className="max-h-full max-w-full object-contain group-hover:scale-108 transition-transform duration-500 ease-out"
                    />

                    {/* Stock status overlay pill */}
                    <div className="absolute top-3 right-3 z-20">
                      <span
                        className={`px-2.5 py-1 font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${
                          isOutOfStock
                            ? 'bg-red-950/80 text-red-400 border border-red-500/50'
                            : isLowStock
                            ? 'bg-amber-950/80 text-[#f2e500] border border-[#f2e500]/50'
                            : 'bg-black/80 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {isOutOfStock ? 'Sin Existencias' : `${p.stock_actual} UDS`}
                      </span>
                    </div>

                    {/* Quick view button on hover */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]">
                      <span className="flex items-center gap-2 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs font-black uppercase px-4 py-2 shadow-xl interactive-press">
                        <Eye className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Ver Ficha Técnica</span>
                      </span>
                    </div>
                  </div>

                  {/* Product Meta & Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#f2e500] uppercase tracking-wider">
                          [{p.codigo_sku}]
                        </span>
                        <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-[#737373]">
                          {p.categoria?.nombre_categoria || 'GENERAL'}
                        </span>
                      </div>

                      <h3 className="font-['Anybody'] text-base font-bold text-white uppercase tracking-tight group-hover:text-[#f2e500] transition-colors line-clamp-2 mb-3">
                        {p.nombre_producto}
                      </h3>
                    </div>

                    {/* Price & Primary Action */}
                    <div className="pt-4 border-t border-[#1A1A1A] mt-2">
                      <div className="flex justify-between items-baseline mb-4">
                        <span className="text-[9px] font-['JetBrains_Mono'] text-[#737373] uppercase tracking-widest">
                          Precio Autorizado
                        </span>
                        <span className="font-['JetBrains_Mono'] text-2xl font-black text-white">
                          Bs. {Number(p.precio_unitario).toFixed(2)}
                        </span>
                      </div>

                      {role === 'CAJERO' || role === 'ADMINISTRADOR' ? (
                        <button
                          onClick={() => navigate('/pos')}
                          className="w-full spartan-btn-secondary py-3 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Vender en POS</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedProductModal(p)}
                          className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <PackageCheck className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Consultar Disponibilidad</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Product Detail Modal with Emil Kowalski modal-enter */}
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
                <p className="font-['JetBrains_Mono'] text-xs text-[#ccc7ab] uppercase mb-4">
                  Categoría: {selectedProductModal.categoria?.nombre_categoria || 'Suplementos'}
                </p>

                {/* Technical / Nutritional Description */}
                {selectedProductModal.descripcion && (
                  <div className="mb-4 bg-black/60 border border-[#2a2a2a] p-3">
                    <span className="text-[10px] font-['JetBrains_Mono'] text-[#f2e500] uppercase block mb-1 font-bold">
                      Ficha Técnica & Beneficios:
                    </span>
                    <p className="text-xs text-[#e2e2e2] leading-relaxed">
                      {selectedProductModal.descripcion}
                    </p>
                  </div>
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
                  <span className="font-['JetBrains_Mono'] text-xs text-[#737373] uppercase">
                    Precio Oficial:
                  </span>
                  <span className="font-['JetBrains_Mono'] text-3xl font-black text-[#f2e500]">
                    Bs. {Number(selectedProductModal.precio_unitario).toFixed(2)}
                  </span>
                </div>

                <div className="flex gap-3">
                  {(role === 'CAJERO' || role === 'ADMINISTRADOR') ? (
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
                        alert('Para adquirir este producto, acércate a cualquiera de nuestras sucursales Spartan Bolivia o inicia sesión como usuario registrado.');
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

      {/* Historia & Legacy Section with Enhanced Grid */}
      <section className="py-24 bg-[#0a0a0a] border-b border-[#1A1A1A]" id="historia">
        <div className="max-w-[1360px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative group">
              <div className="absolute inset-0 bg-[#f2e500]/15 translate-x-4 translate-y-4 border border-[#f2e500]/50 group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500" />
              <img
                className="relative z-10 w-full h-[520px] object-cover grayscale group-hover:grayscale-0 transition-all duration-700 border border-[#1A1A1A] shadow-2xl"
                alt="Spartan Athletics Gym"
                src={heroCinematic}
              />
            </div>

            <div className="order-1 lg:order-2">
              <span className="inline-block px-3 py-1 bg-black border border-[#f2e500]/50 text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-4">
                Identidad & Legado Espartano
              </span>
              <h2 className="font-['Anybody'] text-4xl sm:text-5xl text-white uppercase font-black mb-6 leading-tight">
                LA DISCIPLINA NO ES OPCIONAL: <br />
                <span className="text-[#f2e500]">ES NUESTRO CÓDIGO</span>
              </h2>

              <div className="space-y-5 text-[#ccc7ab] text-base leading-relaxed font-['Hanken_Grotesk']">
                <p>
                  Spartan Suplementos nació con la convicción de transformar el panorama de la nutrición deportiva en Bolivia, desterrando productos dudosos y estableciendo un estándar inflexible de pureza y eficacia.
                </p>
                <p>
                  Inspirados en la templanza espartana, cada producto que distribuimos está respaldado por trazabilidad física auditada en Kárdex, asegurando que cada gramo de proteína, creatina o pre-entreno entregue la máxima biodisponibilidad.
                </p>
                <div className="border-l-2 border-[#f2e500] pl-6 py-2 italic text-white text-lg font-['Anybody'] bg-black/40 mt-6">
                  "No buscamos atajos. Construimos atletas que desafían cualquier límite."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-20 bg-[#080808] border-b border-[#1A1A1A]">
        <div className="max-w-[1360px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-[#0D0D0D] border border-[#1A1A1A] p-10 relative overflow-hidden group hover:border-[#f2e500]/60 transition-colors duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-[#f2e500]">
                <Flame className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <span className="inline-block px-2.5 py-1 bg-black text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase mb-4 border border-[#f2e500]/40">
                  Compromiso
                </span>
                <h3 className="font-['Anybody'] text-2xl md:text-3xl text-white font-bold mb-4 uppercase">
                  Despierta tu Fuego Interior
                </h3>
                <p className="font-['Hanken_Grotesk'] text-[#ccc7ab] text-base max-w-lg leading-relaxed">
                  Ser el catalizador de fuerza y resiliencia para cada atleta en Bolivia, proporcionando nutrición de vanguardia y conocimiento experto que inspire a superar tus marcas diarias.
                </p>
              </div>
            </div>

            <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-10 flex flex-col justify-between group hover:border-[#f2e500]/60 transition-colors duration-300">
              <div>
                <span className="inline-block px-2.5 py-1 bg-black text-white font-['JetBrains_Mono'] text-xs uppercase mb-4 border border-white/20">
                  Asesoría
                </span>
                <h3 className="font-['Anybody'] text-2xl text-white font-bold mb-4 uppercase">
                  Tecnología & Kárdex
                </h3>
                <p className="font-['Hanken_Grotesk'] text-[#ccc7ab] text-sm leading-relaxed">
                  Cada venta y abastecimiento es registrado con integridad transaccional ACID en PostgreSQL, respaldando la trazabilidad de inventario más confiable de Bolivia.
                </p>
              </div>

              <div className="mt-8 flex items-center text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase font-bold group-hover:translate-x-2 transition-transform cursor-pointer">
                <span>Ver Garantía de Inventario</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] py-14">
        <div className="max-w-[1360px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-['Anybody'] text-2xl text-[#f2e500] italic font-black uppercase">
            SPARTAN{' '}
            <span className="text-[#ccc7ab] text-sm not-italic font-normal block md:inline md:ml-2">
              Bolivia — Nutrición de Grado Élite & ERP
            </span>
          </div>
          <div className="flex gap-6 text-xs font-['JetBrains_Mono'] text-[#737373] uppercase">
            <span>© 2026 Spartan Suplementos</span>
            <span>•</span>
            <a href="#catalogo" className="hover:text-[#f2e500] transition-colors">
              Catálogo
            </a>
            <span>•</span>
            <Link to="/login" className="hover:text-[#f2e500] transition-colors">
              Acceso Administrativo
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
