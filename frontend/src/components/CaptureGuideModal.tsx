import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Lock, Ruler, Shirt, Sun, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Uso:                                                               */
/*  <CaptureGuideModal open={open} onClose={() => setOpen(false)}      */
/*                     onFinish={() => { setOpen(false); startCamera() }} /> */
/*  shouldShowGuide() decide si se abre automáticamente.               */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "spartan.captureGuide.dismissed";
const ACCENT = "#e8dc00"; // Token oficial Spartan Suplementos

export function shouldShowGuide(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

function rememberDismissed(value: boolean) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin storage: la guía simplemente se mostrará de nuevo */
  }
}

/* --------------------------------- Pasos --------------------------------- */

const STEPS = [
  {
    id: "distance",
    icon: Ruler,
    badge: "2 a 2.5 m",
    title: "Coloca el teléfono a 2 metros",
    short: "Vertical, fijo y a la altura del pecho. Debes entrar completo, de pies a cabeza.",
    why: "A esa distancia y altura se evitan distorsiones de perspectiva en los 33 puntos anatómicos (landmarks BlazePose) que mide el sistema.",
    image: "/guia/distancia.jpg",
    alt: "Recomendación de distancia de 2 metros frente al teléfono",
  },
  {
    id: "light",
    icon: Sun,
    badge: "Luz de frente o lateral",
    title: "Ponte frente a la luz",
    short: "Evita ventanas o focos a tu espalda y sombras fuertes sobre hombros y cadera. La fuente de luz debe iluminarte de frente.",
    why: "El contraluz oscurece la silueta y hace que el algoritmo MediaPipe confunda el fondo con los límites corporales de hombros y caderas.",
    image: "/guia/luz.jpg",
    alt: "Comparativa de iluminación correcta vs contraluz incorrecto",
  },
  {
    id: "clothing",
    icon: Shirt,
    badge: "Ropa ajustada o deportiva",
    title: "Usa ropa ajustada",
    short: "Licra, short deportivo o ropa de compresión. Si te sientes cómodo, ropa interior para máxima exactitud en la medición.",
    why: "La ropa holgada oculta las proporciones reales de hombros, cintura y cadera, que son la base matemática del cálculo del somatotipo Heath-Carter.",
    image: "/guia/ropa.jpg",
    alt: "Comparativa de ropa holgada incorrecta vs ropa ajustada correcta",
  },
] as const;

/* -------------------------------- Componente ------------------------------- */

interface Props {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
  /** Texto de privacidad: ajustado a la arquitectura de Spartan Suplementos */
  privacyText?: string;
}

export default function CaptureGuideModal({
  open,
  onClose,
  onFinish,
  privacyText = "Tus fotogramas se procesan de forma transitoria en memoria volátil en el microservicio IA para la inferencia MediaPipe y no se almacenan permanentemente sin tu autorización expresa.",
}: Props) {
  const reduce = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showWhy, setShowWhy] = useState(false);
  const [dontShow, setDontShow] = useState(false);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const last = index === STEPS.length - 1;
  const step = STEPS[index];

  const go = useCallback((next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(next);
    setShowWhy(false);
  }, [index]);

  const close = useCallback(() => {
    rememberDismissed(dontShow);
    onClose();
  }, [dontShow, onClose]);

  const finish = useCallback(() => {
    rememberDismissed(dontShow);
    onFinish();
  }, [dontShow, onFinish]);

  // Reinicia al abrir y enfoca el botón principal
  useEffect(() => {
    if (open) {
      setIndex(0);
      setShowWhy(false);
      requestAnimationFrame(() => primaryRef.current?.focus());
    }
  }, [open]);

  // Teclado: Esc cierra, flechas navegan
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight" && !last) go(index + 1);
      if (e.key === "ArrowLeft" && index > 0) go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, go, index, last]);

  const slide = {
    initial: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -28 }),
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-title"
            className="w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-neutral-950 shadow-2xl sm:rounded-3xl"
            initial={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 24 }}
            transition={{ duration: 0.2 }}
          >
            {/* Cabecera + progreso */}
            <div className="px-6 pt-5 shrink-0">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 font-['JetBrains_Mono']">
                  Antes de empezar · {index + 1} de {STEPS.length}
                </span>
                <button
                  onClick={close}
                  aria-label="Cerrar guía"
                  className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={index + 1}>
                {STEPS.map((s, i) => (
                  <div key={s.id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: ACCENT }}
                      initial={false}
                      animate={{ width: i <= index ? "100%" : "0%" }}
                      transition={{ duration: reduce ? 0 : 0.35 }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Contenido desplazable con la imagen real de recomendaciones */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step.id}
                  custom={direction}
                  variants={slide}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="space-y-4"
                >
                  {/* Tarjeta con la ilustración/foto 3D de recurso */}
                  <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 shadow-inner flex items-center justify-center p-1 sm:p-2">
                    <img
                      src={step.image}
                      alt={step.alt}
                      className="w-full h-auto max-h-56 object-contain rounded-xl"
                      loading="eager"
                    />
                  </div>

                  <div>
                    <span className="inline-block rounded-full border border-[#e8dc00]/30 bg-[#e8dc00]/10 px-3 py-0.5 text-xs font-bold text-[#e8dc00] font-['JetBrains_Mono']">
                      {step.badge}
                    </span>
                    <h2 id="guide-title" className="mt-2 text-xl sm:text-2xl font-black uppercase text-white font-['Anybody'] tracking-tight">
                      {step.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-300 font-['Inter']">
                      {step.short}
                    </p>
                  </div>

                  {/* Accordion ¿Por qué? */}
                  <div>
                    <button
                      onClick={() => setShowWhy((v) => !v)}
                      aria-expanded={showWhy}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 transition hover:text-[#e8dc00] cursor-pointer"
                    >
                      <span>¿Por qué?</span>
                      <ChevronDown size={14} className={`transition-transform duration-200 ${showWhy ? "rotate-180 text-[#e8dc00]" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {showWhy && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pt-2"
                        >
                          <p className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-neutral-300 font-['Inter']">
                            {step.why}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Aviso de Privacidad con candado */}
                  <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-xs text-neutral-400">
                    <Lock size={15} className="mt-0.5 shrink-0 text-[#e8dc00]" />
                    <span className="leading-snug">{privacyText}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Acciones al pie */}
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4 shrink-0 bg-neutral-950/80 backdrop-blur-sm">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-400 hover:text-zinc-200 select-none">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                  className="h-4 w-4 rounded accent-[#e8dc00] cursor-pointer"
                />
                No volver a mostrar
              </label>

              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    onClick={() => go(index - 1)}
                    aria-label="Paso anterior"
                    className="rounded-xl border border-white/10 p-2.5 text-neutral-300 transition hover:bg-white/10 cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <button
                  ref={primaryRef}
                  onClick={last ? finish : () => go(index + 1)}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase font-['JetBrains_Mono'] text-black transition active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 cursor-pointer shadow-lg hover:brightness-105"
                  style={{ background: ACCENT }}
                >
                  {last ? (
                    <>
                      <Check size={16} /> Entendido / Activar
                    </>
                  ) : (
                    <>
                      Siguiente <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
