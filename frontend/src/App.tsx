import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Inicio } from './pages/Inicio';
import { Catalogo } from './pages/Catalogo';
import { POS } from './pages/POS';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Presentation & Catalog Routes */}
          <Route path="/" element={<Inicio />} />
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes inside Main Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              {/* Rutas exclusivas de Administrador */}
              <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
                <Route path="/catalogo" element={<Catalogo />} />
              </Route>

              {/* Rutas para Cajero y Administrador */}
              <Route element={<ProtectedRoute allowedRoles={['CAJERO', 'ADMINISTRADOR']} />}>
                <Route path="/pos" element={<POS />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
