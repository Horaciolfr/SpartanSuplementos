import React, { useCallback, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../hooks/useAuth';
import type { Producto, Categoria } from '../types';
import { getProductImage, storeLogo } from '../utils/productImages';
import { getMaskedRoleLabel } from '../utils/security';
import { ProductCard } from '../components/ProductCard';
import { DisciplinesSection } from '../components/DisciplinesSection';
import { ThemeToggle } from '../components/ThemeToggle';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search,
  ArrowRight,
  Layers,
  ShoppingCart,
  LogIn,
  LogOut,
  X,
  Menu,
  Scan,
  RefreshCw,
  WifiOff,
} from 'lucide-react';

export const Inicio: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');
  const [selectedProductModal, setSelectedProductModal] = useState<Producto | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const fetchCatalogData = useCallback(async () => {
    setLoading(true);
    setCatalogError(null);
    try {
        const prodRes = await apiClient.get<Producto[]>('/catalogo/productos');
        const activeProds = prodRes.data.filter((p) => p.estado_activo);
        setProductos(activeProds);

        const catsMap = new Map<number, Categoria>();
        activeProds.forEach((p) => {
          if (p.categoria) {
            catsMap.set(p.categoria.id_categoria, p.categoria);
          }
        });
        setCategorias(Array.from(catsMap.values()));
    } catch (err) {
      console.error('Error al cargar catálogo en Inicio:', err);
      setCatalogError('No pudimos conectar con el catálogo. Comprueba tu conexión y vuelve a intentarlo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestId = window.setTimeout(() => void fetchCatalogData(), 0);
    return () => window.clearTimeout(requestId);
  }, [fetchCatalogData]);

  const filteredProducts = productos.filter((p) => {
    const matchesSearch =
      p.nombre_producto.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_sku.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || p.id_categoria === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-[#080808] text-[#e2e2e2] font-sans overflow-x-hidden w-full max-w-full">
      {/* ── Navigation ── */}
      <nav
        className="w-full spartan-glass-nav sticky top-0 z-50"
        id="main-nav"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-24 flex justify-between items-center">
          <Link to="/" className="flex items-center py-2 group">
            <img
              src={storeLogo}
              alt="Spartan Suplementos"
              className="h-14 sm:h-20 md:h-22 lg:h-[88px] w-auto object-contain transition-transform duration-200 group-hover:scale-105 filter drop-shadow-[0_4px_16px_rgba(232,220,0,0.18)] brightness-105"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider">
            <a href="#" className="text-white font-bold hover:text-[#e8dc00] transition-colors">Inicio</a>
            <a href="#disciplinas" className="text-zinc-400 hover:text-[#e8dc00] transition-colors">Disciplinas</a>
            <a href="#catalogo" className="text-zinc-400 hover:text-white transition-colors">Catálogo</a>
            <Link to="/biometria" className="text-zinc-400 hover:text-[#e8dc00] transition-colors flex items-center gap-1.5">
              <Scan className="h-3 w-3" />
              <span>Biometría</span>
            </Link>
            {role === 'ADMINISTRADOR' && (
              <Link to="/catalogo" className="text-[#e8dc00] hover:text-white transition-colors flex items-center gap-1.5">
                <Layers className="h-3 w-3" />
                <span>Admin</span>
              </Link>
            )}
            {(role === 'CAJERO' || role === 'ADMINISTRADOR') && (
              <Link to="/pos" className="text-zinc-400 hover:text-[#e8dc00] transition-colors flex items-center gap-1.5">
                <ShoppingCart className="h-3 w-3" />
                <span>POS</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right text-xs">
                  <div className="font-medium text-white leading-tight">
                    {user.nombres} {user.apellidos}
                  </div>
                  <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-[#e8dc00]">
                    {getMaskedRoleLabel(role)}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="hidden sm:flex border border-white/10 bg-[#141414] p-2 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors cursor-pointer rounded-xl"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden sm:flex spartan-btn-primary px-5 py-2 text-[11px] items-center gap-2 cursor-pointer shadow-lg rounded-xl"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Ingresar</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center border border-white/15 bg-[#141414] text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-xl"
              aria-label="Abrir menú"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer with Framer Motion */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className="md:hidden border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-2xl overflow-hidden px-4 py-4 space-y-1 shadow-2xl"
            >
              <a
                href="#"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-white font-bold bg-white/5"
              >
                <span>Inicio</span>
              </a>

              <a
                href="#disciplinas"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              >
                <span>Disciplinas & Fichas</span>
              </a>

              <a
                href="#catalogo"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              >
                <span>Catálogo de Suplementos</span>
              </a>

              <Link
                to="/biometria"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#e8dc00] hover:bg-white/[0.04]"
              >
                <Scan className="h-4 w-4" />
                <span>Perfil Biométrico</span>
              </Link>

              {role === 'ADMINISTRADOR' && (
                <Link
                  to="/catalogo"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-white hover:bg-white/[0.04]"
                >
                  <Layers className="h-4 w-4 text-[#e8dc00]" />
                  <span>Kárdex & Administración</span>
                </Link>
              )}

              {(role === 'CAJERO' || role === 'ADMINISTRADOR') && (
                <Link
                  to="/pos"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-[#e8dc00] hover:bg-white/[0.04]"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Punto de Venta (POS)</span>
                </Link>
              )}

              {user ? (
                <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between px-2">
                  <div>
                    <div className="text-xs font-bold text-white leading-tight">
                      {user.nombres} {user.apellidos}
                    </div>
                    <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-[#e8dc00]">
                      {getMaskedRoleLabel(role)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileNavOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 bg-red-950/20 text-red-300 text-xs rounded-xl font-['JetBrains_Mono'] uppercase cursor-pointer hover:bg-red-950/40"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Salir</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-white/10">
                  <Link
                    to="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="w-full spartan-btn-primary py-2.5 text-xs flex items-center justify-center gap-2 rounded-xl"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Ingresar al Sistema</span>
                  </Link>
                </div>
              )}

              {/* Mobile Theme Toggle */}
              <div className="pt-2">
                <ThemeToggle variant="pill" className="w-full justify-center py-2.5" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero Section ── */}
      <section id="contenido-principal" tabIndex={-1} className="hero-cinema relative min-h-[88vh] flex items-center py-20 sm:py-28 border-b border-white/10 overflow-hidden">
        {/* Cinematic Athletic Background Image - High Clarity & Vibrant Lighting */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          <img
            src="/hero_cinematic.jpg"
            alt="Spartan Athletic Gym Background"
            className="w-full h-full object-cover object-[75%_center] lg:object-[82%_center] opacity-80 lg:opacity-85 filter contrast-115 brightness-105 scale-105 transition-all duration-700"
          />
          {/* Gradients: Solid dark on left to frame text, fully revealing athlete and neon on right */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808] via-[#080808]/90 via-30% md:via-38% to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-[#080808]/40 z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080808]/40 via-transparent to-[#080808] z-10" />
        </div>

        {/* Ambient Glowing Backdrops for Neon Atmosphere */}
        <div className="absolute top-12 right-16 w-[550px] h-[350px] bg-[#e8dc00]/10 rounded-full blur-[140px] pointer-events-none animate-ambient z-10" />
        <div className="absolute -bottom-10 left-10 w-[400px] h-[260px] bg-white/5 rounded-full blur-[140px] pointer-events-none z-10" />

        <div className="max-w-[1280px] mx-auto px-6 relative z-20 w-full">
          {/* Live Verified Stock Pill */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 bg-[#111111]/85 backdrop-blur-md border border-white/10 rounded-full mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-['JetBrains_Mono'] text-[10px] sm:text-[11px] text-zinc-300 uppercase font-bold tracking-wider">
              Stock Verificado en Sucursal — Despacho a Toda Bolivia
            </span>
          </div>

          <div className="mb-3 font-['JetBrains_Mono'] text-[11px] font-bold tracking-widest text-[#a1a1aa] uppercase">
            SPARTAN PERFORMANCE NUTRITION
          </div>
          <h1 className="font-['Anybody'] text-4xl sm:text-6xl lg:text-7xl font-black uppercase text-white tracking-tight leading-[0.95] max-w-3xl">
            Nutrición Deportiva<br />
            <span className="text-[#e8dc00]">Certificada</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-300 max-w-xl mt-6 leading-relaxed font-normal">
            Rendimiento respaldado por ciencia. Suplementación, entrenamiento y análisis corporal en una sola plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 mt-8">
            <a
              href="#catalogo"
              className="spartan-btn-primary px-7 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg rounded-xl w-full sm:w-auto font-semibold"
            >
              <span>Explorar Catálogo</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </a>
            <a
              href="#disciplinas"
              className="px-7 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer rounded-xl bg-[#141414] hover:bg-[#1c1c1c] border border-white/10 text-white w-full sm:w-auto font-medium transition-colors"
            >
              <span>Ver Disciplinas →</span>
            </a>
            <Link
              to="/biometria"
              className="px-7 py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer border border-white/10 hover:border-white/20 hover:text-white rounded-xl bg-transparent text-zinc-400 w-full sm:w-auto font-medium transition-colors"
            >
              <Scan className="h-4 w-4" />
              <span>Análisis Corporal</span>
            </Link>
          </div>

          {/* Quick Metrics Bar with Clean Counter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-white/[0.07] max-w-2xl">
            <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/[0.07] rounded-xl p-4 transition-colors">
              <span className="font-['Anybody'] text-2xl sm:text-3xl font-black text-white block">
                {productos.length > 0 ? productos.length : '+120'}
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-zinc-400 tracking-wider font-semibold mt-0.5 block">
                Suplementos Activos
              </span>
            </div>
            <div className="bg-[#111111]/80 backdrop-blur-sm border border-white/[0.07] rounded-xl p-4 transition-colors">
              <span className="font-['Anybody'] text-2xl sm:text-3xl font-black text-white block">
                100%
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-zinc-400 tracking-wider font-semibold mt-0.5 block">
                Productos Verificados
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-[#111111]/80 backdrop-blur-sm border border-white/[0.07] rounded-xl p-4 transition-colors">
              <span className="font-['Anybody'] text-2xl sm:text-3xl font-black text-[#e8dc00] block">
                IA & Pose
              </span>
              <span className="font-['JetBrains_Mono'] text-[10px] uppercase text-zinc-400 tracking-wider font-semibold mt-0.5 block">
                Perfil Biométrico
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Disciplinas & Filosofía de Entrenamiento Spartan ── */}
      <DisciplinesSection />

      {/* ── Catálogo Section ── */}
      <section className="py-16 max-w-[1280px] mx-auto px-6" id="catalogo">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#e8dc00] block mb-1 font-semibold">
              Catálogo Oficial
            </span>
            <h2 className="font-['Anybody'] text-2xl sm:text-3xl text-white uppercase font-bold tracking-tight">
              Suplementos Disponibles
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              {productos.length} productos verificados en inventario.
            </p>
          </div>

          <Link
            to="/catalogo"
            className="spartan-btn-secondary px-5 py-2.5 text-[11px] flex items-center gap-2 cursor-pointer rounded-xl bg-black/40 backdrop-blur-sm border-white/15"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Ver Catálogo Completo</span>
          </Link>
        </div>

        {/* Search & Animated Category Filters with Translucent Style */}
        <div className="spartan-glass-subtle p-4 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar suplemento o SKU..."
                className="w-full spartan-glass-input pl-10 pr-4 py-2 text-xs outline-none font-['JetBrains_Mono'] transition-colors rounded-xl"
              />
            </div>

            <div className="relative max-w-full overflow-hidden w-full md:w-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap pr-8 sm:pr-0">
                <button
                  onClick={() => setSelectedCat('ALL')}
                  className={`relative px-4 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-colors cursor-pointer rounded-xl overflow-hidden shrink-0 ${
                    selectedCat === 'ALL' ? 'text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {selectedCat === 'ALL' && (
                    <motion.div
                      layoutId="activeCatalogCategory"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      className="absolute inset-0 bg-[#e8dc00] z-0 rounded-xl"
                    />
                  )}
                  <span className="relative z-10">Todos</span>
                </button>
                {categorias.slice(0, 7).map((c) => {
                  const isCatActive = selectedCat === c.id_categoria;
                  return (
                    <button
                      key={c.id_categoria}
                      onClick={() => setSelectedCat(c.id_categoria)}
                      className={`relative px-4 py-1.5 text-[11px] font-['JetBrains_Mono'] uppercase font-bold transition-colors cursor-pointer rounded-xl overflow-hidden shrink-0 ${
                        isCatActive ? 'text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {isCatActive && (
                        <motion.div
                          layoutId="activeCatalogCategory"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                          className="absolute inset-0 bg-[#e8dc00] z-0 rounded-xl"
                        />
                      )}
                      <span className="relative z-10">{c.nombre_categoria}</span>
                    </button>
                  );
                })}
              </div>
              {/* Fade gradient cue for mobile horizontal scroll */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#121212] to-transparent pointer-events-none sm:hidden rounded-r-xl" />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin border-2 border-[#e8dc00] border-t-transparent rounded-full" />
            <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider text-zinc-400">
              Cargando productos...
            </span>
          </div>
        ) : catalogError ? (
          <div className="flex flex-col items-center rounded-2xl border border-red-500/20 bg-red-950/20 px-6 py-14 text-center" role="alert">
            <WifiOff className="mb-4 h-8 w-8 text-red-300" aria-hidden="true" />
            <p className="text-sm font-semibold text-white">Catálogo temporalmente no disponible</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-red-100/75">{catalogError}</p>
            <button type="button" onClick={() => void fetchCatalogData()} className="spartan-btn-secondary mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-xs">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar conexión
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center border border-white/10 bg-[#0D0D0D]/60 backdrop-blur-md rounded-2xl">
            <p className="text-sm text-white font-medium">No se encontraron productos</p>
            <p className="text-xs text-[#737373] mt-1">Intenta cambiar los filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.slice(0, 8).map((p, idx) => (
              <ProductCard
                key={p.id_producto}
                producto={p}
                onOpenModal={setSelectedProductModal}
                animationDelay={Math.min(idx, 8) * 30}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Product Detail Modal with Translucent Rounded Glassmorphism ── */}
      <AnimatePresence>
        {selectedProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full max-w-2xl spartan-glass shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col md:flex-row rounded-3xl border-white/15"
            >
              {/* Top Gold Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8dc00] z-20" />

              <button
                onClick={() => setSelectedProductModal(null)}
                className="absolute top-4 right-4 z-30 p-2 text-white/70 hover:text-white transition-colors cursor-pointer spartan-glass-pill rounded-full hover:border-[#e8dc00]/60 shadow-md"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Image */}
              <div className="md:w-1/2 aspect-square md:aspect-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-white/10 rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none">
                <img
                  src={getProductImage(
                    selectedProductModal.codigo_sku,
                    selectedProductModal.categoria?.nombre_categoria,
                    selectedProductModal.imagen_url
                  )}
                  alt={selectedProductModal.nombre_producto}
                  className="max-h-[340px] w-auto object-contain drop-shadow-2xl"
                />
              </div>

              {/* Details */}
              <div className="md:w-1/2 p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    [{selectedProductModal.codigo_sku}]
                  </span>
                  <h3 className="font-['Anybody'] text-xl sm:text-2xl font-bold text-white uppercase tracking-tight mb-2">
                    {selectedProductModal.nombre_producto}
                  </h3>
                  <span className="inline-block px-3 py-1 spartan-glass-pill text-zinc-400 font-['JetBrains_Mono'] text-[10px] uppercase tracking-wider mb-4 rounded-full font-bold">
                    {selectedProductModal.categoria?.nombre_categoria || 'GENERAL'}
                  </span>

                  {selectedProductModal.descripcion && (
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-4 spartan-glass-subtle p-3.5 border-white/10 rounded-2xl">
                      {selectedProductModal.descripcion}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-4 p-3 spartan-glass-subtle rounded-xl border-white/10">
                    <span className="font-['JetBrains_Mono'] text-xs text-[#737373] uppercase">Precio Oficial:</span>
                    <span className="font-['JetBrains_Mono'] text-2xl sm:text-3xl font-black text-[#e8dc00]">
                      Bs. {Number(selectedProductModal.precio_unitario).toFixed(2)}
                    </span>
                  </div>

                  {(role === 'CAJERO' || role === 'ADMINISTRADOR') ? (
                    <button
                      onClick={() => navigate('/pos')}
                      className="w-full spartan-btn-primary py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-lg"
                    >
                      <ShoppingCart className="h-4 w-4 stroke-[3]" />
                      <span>Ir al Punto de Venta</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        toast.info('Para adquirir este producto, acércate a nuestra sucursal o inicia sesión.');
                        setSelectedProductModal(null);
                      }}
                      className="w-full spartan-btn-primary py-3.5 text-xs flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-lg"
                    >
                      <span>Consultar en Sucursal</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1A1A1A] py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-['JetBrains_Mono'] text-[11px] text-[#737373] uppercase">
            © 2026 Spartan Suplementos — Bolivia
          </span>
          <div className="flex gap-4 text-[11px] font-['JetBrains_Mono'] text-[#555] uppercase">
            <a href="#disciplinas" className="hover:text-[#e8dc00] transition-colors">Disciplinas</a>
            <a href="#catalogo" className="hover:text-[#e8dc00] transition-colors">Catálogo</a>
            <Link to="/biometria" className="hover:text-[#e8dc00] transition-colors">Biometría</Link>
            <Link to="/login" className="hover:text-[#e8dc00] transition-colors">Acceso</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
