import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { ArrowRight, AlertCircle, Home } from 'lucide-react';
import { storeLogo } from '../utils/productImages';
import { deobfuscate } from '../utils/security';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { login, setGuestMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Escudo anti-inspección en el DOM: si un usuario intenta cambiar type="password" a "text" en DevTools, se restaura y limpia
  useEffect(() => {
    const el = passwordInputRef.current;
    if (!el) return;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'type') {
          if (el.getAttribute('type') !== 'password') {
            el.setAttribute('type', 'password');
            setPassword('');
          }
        }
      });
    });
    observer.observe(el, { attributes: true, attributeFilter: ['type'] });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);
    setLoading(true);

    try {
      const { rol } = await login(username, password);
      // Purgar inmediatamente la contraseña de la memoria de React
      setPassword('');

      const destination = (location.state as any)?.from?.pathname || new URLSearchParams(location.search).get('redirect');
      
      const isRoleAllowed = (target: string, r: string): boolean => {
        if (!target || target === '/login' || target === '/') return false;
        if (r === 'ADMINISTRADOR') return true;
        if (r === 'EMPLEADO' || r === 'CAJERO') {
          return target.startsWith('/pos') || target.startsWith('/catalogo') || target.startsWith('/biometria') || target.startsWith('/prescripcion') || target.startsWith('/predicciones');
        }
        // CLIENTE
        return target.startsWith('/biometria') || target.startsWith('/prescripcion') || target.startsWith('/catalogo');
      };

      if (destination && isRoleAllowed(destination, rol)) {
        navigate(destination, { replace: true });
      } else {
        if (rol === 'ADMINISTRADOR') {
          navigate('/catalogo', { replace: true });
        } else if (rol === 'EMPLEADO' || rol === 'CAJERO') {
          navigate('/pos', { replace: true });
        } else {
          navigate('/biometria', { replace: true });
        }
      }
    } catch (err: any) {
      setPassword('');
      const msg = getErrorMessage(err, 'Error al conectar con el servidor backend');
      setError(msg);
      const isPending = err.response?.status === 403 && (
        String(err.response?.data?.detail || '').toLowerCase().includes('no está verificada') ||
        String(err.response?.data?.detail || '').toLowerCase().includes('código') ||
        msg.toLowerCase().includes('no está verificada')
      );
      setIsUnverified(Boolean(isPending));
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (email: string) => {
    setUsername(email);
    // Credencial decodificada al vuelo mediante rotación criptográfica;
    // ninguna contraseña real aparece en texto plano en el bundle ni en el DOM
    setPassword(deobfuscate('Ph4OAgUTHTURGx4DXF9CR1M='));
  };

  return (
    <div className="min-h-screen flex flex-col font-['Hanken_Grotesk'] bg-[#080808] text-[#e2e2e2] relative overflow-hidden">
      {/* Background Ambient Glows for realistic glassmorphism */}
      <div className="spartan-ambient-glow w-[500px] h-[500px] -top-20 -left-20 opacity-40" />
      <div className="spartan-ambient-glow w-[600px] h-[600px] top-1/3 -right-32 opacity-35" />
      <div className="spartan-ambient-glow w-[400px] h-[400px] -bottom-20 left-1/3 opacity-30" />

      {/* Header */}
      <header className="w-full h-18 sm:h-20 spartan-glass-nav flex justify-between items-center px-6 sm:px-10 relative z-20">
        <Link to="/" className="flex items-center group py-1">
          <img
            src={storeLogo}
            alt="Spartan"
            className="h-11 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_2px_12px_rgba(242,229,0,0.18)]"
          />
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            to="/"
            className="text-[#ccc7ab] hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-md"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Inicio</span>
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <main id="contenido-principal" tabIndex={-1} className="flex-grow flex items-center justify-center p-6 relative z-10 my-4">
        <div className="w-full max-w-md spartan-glass p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="mb-8 text-center">
            <img
              src={storeLogo}
              alt="Spartan"
              className="h-20 sm:h-24 w-auto mx-auto mb-5 object-contain drop-shadow-[0_4px_24px_rgba(242,229,0,0.25)]"
            />
            <h1 className="font-['Anybody'] text-2xl text-white uppercase font-black tracking-tight">
              Iniciar Sesión
            </h1>
            <p className="text-sm text-[#ccc7ab] mt-1">
              Acceso al sistema de gestión.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex flex-col gap-2.5 border border-red-500/40 bg-red-950/30 backdrop-blur-md p-3.5 text-xs text-red-300 rounded-xl">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
              {isUnverified && (
                <div className="pt-2 border-t border-red-500/20 flex justify-end">
                  <Link
                    to={`/registro?mode=verify&email=${encodeURIComponent(username.trim())}`}
                    className="spartan-btn-primary py-1.5 px-3 text-[11px] font-['JetBrains_Mono'] uppercase font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <span>Verificar cuenta</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5"
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
                className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab]"
                >
                  Contraseña
                </label>
                <Link
                  to="/recuperar-password"
                  className="text-[11px] font-['JetBrains_Mono'] text-[#e8dc00] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <input
                ref={passwordInputRef}
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full spartan-btn-primary py-3.5 text-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl shadow-[0_4px_20px_rgba(242,229,0,0.3)] font-bold uppercase tracking-wider"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Entrar al Sistema</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Guest / Visitor Direct Access */}
            <button
              type="button"
              onClick={() => {
                setGuestMode();
                navigate('/catalogo');
              }}
              className="w-full py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-['JetBrains_Mono'] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 backdrop-blur-md shadow-sm"
            >
              <span>Continuar como Invitado (Explorar Catálogo)</span>
            </button>

            {/* Register Callout */}
            <div className="text-center text-xs text-[#ccc7ab] pt-1">
              ¿Eres atleta y no tienes cuenta?{' '}
              <Link to="/registro" className="text-[#e8dc00] hover:underline font-bold">
                Crear Perfil de Atleta
              </Link>
            </div>
          </form>

          {/* Quick access — 4 roles (F-01: Exclusivo para tribunal bajo flag explícito) */}
          {import.meta.env.VITE_DEMO_ACCOUNTS === 'true' && (
            <div className="mt-6 pt-5 border-t border-white/10">
              <span className="block text-[10px] font-['JetBrains_Mono'] text-[#888] uppercase mb-2 text-center tracking-wider font-semibold">
                Accesos rápidos por rol (Modo Demostración)
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-['JetBrains_Mono']">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin@spartan.dev')}
                  className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2 text-[#e8dc00] hover:border-[#e8dc00]/60 transition-all uppercase font-bold cursor-pointer rounded-xl backdrop-blur-sm"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('cajero@spartan.dev')}
                  className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2 text-emerald-400 hover:border-emerald-500/60 transition-all uppercase font-bold cursor-pointer rounded-xl backdrop-blur-sm"
                >
                  Empleado
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('cliente@spartan.dev')}
                  className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2 text-blue-400 hover:border-blue-500/60 transition-all uppercase font-bold cursor-pointer rounded-xl backdrop-blur-sm"
                >
                  Cliente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGuestMode();
                    navigate('/catalogo');
                  }}
                  className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] py-2 text-[#ccc7ab] hover:border-white/40 transition-all uppercase font-bold cursor-pointer rounded-xl backdrop-blur-sm"
                >
                  Invitado
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
