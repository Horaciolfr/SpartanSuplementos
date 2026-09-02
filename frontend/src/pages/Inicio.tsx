import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Producto, Categoria } from '../types';
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
} from 'lucide-react';

export const Inicio: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<number | 'ALL'>('ALL');

  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiClient.get<Producto[]>('/catalogo/productos'),
          apiClient.get<Categoria[]>('/catalogo/categorias'),
        ]);
        setProductos(prodRes.data.filter((p) => p.estado_activo));
        setCategorias(catRes.data);
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
    <div className="min-h-screen bg-[#0D0D0D] text-[#e2e2e2] font-['Hanken_Grotesk'] selection:bg-[#f2e500] selection:text-black">
      {/* Top Navigation */}
      <nav
        className="w-full border-b border-[#1A1A1A] bg-[#131313]/90 backdrop-blur-md sticky top-0 z-50 transition-all duration-300"
        id="main-nav"
      >
        <div className="max-w-[1280px] mx-auto px-6 h-20 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="font-['Anybody'] text-2xl md:text-3xl text-[#f2e500] italic font-black uppercase tracking-tighter group-hover:scale-105 transition-transform">
              SPARTAN
            </span>
            <span className="text-[10px] font-['JetBrains_Mono'] tracking-widest text-[#ccc7ab] uppercase ml-1 hidden sm:inline">
              Bolivia
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-['JetBrains_Mono'] uppercase tracking-wider">
            <a href="#" className="text-white border-b-2 border-[#f2e500] pb-1 font-bold">
              Inicio
            </a>
            <a href="#catalogo" className="text-[#ccc7ab] hover:text-white transition-colors">
              Catálogo
            </a>
            <a href="#historia" className="text-[#ccc7ab] hover:text-white transition-colors">
              Nuestra Historia
            </a>
            {role === 'ADMINISTRADOR' && (
              <Link to="/catalogo" className="text-[#f2e500] hover:text-white transition-colors">
                Inventario ERP
              </Link>
            )}
            {(role === 'CAJERO' || role === 'ADMINISTRADOR') && (
              <Link to="/pos" className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors">
                Punto de Venta
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            <a
              href="#catalogo"
              className="text-[#e2e2e2] hover:text-[#f2e500] transition-colors p-2"
              title="Buscar en catálogo"
            >
              <Search className="h-5 w-5" />
            </a>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right text-xs">
                  <div className="font-bold text-white leading-tight">
                    {user.nombres} {user.apellidos}
                  </div>
                  <span className="inline-block text-[10px] font-['JetBrains_Mono'] uppercase px-1.5 py-0.5 bg-black border border-[#f2e500]/40 text-[#f2e500]">
                    {role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Cerrar Sesión"
                  className="border border-[#1A1A1A] bg-black p-2.5 text-[#ccc7ab] hover:text-red-400 hover:border-red-500/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs uppercase font-black px-6 py-3 hover:bg-white transition-colors flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Acceder</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center pt-12 pb-20 overflow-hidden border-b border-[#1A1A1A]">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D0D0D] via-[#0D0D0D]/80 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-transparent to-transparent z-10" />
          <div
            className="w-full h-full bg-cover bg-center object-cover opacity-50 mix-blend-luminosity"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAXxG-e_mbJHW-EaAqtXe_DLd_U2bNtB6xTVMTFwlYb5Kyco9Didh1xgS1YRqa0kIz8SCXOTqB07jIY_oya0nWH-JGJs4Y_g9QDv1wZm1YVOhXUOgEHv7hfZOC7Lk4aaMOn4ANapj6H4_K1HUkubn9AgTGZBUjkNbvA2k-Wu8o4BmZ6f-IBSBsbe77U8SKs9ZMeOignPl4upbG-coh7PbiwYptpD2ljLDHGFHlShmM7x3qXlcn6LdP8')",
            }}
          />
        </div>

        <div className="max-w-[1280px] mx-auto px-6 relative z-20 w-full">
          <div className="max-w-2xl">
            <span className="inline-block px-3 py-1 bg-[#1A1A1A] border border-white/20 text-[#e2e2e2] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-6">
              Bolivia's Premium Standard
            </span>

            <h1 className="font-['Anybody'] text-5xl sm:text-6xl md:text-7xl text-white uppercase font-black mb-6 leading-none tracking-tight">
              Eleva Tu <br />
              <span className="text-[#f2e500]">Potencial</span>
            </h1>

            <p className="font-['Hanken_Grotesk'] text-lg text-[#ccc7ab] mb-10 max-w-xl leading-relaxed">
              Suplementación de grado élite para atletas que exigen resultados. Construye tu mejor versión con Spartan Suplementos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center bg-[#f2e500] text-black font-['JetBrains_Mono'] text-xs uppercase font-black px-8 py-4 hover:bg-white transition-all hover:scale-105"
              >
                <span>Ver Catálogo de Productos</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
              <a
                href="#historia"
                className="inline-flex items-center justify-center border-2 border-white text-white font-['JetBrains_Mono'] text-xs uppercase font-bold px-8 py-4 hover:bg-white/10 transition-colors"
              >
                Nuestra Historia
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Live Catalog Section */}
      <section id="catalogo" className="py-20 bg-[#0D0D0D] border-b border-[#1A1A1A]">
        <div className="max-w-[1280px] mx-auto px-6">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-[#f2e500]/30 text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-3">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Línea Oficial Spartan</span>
              </div>
              <h2 className="font-['Anybody'] text-3xl sm:text-4xl text-white uppercase font-bold tracking-tight">
                Catálogo de Suplementos
              </h2>
              <p className="font-['Hanken_Grotesk'] text-[#ccc7ab] text-sm mt-1">
                Fórmulas científicas diseñadas para máxima absorción, potencia muscular y resistencia.
              </p>
            </div>

            {role === 'ADMINISTRADOR' && (
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 bg-[#1A1A1A] border border-[#f2e500] text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase px-5 py-2.5 font-bold hover:bg-[#f2e500] hover:text-black transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>Administrar Inventario</span>
              </Link>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-10 items-start md:items-center justify-between bg-[#131313] p-5 border border-[#1A1A1A]">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#ccc7ab]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
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
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="py-20 text-center text-[#ccc7ab] flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin border-2 border-[#f2e500] border-t-transparent rounded-full" />
              <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
                Cargando suplementos Spartan...
              </span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-20 text-center text-gray-500 bg-[#131313] border border-[#1A1A1A]">
              <p className="text-sm font-['Hanken_Grotesk']">
                No se encontraron productos que coincidan con la búsqueda o filtro.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_actual <= 0;
                const isLowStock = p.stock_actual <= p.stock_seguridad;

                return (
                  <div
                    key={p.id_producto}
                    className="bg-[#131313] border border-[#1A1A1A] hover:border-[#f2e500] transition-colors p-6 flex flex-col justify-between group relative"
                  >
                    {/* Top Tags */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-['JetBrains_Mono'] text-[11px] font-bold text-[#f2e500] uppercase tracking-wider">
                          {p.codigo_sku}
                        </span>
                        <span className="px-2 py-0.5 bg-black border border-white/10 text-gray-400 font-['JetBrains_Mono'] text-[10px] uppercase">
                          {p.categoria?.nombre_categoria || 'Suplemento'}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h3 className="font-['Anybody'] text-lg text-white uppercase font-bold tracking-tight mb-2 group-hover:text-[#f2e500] transition-colors">
                        {p.nombre_producto}
                      </h3>
                    </div>

                    {/* Pricing & Stock */}
                    <div className="mt-6 pt-4 border-t border-[#1A1A1A]">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <span className="text-[10px] font-['JetBrains_Mono'] text-gray-500 uppercase block">
                            Precio de Lista
                          </span>
                          <span className="font-['Anybody'] text-2xl text-white font-black">
                            Bs. {Number(p.precio_unitario).toFixed(2)}
                          </span>
                        </div>

                        {/* Stock indicator badge */}
                        <div className="text-right">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-['JetBrains_Mono'] uppercase font-bold ${
                              isOutOfStock
                                ? 'bg-red-950/40 text-red-400 border border-red-500/40'
                                : isLowStock
                                ? 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/40'
                            }`}
                          >
                            {isOutOfStock ? 'Agotado' : `${p.stock_actual} en stock`}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {role === 'CAJERO' || role === 'ADMINISTRADOR' ? (
                        <button
                          onClick={() => navigate('/pos')}
                          className="w-full bg-[#1A1A1A] hover:bg-[#f2e500] text-white hover:text-black border border-white/10 hover:border-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase font-bold py-2.5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          <span>Vender en POS</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => (!user ? navigate('/login') : alert(`Producto: ${p.nombre_producto}\nPrecio: Bs. ${p.precio_unitario}\nDisponible en tienda Spartan.`))}
                          className="w-full bg-[#f2e500] text-black hover:bg-white font-['JetBrains_Mono'] text-xs uppercase font-black py-2.5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>{user ? 'Consultar Producto' : 'Comprar / Acceder'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Historia Section */}
      <section className="py-24 bg-[#131313] border-b border-[#1A1A1A]" id="historia">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative group">
              <div className="absolute inset-0 bg-[#f2e500]/20 translate-x-4 translate-y-4 border border-[#f2e500] group-hover:translate-x-6 group-hover:translate-y-6 transition-transform duration-500" />
              <img
                className="relative z-10 w-full h-[550px] object-cover grayscale group-hover:grayscale-0 transition-all duration-700 border border-[#1A1A1A]"
                alt="Spartan Athletics Gym"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCKn8XlVD1Na4N77kS1fCypFlLvUxrqoQdw_D8AKaHp1-93Q5r30lJ9Zq2-BfVjpdFzpWas5LMR1NNFIGopS40ZZNFqtiydKPYJwfMxAhJ4A5O0czwjZ4ujsvBeyJu9DIhEnjWdf9tvJRn_OvzHAH1e9U8K3g3nTtfaNiYi2fiCu_ZKNUXARWCnQmMubahQrXyhWcgF7Bs01GdzmikutWvGTxo7GJ3MSQvH2KCOG-8CUuXcjqWGigg"
              />
            </div>

            <div className="order-1 lg:order-2">
              <span className="inline-block px-3 py-1 bg-black border border-[#f2e500]/40 text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-4">
                Identidad & Legado
              </span>
              <h2 className="font-['Anybody'] text-3xl sm:text-4xl md:text-5xl text-white uppercase font-bold mb-8">
                Nuestra <span className="text-[#f2e500]">Historia</span>
              </h2>

              <div className="space-y-6 text-[#ccc7ab] text-base leading-relaxed">
                <p>
                  Nacidos de una convicción inquebrantable: lo extraordinario existe dentro de lo ordinario.
                  Spartan Suplementos comenzó en Bolivia con una misión clara de elevar el estándar de la nutrición deportiva en el país.
                </p>
                <p>
                  Como los espartanos de antaño, creemos en la disciplina, la resiliencia y el poder de la comunidad. No solo vendemos productos; forjamos atletas. Cada suplemento que ofrecemos es seleccionado bajo los más estrictos estándares de calidad internacional, asegurando que recibas solo lo que tu cuerpo necesita para romper sus límites.
                </p>
                <div className="border-l-2 border-[#f2e500] pl-6 py-2 italic text-white mt-8 text-lg font-['Anybody']">
                  "Somos soñadores, luchadores y visionarios, unidos por el deseo compartido de liberar nuestro máximo potencial."
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Mision / Experiencia */}
      <section className="py-20 bg-[#0D0D0D] border-b border-[#1A1A1A]">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mision Card */}
            <div className="md:col-span-2 bg-[#131313] border border-[#1A1A1A] p-10 relative overflow-hidden group hover:border-[#f2e500] transition-colors duration-300">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-[#f2e500]">
                <Flame className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <span className="inline-block px-2.5 py-1 bg-black text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase mb-4 border border-[#f2e500]/30">
                  Misión
                </span>
                <h3 className="font-['Anybody'] text-2xl md:text-3xl text-white font-bold mb-4 uppercase">
                  Despierta tu Fuego Interior
                </h3>
                <p className="font-['Hanken_Grotesk'] text-[#ccc7ab] text-base max-w-lg leading-relaxed">
                  Ser el catalizador de fuerza y resiliencia para cada atleta en Bolivia, proporcionando nutrición de vanguardia y conocimiento experto que inspire a individuos a desbloquear su potencial diario.
                </p>
              </div>
            </div>

            {/* Asesoría Card */}
            <div className="bg-[#131313] border border-[#1A1A1A] p-10 flex flex-col justify-between group hover:border-[#f2e500] transition-colors duration-300">
              <div>
                <span className="inline-block px-2.5 py-1 bg-black text-white font-['JetBrains_Mono'] text-xs uppercase mb-4 border border-white/20">
                  Experiencia
                </span>
                <h3 className="font-['Anybody'] text-2xl text-white font-bold mb-4 uppercase">
                  Asesoría de Élite
                </h3>
                <p className="font-['Hanken_Grotesk'] text-[#ccc7ab] text-sm leading-relaxed">
                  Más allá del producto. Ofrecemos orientación precisa y profesional para optimizar tus resultados corporales y de rendimiento con trazabilidad garantizada.
                </p>
              </div>

              <div className="mt-8 flex items-center text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase font-bold group-hover:translate-x-2 transition-transform cursor-pointer">
                <span>Conocer Más</span>
                <ArrowRight className="h-4 w-4 ml-2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="bg-[#0D0D0D] py-12">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-['Anybody'] text-2xl text-[#f2e500] italic font-black uppercase">
            Spartan{' '}
            <span className="text-[#ccc7ab] text-sm not-italic font-normal block md:inline md:ml-2">
              Bolivia - Suplementación & ERP
            </span>
          </div>
          <div className="flex gap-6 text-xs font-['JetBrains_Mono'] text-gray-500 uppercase">
            <span>© 2026 Spartan Suplementos</span>
            <span>•</span>
            <a href="#catalogo" className="hover:text-[#f2e500] transition-colors">
              Catálogo
            </a>
            <span>•</span>
            <Link to="/login" className="hover:text-[#f2e500] transition-colors">
              Ingreso Personal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
