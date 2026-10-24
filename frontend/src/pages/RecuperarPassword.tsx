import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { ArrowRight, AlertCircle, Home, KeyRound, CheckCircle2 } from 'lucide-react';
import { storeLogo } from '../utils/productImages';
import { toast } from 'sonner';

export const RecuperarPassword: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { requestPasswordReset, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
      toast.success('Si el correo está registrado, se envió un código de 6 dígitos.');
      setStep(2);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error solicitando el código de recuperación.'));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nuevaPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!codigo.trim() || codigo.trim().length < 6) {
      setError('Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email.trim(), codigo.trim(), nuevaPassword);
      toast.success('Contraseña actualizada exitosamente. Ya puedes iniciar sesión.');
      navigate('/login');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Código incorrecto o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-['Hanken_Grotesk'] bg-[#080808] text-[#e2e2e2] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="spartan-ambient-glow w-[500px] h-[500px] -top-20 -left-20 opacity-35" />
      <div className="spartan-ambient-glow w-[550px] h-[550px] top-1/3 -right-28 opacity-30" />
      <div className="spartan-ambient-glow w-[380px] h-[380px] -bottom-16 left-1/3 opacity-25" />

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

      {/* Main Container */}
      <main id="contenido-principal" tabIndex={-1} className="flex-grow flex items-center justify-center p-6 relative z-10 my-4">
        <div className="w-full max-w-md spartan-glass p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="mb-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-[#e8dc00]/10 border border-[#e8dc00]/30 flex items-center justify-center text-[#e8dc00] mb-4 backdrop-blur-sm shadow-[0_0_15px_rgba(242,229,0,0.15)]">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="font-['Anybody'] text-2xl text-white uppercase font-black tracking-tight">
              Recuperar Acceso
            </h1>
            <p className="text-sm text-[#ccc7ab] mt-1">
              {step === 1
                ? 'Ingresa tu correo para recibir un código de seguridad de 6 dígitos.'
                : `Ingresa el código enviado a ${email} y tu nueva contraseña.`}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 border border-red-500/40 bg-red-950/30 backdrop-blur-md p-3.5 text-xs text-red-300 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-5">
              <div>
                <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu_correo@ejemplo.com"
                  className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full spartan-btn-primary py-3.5 text-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl shadow-[0_4px_20px_rgba(242,229,0,0.3)] font-bold uppercase tracking-wider"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>Enviar Código de Seguridad</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </>
                )}
              </button>

              <div className="text-center text-xs text-[#ccc7ab] mt-2">
                ¿Recordaste tu contraseña?{' '}
                <Link to="/login" className="text-[#e8dc00] hover:underline font-bold">
                  Inicia Sesión
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="flex flex-col gap-4">
              <div className="p-4 spartan-glass-subtle text-center">
                <span className="block text-[10px] text-[#ccc7ab] font-['JetBrains_Mono'] uppercase tracking-wider mb-1">
                  Código de 6 Dígitos
                </span>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-transparent text-center font-['JetBrains_Mono'] text-2xl text-[#e8dc00] tracking-[8px] outline-none font-bold placeholder-[#333]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Confirmar Nueva Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                />
              </div>

              <button
                type="submit"
                disabled={loading || codigo.length < 6}
                className="mt-2 w-full spartan-btn-primary py-3.5 text-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl shadow-[0_4px_20px_rgba(242,229,0,0.3)] font-bold uppercase tracking-wider"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Actualizar Contraseña</span>
                  </>
                )}
              </button>

              <div className="flex justify-between text-xs font-['JetBrains_Mono'] pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#ccc7ab] hover:text-white underline cursor-pointer"
                >
                  Cambiar correo
                </button>
                <Link to="/login" className="text-[#e8dc00] hover:underline">
                  Volver al Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
