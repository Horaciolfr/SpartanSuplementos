import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { ArrowRight, AlertCircle, Home, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { storeLogo } from '../utils/productImages';
import { toast } from 'sonner';

export const Registro: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode');
  const initialStepParam = searchParams.get('step');
  const initialEmail = searchParams.get('email') || '';

  const isVerifyMode = initialMode === 'verify' || initialStepParam === '2';
  const [step, setStep] = useState<1 | 2>(isVerifyMode ? 2 : 1);
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [idGenero, setIdGenero] = useState<number | undefined>(undefined);
  const [codigo, setCodigo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { login, register, verifyCode, resendCode, setGuestMode } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any;
    if (step === 2 && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        nombres,
        apellidos,
        email,
        password,
        id_genero: idGenero,
      });

      // Si no requiere verificación, iniciar sesión automáticamente y conducir al módulo principal
      if (res && res.requiere_verificacion === false) {
        toast.success('¡Cuenta creada y activada con éxito!');
        try {
          await login(email, password);
          navigate('/biometria', { replace: true });
          return;
        } catch {
          navigate('/login', { replace: true });
          return;
        }
      }

      toast.success('Código de verificación despachado a tu correo electrónico.');
      setStep(2);
      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      const msg = getErrorMessage(err, 'No se pudo registrar la cuenta. Verifica tus datos.');
      if (msg.includes('ya se encuentra registrado')) {
        // El usuario ya existe en base de datos; permitir ingresar el código o reenviarlo
        toast.info('Este correo ya está registrado. Ingresa tu código o solicita reenvío.');
        setStep(2);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!codigo.trim() || codigo.trim().length < 6) {
      setError('Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setLoading(true);
    try {
      await verifyCode(email, codigo.trim());
      toast.success('¡Cuenta activada con éxito! Bienvenido al ecosistema Spartan.');
      navigate('/biometria');
    } catch (err: any) {
      setError(getErrorMessage(err, 'Código inválido o expirado.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setLoading(true);
    setError(null);
    try {
      await resendCode(email);
      toast.success('Se ha enviado un nuevo código de 6 dígitos a tu correo.');
      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al reenviar el código.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-['Hanken_Grotesk'] bg-[#080808] text-[#e2e2e2] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="spartan-ambient-glow w-[550px] h-[550px] -top-24 -right-24 opacity-35" />
      <div className="spartan-ambient-glow w-[500px] h-[500px] top-1/2 -left-32 opacity-30" />
      <div className="spartan-ambient-glow w-[400px] h-[400px] -bottom-20 right-1/4 opacity-25" />

      {/* Header */}
      <header className="w-full h-18 sm:h-20 spartan-glass-nav flex justify-between items-center px-6 sm:px-10 relative z-20">
        <Link to="/" className="flex items-center group py-1">
          <img
            src={storeLogo}
            alt="Spartan"
            className="h-11 sm:h-14 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_2px_12px_rgba(242,229,0,0.18)]"
          />
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setGuestMode();
              navigate('/catalogo');
            }}
            className="text-[#ccc7ab] hover:text-[#e8dc00] transition-colors text-xs font-['JetBrains_Mono'] uppercase tracking-wider hidden sm:block bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-md"
          >
            Modo Invitado
          </button>
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
      <main id="contenido-principal" tabIndex={-1} className="flex-grow flex items-center justify-center p-6 my-6 relative z-10">
        <div className="w-full max-w-lg spartan-glass p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e8dc00]/10 border border-[#e8dc00]/30 rounded-full text-[10px] font-['JetBrains_Mono'] text-[#e8dc00] uppercase tracking-wider font-semibold mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              Perfil de Atleta (Cliente)
            </span>
            <h1 className="font-['Anybody'] text-2xl text-white uppercase font-bold tracking-tight">
              {step === 1 ? 'Crear Cuenta' : 'Verifica tu Correo'}
            </h1>
            <p className="text-sm text-[#ccc7ab] mt-1">
              {step === 1
                ? 'Accede al análisis corporal biométrico, rutinas y suplementación personalizada.'
                : `Ingresa el código de 6 dígitos enviado a ${email}`}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 border border-red-500/40 bg-red-950/20 p-3.5 text-xs text-red-300 rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    placeholder="Ej. Rodrigo"
                    className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    placeholder="Ej. Vargas"
                    className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Correo Electrónico *
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

              <div>
                <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                  Género (Para calibración antropométrica)
                </label>
                <select
                  value={idGenero ?? ''}
                  onChange={(e) => setIdGenero(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none rounded-xl"
                >
                  <option value="" className="bg-[#121212] text-white">Seleccionar (Opcional)</option>
                  <option value="1" className="bg-[#121212] text-white">Masculino</option>
                  <option value="2" className="bg-[#121212] text-white">Femenino</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Confirmar Contraseña *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full spartan-glass-input px-3.5 py-2.5 text-sm outline-none placeholder-[#555] rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full spartan-btn-primary py-3.5 text-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl shadow-lg"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>Enviar Código de Verificación</span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </>
                )}
              </button>

              <div className="mt-4 text-center text-xs text-[#ccc7ab]">
                ¿Ya tienes una cuenta?{' '}
                <Link to="/login" className="text-[#e8dc00] hover:underline font-bold">
                  Inicia Sesión aquí
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleStep2Submit} className="flex flex-col gap-5">
              {!initialEmail && (
                <div>
                  <label className="block text-[11px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#ccc7ab] mb-1.5">
                    Correo Electrónico *
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
              )}
              <div className="text-center">
                <div className="p-5 spartan-glass-subtle mb-4">
                  <span className="block text-xs text-[#ccc7ab] mb-2 font-['JetBrains_Mono'] uppercase tracking-wider">
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
                    className="w-full bg-transparent text-center font-['JetBrains_Mono'] text-3xl sm:text-4xl text-[#e8dc00] tracking-[10px] outline-none font-bold placeholder-[#333]"
                  />
                </div>
                <p className="text-xs text-[#888]">
                  Revisa tu bandeja de entrada o carpeta de spam. En entorno de desarrollo también se registra en los registros locales.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || codigo.length < 6}
                className="w-full spartan-btn-primary py-3.5 text-xs flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 rounded-xl shadow-[0_4px_20px_rgba(242,229,0,0.3)] font-bold uppercase tracking-wider"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Activar Cuenta y Comenzar</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs font-['JetBrains_Mono'] pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#ccc7ab] hover:text-white underline cursor-pointer"
                >
                  Corregir correo
                </button>

                <button
                  type="button"
                  disabled={!canResend || loading}
                  onClick={handleResend}
                  className={`flex items-center gap-1.5 ${
                    canResend
                      ? 'text-[#e8dc00] hover:underline cursor-pointer font-bold'
                      : 'text-[#666] cursor-not-allowed'
                  }`}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{canResend ? 'Reenviar Código' : `Reenviar en ${resendTimer}s`}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
