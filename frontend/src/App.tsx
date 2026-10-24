import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Toaster } from 'sonner';

const Inicio = lazy(() => import('./pages/Inicio').then((module) => ({ default: module.Inicio })));
const Catalogo = lazy(() => import('./pages/Catalogo').then((module) => ({ default: module.Catalogo })));
const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Registro = lazy(() => import('./pages/Registro').then((module) => ({ default: module.Registro })));
const RecuperarPassword = lazy(() => import('./pages/RecuperarPassword').then((module) => ({ default: module.RecuperarPassword })));
const POS = lazy(() => import('./pages/POS').then((module) => ({ default: module.POS })));
const Biometria = lazy(() => import('./pages/Biometria').then((module) => ({ default: module.Biometria })));
const PrediccionesVentas = lazy(() => import('./pages/PrediccionesVentas').then((module) => ({ default: module.PrediccionesVentas })));
const Prescripcion = lazy(() => import('./pages/Prescripcion').then((module) => ({ default: module.Prescripcion })));
const ClientesAdmin = lazy(() => import('./pages/ClientesAdmin').then((module) => ({ default: module.ClientesAdmin })));
const ClienteDetalleAdmin = lazy(() => import('./pages/ClienteDetalleAdmin').then((module) => ({ default: module.ClienteDetalleAdmin })));

const AppContent: React.FC = () => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    localStorage.removeItem('spartan_theme');
  }, []);

  return (
    <AuthProvider>
      <a
        href="#contenido-principal"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-[#e8dc00] px-4 py-2 text-sm font-bold text-black shadow-lg transition-transform focus:translate-y-0"
      >
        Saltar al contenido principal
      </a>
      <Toaster position="top-right" theme="dark" richColors closeButton />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Presentation & Exploration Routes */}
          <Route path="/" element={<Inicio />} />
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-password" element={<RecuperarPassword />} />

          {/* Protected Routes inside Main Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/biometria" element={<Biometria />} />
              <Route path="/prescripcion" element={<Prescripcion />} />
              <Route path="/prescripcion/:id" element={<Prescripcion />} />
              {/* Rutas exclusivas para Empleados / Cajeros y Administradores */}
              <Route element={<ProtectedRoute allowedRoles={['EMPLEADO', 'CAJERO', 'ADMINISTRADOR']} />}>
                <Route path="/pos" element={<POS />} />
              </Route>
              {/* Módulo Predictivo de Ventas para el Administrador */}
              <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR', 'EMPLEADO']} />}>
                <Route path="/predicciones" element={<PrediccionesVentas />} />
              </Route>
              {/* Módulo de Administración de Clientes y Planes (Exclusivo ADMINISTRADOR) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
                <Route path="/admin/clientes" element={<ClientesAdmin />} />
                <Route path="/admin/clientes/:id" element={<ClienteDetalleAdmin />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
};

export default App;
