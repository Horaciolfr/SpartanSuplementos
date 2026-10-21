import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, CameraOff, Sparkles, Activity, ShieldCheck, Zap, 
  RefreshCw, Info, Upload, ArrowRight,
  Scan, Layers, Dumbbell, Utensils, UserPlus, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';

interface LandmarkPoint {
  id: number;
  nombre: string;
  x: number;
  y: number;
  z: number;
  visibilidad: number;
}

interface BiometricMetrics {
  relacion_hombro_cadera: number;
  ancho_hombros_norm: number;
  ancho_cadera_norm: number;
  postura: string;
}

interface AnalysisResult {
  status: string;
  landmarks_count: number;
  precision: number;
  somatotipo_estimado: 'MESOMORFO' | 'ECTOMORFO' | 'ENDOMORFO' | string;
  metricas_biometricas: BiometricMetrics;
  landmarks: LandmarkPoint[];
  probabilidades_somatotipo?: Record<string, number>;
  scores_heath_carter?: {
    endo?: number;
    meso?: number;
    ecto?: number;
  };
  detail?: string;
  message?: string;
}

export const Biometria: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const { isGuest } = useAuth();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'rutina' | 'dieta' | 'antropometria' | 'telemetria'>('diagnostico');
  const [estaturaCm, setEstaturaCm] = useState<number>(175);
  const [pesoKg, setPesoKg] = useState<number>(75);
  const facingMode = 'user';

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Iniciar la cámara local mediante getUserMedia API
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: facingMode
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCapturedImage(null);
      setAnalysisResult(null);
      setIsDemoData(false);
      toast.success('Cámara local activada vía getUserMedia API');
    } catch (err: any) {
      console.error('Error accediendo a getUserMedia:', err);
      toast.error('No se pudo acceder a la cámara. Revisa los permisos del navegador o usa el botón de subida de archivo.');
    }
  };

  // Detener cámara y liberar hardware
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      // Limpieza al desmontar componente
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Dibujar los 33 landmarks sobre el canvas del fotograma capturado
  const drawLandmarksOnCanvas = (landmarks: LandmarkPoint[], imgElement: HTMLImageElement) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    canvas.width = imgElement.naturalWidth || imgElement.width || 640;
    canvas.height = imgElement.naturalHeight || imgElement.height || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar imagen base
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    // Definir conexiones anatómicas clave entre landmarks
    const connections: [number, number][] = [
      [11, 12], // Hombros
      [11, 13], [13, 15], // Brazo izquierdo
      [12, 14], [14, 16], // Brazo derecho
      [11, 23], [12, 24], // Tronco
      [23, 24], // Caderas
      [23, 25], [25, 27], // Pierna izquierda
      [24, 26], [26, 28], // Pierna derecha
    ];

    // 1. Dibujar líneas de conexión esqueléticas
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e8dc00'; // Dorado Spartan
    ctx.shadowColor = '#e8dc00';
    ctx.shadowBlur = 8;

    connections.forEach(([i1, i2]) => {
      const p1 = landmarks.find(p => p.id === i1);
      const p2 = landmarks.find(p => p.id === i2);
      if (p1 && p2 && p1.visibilidad > 0.4 && p2.visibilidad > 0.4) {
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      }
    });

    // 2. Dibujar nodos (puntos articulares 3D)
    landmarks.forEach((p) => {
      if (p.visibilidad > 0.3) {
        const px = p.x * canvas.width;
        const py = p.y * canvas.height;

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#e8dc00';
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#080808';
        ctx.fill();
      }
    });
  };

  // Enviar fotograma discreto (Blob) al Gateway
  const sendFrameToGateway = async (blob: Blob, imagePreviewUrl: string, customEstatura?: number, customPeso?: number) => {
    setAnalyzing(true);
    setCapturedImage(imagePreviewUrl);

    const activeEstatura = customEstatura ?? estaturaCm ?? 175;
    const activePeso = customPeso ?? pesoKg ?? 75;

    const formData = new FormData();
    formData.append('file', blob, 'pose_frame.jpg');
    formData.append('estatura_cm', String(activeEstatura));
    formData.append('peso_kg', String(activePeso));

    const t0 = performance.now();
    window.dispatchEvent(new CustomEvent('ai-infer-start'));

    try {
      const response = await apiClient.post<AnalysisResult>('/ia/pose/analizar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 12000, // 12s en cliente para acomodar los 10s del Gateway
      });

      const result = response.data;
      setAnalysisResult(result);

      const elapsedMs = Math.round(performance.now() - t0);
      window.dispatchEvent(new CustomEvent('ai-infer-complete', {
        detail: {
          jobId: `MP-${Date.now().toString().slice(-4)}`,
          latencyMs: elapsedMs,
        }
      }));

      if (result.status === 'success' && result.landmarks && result.landmarks.length > 0) {
        toast.success(`Análisis biométrico completado con éxito (${(result.precision * 100).toFixed(1)}% de visibilidad postural detectada)`);

        // Renderizar overlay de landmarks
        const img = new Image();
        img.src = imagePreviewUrl;
        img.onload = () => {
          drawLandmarksOnCanvas(result.landmarks, img);
        };
      } else {
        toast.warning(result.message || 'No se detectó una figura corporal clara en el fotograma.');
      }
    } catch (err: any) {
      const elapsedMs = Math.round(performance.now() - t0);
      window.dispatchEvent(new CustomEvent('ai-infer-complete', {
        detail: {
          jobId: 'FAIL',
          latencyMs: elapsedMs,
        }
      }));
      console.error('Error enviando fotograma a /ia/pose/analizar:', err);
      const detail = err.response?.data?.detail;
      let errMsg = 'Error analizando fotograma';
      if (typeof detail === 'string') {
        errMsg = detail;
      } else if (Array.isArray(detail)) {
        errMsg = detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (err.message) {
        errMsg = err.message;
      }
      toast.error(`Error en análisis de pose: ${errMsg}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Capturar fotograma discreto desde el video en vivo
  const captureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Error extrayendo fotograma del video');
        return;
      }
      const previewUrl = canvas.toDataURL('image/jpeg', 0.9);
      setIsDemoData(false);
      stopCamera();
      sendFrameToGateway(blob, previewUrl);
    }, 'image/jpeg', 0.9);
  };

  // Manejo de archivo subido manualmente (fallback o demo con sample_pose.jpg)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const previewUrl = event.target?.result as string;
      setIsDemoData(false);
      stopCamera();
      sendFrameToGateway(file, previewUrl);
    };
    reader.readAsDataURL(file);
  };

  // Cargar muestra de prueba oficial (sample_pose.jpg) para demostración instantánea ante el tribunal
  const loadDemoSample = async () => {
    try {
      setAnalyzing(true);
      setIsDemoData(true);
      // Sincronizar con los parámetros oficiales del atleta de prueba de la tesis (175cm / 75kg)
      setEstaturaCm(175);
      setPesoKg(75);
      const res = await fetch('/sample_pose.jpg');
      const blob = await res.blob();
      const previewUrl = '/sample_pose.jpg';
      stopCamera();
      await sendFrameToGateway(blob, previewUrl, 175, 75);
    } catch (err: any) {
      console.error('Error cargando fotograma demo:', err);
      toast.error('Error cargando fotograma demo');
      setAnalyzing(false);
    }
  };

  // Información complementaria de somatotipo
  const getSomatotypeDetails = (type?: string) => {
    switch (type) {
      case 'MESOMORFO':
        return {
          title: 'Mesomorfo (Atlético / V-Taper)',
          badge: 'border-[#e8dc00]/40 text-[#e8dc00] bg-[#e8dc00]/10',
          desc: 'Excelente capacidad de desarrollo muscular con baja propensión a acumular tejido graso. Estructura ósea amplia en hombros con cintura estrecha.',
          suplemento: '100% Whey Gold Standard + Creatina Creapure',
          link: '/catalogo',
          recomendacion: 'Entrenamiento de fuerza hipertrófica con carga progresiva y balance proteico de 2.0g/kg.'
        };
      case 'ECTOMORFO':
        return {
          title: 'Ectomorfo (Metabolismo Acelerado / Lineal)',
          badge: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
          desc: 'Estructura esbelta con extremidades largas y metabolismo basal muy eficiente. Requiere superávit calórico controlado para hipertrofia.',
          suplemento: 'Mass Gainer Spartan + Complejo B + Creatina',
          link: '/catalogo',
          recomendacion: 'Mayor densidad calórica, carbohidratos complejos y pausas de descanso ampliadas entre series pesadas.'
        };
      case 'ENDOMORFO':
        return {
          title: 'Endomorfo (Estructura Sólida / Fuerza Natural)',
          badge: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
          desc: 'Gran fortaleza articular y capacidad de carga pesada. Mayor facilidad para ganar masa magra pero sensible a los hidratos de carbono simples.',
          suplemento: 'Proteína Whey Isolate Zero Carbs + Termogénico',
          link: '/catalogo',
          recomendacion: 'Ciclos de entrenamiento combinados (fuerza + HIIT metabólico) con control glucémico estricto.'
        };
      default:
        return {
          title: 'Evaluando Biometría...',
          badge: 'border-white/10 text-zinc-400 bg-white/[0.04]',
          desc: 'Captura un fotograma de cuerpo entero para activar el clasificador biomecánico.',
          suplemento: 'Catálogo de Suplementación Élite',
          link: '/catalogo',
          recomendacion: 'Mantén una posición erguida frente a la cámara.'
        };
    }
  };

  const getSomatotypeRoutineAndDiet = (type?: string) => {
    switch (type) {
      case 'ECTOMORFO':
        return {
          rutina: {
            frecuencia: '4 días por semana (Frecuencia 2 / Torso-Pierna)',
            enfoque: 'Hipertrofia Miofibrilar y Tensión Mecánica Progresiva',
            descanso: '90 a 120 segundos entre series para regeneración completa de ATP.',
            dias: [
              { dia: 'Lunes', sesion: 'Torso Fuerza & Volumen', ejercicios: ['Press Banca con Barra 4x6-8', 'Remo con Barra 4x6-8', 'Press Militar de Pie 3x8', 'Dominadas Lastradas 3x8', 'Fondos en Paralelas 3x10'] },
              { dia: 'Martes', sesion: 'Pierna & Cadena Posterior', ejercicios: ['Sentadilla Trasera Profunda 4x6-8', 'Peso Muerto Rumano 3x8-10', 'Prensa Inclinada 3x10', 'Elevación de Gemelos 4x12', 'Plancha Abdominal 3x45s'] },
              { dia: 'Jueves', sesion: 'Torso Hipertrofia Sarcomérica', ejercicios: ['Press Inclinado con Mancuernas 4x8-10', 'Jalón al Pecho Agarre Neutro 4x10', 'Elevaciones Laterales Pesadas 4x12', 'Curl Bíceps Barra Z 3x10', 'Press Francés Tríceps 3x10'] },
              { dia: 'Viernes', sesion: 'Tren Inferior & Estabilidad', ejercicios: ['Peso Muerto Convencional 3x5', 'Sentadilla Búlgara 3x10/pierna', 'Curl Femoral Tumbado 4x12', 'Zancadas con Mancuerna 3x12', 'Rueda Abdominal 3x12'] },
            ]
          },
          dieta: {
            calorias: 'Superávit Calórico Hipertrófico (+400 a +500 kcal sobre mantenimiento basal)',
            macros: { carbs: '55%', proteina: '25% (2.0g - 2.2g / kg)', grasas: '20%' },
            alimentos: ['Avena entera, arroz jazmín, patata y boniato asado', 'Pechuga de pollo, ternera magra y huevos enteros camperos', 'Mantequilla de maní natural, aceite de oliva virgen extra y nueces', 'Batido hipercalórico con proteína y carbohidratos post-entrenamiento'],
            timing: '5 a 6 comidas cada 3 horas. Ingesta sólida rica en carbohidratos 90 min pre-entreno y proteína líquida inmediata post-entreno.'
          },
          stack: [
            { nombre: 'ADN 100 CREATINE 250G', dosis: '5g diarios post-entreno', motivo: 'Saturación celular de fosfocreatina para máxima fuerza y síntesis proteica.' },
            { nombre: 'WHEY GOLD STANDARD 5LBS', dosis: '1 scoop (30g) con avena', motivo: 'Aporte de 24g de proteína de rápida asimilación y 5.5g de BCAAs.' },
            { nombre: 'DRAGON PHARMA ATP FORCE', dosis: '1 servicio 20 min antes', motivo: 'Potenciador del ATP celular y resistencia a la fatiga en series pesadas.' }
          ]
        };
      case 'ENDOMORFO':
        return {
          rutina: {
            frecuencia: '5 días por semana (Híbrido Fuerza + Acondicionamiento Metabólico HIIT)',
            enfoque: 'Aceleración Metabólica, Quema Lipídica y Preservación de Masa Muscular',
            descanso: '45 a 60 segundos para sostener una frecuencia cardíaca elevada.',
            dias: [
              { dia: 'Lunes', sesion: 'Empuje & HIIT', ejercicios: ['Press Banca Inclinado 4x10-12', 'Press Militar Mancuernas 4x10', 'Fondos en Paralelas 3x12', 'Aperturas Polea 3x15', 'HIIT en Cinta 15 min (30s sprint / 30s trote)'] },
              { dia: 'Martes', sesion: 'Tracción & Core', ejercicios: ['Peso Muerto Sumo 4x8-10', 'Remo Gironda Polea Baja 4x10-12', 'Jalón Neutro 3x12', 'Face Pulls 4x15', 'Hanging Leg Raises 4x15'] },
              { dia: 'Miércoles', sesion: 'Pierna Metabólica', ejercicios: ['Sentadilla Goblet 4x12-15', 'Prensa Inclinada 4x15 (drop set)', 'Extensiones Cuádriceps 3x15', 'Curl Femoral 4x15', 'Cardio Zona 2 en Bicicleta 25 min'] },
              { dia: 'Viernes', sesion: 'Torso Densidad', ejercicios: ['Press Plano Mancuernas 4x10', 'Remo Mancuerna a 1 brazo 4x10', 'Press Militar Barra 3x12', 'Curl Martillo 3x12', 'Extensiones Tríceps Cuerda 3x15'] },
              { dia: 'Sábado', sesion: 'Circuito Funcional Spartan', ejercicios: ['Kettlebell Swings 4x20', 'Burpees 4x15', 'Box Jumps 4x12', 'Battle Ropes 4x30s', 'Planchas Isométricas 4x60s'] },
            ]
          },
          dieta: {
            calorias: 'Déficit Calórico Controlado (-400 kcal preservando tejido magro)',
            macros: { carbs: '30% (Bajo índice glucémico)', proteina: '45% (2.2g - 2.4g / kg)', grasas: '25%' },
            alimentos: ['Verduras de hoja verde, brócoli, espárragos y quinoa controlada', 'Claras de huevo, pechuga de pavo, atún al natural y pescado blanco', 'Aguacate en porciones pesadas, semillas de chía y aceite de oliva en spray'],
            timing: '3 a 4 comidas saciantes de alta densidad proteica. Concentración de carbohidratos en la ventana de entrenamiento.'
          },
          stack: [
            { nombre: 'ISO 100 WHEY ZERO', dosis: '1 scoop (25g) en agua post-entreno', motivo: 'Cero azúcar, cero carbohidratos y absorción ultra pura para definición.' },
            { nombre: 'THERMOGENIC RIPPER', dosis: '1 cápsula con el desayuno', motivo: 'Estimulación del metabolismo lipídico y supresión del apetito durante el déficit.' },
            { nombre: 'L-CARNITINA LÍQUIDA 3000', dosis: '1 dosis 20 min antes del cardio', motivo: 'Transporte de ácidos grasos a las mitocondrias para conversión en energía.' }
          ]
        };
      case 'MESOMORFO':
      default:
        return {
          rutina: {
            frecuencia: '5 días por semana (Periodización Ondulante Push-Pull-Legs)',
            enfoque: 'Fuerza Máxima + Hipertrofia Sarcomérica + Recomposición Atlética',
            descanso: '60 a 90 segundos entre series con alternancia de cadencias excéntricas.',
            dias: [
              { dia: 'Lunes', sesion: 'Empuje Pesado (Push 1)', ejercicios: ['Press Banca Plano 4x6 (RPE 8.5)', 'Press Inclinado Mancuernas 3x8-10', 'Press Militar con Barra 4x6-8', 'Elevaciones Laterales 4x12', 'Extensiones Tríceps Polea 3x12'] },
              { dia: 'Martes', sesion: 'Tracción & Espalda (Pull 1)', ejercicios: ['Peso Muerto Convencional 3x5', 'Remo con Barra 4x6-8', 'Dominadas Pronas 4x8', 'Remo en Banco Inclinado 3x10', 'Curl Bíceps con Barra 3x10'] },
              { dia: 'Miércoles', sesion: 'Pierna & Potencia (Legs 1)', ejercicios: ['Sentadilla Trasera 4x6-8', 'Prensa Inclinada 4x10', 'Hip Thrust con Barra 4x8-10', 'Zancadas Caminando 3x12/pierna', 'Gemelos Sentado 4x15'] },
              { dia: 'Viernes', sesion: 'Torso Hipertrofia (Upper 2)', ejercicios: ['Press Declinado Mancuernas 3x10', 'Jalón al Pecho Agarre Neutro 4x10', 'Pec Deck 3x12', 'Remo Gironda 3x12', 'Superserie Bíceps/Tríceps 3x12'] },
              { dia: 'Sábado', sesion: 'Pierna & Acondicionamiento (Legs 2)', ejercicios: ['Sentadilla Frontal 3x8', 'Peso Muerto Rumano 4x8', 'Paseo del Granjero 4x30m', 'Sprints en Colina 5x40m', 'Abdominales en Polea 4x15'] },
            ]
          },
          dieta: {
            calorias: 'Recomposición Atlética / Superávit Limpio (+200 kcal)',
            macros: { carbs: '45%', proteina: '30% (2.0g - 2.2g / kg)', grasas: '25%' },
            alimentos: ['Arroz basmati, copos de avena, patatas y pasta integral', 'Salmón fresco, ternera magra, pechuga de pollo y huevos enteros', 'Frutos secos variados, aguacate, aceite de oliva virgen y cacao puro'],
            timing: '4 a 5 comidas balanceadas. Nutrición peri-entrenamiento con ratio carbohidrato/proteína 2:1 para síntesis de glucógeno.'
          },
          stack: [
            { nombre: '100% WHEY GOLD STANDARD', dosis: '1 scoop (30g) post-entrenamiento', motivo: 'Perfil balanceado de aminoácidos esenciales y rápida digestión.' },
            { nombre: 'ADN 100 CREATINE 250G', dosis: '5g diarios a cualquier hora', motivo: 'Incremento comprobado del 12-15% en potencia explosiva y tamaño muscular.' },
            { nombre: 'DRAGON PHARMA ATP FORCE', dosis: '1 servicio 20 min antes', motivo: 'Monohidrato de creatina + betaína + taurina para fuerza inmediata.' }
          ]
        };
    }
  };

  const somatotypeInfo = getSomatotypeDetails(analysisResult?.somatotipo_estimado);
  const personalizedPlan = getSomatotypeRoutineAndDiet(analysisResult?.somatotipo_estimado);

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col relative overflow-hidden">
      {/* Ambient background glows for optical glass refraction */}
      <div className="spartan-ambient-glow w-[520px] h-[520px] -top-24 -left-36 opacity-30" />
      <div className="spartan-ambient-glow w-[600px] h-[600px] top-[30%] -right-48 opacity-20" />
      <div className="spartan-ambient-glow w-[550px] h-[550px] bottom-10 left-[25%] opacity-15" />

      <div className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/[0.07] pb-6 mb-8 gap-4">
          <div>
            <span className="font-['JetBrains_Mono'] text-[11px] uppercase tracking-wider text-[#e8dc00] block mb-1">
              Visión Computacional & Biomecánica
            </span>
            <h1 className="font-['Anybody'] text-3xl sm:text-4xl font-black uppercase tracking-tight text-white">
              Biometría
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl mt-1 font-['Inter']">
              Analiza postura, composición y proporciones corporales mediante visión computacional.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowArchitectureModal(true)}
              className="spartan-btn-secondary px-3 py-2 text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md rounded-xl"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Arquitectura</span>
            </button>

            <Link
              to="/catalogo"
              className="spartan-btn-primary px-3 py-2 text-[11px] flex items-center gap-1.5 cursor-pointer shadow-md rounded-xl"
            >
              <span>Catálogo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Banner de Invitación para Invitados (Conversión a Cliente) */}
        {isGuest && (
          <div className="mb-6 p-5 bg-[#0c0c0c] border border-[#e8dc00]/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#e8dc00]/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-11 h-11 rounded-xl bg-[#e8dc00]/10 border border-[#e8dc00]/30 flex items-center justify-center text-[#e8dc00] shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-[#e8dc00] font-bold">
                    Acceso para Atletas Spartan
                  </span>
                  <span className="px-2 py-0.5 bg-white/[0.05] border border-white/10 text-zinc-300 text-[9px] font-bold uppercase font-['JetBrains_Mono'] rounded-md">
                    Modo Invitado Activo
                  </span>
                </div>
                <h3 className="font-['Inter'] text-sm sm:text-base text-white font-bold">
                  Crea tu Perfil de Atleta para Guardar tus Mediciones
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                  Registra tu cuenta en 30 segundos para desbloquear tu historial biométrico, planes de entrenamiento adaptados a tu somatotipo y cálculo nutricional exacto.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto relative z-10">
              <Link
                to="/registro"
                className="flex-1 md:flex-initial text-center spartan-btn-primary px-4 py-2.5 text-xs uppercase font-bold rounded-xl shadow-lg"
              >
                Crear Cuenta Gratis
              </Link>
              <Link
                to="/login"
                className="flex-1 md:flex-initial text-center spartan-btn-secondary px-4 py-2.5 text-xs uppercase font-['JetBrains_Mono'] rounded-xl"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}

        {/* Rejilla de Trabajo: Visor de Video Local a la izquierda, Resultados a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Camera & Metrics Column */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-[4/3] w-full bg-[#0c0c0c] border border-white/[0.07] overflow-hidden flex items-center justify-center rounded-2xl shadow-xl">
              {/* 1. Video en vivo si la cámara está activa */}
              {cameraActive && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {/* 2. Imagen fija analizada o Canvas de Overlay */}
              {!cameraActive && capturedImage && (
                <canvas
                  ref={overlayCanvasRef}
                  className="w-full h-full object-contain bg-black"
                />
              )}

              {/* 3. Estado inactivo inicial */}
              {!cameraActive && !capturedImage && (
                <div className="text-center p-8 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#111111] border border-white/[0.07] flex items-center justify-center mb-4 text-[#e8dc00]">
                    <Scan className="h-8 w-8" />
                  </div>
                  <h3 className="font-['Inter'] text-base font-bold text-white mb-1">
                    Cámara Inactiva
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mb-5 font-['Inter']">
                    Activa la cámara o sube una imagen para iniciar el análisis biométrico y estimación de somatotipo.
                  </p>
                  <button
                    onClick={startCamera}
                    className="spartan-btn-primary px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer rounded-xl shadow-lg"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Iniciar Análisis</span>
                  </button>
                </div>
              )}

              {/* Status indicator */}
              {cameraActive && (
                <div className="absolute bottom-3 left-3 pointer-events-none">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase bg-black/80 px-2.5 py-1 text-[#e8dc00] border border-white/10 rounded-lg">
                    Cámara activa
                  </span>
                </div>
              )}

              {/* Spinner de Análisis */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20">
                  <RefreshCw className="h-8 w-8 text-[#e8dc00] animate-spin mb-3" />
                  <div className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-white font-bold">
                    Procesando fotograma...
                  </div>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="bg-[#0c0c0c] border border-white/[0.07] p-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl shadow-md">
              <div className="flex items-center gap-2 flex-wrap">
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-[11px] font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer rounded-xl"
                  >
                    <CameraOff className="h-3.5 w-3.5" />
                    <span>Detener</span>
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-[11px] font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer rounded-xl"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Cámara</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-[11px] font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer rounded-xl"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Subir</span>
                </button>

                <button
                  onClick={loadDemoSample}
                  disabled={analyzing}
                  title="Cargar muestra demo"
                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#e8dc00]/40 hover:border-[#e8dc00] text-[#e8dc00] bg-[#e8dc00]/10 text-[11px] font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer rounded-xl shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Demo</span>
                </button>
              </div>

              {cameraActive && (
                <button
                  onClick={captureFrame}
                  disabled={analyzing}
                  className="spartan-btn-primary px-5 py-2 text-[11px] flex items-center gap-1.5 cursor-pointer rounded-xl shadow-md"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Capturar</span>
                </button>
              )}

              {capturedImage && !cameraActive && (
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-[11px] font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer rounded-xl"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Otra Captura</span>
                </button>
              )}
            </div>

            {/* Parámetros Antropométricos de Entrada (Altura, Peso, IMC) */}
            <div className="grid grid-cols-3 gap-3 p-3.5 bg-[#0c0c0c] border border-white/[0.07] rounded-2xl text-center">
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400">Altura</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min={100}
                    max={250}
                    value={estaturaCm}
                    onChange={(e) => setEstaturaCm(Math.max(50, Number(e.target.value)))}
                    className="w-14 bg-transparent text-white font-['JetBrains_Mono'] text-sm font-bold text-center outline-none border-b border-white/20 focus:border-[#e8dc00]"
                  />
                  <span className="text-zinc-500 font-['JetBrains_Mono'] text-xs">cm</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center border-x border-white/[0.07]">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400">Peso</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min={30}
                    max={250}
                    value={pesoKg}
                    onChange={(e) => setPesoKg(Math.max(20, Number(e.target.value)))}
                    className="w-14 bg-transparent text-white font-['JetBrains_Mono'] text-sm font-bold text-center outline-none border-b border-white/20 focus:border-[#e8dc00]"
                  />
                  <span className="text-zinc-500 font-['JetBrains_Mono'] text-xs">kg</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400">IMC</span>
                <div className="mt-0.5">
                  <span className="text-sm font-['JetBrains_Mono'] font-bold text-[#e8dc00]">
                    {estaturaCm > 0 ? (pesoKg / Math.pow(estaturaCm / 100, 2)).toFixed(1) : '--'}
                  </span>
                  <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500 ml-1">kg/m²</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Segmented Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0c0c0c] border border-white/[0.07] rounded-2xl shrink-0">
              <button
                onClick={() => setActiveTab('diagnostico')}
                className={`flex-1 min-w-[75px] py-2 px-1.5 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'diagnostico'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Evaluación</span>
              </button>
              <button
                onClick={() => setActiveTab('rutina')}
                className={`flex-1 min-w-[70px] py-2 px-1.5 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'rutina'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Dumbbell className="h-3 w-3" />
                <span>Rutina</span>
              </button>
              <button
                onClick={() => setActiveTab('dieta')}
                className={`flex-1 min-w-[65px] py-2 px-1.5 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'dieta'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Utensils className="h-3 w-3" />
                <span>Dieta</span>
              </button>
              <button
                onClick={() => setActiveTab('antropometria')}
                className={`flex-1 min-w-[75px] py-2 px-1.5 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'antropometria'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Métricas</span>
              </button>
              <button
                onClick={() => setActiveTab('telemetria')}
                className={`flex-1 min-w-[75px] py-2 px-1.5 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'telemetria'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Telemetría</span>
              </button>
            </div>

            {/* Tab 1: Evaluación & Somatotipo */}
            {activeTab === 'diagnostico' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Activity className="h-3.5 w-3.5 text-[#e8dc00]" />
                      <span>Perfil Corporal Estimado</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {isDemoData && (
                        <span className="px-2.5 py-0.5 text-[10px] font-['JetBrains_Mono'] font-bold uppercase rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm">
                          Datos demo
                        </span>
                      )}
                      <span className={`px-2.5 py-1 text-[11px] font-['JetBrains_Mono'] font-bold uppercase border rounded-full ${somatotypeInfo.badge}`}>
                        {analysisResult?.somatotipo_estimado || 'ESPERANDO CAPTURA'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-bold font-['Inter'] text-white mb-1">
                      {somatotypeInfo.title}
                    </h2>
                    <p className="text-xs text-zinc-400 leading-relaxed font-['Inter']">
                      {somatotypeInfo.desc}
                    </p>
                  </div>

                  {/* Bloque 1: Métricas de Visibilidad Óptica y Postura Sagital */}
                  <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
                    <div className="bg-[#111111] p-3 rounded-xl border border-white/[0.05]">
                      <div className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400">
                        Visibilidad media
                      </div>
                      <div className="text-xl font-bold font-['JetBrains_Mono'] text-[#e8dc00] mt-1 tabular-nums">
                        {analysisResult ? `${(analysisResult.precision * 100).toFixed(1)}%` : '--'}
                      </div>
                      <div className="w-full bg-black/60 h-1.5 mt-2 overflow-hidden rounded-full border border-white/5">
                        <div
                          className="bg-[#e8dc00] h-full transition-all duration-500 rounded-full"
                          style={{ width: `${(analysisResult?.precision || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-zinc-500 block mt-1 font-['JetBrains_Mono']">
                        Puntos MediaPipe
                      </span>
                    </div>

                    <div className="bg-[#111111] p-3 rounded-xl border border-white/[0.05]">
                      <div className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400">
                        Postura Troncal
                      </div>
                      <div className="text-base font-bold font-['JetBrains_Mono'] text-white mt-1 uppercase truncate">
                        {analysisResult?.metricas_biometricas?.postura || '--'}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-['JetBrains_Mono']">
                        <ShieldCheck className="h-3 w-3 text-[#e8dc00]" />
                        <span>Alineación Sagital</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2: Confianza del Clasificador Machine Learning (Random Forest) */}
                  {analysisResult?.probabilidades_somatotipo && (
                    <div className="bg-[#111111] p-4 rounded-xl border border-white/[0.07] space-y-3 mt-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                        <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-[#e8dc00] font-bold flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3" />
                          <span>Confianza del Clasificador (Random Forest)</span>
                        </span>
                        <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500">
                          150 Árboles
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(analysisResult.probabilidades_somatotipo).map(([clase, prob]) => {
                          const pct = Math.round((prob as number) * 100);
                          const isSelected = clase === analysisResult.somatotipo_estimado;
                          return (
                            <div key={clase} className="space-y-1">
                              <div className="flex justify-between text-[10px] font-['JetBrains_Mono']">
                                <span className={isSelected ? 'text-[#e8dc00] font-bold' : 'text-zinc-400'}>
                                  {clase} {isSelected && '✓'}
                                </span>
                                <span className={isSelected ? 'text-[#e8dc00] font-bold' : 'text-zinc-400'}>
                                  {pct}%
                                </span>
                              </div>
                              <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isSelected ? 'bg-[#e8dc00]' : 'bg-zinc-700'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {analysisResult.scores_heath_carter && (
                        <div className="border-t border-white/[0.07] mt-3 pt-3">
                          <div className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400 mb-2">
                            Tríada Antropométrica Heath-Carter
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.05]">
                              <div className="text-[9px] font-['JetBrains_Mono'] text-zinc-400">ENDOMORFIA</div>
                              <div className="text-sm font-bold font-['JetBrains_Mono'] text-amber-400 mt-0.5">
                                {analysisResult.scores_heath_carter.endo?.toFixed(1) ?? '--'}
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.05]">
                              <div className="text-[9px] font-['JetBrains_Mono'] text-zinc-400">MESOMORFIA</div>
                              <div className="text-sm font-bold font-['JetBrains_Mono'] text-[#e8dc00] mt-0.5">
                                {analysisResult.scores_heath_carter.meso?.toFixed(1) ?? '--'}
                              </div>
                            </div>
                            <div className="p-2 rounded-lg bg-black/40 border border-white/[0.05]">
                              <div className="text-[9px] font-['JetBrains_Mono'] text-zinc-400">ECTOMORFIA</div>
                              <div className="text-sm font-bold font-['JetBrains_Mono'] text-cyan-400 mt-0.5">
                                {analysisResult.scores_heath_carter.ecto?.toFixed(1) ?? '--'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recomendación de Nutrición Vinculada */}
                  <div className="border border-[#e8dc00]/30 bg-[#e8dc00]/5 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-[#e8dc00] text-xs font-['JetBrains_Mono'] uppercase font-bold mb-1">
                      <Zap className="h-4 w-4" />
                      <span>Prescripción Nutricional Sugerida</span>
                    </div>
                    <div className="text-sm font-bold text-white mb-1 font-['Inter']">
                      {somatotypeInfo.suplemento}
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <Link
                        to="/prescripcion"
                        className="spartan-btn-primary w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Ver Prescripción Inteligente</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link
                        to="/catalogo"
                        className="inline-flex items-center gap-1.5 text-xs font-bold font-['JetBrains_Mono'] uppercase text-[#e8dc00] hover:text-white transition-colors"
                      >
                        <span>Ver fórmulas en el Catálogo</span>
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Rutina de Entrenamiento por Somatotipo */}
            {activeTab === 'rutina' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Dumbbell className="h-3.5 w-3.5 text-[#e8dc00]" />
                      <span>Periodización de Entrenamiento</span>
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-['JetBrains_Mono'] font-bold uppercase bg-[#e8dc00]/10 text-[#e8dc00] border border-[#e8dc00]/30 rounded-full">
                      {analysisResult?.somatotipo_estimado || 'MESOMORFO'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-['Inter'] text-white">
                      {personalizedPlan.rutina.enfoque}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 font-['JetBrains_Mono']">
                      Frecuencia: {personalizedPlan.rutina.frecuencia}
                    </p>
                  </div>

                  {/* Microciclo semanal */}
                  <div className="space-y-3">
                    {personalizedPlan.rutina.dias.map((d, i) => (
                      <div key={i} className="bg-[#111111] border border-white/[0.05] p-3.5 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold font-['JetBrains_Mono'] text-[#e8dc00] uppercase">
                            {d.dia} &bull; {d.sesion}
                          </span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-zinc-300">
                          {d.ejercicios.map((ej, j) => (
                            <li key={j} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#e8dc00] shrink-0" />
                              <span>{ej}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-[#111111] rounded-xl text-xs text-zinc-400 border border-white/[0.05]">
                    <strong className="text-white block mb-0.5 font-['JetBrains_Mono'] uppercase text-[10px]">Pauta de Descanso:</strong>
                    {personalizedPlan.rutina.descanso}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Plan Nutricional & Dieta */}
            {activeTab === 'dieta' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Utensils className="h-3.5 w-3.5 text-[#e8dc00]" />
                      <span>Plan Nutricional & Dieta</span>
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-['JetBrains_Mono'] font-bold uppercase bg-[#e8dc00]/10 text-[#e8dc00] border border-[#e8dc00]/30 rounded-full">
                      {analysisResult?.somatotipo_estimado || 'MESOMORFO'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold font-['Inter'] text-white">
                      Distribución de Macronutrientes
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 font-['Inter']">
                      {personalizedPlan.dieta.calorias}
                    </p>
                  </div>

                  {/* Macros Bar */}
                  <div className="grid grid-cols-3 gap-2.5 text-center font-['JetBrains_Mono']">
                    <div className="bg-[#111111] border border-white/[0.05] p-3 rounded-xl">
                      <div className="text-[10px] uppercase text-zinc-400">Carbohidratos</div>
                      <div className="text-lg font-bold text-[#e8dc00] mt-1">{personalizedPlan.dieta.macros.carbs}</div>
                    </div>
                    <div className="bg-[#111111] border border-white/[0.05] p-3 rounded-xl">
                      <div className="text-[10px] uppercase text-zinc-400">Proteínas</div>
                      <div className="text-lg font-bold text-white mt-1">{personalizedPlan.dieta.macros.proteina}</div>
                    </div>
                    <div className="bg-[#111111] border border-white/[0.05] p-3 rounded-xl">
                      <div className="text-[10px] uppercase text-zinc-400">Grasas</div>
                      <div className="text-lg font-bold text-amber-400 mt-1">{personalizedPlan.dieta.macros.grasas}</div>
                    </div>
                  </div>

                  {/* Alimentos Prioritarios */}
                  <div>
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-[#e8dc00] block mb-2 font-bold">
                      Fuentes Alimenticias Óptimas
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      {personalizedPlan.dieta.alimentos.map((al, idx) => (
                        <div key={idx} className="p-2.5 bg-[#111111] border border-white/[0.05] rounded-xl text-xs text-zinc-300 flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#e8dc00] shrink-0" />
                          <span>{al}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stack de Suplementos Vinculados */}
                  <div className="p-4 border border-[#e8dc00]/30 bg-[#e8dc00]/5 rounded-xl">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-[#e8dc00] block mb-2 font-bold">
                      Stack Spartan Recomendado para este Somatotipo
                    </span>
                    <div className="space-y-2">
                      {personalizedPlan.stack.map((stk, idx) => (
                        <div key={idx} className="p-2.5 bg-[#111111] border border-white/[0.05] rounded-xl">
                          <div className="flex justify-between items-center text-xs font-bold text-white mb-0.5">
                            <span className="font-['Inter'] uppercase">{stk.nombre}</span>
                            <span className="text-[10px] font-['JetBrains_Mono'] text-[#e8dc00]">{stk.dosis}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">{stk.motivo}</p>
                        </div>
                      ))}
                    </div>
                    <Link
                      to="/catalogo"
                      className="mt-3 w-full py-2.5 spartan-btn-primary text-xs flex items-center justify-center gap-2 rounded-xl uppercase font-bold shadow-md"
                    >
                      <span>Ver Stack en Catálogo</span>
                      <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                    </Link>
                  </div>

                  <div className="p-3 bg-[#111111] border border-white/[0.05] rounded-xl text-xs text-zinc-400">
                    <strong className="text-white block mb-0.5 font-['JetBrains_Mono'] uppercase text-[10px]">Timing Nutricional:</strong>
                    {personalizedPlan.dieta.timing}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 2: Métricas Antropométricas */}
            {activeTab === 'antropometria' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-[#e8dc00]" />
                      <span>Proporciones Antropométricas</span>
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-['JetBrains_Mono'] font-bold uppercase bg-white/[0.05] text-zinc-400 rounded-md">
                      Determinista
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-[#111111] border border-white/[0.05] p-3.5 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-400">Ratio V-Taper (Hombro / Cadera)</span>
                        <span className="text-base font-bold font-['JetBrains_Mono'] text-[#e8dc00] tabular-nums">
                          {analysisResult?.metricas_biometricas?.relacion_hombro_cadera ? `${analysisResult.metricas_biometricas.relacion_hombro_cadera}x` : '--'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Proporción estética clásica de desarrollo escapular sobre cintura pélvica.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#111111] border border-white/[0.05] p-3 rounded-xl">
                        <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400 block mb-1">Ancho Hombros (Norm)</span>
                        <span className="text-base font-bold font-['JetBrains_Mono'] text-white tabular-nums">
                          {analysisResult?.metricas_biometricas?.ancho_hombros_norm ? `${analysisResult.metricas_biometricas.ancho_hombros_norm.toFixed(3)}` : '--'}
                        </span>
                      </div>
                      <div className="bg-[#111111] border border-white/[0.05] p-3 rounded-xl">
                        <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400 block mb-1">Ancho Cadera (Norm)</span>
                        <span className="text-base font-bold font-['JetBrains_Mono'] text-white tabular-nums">
                          {analysisResult?.metricas_biometricas?.ancho_cadera_norm ? `${analysisResult.metricas_biometricas.ancho_cadera_norm.toFixed(3)}` : '--'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#111111] border border-white/[0.05] p-3.5 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-400">Alineación Biomecánica</span>
                        <span className="text-xs font-bold font-['JetBrains_Mono'] uppercase text-[#e8dc00]">
                          {analysisResult?.metricas_biometricas?.postura || '--'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        Ángulo del vector sagital y frontal calculado contra la vertical de gravedad terrestre.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab 3: Telemetría 3D & Arquitectura */}
            {activeTab === 'telemetria' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                {/* 33 Landmarks Topology */}
                <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Layers className="h-3.5 w-3.5 text-[#e8dc00]" />
                      <span>Landmarks 3D Extraídos</span>
                    </span>
                    <span className="font-['JetBrains_Mono'] text-xs font-bold text-[#e8dc00] tabular-nums">
                      {analysisResult?.landmarks_count || '0'} / 33
                    </span>
                  </div>

                  {analysisResult?.landmarks && analysisResult.landmarks.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto divide-y divide-white/10 text-[10px] font-['JetBrains_Mono'] pr-1 mb-2">
                      {analysisResult.landmarks.slice(0, 10).map((lm) => (
                        <div key={lm.id} className="py-1.5 flex justify-between items-center text-zinc-300">
                          <span className="truncate max-w-[130px] text-zinc-400 font-semibold">
                            #{lm.id} {lm.nombre}
                          </span>
                          <span className="text-[#e8dc00] tabular-nums">
                            x:{lm.x.toFixed(2)} y:{lm.y.toFixed(2)} z:{lm.z.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-zinc-400">
                      Inicia una captura o demo para visualizar el tensor 3D de landmarks.
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Técnico: Diagrama de Secuencia y Respuestas Anticipadas */}
      {showArchitectureModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-white/10 max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#e8dc00]" />
                <h3 className="text-xl font-bold font-['Inter'] uppercase tracking-wider text-white">
                  Arquitectura Técnica & Respuestas de Defensa
                </h3>
              </div>
              <button
                onClick={() => setShowArchitectureModal(false)}
                aria-label="Cerrar modal de arquitectura técnica"
                className="text-zinc-400 hover:text-white text-xs font-['JetBrains_Mono'] uppercase p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                [Cerrar]
              </button>
            </div>

            <div className="space-y-6 text-xs text-zinc-300">
              {/* Tarea 5 */}
              <div className="bg-[#111111] p-4 rounded-xl border border-white/[0.07]">
                <div className="text-[#e8dc00] font-bold font-['JetBrains_Mono'] uppercase mb-1">
                  Tarea 5: Integración de Librerías de Visión Artificial
                </div>
                <p className="italic text-zinc-200 mb-2">
                  "MediaPipe vive exclusivamente en el microservicio IA; el gateway ni siquiera importa la librería."
                </p>
                <div className="bg-black/60 p-3 border border-[#e8dc00]/20 text-zinc-300 rounded-xl">
                  <strong className="text-white">¿Por qué to_thread y no ejecutar directo?</strong>
                  <br />
                  La inferencia es CPU-bound; sin offloading bloquea el event loop ASGI y viola la separación de responsabilidades transaccionales de ventas.
                </div>
              </div>

              {/* Tarea 6 */}
              <div className="bg-[#111111] p-4 rounded-xl border border-white/[0.07]">
                <div className="text-[#e8dc00] font-bold font-['JetBrains_Mono'] uppercase mb-2 flex items-center justify-between">
                  <span>Tarea 6: Captura de Video Local vía getUserMedia API & Proxy</span>
                  <span className="text-[10px] bg-[#e8dc00]/10 text-[#e8dc00] px-2 py-0.5 border border-[#e8dc00]/30 font-normal rounded-full">
                    DECISIÓN ARQUITECTÓNICA
                  </span>
                </div>
                <p className="italic text-zinc-200 mb-3 text-xs leading-relaxed border-l-2 border-[#e8dc00] pl-3">
                  "Optamos deliberadamente por la API getUserMedia con fotogramas discretos en lugar de WebRTC peer-to-peer. WebRTC está diseñado para comunicación bidireccional en tiempo real (videollamadas), lo cual sería sobredimensionamiento arquitectónico para un caso de uso unidireccional de inferencia biométrica. El fotograma JPEG discreto reduce ancho de banda en un 85% comparado con streaming WebRTC y mantiene la latencia acotada dentro del timeout de 10 segundos."
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-['JetBrains_Mono'] bg-black/60 p-2.5 border border-white/10 rounded-xl">
                  <div className="text-zinc-400">
                    <span className="text-red-400 font-bold block">WebRTC P2P (Descartado):</span>
                    RTCPeerConnection, STUN/TURN, stream continuo. Sobredimensionamiento innecesario.
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-[#e8dc00] font-bold block">getUserMedia + HTTP POST (Elegido):</span>
                    Captura local en cliente, fotograma discreto, 85% ahorro en ancho de banda.
                  </div>
                </div>
              </div>

              {/* Fragmento de código del Gateway */}
              <div className="bg-black/80 p-3 border border-white/10 font-['JetBrains_Mono'] text-[11px] text-zinc-400 overflow-x-auto rounded-xl">
                <div className="text-zinc-500 mb-1">// app/modules/ia/router.py (Gateway Proxy)</div>
                <div className="text-[#e8dc00]">async with httpx.AsyncClient(timeout=10.0) as client:</div>
                <div className="text-zinc-300 pl-4">response = await client.post(ia_endpoint, files=files_payload)</div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowArchitectureModal(false)}
                aria-label="Cerrar modal de arquitectura técnica"
                className="spartan-btn-primary px-6 py-2.5 text-xs font-bold font-['JetBrains_Mono'] uppercase cursor-pointer rounded-xl shadow-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
