import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Sparkles,
  Dumbbell,
  ChevronRight,
  Quote,
  X,
} from 'lucide-react';

interface InspirationItem {
  id: string;
  title: string;
  category: 'CULTURISMO' | 'POWERLIFTING' | 'CALISTENIA' | 'PRENATAL' | 'LONGEVIDAD' | 'FITNESS';
  categoryLabel: string;
  targetAudience: string;
  quote: string;
  author: string;
  image: string;
  description: string;
  supplementTip: string;
  keyExercises: string[];
}

const inspirationItems: InspirationItem[] = [
  {
    id: 'mentzer',
    title: 'INTENSIDAD & ENFOQUE MENTAL',
    category: 'CULTURISMO',
    categoryLabel: 'Culturismo de Leyenda',
    targetAudience: 'Atletas 17+ & Hipertrofia Máxima',
    quote:
      'El músculo no crece por pasar horas eternas en el gimnasio, sino por llevar cada repetición a su límite absoluto de intensidad con concentración mental total.',
    author: 'Mike Mentzer — Campeón Mr. Universe & Creador Heavy Duty',
    image: '/comunidad/culturismo_mentzer.jpg',
    description:
      'La filosofía Heavy Duty demostró que la intensidad de estímulo, la recuperación adecuada y la sobrecarga progresiva superan al volumen excesivo.',
    supplementTip: 'Sinergia recomendada: Creatina Monohidratada Creapure + Pre-entreno de alta concentración + Proteína Aislada.',
    keyExercises: ['Press de Banca con pausa', 'Sentadilla profunda guiada', 'Fondos pesados al fallo'],
  },
  {
    id: 'arnold',
    title: 'VISIÓN, DISCIPLINA & CONSTANCIA',
    category: 'CULTURISMO',
    categoryLabel: 'Culturismo Clásico',
    targetAudience: 'Deportistas 17+ & Fuerza Estética',
    quote:
      'La resistencia con la que luchas en el gimnasio y la resistencia con la que te enfrentas en la vida construyen un carácter inquebrantable. Nunca tengas miedo a fallar.',
    author: 'Arnold Schwarzenegger — 7x Mr. Olympia',
    image: '/comunidad/culturismo_arnold.jpg',
    description:
      'El entrenamiento clásico de la era dorada: conexión mente-músculo, rango completo de movimiento y nutrición densa en proteínas limpias.',
    supplementTip: 'Sinergia recomendada: Whey Isolate Gold + Multivitamínico de alto espectro + Glutamina para regeneración.',
    keyExercises: ['Press militar estricto', 'Remo con barra T', 'Dominadas con agarre amplio'],
  },
  {
    id: 'powerlifting-deadlift',
    title: 'EL HIERRO NUNCA MIENTE',
    category: 'POWERLIFTING',
    categoryLabel: 'Powerlifting & Fuerza Pura',
    targetAudience: 'Levantadores de Fuerza & Rendimiento',
    quote:
      'La barra cargada no sabe de excusas, cansancio ni atajos. Cada kilo despegado del suelo es un pacto directo entre tu mente y tu espalda.',
    author: 'Filosofía Spartan Powerlifting',
    image: '/comunidad/powerlifting_deadlift.jpg',
    description:
      'Dominio de los tres levantamientos fundamentales: Sentadilla, Press de Banca y Peso Muerto. Fuerza absoluta que transfiere a cualquier disciplina deportiva.',
    supplementTip: 'Sinergia recomendada: Creatina Micronizada + Aminoácidos BCAAs intra-entreno + Magnesio bisglicinato.',
    keyExercises: ['Peso muerto convencional/sumo', 'Sentadilla con barra baja', 'Press banca con arco técnico'],
  },
  {
    id: 'calistenia-planche',
    title: 'CONTROL TOTAL DEL PROPIO PESO',
    category: 'CALISTENIA',
    categoryLabel: 'Calistenia & Street Workout',
    targetAudience: 'Jóvenes y Adultos 17+ — Fuerza Relativa',
    quote:
      'Controlar tu propio peso corporal en el aire requiere ligamentos de acero, tensión isométrica perfecta y paciencia infinita.',
    author: 'Movimiento Street Workout Élite',
    image: '/comunidad/calistenia_planche.jpg',
    description:
      'La calistenia forja una fuerza funcional extraordinaria utilizando barras, anillas y el suelo, protegiendo las articulaciones y desarrollando un core blindado.',
    supplementTip: 'Sinergia recomendada: Colágeno hidrolizado tipo II (articulaciones) + Proteína vegetal o suero microfiltrado.',
    keyExercises: ['Full Planche progresiva', 'Dominadas estrictas al pecho', 'Muscle-ups limpios en barra'],
  },
  {
    id: 'calistenia-dips',
    title: 'FUERZA AL AIRE LIBRE',
    category: 'CALISTENIA',
    categoryLabel: 'Calistenia & Parques Urbanos',
    targetAudience: 'Acondicionamiento Físico & Resistencia',
    quote:
      'Sin suscripciones costosas ni máquinas sofisticadas: solo tú, las barras paralelas y el cielo abierto demostrando que la voluntad no tiene precio.',
    author: 'Comunidad Calistenia Spartan',
    image: '/comunidad/calistenia_dips.jpg',
    description:
      'Entrenar al aire libre despierta la energía metabólica natural, mejora la síntesis de vitamina D y potencia la resistencia cardiovascular de forma integral.',
    supplementTip: 'Sinergia recomendada: Electrolitos hidratantes sin azúcar + Pre-entreno ligero para energía constante.',
    keyExercises: ['Fondos en barras paralelas', 'Flexiones en pino (Handstand pushups)', 'Elevaciones de piernas en barra'],
  },
  {
    id: 'prenatal-mancuernas',
    title: 'FUERZA Y VITALIDAD PARA DOS',
    category: 'PRENATAL',
    categoryLabel: 'Maternidad Activa & Prenatal',
    targetAudience: 'Madres en Gestación & Etapa Prenatal',
    quote:
      'El embarazo no es una pausa en tu salud: es la etapa donde tu fuerza, tu postura y tu vitalidad protegen y nutren la vida que crece en ti.',
    author: 'Programa Fitmama & Salud Materna',
    image: '/comunidad/prenatal_mancuernas.jpg',
    description:
      'Entrenamiento de fuerza suave y controlado con mancuernas ligeras y pelota suiza. Fortalece la musculatura paravertebral y alivia los dolores lumbares de la gestación.',
    supplementTip: 'Sinergia recomendada: Omega 3 DHA purificado + Proteína limpia sin estimulantes + Calcio con vitamina D (bajo supervisión médica).',
    keyExercises: ['Sentadillas asistidas sobre fitball', 'Elevaciones laterales controladas', 'Puente de glúteos suave'],
  },
  {
    id: 'prenatal-yoga',
    title: 'BALANCE, MOVILIDAD Y SUELO PÉLVICO',
    category: 'PRENATAL',
    categoryLabel: 'Movilidad & Yoga Prenatal',
    targetAudience: 'Bienestar Fetal & Preparación al Parto',
    quote:
      'Respiración consciente, apertura de caderas y relajación profunda. Cuidar tu cuerpo en cada trimestre es el mayor acto de amor propio y maternidad consciente.',
    author: 'Guía de Movilidad Prenatal Spartan',
    image: '/comunidad/prenatal_yoga.jpg',
    description:
      'Movimientos de bajo impacto enfocados en la flexibilidad articular, descompresión espinal y técnicas de respiración diafragmática para el bienestar madre-bebé.',
    supplementTip: 'Sinergia recomendada: Magnesio para evitar calambres nocturnos + Hidratación rica en minerales naturales.',
    keyExercises: ['Postura del gato-vaca suave', 'Apertura de cadera en mariposa', 'Estiramientos laterales con soporte'],
  },
  {
    id: 'longevidad-fuerza',
    title: 'LA EDAD ES UN NÚMERO; LA FUERZA ES TU ELECCIÓN',
    category: 'LONGEVIDAD',
    categoryLabel: 'Longevidad Activa & Tercera Edad',
    targetAudience: 'Adultos 50+ & Envejecimiento Saludable',
    quote:
      'El entrenamiento de fuerza después de los 50 es la mejor medicina preventiva que existe. Preserva tu masa muscular, protege tus huesos y vive con autonomía total.',
    author: 'Medicina Deportiva & Longevidad',
    image: '/comunidad/longevidad_fuerza.jpg',
    description:
      'La ciencia médica confirma que levantar peso moderado combate directamente la sarcopenia y osteoporosis, devolviendo agilidad, equilibrio y vitalidad a cualquier edad.',
    supplementTip: 'Sinergia recomendada: Colágeno Hidrolizado con Magnesio + Omega 3 para salud cardiovascular + Proteína Whey para síntesis proteica.',
    keyExercises: ['Curl de bíceps sentado', 'Levantarse de la silla (Box squats)', 'Paseo del granjero con mancuernas ligeras'],
  },
  {
    id: 'longevidad-vitalidad',
    title: 'VITALIDAD Y ALEGRÍA EN COMUNIDAD',
    category: 'LONGEVIDAD',
    categoryLabel: 'Salud Integral & Tercera Edad',
    targetAudience: 'Personas Mayores Activas',
    quote:
      'No dejamos de movernos porque nos hacemos viejos; nos hacemos viejos cuando dejamos de movernos. Mantener la sonrisa y la flexibilidad es el secreto de la juventud.',
    author: 'Comunidad Vitalidad Spartan',
    image: '/comunidad/longevidad_vitalidad.jpg',
    description:
      'Rutinas grupales de estiramiento al aire libre, movilidad y caminata activa para mantener las articulaciones lubricadas y un estado anímico positivo.',
    supplementTip: 'Sinergia recomendada: Glucosamina + Condroitina para cartílagos + Complejo Vitamínico B para energía metabólica.',
    keyExercises: ['Estiramiento de isquiotibiales sentado', 'Movilidad de hombros con bandas', 'Caminatas a ritmo constante en césped'],
  },
  {
    id: 'fitness-running',
    title: 'LA CONSTANCIA DIARIA CONQUISTA CUALQUIER META',
    category: 'FITNESS',
    categoryLabel: 'Fitness & Cardio Funcional',
    targetAudience: 'Mujeres y Hombres — Todo Público 17+',
    quote:
      'Cada mañana que decides atarte las zapatillas y salir a correr estás venciendo la pereza y ganando claridad mental para todo tu día.',
    author: 'Filosofía Spartan Running',
    image: '/comunidad/fitness_running.jpg',
    description:
      'El ejercicio aeróbico regular fortalece el miocardio, reduce el estrés oxidativo y complementa a la perfección los días de fuerza en el gimnasio.',
    supplementTip: 'Sinergia recomendada: L-Carnitina líquida antes de salir + Glutamina post-entreno para evitar catabolismo.',
    keyExercises: ['Carrera continua a ritmo conversacional', 'Intervalos HIIT suaves en parque', 'Zancadas activas'],
  },
  {
    id: 'fitness-flexibilidad',
    title: 'RECUPERACIÓN INTELIGENTE & POSTURA',
    category: 'FITNESS',
    categoryLabel: 'Flexibilidad & Core',
    targetAudience: 'Atletas y Personas de Oficina',
    quote:
      'Tan importante como levantar pesado es aprender a descargar tensiones, alinear la columna y permitir que el cuerpo se reconstruya más fuerte.',
    author: 'Salud Postural Spartan',
    image: '/comunidad/fitness_flexibilidad.jpg',
    description:
      'Rutinas de descarga para personas que pasan muchas horas sentadas o atletas con sobrecarga muscular. Restaura la longitud natural de las fibras musculares.',
    supplementTip: 'Sinergia recomendada: Magnesio nocturno + Complejo antioxidante Vitamina C y E.',
    keyExercises: ['Estiramiento de psoas ilíaco', 'Descompresión de deltoides en colchoneta', 'Plancha isométrica frontal'],
  },
];

type CategoryFilter = 'ALL' | 'CULTURISMO' | 'POWERLIFTING' | 'CALISTENIA' | 'PRENATAL' | 'LONGEVIDAD' | 'FITNESS';

export const CommunitySection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('ALL');
  const [selectedModalItem, setSelectedModalItem] = useState<InspirationItem | null>(null);

  const filteredItems = activeFilter === 'ALL'
    ? inspirationItems
    : inspirationItems.filter((it) => it.category === activeFilter);

  const filterButtons: { key: CategoryFilter; label: string }[] = [
    { key: 'ALL', label: `Todos (${inspirationItems.length})` },
    { key: 'CULTURISMO', label: 'Culturismo Élite' },
    { key: 'POWERLIFTING', label: 'Powerlifting' },
    { key: 'CALISTENIA', label: 'Calistenia' },
    { key: 'PRENATAL', label: 'Maternidad Activa' },
    { key: 'LONGEVIDAD', label: 'Longevidad +50' },
    { key: 'FITNESS', label: 'Fitness Funcional' },
  ];

  return (
    <section id="rutinas" className="py-24 bg-[#070707] border-b border-[#1A1A1A] relative overflow-hidden">
      {/* Background radial accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#f2e500]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-[1360px] mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-black border border-[#f2e500]/40 text-[#f2e500] font-['JetBrains_Mono'] text-xs uppercase tracking-widest mb-4">
            <Flame className="h-3.5 w-3.5" />
            <span>Comunidad Spartan — Entrenamiento Sin Excusas</span>
          </div>

          <h2 className="font-['Anybody'] text-4xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-none mb-4">
            FUERZA PARA <span className="text-[#f2e500] italic">CADA ETAPA</span>
          </h2>

          <p className="font-['Hanken_Grotesk'] text-sm sm:text-base text-[#ccc7ab] leading-relaxed">
            En Spartan Suplementos Bolivia creemos que el movimiento transforma vidas: desde atletas de culturismo y levantadores pesados hasta mujeres en gestación y adultos mayores construyendo longevidad.
          </p>
        </div>

        {/* Category Filters Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {filterButtons.map((btn) => (
            <motion.button
              key={btn.key}
              whileTap={{ scale: 0.94 }}
              onClick={() => setActiveFilter(btn.key)}
              className={`px-4 py-2 text-xs font-['JetBrains_Mono'] uppercase font-bold transition-all cursor-pointer ${
                activeFilter === btn.key
                  ? 'bg-[#f2e500] text-black font-black shadow-lg shadow-[#f2e500]/10'
                  : 'bg-[#111] border border-[#262626] text-[#ccc7ab] hover:border-[#f2e500] hover:text-white'
              }`}
            >
              {btn.label}
            </motion.button>
          ))}
        </div>

        {/* Inspiration Grid with Framer Motion */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          <AnimatePresence>
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.25) }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                onClick={() => setSelectedModalItem(item)}
                className="group relative bg-gradient-to-b from-[#131313] via-[#0d0d0d] to-[#080808] border border-[#222] hover:border-[#f2e500]/70 overflow-hidden cursor-pointer shadow-xl flex flex-col justify-between"
              >
                {/* Top Gold Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent group-hover:bg-[#f2e500] transition-colors duration-300 z-30" />

                {/* Photo Stage with Gradient Vignette */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover object-center grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-black/30" />

                  {/* Category & Audience Badges */}
                  <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 items-start">
                    <span className="px-2.5 py-0.5 bg-black/85 backdrop-blur-md border border-[#333] text-[9px] font-['JetBrains_Mono'] font-bold text-[#f2e500] tracking-wider uppercase">
                      {item.categoryLabel}
                    </span>
                    <span className="px-2 py-0.5 bg-[#141414]/90 backdrop-blur-md border border-[#2a2a2a] text-[8px] font-['JetBrains_Mono'] font-bold text-white tracking-wider uppercase">
                      {item.targetAudience}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between bg-[#0b0b0b]/90 border-t border-[#1a1a1a]">
                  <div>
                    <h3 className="font-['Anybody'] text-lg font-bold text-white uppercase tracking-tight group-hover:text-[#f2e500] transition-colors mb-3 leading-snug">
                      {item.title}
                    </h3>

                    <div className="relative pl-5 border-l-2 border-[#f2e500]/70 my-3">
                      <Quote className="absolute -top-1 left-1 h-3.5 w-3.5 text-[#f2e500]/40" />
                      <p className="font-['Hanken_Grotesk'] text-xs italic text-[#ccc7ab] line-clamp-3 leading-relaxed">
                        "{item.quote}"
                      </p>
                    </div>
                  </div>

                  {/* Author & Trigger Footer */}
                  <div className="pt-4 border-t border-[#1a1a1a] mt-4 flex items-center justify-between">
                    <span className="font-['JetBrains_Mono'] text-[10px] text-[#737373] uppercase truncate max-w-[200px]">
                      {item.author}
                    </span>
                    <span className="flex items-center gap-1 font-['JetBrains_Mono'] text-[10px] font-bold text-[#f2e500] uppercase group-hover:translate-x-1 transition-transform">
                      <span>Ver Ficha</span>
                      <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Feature Teaser Banner: Motor Inteligente de Rutinas Spartan */}
        <div className="bg-gradient-to-r from-[#121212] via-[#1a1a1a] to-[#0f0f0f] border border-[#2a2a2a] p-8 md:p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 text-[#f2e500] pointer-events-none">
            <Dumbbell className="h-44 w-44" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-black border border-[#f2e500]/50 text-[#f2e500] font-['JetBrains_Mono'] text-[10px] uppercase font-bold tracking-widest mb-3">
                <Sparkles className="h-3 w-3" />
                <span>Módulo en Desarrollo — Spartan Intelligence</span>
              </div>
              <h3 className="font-['Anybody'] text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
                Sugerencia de Rutinas Adaptativas para Toda Bolivia
              </h3>
              <p className="font-['Hanken_Grotesk'] text-xs sm:text-sm text-[#ccc7ab] leading-relaxed">
                Próximamente integraremos un generador de rutinas personalizado para toda persona mayor de 17 años: adaptado para principiantes, culturistas, levantadores pesados, personas en gestación y adultos mayores en busca de longevidad.
              </p>
            </div>

            <div className="shrink-0">
              <a
                href="#catalogo"
                className="spartan-btn-primary px-6 py-3.5 text-xs font-black uppercase flex items-center gap-2 shadow-xl interactive-press"
              >
                <span>Ver Suplementación Adecuada</span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Routine / Discipline Inspiration Modal */}
      <AnimatePresence>
        {selectedModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="w-full max-w-2xl bg-[#0D0D0D] border border-[#1A1A1A] shadow-2xl relative overflow-hidden flex flex-col md:flex-row"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#f2e500] z-20" />
              <button
                onClick={() => setSelectedModalItem(null)}
                className="absolute top-4 right-4 z-30 p-2 text-[#737373] hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Modal Image */}
              <div className="md:w-1/2 bg-black relative overflow-hidden flex items-center justify-center p-2 min-h-[300px]">
                <img
                  src={selectedModalItem.image}
                  alt={selectedModalItem.title}
                  className="w-full h-full object-cover max-h-[420px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="px-2 py-0.5 bg-[#f2e500] text-black font-['JetBrains_Mono'] text-[9px] font-black uppercase">
                    {selectedModalItem.categoryLabel}
                  </span>
                </div>
              </div>

              {/* Modal Details */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#f2e500] uppercase tracking-wider block mb-1">
                    {selectedModalItem.targetAudience}
                  </span>
                  <h3 className="font-['Anybody'] text-xl font-bold text-white uppercase tracking-tight mb-3">
                    {selectedModalItem.title}
                  </h3>

                  <div className="bg-[#141414] border border-[#222] p-3 mb-4">
                    <p className="font-['Hanken_Grotesk'] text-xs italic text-[#ccc7ab] leading-relaxed">
                      "{selectedModalItem.quote}"
                    </p>
                    <span className="block font-['JetBrains_Mono'] text-[10px] text-[#f2e500] mt-2 text-right">
                      — {selectedModalItem.author}
                    </span>
                  </div>

                  <p className="text-xs text-[#8a8a8a] font-['Hanken_Grotesk'] leading-relaxed mb-4">
                    {selectedModalItem.description}
                  </p>

                  <div className="space-y-2 text-xs font-['Hanken_Grotesk'] text-[#ccc7ab] border-t border-[#1a1a1a] pt-3">
                    <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-white uppercase block">
                      Ejercicios Clave Sugeridos:
                    </span>
                    <ul className="space-y-1">
                      {selectedModalItem.keyExercises.map((ex, i) => (
                        <li key={i} className="flex items-center gap-2 text-[11px] text-[#ccc7ab]">
                          <span className="h-1 w-1 bg-[#f2e500] rounded-full" />
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 p-2.5 bg-black/60 border border-[#2a2a2a] text-[10px] text-[#8a8a8a]">
                    <strong className="text-[#f2e500] uppercase block font-['JetBrains_Mono'] mb-0.5">
                      Consejo Nutricional:
                    </strong>
                    <span>{selectedModalItem.supplementTip}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#1a1a1a] mt-4">
                  <button
                    onClick={() => setSelectedModalItem(null)}
                    className="w-full spartan-btn-secondary py-2.5 text-xs uppercase font-bold cursor-pointer"
                  >
                    Cerrar Ficha
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
