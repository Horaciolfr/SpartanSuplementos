import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Producto, Categoria } from '../types';
import { getProductImage, storeLogo } from '../utils/productImages';
import heroCinematic from '../assets/hero_cinematic.jpg';
import { ProductCard } from '../components/ProductCard';
import { CommunitySection } from '../components/CommunitySection';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search,
  ArrowRight,
  Flame,
  Sparkles,
  Layers,
  ShoppingCart,
  LogIn,
  LogOut,
  ShieldCheck,
  Zap,
  Award,
  Check,
  X,
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
        <div className="max-w-[1360px] mx-auto px-6 h-24 flex justify-between items-center">
          <Link to="/" className="flex items-center group py-2">
            <img
              src={storeLogo}
              alt="Spartan Suplementos Bolivia"
              className="h-14 sm:h-16 md:h-20 w-auto object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-['JetBrains_Mono'] uppercase tracking-wider">
            <a href="#" className="text-white border-b-2 border-[#f2e500] pb-1 font-bold">
              Inicio
            </a>
            <a href="#catalogo" className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors">
              Catálogo Élite
            </a>
            <a href="#rutinas" className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors">
              Comunidad & Rutinas
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
                <span>Administración</span>
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
                <span>Acceso Personal</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[92vh] flex items-center justify-center pt-24 pb-16 overflow-hidden">
        {/* Cinematic Hero Background */}
        <div className="absolute inset-0 z-0">
          <img
            src={heroCinematic}
            alt="Spartan Suplementos Élite"
            className="w-full h-full object-cover object-center opacity-40 scale-105 animate-pulse duration-[10000ms]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/70 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#080808]/60 to-[#080808]" />
        </div>

        <div className="relative z-10 max-w-[1360px] mx-auto px-6 w-full text-center sm:text-left flex flex-col items-center sm:items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-[#f2e500]/40 text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nutrición Deportiva Certificada — Bolivia 2026</span>
          </div>

          <h1 className="font-['Anybody'] text-5xl sm:text-7xl lg:text-8xl font-black uppercase text-white tracking-tight leading-[0.95] max-w-4xl mb-6">
            FORJA TU <br />
            <span className="text-[#f2e500] italic">VERSIÓN ÉLITE</span>
          </h1>

          <p className="font-['Hanken_Grotesk'] text-base sm:text-lg text-[#ccc7ab] max-w-xl mb-10 leading-relaxed font-light">
            Nutrición deportiva de máxima pureza, marcas internacionales certificadas y stock inmediato para atletas de alto rendimiento.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <a
              href="#catalogo"
              className="spartan-btn-primary w-full sm:w-auto px-8 py-4 text-xs font-black uppercase flex items-center justify-center gap-3 shadow-2xl group cursor-pointer"
            >
              <span>Explorar Catálogo ({productos.length})</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform stroke-[3]" />
            </a>

            <a
              href="#historia"
              className="spartan-btn-secondary w-full sm:w-auto px-8 py-4 text-xs font-bold uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Nuestra Filosofía</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 pt-8 border-t border-[#1A1A1A]/80 w-full max-w-2xl">
            <div className="grid grid-cols-3 gap-6 text-center sm:text-left">
              <div>
                <span className="block font-['Anybody'] text-2xl sm:text-3xl font-black text-white">
                  100%
                </span>
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#737373] tracking-wider">
                  Garantía Original
                </span>
              </div>
              <div>
                <span className="block font-['Anybody'] text-2xl sm:text-3xl font-black text-[#f2e500]">
                  198+
                </span>
                <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-[#737373] tracking-wider">
                  Suplementos en Stock
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

      {/* Contemporary Bento Grid: Pilares de Alto Rendimiento */}
      <section className="max-w-[1360px] mx-auto px-6 -mt-10 mb-16 relative z-30">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-[#0c0c0c]/90 border border-[#222] p-6 hover:border-[#f2e500]/50 transition-colors backdrop-blur-md relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#f2e500]" />
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-5 w-5 text-[#f2e500]" />
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#f2e500] uppercase tracking-wider">
                Disponibilidad Garantizada
              </span>
            </div>
            <h3 className="font-['Anybody'] text-xl text-white uppercase font-black mb-1">
              Stock Real en Tiempo Real
            </h3>
            <p className="font-['Hanken_Grotesk'] text-xs text-[#ccc7ab] leading-relaxed">
              Cada suplemento que ves en nuestro catálogo cuenta con inventario físico confirmado en sucursal, asegurando entrega y despacho inmediato sin demoras.
            </p>
          </div>

          <div className="bg-[#0c0c0c]/90 border border-[#222] p-6 hover:border-[#f2e500]/50 transition-colors backdrop-blur-md relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-5 w-5 text-[#f2e500]" />
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-white uppercase tracking-wider">
                198 Referencias
              </span>
            </div>
            <h3 className="font-['Anybody'] text-xl text-white uppercase font-black mb-1">
              Catálogo 100% Original
            </h3>
            <p className="font-['Hanken_Grotesk'] text-xs text-[#ccc7ab] leading-relaxed">
              Marcas internacionales líderes (ADN, Dragon Pharma, Evogen, MuscleTech, Nutrex) con lotes certificados y sellos de seguridad vigentes.
            </p>
          </div>

          <div className="bg-[#0c0c0c]/90 border border-[#222] p-6 hover:border-[#f2e500]/50 transition-colors backdrop-blur-md relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-5 w-5 text-[#f2e500]" />
              <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#f2e500] uppercase tracking-wider">
                Punto de Venta
              </span>
            </div>
            <h3 className="font-['Anybody'] text-xl text-white uppercase font-black mb-1">
              Atención y Despacho Ágil
            </h3>
            <p className="font-['Hanken_Grotesk'] text-xs text-[#ccc7ab] leading-relaxed">
              Emisión instantánea de comprobante de compra con código QR y detalle garantizado del producto.
            </p>
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
                Selección Élite Spartan
              </span>
            </div>
            <h2 className="font-['Anybody'] text-3xl sm:text-4xl md:text-5xl text-white uppercase font-bold tracking-tight">
              Suplementos <span className="text-[#f2e500]">Destacados</span>
            </h2>
            <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab] mt-2 max-w-xl">
              Una selección curada de nuestras formulaciones más demandadas. Accede a las 198 referencias autorizadas en la sección de Catálogo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/catalogo"
              className="spartan-btn-primary px-5 py-3 text-xs font-black uppercase flex items-center gap-2 cursor-pointer shadow-lg interactive-press"
            >
              <Layers className="h-4 w-4" />
              <span>Ver Catálogo Completo ({productos.length})</span>
            </Link>
          </div>
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
                placeholder="BUSCAR EN DESTACADOS (EJ. WHEY, CREATINA)..."
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
                Destacados ({Math.min(productos.length, 8)})
              </button>
              {categorias.slice(0, 5).map((c) => (
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

        {/* Featured Product Grid (Max 8 cards for a balanced, clean look) */}
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.slice(0, 8).map((p, idx) => (
                <ProductCard
                  key={p.id_producto}
                  producto={p}
                  onOpenModal={setSelectedProductModal}
                  animationDelay={Math.min(idx, 8) * 35}
                />
              ))}
            </div>

            {/* Teaser CTA Banner to Full Classified Catalog */}
            <div className="mt-14 p-8 sm:p-10 bg-gradient-to-r from-[#141414] via-[#0D0D0D] to-[#141414] border border-[#262626] hover:border-[#f2e500]/50 transition-colors shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 group">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-[#f2e500]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 max-w-2xl text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-[#f2e500]/40 text-[#f2e500] font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest mb-3">
                  <Layers className="h-3.5 w-3.5" />
                  <span>Catálogo Completo Clasificado</span>
                </div>
                <h3 className="font-['Anybody'] text-2xl sm:text-3xl text-white uppercase font-black tracking-tight">
                  Explora las 7 Secciones del Catálogo ({productos.length} Suplementos)
                </h3>
                <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab] mt-2 leading-relaxed">
                  Encuentra exactamente lo que tu entrenamiento necesita: Proteínas & Aislados, Creatinas, Pre-Entrenos, Ganadores de Masa, Aminoácidos y Salud Articular con stock físico verificado.
                </p>
              </div>

              <div className="relative z-10 w-full md:w-auto flex justify-center">
                <Link
                  to="/catalogo"
                  className="spartan-btn-primary px-8 py-4 text-xs font-black uppercase flex items-center justify-center gap-3 shadow-2xl whitespace-nowrap cursor-pointer interactive-press"
                >
                  <span>Explorar Catálogo por Secciones</span>
                  <ArrowRight className="h-4 w-4 stroke-[3]" />
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Product Detail Modal with Framer Motion */}
      <AnimatePresence>
        {selectedProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full max-w-2xl bg-[#0D0D0D] border border-[#1A1A1A] shadow-2xl relative overflow-hidden flex flex-col md:flex-row"
            >
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
                      <span>Stock físico verificado y disponible en tienda.</span>
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
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/pos')}
                        className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingCart className="h-4 w-4 stroke-[3]" />
                        <span>Ir al Punto de Venta</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          toast.info('Para adquirir este suplemento, acércate a cualquiera de nuestras sucursales Spartan o inicia sesión.');
                          setSelectedProductModal(null);
                        }}
                        className="w-full spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Consultar en Sucursal</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Community, Motivation & Routine Philosophy Section */}
      <CommunitySection />

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
                  Inspirados en la disciplina espartana, cada producto que distribuimos cuenta con certificación original de fábrica y sellos de seguridad intactos, asegurando la máxima eficacia y pureza nutricional.
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
                  Confianza y Garantía
                </h3>
                <p className="font-['Hanken_Grotesk'] text-[#ccc7ab] text-sm leading-relaxed">
                  Gestionamos nuestro catálogo con los más altos estándares de control y autenticidad, respaldando la experiencia de compra deportiva más confiable de Bolivia.
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
              Bolivia — Nutrición Deportiva de Grado Élite
            </span>
          </div>
          <div className="flex gap-6 text-xs font-['JetBrains_Mono'] text-[#737373] uppercase">
            <span>© 2026 Spartan Suplementos</span>
            <span>•</span>
            <a href="#catalogo" className="hover:text-[#f2e500] transition-colors">
              Catálogo
            </a>
            <span>•</span>
            <a href="#rutinas" className="hover:text-[#f2e500] transition-colors">
              Comunidad & Rutinas
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
