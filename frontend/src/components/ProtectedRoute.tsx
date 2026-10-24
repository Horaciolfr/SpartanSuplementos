import React from 'react';
import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getMaskedRoleLabel } from '../utils/security';
import { ShieldAlert } from 'lucide-react';
import { PageLoader } from './PageLoader';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader message="Verificando tu sesión segura" />;
  }

  // Si no está autenticado y la ruta no admite INVITADO
  if (!isAuthenticated && (!allowedRoles || !allowedRoles.includes('INVITADO'))) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role) {
    const isAllowed =
      allowedRoles.includes(role) ||
      (role === 'CAJERO' && allowedRoles.includes('EMPLEADO')) ||
      (role === 'EMPLEADO' && allowedRoles.includes('CAJERO'));

    if (!isAllowed) {
      return (
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 max-w-md">
            <ShieldAlert className="mx-auto h-16 w-16 text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No tienes acceso a este módulo</h2>
            <p className="text-gray-400 mb-6">
              Tu perfil actual (<strong className="text-red-400">{getMaskedRoleLabel(role)}</strong>) no incluye los permisos necesarios. Si necesitas acceso, consulta con un administrador.
            </p>
            <Link to="/" className="spartan-btn-secondary inline-flex px-5 py-2.5 text-xs">
              Volver al inicio
            </Link>
          </div>
        </div>
      );
    }
  }

  return <Outlet />;
};
