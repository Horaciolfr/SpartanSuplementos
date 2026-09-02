import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errors';
import { ArrowRight, AlertCircle, HelpCircle, Shield, Home } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      const role = localStorage.getItem('role');
      if (role === 'ADMINISTRADOR') {
        navigate('/catalogo');
      } else {
        navigate('/pos');
      }
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al conectar con el servidor backend'));
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email: string) => {
    setUsername(email);
    setPassword('SpartanAdmin2026!');
  };

  return (
    <div className="min-h-screen flex flex-col font-['Hanken_Grotesk'] antialiased selection:bg-[#f2e500] selection:text-black relative bg-black text-[#e2e2e2]">
      {/* Background Image / Texture */}
      <div
        className="fixed inset-0 z-0 opacity-25 pointer-events-none bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCGeRvFsPC72vt9eWBxqDKulHotYoMDhZou7cj931RlM3cHH24Ge5jFlUPTx5ada_Fz7LRc4NKJg1ifBhSeB7US0JGvjAtHwh3zFJCoypHga9pYjN4mSlw0Ln6V17GM6LJC7323lkzuEYFuHGkby4R88es6DIfRlBlY2-k1TSC1kPbeokd5PeHeV12jKbPMIMn-kzgX4zsg95D0o_hAzNacUNb-8QpVOAp4XBVjzhzR2JK59ASN4dsr')",
        }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-t from-black via-black/85 to-black pointer-events-none" />

      {/* Top Header */}
      <header className="w-full h-20 border-b border-[#1A1A1A] flex justify-between items-center px-6 sm:px-12 relative z-10 bg-black/60 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="font-['Anybody'] text-2xl sm:text-3xl text-[#f2e500] italic font-black uppercase tracking-tighter group-hover:scale-105 transition-transform">
            SPARTAN
          </span>
          <span className="text-[10px] font-['JetBrains_Mono'] tracking-widest text-gray-500 uppercase ml-1 hidden sm:inline">
            Bolivia
          </span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors flex items-center gap-2 text-xs font-['JetBrains_Mono'] uppercase tracking-wider"
          >
            <Home className="h-4 w-4" />
            <span>Inicio</span>
          </Link>
          <a
            className="text-[#ccc7ab] hover:text-[#f2e500] transition-colors flex items-center gap-1.5 text-xs font-['JetBrains_Mono'] uppercase tracking-wider"
            href="#soporte"
            onClick={(e) => {
              e.preventDefault();
              alert('Para asistencia técnica o consultas de acceso, contacta al administrador del sistema.');
            }}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Soporte</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 relative z-10 py-12">
        <div className="bg-[#0D0D0D] border border-[#1A1A1A] w-full max-w-md p-8 md:p-10 shadow-2xl relative">
          {/* Accent top border highlight */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500]" />

          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border border-[#f2e500]/40 bg-black text-[#f2e500]">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="font-['Anybody'] text-3xl sm:text-4xl text-white uppercase font-bold tracking-tight mb-1">
              Ingresar
            </h1>
            <p className="font-['Hanken_Grotesk'] text-sm text-[#ccc7ab]">
              Bienvenido de vuelta a la arena.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 border border-red-500/40 bg-red-950/20 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-2"
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@spartan.dev"
                className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-4 py-3 text-sm outline-none transition-colors font-['Hanken_Grotesk'] placeholder-gray-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab]"
                >
                  Contraseña
                </label>
                <span className="text-[11px] font-['JetBrains_Mono'] text-gray-500 hover:text-[#f2e500] cursor-pointer">
                  ¿Olvidaste tu clave?
                </span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#141414] border border-[#2a2a2a] focus:border-[#f2e500] text-white px-4 py-3 text-sm outline-none transition-colors font-['Hanken_Grotesk'] placeholder-gray-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#f2e500] text-black font-['Anybody'] text-lg uppercase font-black py-4 hover:bg-white transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credentials Helpers for Auditor/Testing */}
          <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
            <span className="block text-[10px] font-['JetBrains_Mono'] font-bold tracking-widest text-gray-500 uppercase mb-3 text-center">
              Accesos Rápidos de Auditoría
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-['JetBrains_Mono']">
              <button
                type="button"
                onClick={() => fillCredentials('admin@spartan.dev')}
                className="border border-[#f2e500]/30 bg-black py-2 px-1 text-[#f2e500] hover:bg-[#f2e500]/10 transition-colors uppercase text-[11px] font-bold"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('cajero@spartan.dev')}
                className="border border-emerald-500/30 bg-black py-2 px-1 text-emerald-400 hover:bg-emerald-500/10 transition-colors uppercase text-[11px] font-bold"
              >
                Cajero
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('cliente@spartan.dev')}
                className="border border-blue-500/30 bg-black py-2 px-1 text-blue-400 hover:bg-blue-500/10 transition-colors uppercase text-[11px] font-bold"
              >
                Cliente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
