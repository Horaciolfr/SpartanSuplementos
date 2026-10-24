import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  ShoppingCart,
  Package,
  Layers,
  Scan,
  Menu,
  X,
  LogOut,
  Sparkles,
  TrendingUp,
  Users,
  Search,
} from 'lucide-react';
import { storeLogo } from '../utils/productImages';
import { getMaskedRoleLabel } from '../utils/security';

export const EnterpriseLayout: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  const getActiveModuleTitle = () => {
    if (location.pathname.startsWith('/pos')) return 'Punto de venta';
    if (location.pathname.startsWith('/catalogo')) return 'Catálogo e inventario';
    if (location.pathname.startsWith('/biometria')) return 'Evaluación corporal';
    if (location.pathname.startsWith('/prescripcion')) return 'Orientación nutricional';
    if (location.pathname.startsWith('/admin/clientes')) return 'Gestión de clientes';
    if (location.pathname.startsWith('/predicciones')) return 'Análisis de ventas';
    return 'Área de trabajo';
  };

  const isActive = (path: string) => {
    if (path === '/prescripcion') {
      return location.pathname.startsWith('/prescripcion');
    }
    if (path === '/admin/clientes') {
      return location.pathname.startsWith('/admin/clientes');
    }
    return location.pathname === path;
  };

  const navItemClass = (path: string) => `
    flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer rounded-lg mx-2
    ${isActive(path)
      ? 'spartan-nav-active'
      : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-white/[0.04]'
    }
  `;

  return (
    <div className="min-h-screen bg-[#070707] text-[#f5f5f5] font-['Inter',sans-serif] flex flex-col antialiased selection:bg-[rgba(232,220,0,0.25)] selection:text-white w-full max-w-full overflow-x-hidden">
      {/* =========================================================================
          TOPBAR: Barra Superior Unificada y Limpia
          ========================================================================= */}
      <header className="h-16 bg-[#0c0c0c]/90 border-b border-white/[0.07] backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 w-full min-w-0">
        {/* Lado Izquierdo: Brand & Toggle de Sidebar */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 border border-white/[0.08] hover:border-white/20 bg-white/[0.03] text-[#a3a3a3] hover:text-white transition-all cursor-pointer rounded-lg"
            title="Mostrar u ocultar navegación"
            aria-label="Mostrar u ocultar navegación"
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={storeLogo}
              alt="Spartan Core"
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:flex flex-col">
              <span className="font-['Anybody'] text-sm font-black tracking-wider uppercase text-white leading-tight">
                SPARTAN <span className="text-[#e8dc00]">CORE</span>
              </span>
              <span className="text-[10px] text-[#6f6f6f] font-mono tracking-wider">
                Plataforma de gestión
              </span>
            </div>
          </Link>
        </div>

        {/* Centro: Indicador de Módulo Activo / Buscador */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-white/[0.06] rounded-lg text-xs text-[#a3a3a3] max-w-md w-full justify-between min-w-0">
          <div className="flex items-center gap-2 truncate min-w-0">
            <span className="text-[#6f6f6f] shrink-0">Módulo:</span>
            <span className="text-[#f5f5f5] font-medium truncate">{getActiveModuleTitle()}</span>
          </div>
          <Search className="h-3.5 w-3.5 text-[#6f6f6f] shrink-0" />
        </div>

        {/* Lado Derecho: Controles y Usuario */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sesión de Usuario */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08] shrink-0">
              <div className="hidden sm:block text-right bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                <div className="text-xs font-semibold text-white leading-none">
                  {user.nombres}
                </div>
                <span className="text-[9px] font-mono text-[#e8dc00] uppercase tracking-wider font-medium">
                  {getMaskedRoleLabel(role)}
                </span>
              </div>
              <button
                onClick={logout}
                title="Cerrar Sesión"
                className="p-2 bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-[#a3a3a3] hover:text-rose-400 transition-all cursor-pointer rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 bg-[#e8dc00] text-black font-semibold text-xs transition-colors rounded-lg hover:bg-[#f4e900]"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>

      {/* =========================================================================
          BODY: Sidebar Único Persistente (240px) + Área de Contenido
          ========================================================================= */}
      <div className="flex-1 flex w-full relative min-w-0 overflow-hidden">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity"
          />
        )}

        {/* 1. SIDEBAR: Ancho 240px, fondo #090909, acento en borde izquierdo sutil */}
        <aside
          className={`
            fixed md:static inset-y-0 left-0 top-16 md:top-0 h-[calc(100vh-4rem)] md:h-auto
            ${sidebarOpen ? 'w-60 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-16'}
            border-r border-white/[0.06] bg-[#090909] flex flex-col justify-between transition-all duration-200 z-50 md:z-40 shrink-0
          `}
        >
          <div className="py-5 space-y-6 overflow-y-auto overflow-x-hidden min-h-0">
            {/* SECCIÓN 1: OPERACIONES */}
            <div>
              {sidebarOpen && (
                <div className="px-4 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#a3a3a3] font-bold">
                    Operación comercial
                  </span>
                </div>
              )}
              <div className="space-y-1">
                {(role === 'ADMINISTRADOR' || role === 'EMPLEADO' || role === 'CAJERO') && (
                  <Link
                    to="/pos"
                    onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
                    className={navItemClass('/pos')}
                    title="Punto de Venta"
                  >
                    <ShoppingCart className="h-[18px] w-[18px] shrink-0" />
                  {sidebarOpen && <span>Punto de venta</span>}
                  </Link>
                )}

                <Link
                  to="/catalogo"
                  onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={navItemClass('/catalogo')}
                  title="Catálogo de Productos"
                >
                  <Package className="h-[18px] w-[18px] shrink-0" />
                  {sidebarOpen && <span>Catálogo</span>}
                </Link>
              </div>
            </div>

            {/* SECCIÓN 2: SALUD & BIOMETRÍA */}
            <div>
              {sidebarOpen && (
                <div className="px-4 mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-[#a3a3a3] font-bold">
                    Evaluación y asesoría
                  </span>
                </div>
              )}
              <div className="space-y-1">
                <Link
                  to="/biometria"
                  onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={navItemClass('/biometria')}
                  title="Evaluación corporal"
                >
                  <Scan className="h-[18px] w-[18px] shrink-0" />
                  {sidebarOpen && <span>Evaluación corporal</span>}
                </Link>

                <Link
                  to="/prescripcion"
                  onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
                  className={navItemClass('/prescripcion')}
                  title="Orientación nutricional"
                >
                  <Sparkles className="h-[18px] w-[18px] shrink-0" />
                  {sidebarOpen && <span>Orientación nutricional</span>}
                </Link>
              </div>
            </div>

            {/* SECCIÓN 3: GESTIÓN & ANALÍTICA */}
            {(role === 'ADMINISTRADOR' || role === 'EMPLEADO') && (
              <div>
                {sidebarOpen && (
                  <div className="px-4 mb-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#a3a3a3] font-bold">
                    Gestión y análisis
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  {role === 'ADMINISTRADOR' && (
                    <Link
                      to="/admin/clientes"
                      onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
                      className={navItemClass('/admin/clientes')}
                      title="Administración de Clientes y Planes"
                    >
                      <Users className="h-[18px] w-[18px] shrink-0" />
                      {sidebarOpen && <span>Clientes</span>}
                    </Link>
                  )}
                  <Link
                    to="/predicciones"
                    onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
                    className={navItemClass('/predicciones')}
                    title="Predicción de Ventas"
                  >
                    <TrendingUp className="h-[18px] w-[18px] shrink-0" />
                  {sidebarOpen && <span>Análisis de ventas</span>}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER DEL SIDEBAR: Portal Público */}
          <div className="p-3 border-t border-white/[0.06]">
            <Link
              to="/"
              onClick={() => typeof window !== 'undefined' && window.innerWidth < 1024 && setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-[13px] text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-white/[0.04] transition-colors rounded-lg mx-1"
              title="Ir al Portal Público"
            >
              <Layers className="h-[18px] w-[18px] shrink-0" />
              {sidebarOpen && <span>Portal web</span>}
            </Link>
          </div>
        </aside>

        {/* 2. MAIN CONTENT: Área de Trabajo */}
        <main id="contenido-principal" tabIndex={-1} className="spartan-workspace flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0 min-w-0 w-full">
          {/* Breadcrumb sutil y elegante */}
          <div className="border-b border-white/[0.06] bg-[#0c0c0c] px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#a3a3a3] min-w-0">
            <div className="flex items-center gap-2 truncate min-w-0">
              <span className="text-[#a3a3a3] shrink-0">Plataforma /</span>
              <span className="text-[#f5f5f5] font-medium truncate">{getActiveModuleTitle()}</span>
            </div>
          </div>

          {/* Inyección de la Vista Hija */}
          <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default EnterpriseLayout;
