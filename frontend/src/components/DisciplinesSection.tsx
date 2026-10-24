import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Dumbbell,
  Shield,
  Activity,
  HeartPulse,
  Sparkles,
  ChevronRight,
  Quote,
  X,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export interface DisciplineItem {
  id: string;
  category: 'CULTURISMO' | 'POWERLIFTING' | 'CALISTENIA' | 'FITNESS' | 'LONGEVIDAD';
  categoryLabel: string;
  title: string;
  targetAudience: string;
  quote: string;
  author: string;
  image: string;
  description: string;
  supplementTip: string;
  keyExercises: string[];
}

const disciplinesData: DisciplineItem[] = [
  {
    id: 'alta-intensidad',
    category: 'CULTURISMO',
    categoryLabel: 'Línea Alta Intensidad',
    title: 'ALTA INTENSIDAD (HIT)',
    targetAudience: 'Hipertrofia Funcional & Sobrecarga Progresiva',
    quote:
      'La intensidad se trabaja con técnica, progresión y recuperación suficiente; el volumen adecuado depende de cada persona.',
    author: 'Enfoque de alta intensidad',
    image: '/disciplinas/alta_intensidad.jpg',
    description:
      'Una propuesta de trabajo con series exigentes, progresión gradual y descansos planificados para quienes ya dominan la técnica de los ejercicios.',
    supplementTip:
      'Productos que suelen consultar quienes entrenan fuerza: creatina, proteína y opciones de preentrenamiento. Revisa sus indicaciones antes de usarlos.',
    keyExercises: [
      'Press de Banca inclinado con pausa isométrica',
      'Sentadilla Hack guiada al fallo concéntrico',
      'Fondos pesados en paralelas con sobrecarga progresiva',
      'Remo con barra apoyado al pecho estricto',
    ],
  },
  {
    id: 'volumen-estructurado',
    category: 'CULTURISMO',
    categoryLabel: 'Línea Volumen Estructurado',
    title: 'VOLUMEN ESTRUCTURADO',
    targetAudience: 'Desarrollo Estético Proporcional & Simetría',
    quote:
      'El progreso sostenible combina una carga que puedas controlar, una técnica consistente y tiempo de recuperación.',
    author: 'Enfoque de volumen estructurado',
    image: '/disciplinas/volumen_estructurado.jpg',
    description:
      'Rutinas de volumen con selección de ejercicios, repeticiones y pausas organizadas para favorecer una práctica constante.',
    supplementTip:
      'Opciones frecuentes para esta meta: proteína, creatina y suplementos que complementen una alimentación planificada.',
    keyExercises: [
      'Press Militar estricto con barra olímpica',
      'Superserie de Pecho y Espalda (Press Plano + Remo)',
      'Aperturas con mancuernas en banco inclinado',
      'Dominadas con agarre amplio al esternón',
    ],
  },
  {
    id: 'powerlifting-deadlift',
    category: 'POWERLIFTING',
    categoryLabel: 'Línea Fuerza Pura',
    title: 'FUERZA PURA & POWERLIFTING',
    targetAudience: 'Levantadores de Fuerza, Rugby & Deportes de Contacto',
    quote:
      'La fuerza se construye con técnica repetible, progresión de carga y una ejecución segura en cada levantamiento.',
    author: 'Enfoque de fuerza',
    image: '/disciplinas/powerlifting_deadlift.jpg',
    description:
      'Programa centrado en sentadilla, press de banca y peso muerto, con atención a la técnica y a la progresión individual.',
    supplementTip:
      'Para sesiones intensas, algunas personas consideran creatina, hidratación y electrolitos según su contexto deportivo.',
    keyExercises: [
      'Peso Muerto convencional con bloqueo dorsal',
      'Sentadilla Low-Bar con respiración diafragmática',
      'Press de Banca con arco técnico y leg drive',
      'Paseo del Granjero (Farmer Walk) con mancuernas pesadas',
    ],
  },
  {
    id: 'calistenia-planche',
    category: 'CALISTENIA',
    categoryLabel: 'Street Workout & Control',
    title: 'DOMINIO CORPORAL TOTAL',
    targetAudience: 'Jóvenes y Adultos — Fuerza Relativa, Equilibrio y Core',
    quote:
      'El control corporal mejora con práctica progresiva, una base de fuerza y paciencia para consolidar cada movimiento.',
    author: 'Enfoque de calistenia',
    image: '/disciplinas/calistenia_planche.jpg',
    description:
      'Entrenamiento con peso corporal, barras y anillas que prioriza control, movilidad y progresiones acordes a la experiencia.',
    supplementTip:
      'Una alimentación suficiente y una recuperación adecuada son la base. Los suplementos deben elegirse según necesidad y tolerancia individual.',
    keyExercises: [
      'Progresión a Full Planche y Straddle',
      'Muscle-Ups explosivos en barra fija',
      'Fondos rusos en paralelas con control de descenso',
      'Flexiones en pino vertical (Handstand Pushups)',
    ],
  },
  {
    id: 'fitness-tonificacion',
    category: 'FITNESS',
    categoryLabel: 'Fitness & Potencia Core',
    title: 'CONDICIONAMIENTO & AGILIDAD',
    targetAudience: 'Hombres y Mujeres — Tonificación, Quema Grasa y Resistencia',
    quote:
      'El acondicionamiento mejora cuando el esfuerzo, la técnica y el descanso se ajustan al nivel de cada persona.',
    author: 'Enfoque de acondicionamiento',
    image: '/disciplinas/fitness_tonificacion.jpg',
    description:
      'Sesiones que combinan movilidad, trabajo cardiovascular y fuerza para desarrollar resistencia y agilidad de forma progresiva.',
    supplementTip:
      'Consulta el catálogo para conocer opciones de hidratación y proteína que se adapten a tus hábitos y objetivos.',
    keyExercises: [
      'Intervalos HIIT de alta densidad metabólica',
      'Kettlebell Swings y Thrusters con mancuernas',
      'Planchas dinámicas con tracción rotacional',
      'Zancadas pliométricas y saltos al cajón',
    ],
  },
  {
    id: 'longevidad-fuerza',
    category: 'LONGEVIDAD',
    categoryLabel: 'Longevidad & Salud Activa',
    title: 'VITALIDAD SIN EDAD',
    targetAudience: 'Adultos 50+ y Tercera Edad — Movilidad, Autonomía y Densidad Ósea',
    quote:
      'La actividad física adaptada puede formar parte de una vida activa cuando se practica con acompañamiento y progresión adecuada.',
    author: 'Enfoque de movilidad y fuerza',
    image: '/disciplinas/longevidad_fuerza.jpg',
    description:
      'Rutinas de movilidad, equilibrio y fuerza adaptada. Para iniciar o modificar un programa, conviene contar con orientación profesional.',
    supplementTip:
      'La elección de suplementos para esta etapa debe realizarse con asesoramiento profesional, especialmente si existen tratamientos o condiciones previas.',
    keyExercises: [
      'Sentadilla a cajón (Box Squats) con apoyo seguro',
      'Remo sentado en polea para soporte escapular',
      'Ejercicios de equilibrio unipodal y marcha tándem',
      'Extensiones de cadera en colchoneta',
    ],
  },
];

type CategoryFilter = 'TODAS' | 'CULTURISMO' | 'POWERLIFTING' | 'CALISTENIA' | 'FITNESS' | 'LONGEVIDAD';

const filterTabs: { id: CategoryFilter; label: string; icon: any }[] = [
  { id: 'TODAS', label: 'Todas las Líneas', icon: Sparkles },
  { id: 'CULTURISMO', label: 'Culturismo', icon: Flame },
  { id: 'POWERLIFTING', label: 'Powerlifting', icon: Dumbbell },
  { id: 'CALISTENIA', label: 'Calistenia', icon: Shield },
  { id: 'FITNESS', label: 'Fitness & Core', icon: Activity },
  { id: 'LONGEVIDAD', label: 'Longevidad 50+', icon: HeartPulse },
];

export const DisciplinesSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CategoryFilter>('TODAS');
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineItem | null>(null);

  const filteredItems = disciplinesData.filter((item) => {
    if (activeTab === 'TODAS') return true;
    return item.category === activeTab;
  });

  return (
    <section className="py-20 bg-[#080808] border-b border-[#1A1A1A] relative overflow-hidden" id="disciplinas">
      {/* Background Ambient Aura */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#e8dc00]/5 rounded-full blur-[140px] pointer-events-none animate-ambient" />

      <div className="max-w-[1280px] mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <h2 className="font-['Anybody'] text-3xl sm:text-4xl lg:text-5xl font-black uppercase text-white tracking-tight leading-tight">
              Domina Tu <span className="text-[#e8dc00]">Disciplina</span>
            </h2>
            <p className="font-sans text-sm sm:text-base text-zinc-300 mt-2 max-w-2xl font-normal leading-relaxed">
              Explora rutas de entrenamiento y ejercicios de referencia para orientar tu práctica según tu objetivo.
            </p>
          </div>

          <div className="hidden lg:block text-right">
            <span className="font-['JetBrains_Mono'] text-xs font-bold text-white uppercase tracking-wider">
              {disciplinesData.length} rutas de entrenamiento
            </span>
          </div>
        </div>

        {/* Filter Tabs with Fluid Animated Pill */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none border-b border-white/10">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={isActive}
                className={`relative px-4 py-2.5 text-xs font-['JetBrains_Mono'] font-bold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-2 cursor-pointer rounded-xl overflow-hidden ${
                  isActive ? 'text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDisciplinePill"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    className="absolute inset-0 bg-[#e8dc00] z-0 rounded-xl"
                  />
                )}
                <Icon className={`h-3.5 w-3.5 relative z-10 stroke-[2.5] ${isActive ? 'text-black' : 'text-[#e8dc00]'}`} />
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Discipline Cards Grid - Simplified & High Polish (Point 11) */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => (
              <motion.button
                type="button"
                key={item.id}
                layout
                role="button"
                tabIndex={0}
                aria-label={`Ver guía de ${item.title}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, delay: idx * 0.04, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => setSelectedDiscipline(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDiscipline(item);
                  }
                }}
                className="bg-[#0e0e0e] border border-white/[0.08] hover:border-white/20 group relative flex flex-col justify-between cursor-pointer overflow-hidden rounded-2xl shadow-xl transition-all duration-300"
              >
                {/* Top Accent Stripe on Hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#e8dc00] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-20" />

                <div>
                  {/* Card Image Container */}
                  <div className="relative aspect-[16/10] w-full bg-black overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover filter grayscale contrast-125 group-hover:grayscale-0 group-hover:scale-[1.04] transition-all duration-500 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-black/30" />

                    {/* Category Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 bg-black/85 backdrop-blur-md border border-white/10 text-white font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                        [{item.category}]
                      </span>
                    </div>
                  </div>

                  {/* Card Body - Clean hierarchy without cluttered quote box */}
                  <div className="p-5">
                    <span className="font-['JetBrains_Mono'] text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      {item.targetAudience}
                    </span>
                    <h3 className="font-['Anybody'] text-lg font-bold text-white uppercase tracking-tight group-hover:text-[#e8dc00] transition-colors duration-200 leading-snug">
                      {item.title}
                    </h3>
                    <p className="font-sans text-xs text-zinc-300 line-clamp-2 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Footer with CTA */}
                <div className="p-5 pt-3 border-t border-white/[0.07] flex items-center justify-between bg-black/20">
                  <span className="font-['JetBrains_Mono'] text-[10px] text-zinc-500 uppercase tracking-wide truncate max-w-[180px]">
                    {item.categoryLabel}
                  </span>
                  <span className="flex items-center gap-1.5 font-['JetBrains_Mono'] text-[11px] font-bold text-[#e8dc00] uppercase group-hover:text-[#f4e900] transition-colors">
                    <span>Explorar programa</span>
                    <ChevronRight className="h-3.5 w-3.5 stroke-[2.5] group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Interactive Ficha Técnica Modal with Full Rich Content */}
      <AnimatePresence>
        {selectedDiscipline && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-3xl bg-[#0d0d0d] rounded-2xl relative overflow-hidden flex flex-col md:flex-row shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto border border-white/10"
            >
              {/* Top Gold Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8dc00] z-30" />

              {/* Close Button */}
              <button
                onClick={() => setSelectedDiscipline(null)}
                aria-label="Cerrar guía de entrenamiento"
                className="absolute top-4 right-4 z-30 p-2 text-white/70 hover:text-white transition-colors cursor-pointer bg-[#171717] rounded-full border border-white/10 hover:border-[#e8dc00]/60 shadow-md"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Image Column */}
              <div className="md:w-5/12 bg-black/50 relative flex flex-col justify-end h-48 sm:h-60 md:h-auto md:min-h-full rounded-t-2xl md:rounded-l-2xl md:rounded-tr-none overflow-hidden shrink-0">
                <img
                  src={selectedDiscipline.image}
                  alt={selectedDiscipline.title}
                  className="w-full h-full object-cover filter contrast-110 absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/40 to-transparent z-10" />

                <div className="relative z-20 p-5 sm:p-6">
                  <span className="inline-block px-3 py-1 bg-[#e8dc00] text-black font-['JetBrains_Mono'] text-[10px] font-bold uppercase rounded-md mb-2 shadow-sm">
                    {selectedDiscipline.categoryLabel}
                  </span>
                  <h4 className="font-['Anybody'] text-lg sm:text-xl font-black text-white uppercase leading-tight">
                    {selectedDiscipline.title}
                  </h4>
                </div>
              </div>

              {/* Modal Details Column */}
              <div className="md:w-7/12 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <span className="font-['JetBrains_Mono'] text-xs font-semibold text-[#e8dc00] uppercase tracking-wider block mb-1">
                      {selectedDiscipline.targetAudience}
                    </span>
                    <p className="font-sans text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      {selectedDiscipline.description}
                    </p>
                  </div>

                  {/* Quote block */}
                  <div className="bg-[#141414] border border-white/10 p-4 rounded-xl relative">
                    <Quote className="h-4 w-4 text-[#e8dc00]/50 mb-1" />
                    <p className="font-sans text-xs italic text-zinc-200 leading-relaxed">
                      "{selectedDiscipline.quote}"
                    </p>
                    <span className="block font-['JetBrains_Mono'] text-[10px] font-semibold text-[#e8dc00] mt-2 text-right uppercase">
                      — {selectedDiscipline.author}
                    </span>
                  </div>

                  {/* Suggested Exercises */}
                  <div className="pt-2">
                    <span className="font-['JetBrains_Mono'] text-[11px] font-semibold text-white uppercase tracking-wider block mb-2">
                      Ejercicios Clave Sugeridos:
                    </span>
                    <ul className="grid grid-cols-1 gap-1.5">
                      {selectedDiscipline.keyExercises.map((ex, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-zinc-300 bg-[#141414] p-2.5 rounded-lg border border-white/[0.07] hover:border-[#e8dc00]/40 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#e8dc00] shrink-0" />
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Nutritional synergy tip */}
                  <div className="p-3.5 bg-[#e8dc00]/[0.06] border border-[#e8dc00]/25 rounded-xl text-xs text-zinc-300">
                    <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-[#e8dc00] uppercase block mb-1">
                      Sinergia Nutricional Spartan:
                    </span>
                    <p className="leading-relaxed text-[11px]">{selectedDiscipline.supplementTip}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-6 border-t border-white/10 mt-6 flex gap-3">
                  <a
                    href="#catalogo"
                    onClick={() => setSelectedDiscipline(null)}
                    className="flex-1 spartan-btn-primary py-3 text-xs flex items-center justify-center gap-2 cursor-pointer rounded-xl shadow-lg font-semibold"
                  >
                    <span>Explorar Suplementos</span>
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setSelectedDiscipline(null)}
                    className="spartan-btn-secondary px-5 py-3 text-xs uppercase cursor-pointer rounded-xl border-white/10 bg-[#141414] hover:bg-[#1f1f1f]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
