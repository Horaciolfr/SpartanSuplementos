import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingCart, Package, LogOut, User as UserIcon, Home } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const location = useLocation();

  const getRoleBadge = (r?: string | null) => {
    switch (r) {
      case 'ADMINISTRADOR':
        return 'border-[#f2e500]/50 text-[#f2e500] bg-black';
      case 'CAJERO':
        return 'border-emerald-500/50 text-emerald-400 bg-black';
      default:
        return 'border-blue-500/50 text-blue-400 bg-black';
    }
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1A1A1A] bg-[#131313]/95 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6">
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-['Anybody'] text-2xl md:text-3xl text-[#f2e500] italic font-black uppercase tracking-tighter group-hover:scale-105 transition-transform">
            SPARTAN
          </span>
          <span className="text-[10px] font-['JetBrains_Mono'] tracking-widest text-[#ccc7ab] uppercase ml-1 hidden sm:inline">
            ERP
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-4 font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
              isActive('/')
                ? 'text-white border-b-2 border-[#f2e500] font-bold'
                : 'text-[#ccc7ab] hover:text-white'
            }`}
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Inicio</span>
          </Link>

          {role === 'ADMINISTRADOR' && (
            <Link
              to="/catalogo"
              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                isActive('/catalogo')
                  ? 'text-white border-b-2 border-[#f2e500] font-bold'
                  : 'text-[#ccc7ab] hover:text-white'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Inventario</span>
            </Link>
          )}

          {(role === 'CAJERO' || role === 'ADMINISTRADOR') && (
            <Link
              to="/pos"
              className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
                isActive('/pos')
                  ? 'text-white border-b-2 border-[#f2e500] font-bold'
                  : 'text-[#ccc7ab] hover:text-white'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Punto de Venta</span>
            </Link>
          )}
        </nav>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-right">
            <div>
              <div className="text-xs font-bold text-white leading-tight">
                {user ? `${user.nombres} ${user.apellidos}` : 'Usuario'}
              </div>
              <div className="flex justify-end mt-1">
                <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-['JetBrains_Mono'] uppercase font-bold tracking-wider ${getRoleBadge(role)}`}>
                  {role || 'Invitado'}
                </span>
              </div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center bg-black border border-[#2a2a2a] text-[#ccc7ab]">
              <UserIcon className="h-4 w-4" />
            </div>
          </div>

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex h-9 w-9 items-center justify-center border border-[#1A1A1A] bg-black text-[#ccc7ab] hover:text-red-400 hover:border-red-500/40 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
