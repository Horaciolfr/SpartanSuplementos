import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShoppingCart, Package, LogOut, Home, Scan, Menu, X, TrendingUp, Sparkles, Users } from 'lucide-react';
import { storeLogo } from '../utils/productImages';
import { getMaskedRoleLabel } from '../utils/security';
import { motion, AnimatePresence } from 'framer-motion';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const linkClass = (path: string) =>
    `flex items-center gap-1.5 px-3 py-1.5 transition-colors text-xs font-medium rounded-lg ${
      isActive(path)
        ? 'bg-white/[0.08] text-[#e8dc00] font-semibold'
        : 'text-[#a3a3a3] hover:text-white hover:bg-white/[0.04]'
    }`;

  const mobileLinkClass = (path: string) =>
    `flex items-center gap-3 px-4 py-2.5 transition-colors text-xs rounded-lg font-medium tracking-wide ${
      isActive(path)
        ? 'text-black font-semibold bg-[#e8dc00]'
        : 'text-[#a3a3a3] hover:text-white hover:bg-white/[0.05]'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full spartan-glass-nav">
      <div className="mx-auto flex h-18 sm:h-20 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center py-1 group">
          <img
            src={storeLogo}
            alt="Spartan Suplementos"
            className="h-10 sm:h-14 md:h-16 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </Link>

        {/* Desktop Nav Links - Glass Container */}
        <nav className="hidden md:flex items-center gap-1 font-['Inter',sans-serif] bg-white/[0.03] border border-white/[0.06] backdrop-blur-md p-1 rounded-xl shadow-inner">
          <Link to="/" className={linkClass('/')}>
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>

          <Link to="/catalogo" className={linkClass('/catalogo')}>
            <Package className="h-4 w-4" />
            <span>Catálogo</span>
          </Link>

          <Link to="/biometria" className={linkClass('/biometria')}>
            <Scan className="h-4 w-4" />
            <span>Evaluación corporal</span>
          </Link>

          <Link to="/prescripcion" className={linkClass('/prescripcion')}>
            <Sparkles className="h-4 w-4" />
            <span>Orientación nutricional</span>
          </Link>

          {(role === 'CAJERO' || role === 'EMPLEADO' || role === 'ADMINISTRADOR') && (
            <Link to="/pos" className={linkClass('/pos')}>
              <ShoppingCart className="h-4 w-4" />
              <span>Punto de venta</span>
            </Link>
          )}

          {(role === 'ADMINISTRADOR' || role === 'EMPLEADO') && (
            <Link to="/predicciones" className={linkClass('/predicciones')}>
              <TrendingUp className="h-4 w-4" />
              <span>Análisis de ventas</span>
            </Link>
          )}

          {role === 'ADMINISTRADOR' && (
            <Link to="/admin/clientes" className={linkClass('/admin/clientes')}>
              <Users className="h-4 w-4" />
              <span>Clientes</span>
            </Link>
          )}
        </nav>

        {/* User Actions & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">

          {user ? (
            <>
              <div className="hidden sm:block text-right text-xs bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <div className="font-semibold text-white leading-tight">
                  {user.nombres} {user.apellidos}
                </div>
                <span className="text-[10px] font-mono text-[#e8dc00] font-medium uppercase">
                  {getMaskedRoleLabel(role)}
                </span>
              </div>
              <button
                onClick={logout}
                title="Cerrar sesión"
                className="hidden sm:flex h-9 w-9 items-center justify-center border border-white/[0.08] bg-white/[0.03] hover:bg-rose-500/10 text-[#a3a3a3] hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer rounded-lg backdrop-blur-sm"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2 font-['Inter',sans-serif] text-xs">
              <Link
                to="/login"
                className="px-3.5 py-1.5 border border-white/[0.08] bg-white/[0.03] text-[#a3a3a3] hover:text-white hover:border-white/20 rounded-lg transition-all text-xs font-medium"
              >
                Acceder
              </Link>
              <Link
                to="/registro"
                className="px-4 py-1.5 bg-[#e8dc00] text-black font-semibold rounded-lg hover:bg-[#f4e900] transition-all text-xs shadow-sm"
              >
                Crear Cuenta
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[0.05] text-[#ccc7ab] hover:text-white transition-colors cursor-pointer rounded-xl backdrop-blur-md"
            aria-label="Alternar menú de navegación"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer with Smooth Animation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="md:hidden border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur-xl overflow-hidden px-4 py-4 space-y-1 shadow-2xl"
          >
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass('/')}
            >
              <Home className="h-4 w-4" />
              <span>Inicio</span>
            </Link>

            <Link
              to="/catalogo"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass('/catalogo')}
            >
              <Package className="h-4 w-4" />
              <span>Catálogo</span>
            </Link>

            <Link
              to="/biometria"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass('/biometria')}
            >
              <Scan className="h-4 w-4" />
              <span>Evaluación corporal</span>
            </Link>

            <Link
              to="/prescripcion"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileLinkClass('/prescripcion')}
            >
              <Sparkles className="h-4 w-4" />
              <span>Orientación nutricional</span>
            </Link>

            {(role === 'CAJERO' || role === 'EMPLEADO' || role === 'ADMINISTRADOR') && (
              <Link
                to="/pos"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileLinkClass('/pos')}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Punto de venta</span>
              </Link>
            )}

            {(role === 'ADMINISTRADOR' || role === 'EMPLEADO') && (
              <Link
                to="/predicciones"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileLinkClass('/predicciones')}
              >
                <TrendingUp className="h-4 w-4" />
                <span>Análisis de ventas</span>
              </Link>
            )}

            {role === 'ADMINISTRADOR' && (
              <Link
                to="/admin/clientes"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileLinkClass('/admin/clientes')}
              >
                <Users className="h-4 w-4" />
                <span>Clientes</span>
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
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500/30 bg-red-950/20 text-red-300 text-xs rounded-xl font-['JetBrains_Mono'] uppercase cursor-pointer hover:bg-red-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Salir</span>
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center border border-white/10 text-white text-xs font-['JetBrains_Mono'] uppercase tracking-wider rounded-xl hover:bg-white/5"
                >
                  Acceder
                </Link>
                <Link
                  to="/registro"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center bg-[#e8dc00] text-black text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-wider rounded-xl shadow-md"
                >
                  Crear Cuenta
                </Link>
              </div>
            )}

            {/* Mobile Theme Toggle */}
            <div className="pt-2 px-1">
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
