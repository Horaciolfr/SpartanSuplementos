import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0f1115]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#d4af37] border-t-transparent"></div>
          <span className="text-sm font-semibold tracking-wider text-gray-400 uppercase">Cargando Spartan ERP...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center p-8 text-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 max-w-md">
          <ShieldAlert className="mx-auto h-16 w-16 text-red-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso No Autorizado (403)</h2>
          <p className="text-gray-400 mb-6">
            Tu rol actual (<strong className="text-red-400">{role}</strong>) no cuenta con los privilegios necesarios para ver este módulo.
          </p>
          <button
            onClick={() => window.history.back()}
            className="rounded-lg bg-gray-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
