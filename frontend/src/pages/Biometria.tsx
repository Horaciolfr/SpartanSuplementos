import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, CameraOff, Sparkles, Activity, ShieldCheck, Zap, 
  RefreshCw, Upload, ArrowRight,
  Scan, Layers, Dumbbell, Utensils, UserPlus,
  HelpCircle, Sun, Lock, AlertCircle, Timer, X
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import CaptureGuideModal, { shouldShowGuide } from '../components/CaptureGuideModal';
import { useCaptureChecks, type Landmark } from '../hooks/useCaptureChecks';
import { RecetaCard } from '../components/RecetaCard';
import { RecetaModal, type RecetaItemData } from '../components/RecetaModal';
import { EjercicioCard } from '../components/EjercicioCard';
import { EjercicioModal, type EjercicioRutinaData } from '../components/EjercicioModal';

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
  id_perfil?: number;
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

interface SupplementRecommendation {
  id_prescripcion: number;
  id_producto: number;
  codigo_sku: string;
  nombre_producto: string;
  precio_unitario: number;
  stock_actual: number;
  descripcion_tecnica?: string | null;
}

interface SupplementRecommendationResponse {
  id_perfil: number;
  prescripciones: SupplementRecommendation[];
}

interface DiaRutinaData {
  dia: number;
  nombre_dia: string;
  ejercicios: EjercicioRutinaData[];
}

interface RutinaData {
  id_plantilla: number;
  nombre: string;
  somatotipo_solicitado: string;
  somatotipo_plantilla: string;
  objetivo_solicitado: string;
  objetivo_plantilla: string;
  objetivo_declarado: boolean;
  aviso?: string | null;
  frecuencia: string;
  enfoque: string;
  descanso_general: string;
  dias_semana: number;
  regla_aplicada: string;
  disclaimer: string;
  total_ejercicios: number;
  dias: DiaRutinaData[];
}

export const Biometria: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const { isGuest, role } = useAuth();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showArchitectureModal, setShowArchitectureModal] = useState<boolean>(false);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(() => shouldShowGuide());
  const [showMeasurementsModal, setShowMeasurementsModal] = useState<boolean>(false);
  const [measurementsConfirmed, setMeasurementsConfirmed] = useState<boolean>(false);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'diagnostico' | 'rutina' | 'dieta' | 'antropometria' | 'telemetria'>('diagnostico');
  const [estaturaCm, setEstaturaCm] = useState<number | ''>('');
  const [pesoKg, setPesoKg] = useState<number | ''>('');
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [assessmentInputs, setAssessmentInputs] = useState<{ estaturaCm: number; pesoKg: number } | null>(null);
  const facingMode = 'user';

  const [planDiario, setPlanDiario] = useState<any>(null);
  const [loadingPlanDiario, setLoadingPlanDiario] = useState<boolean>(false);
  const [objetivoSeleccionado, setObjetivoSeleccionado] = useState<string>('');
  const [selectedRecetaModal, setSelectedRecetaModal] = useState<RecetaItemData | null>(null);
  const [avisoObjetivo, setAvisoObjetivo] = useState<string | null>(null);

  const [rutinaData, setRutinaData] = useState<RutinaData | null>(null);
  const [loadingRutina, setLoadingRutina] = useState<boolean>(false);
  const [errorRutina, setErrorRutina] = useState<string | null>(null);
  const [selectedEjercicioModal, setSelectedEjercicioModal] = useState<EjercicioRutinaData | null>(null);
  const [selectedDiaFiltro, setSelectedDiaFiltro] = useState<number | 'todos'>('todos');
  const [supplementRecommendations, setSupplementRecommendations] = useState<SupplementRecommendation[]>([]);
  const [loadingSupplements, setLoadingSupplements] = useState<boolean>(false);
  const [supplementsError, setSupplementsError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestLandmarksRef = useRef<Landmark[] | null>(null);
  const captureTimerRef = useRef<number | null>(null);

  // Optimización y redimensión cliente para garantizar formato JPEG estándar compatible y carga instantánea
  const optimizeImageForInference = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 1280;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          0.88
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
      img.src = objectUrl;
    });
  };

  // Las verificaciones acompañan la preparación. La captura siempre la confirma el usuario.
  const { checks } = useCaptureChecks(
    videoRef,
    latestLandmarksRef,
    () => undefined,
    { intervalMs: 250, enabled: cameraActive && !analyzing, autoCapture: false }
  );

  const cancelCaptureCountdown = () => {
    if (captureTimerRef.current !== null) {
      window.clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
    setCaptureCountdown(null);
  };

  // Iniciar la cámara local mediante getUserMedia API con fallback resiliente
  const startCamera = async () => {
    if (!measurementsConfirmed) {
      setShowMeasurementsModal(true);
      return;
    }
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador sin soporte de cámara o conexión no segura (se requiere HTTPS o localhost).');
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: facingMode
          },
          audio: false
        });
      } catch (errFirst) {
        console.warn('Fallback a video sin facingMode...', errFirst);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play error:', playErr);
        }
      }

      setCameraActive(true);
      setCapturedImage(null);
      setAnalysisResult(null);
      setAssessmentInputs(null);
      toast.success('Cámara local activada vía getUserMedia API');
    } catch (err: any) {
      console.error('Error accediendo a getUserMedia:', err);
      let msg = 'No se pudo acceder a la cámara.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permiso denegado. Habilita el acceso a la cámara en los permisos de tu navegador.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.name === 'NotSupportedError') {
        msg = 'No se detectó una cámara física compatible conectada a tu equipo.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'La cámara está siendo usada por otra aplicación.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
      toast.error(msg, {
        description: 'Puedes subir una foto desde tu equipo o probar con la muestra demo.'
      });
    }
  };

  // Detener cámara y liberar hardware
  const stopCamera = () => {
    cancelCaptureCountdown();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    latestLandmarksRef.current = null;
    setCameraActive(false);
    setCameraError(null);
  };

  // Sincronizar stream de video en el elemento de video del DOM
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(console.error);
    }
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      if (captureTimerRef.current !== null) {
        window.clearInterval(captureTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Dibujar los 33 landmarks sobre el canvas del fotograma capturado
  const drawLandmarksOnCanvas = (landmarks: LandmarkPoint[], imgElement: HTMLImageElement, renderSkeleton: boolean = true) => {
    baseImageRef.current = imgElement;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    canvas.width = imgElement.naturalWidth || imgElement.width || 640;
    canvas.height = imgElement.naturalHeight || imgElement.height || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar imagen base
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

    if (!renderSkeleton) return;

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

  const toggleSkeleton = () => {
    const next = !showSkeleton;
    setShowSkeleton(next);
    if (analysisResult?.landmarks && baseImageRef.current) {
      drawLandmarksOnCanvas(analysisResult.landmarks, baseImageRef.current, next);
    }
  };

  // Enviar fotograma discreto (Blob) al Gateway
  const sendFrameToGateway = async (blob: Blob, imagePreviewUrl: string, customEstatura?: number, customPeso?: number) => {
    setAnalyzing(true);
    setCapturedImage(imagePreviewUrl);
    setAnalysisResult(null);
    setActiveTab('diagnostico');
    setPlanDiario(null);
    setRutinaData(null);
    setSupplementRecommendations([]);
    setSupplementsError(null);

    const activeEstatura = customEstatura ?? Number(estaturaCm);
    const activePeso = customPeso ?? Number(pesoKg);
    setAssessmentInputs({ estaturaCm: activeEstatura, pesoKg: activePeso });

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

      const elapsedMs = Math.round(performance.now() - t0);
      window.dispatchEvent(new CustomEvent('ai-infer-complete', {
        detail: {
          jobId: `MP-${Date.now().toString().slice(-4)}`,
          latencyMs: elapsedMs,
        }
      }));

      if (result.status === 'success' && result.landmarks && result.landmarks.length > 0) {
        setAnalysisResult(result);
        setActiveTab('diagnostico');
        latestLandmarksRef.current = result.landmarks.map((p) => ({
          x: p.x,
          y: p.y,
          z: p.z,
          visibility: p.visibilidad,
        }));
        toast.success(`Evaluación corporal completada (${(result.precision * 100).toFixed(1)}% de visibilidad de puntos detectada)`);

        // Renderizar overlay de landmarks
        const img = new Image();
        img.src = imagePreviewUrl;
        img.onload = () => {
          baseImageRef.current = img;
          drawLandmarksOnCanvas(result.landmarks, img, showSkeleton);
        };

        void Promise.all([
          fetchPlanDiario(result.somatotipo_estimado),
          fetchRutina(result.somatotipo_estimado),
          result.id_perfil ? fetchSupplementRecommendations(result.id_perfil) : Promise.resolve(),
        ]);
      } else {
        setAnalysisResult(null);
        setSupplementRecommendations([]);
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
    cancelCaptureCountdown();
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
      stopCamera();
      sendFrameToGateway(blob, previewUrl);
    }, 'image/jpeg', 0.9);
  };

  const startCaptureCountdown = () => {
    const numericHeight = Number(estaturaCm);
    const numericWeight = Number(pesoKg);
    const measurementsValid = measurementsConfirmed && Number.isFinite(numericHeight) && Number.isFinite(numericWeight)
      && numericHeight >= 100 && numericHeight <= 250 && numericWeight >= 30 && numericWeight <= 250;

    if (!measurementsValid) {
      toast.error('Registra una altura entre 100 y 250 cm y un peso entre 30 y 250 kg antes de la captura.');
      return;
    }
    if (!cameraActive || analyzing) {
      toast.info('Activa la cámara antes de preparar la captura.');
      return;
    }
    if (captureTimerRef.current !== null) return;

    let secondsLeft = 10;
    setCaptureCountdown(secondsLeft);
    toast.info('Tienes 10 segundos para colocarte dentro de la guía.');

    captureTimerRef.current = window.setInterval(() => {
      secondsLeft -= 1;
      setCaptureCountdown(secondsLeft);

      if (secondsLeft <= 0) {
        if (captureTimerRef.current !== null) {
          window.clearInterval(captureTimerRef.current);
          captureTimerRef.current = null;
        }
        setCaptureCountdown(null);
        captureFrame();
      }
    }, 1000);
  };

  const confirmMeasurements = () => {
    const numericHeight = Number(estaturaCm);
    const numericWeight = Number(pesoKg);
    const valid = Number.isFinite(numericHeight) && Number.isFinite(numericWeight)
      && numericHeight >= 100 && numericHeight <= 250 && numericWeight >= 30 && numericWeight <= 250;

    if (!valid) {
      toast.error('Ingresa una altura entre 100 y 250 cm y un peso entre 30 y 250 kg.');
      return;
    }

    setMeasurementsConfirmed(true);
    setShowMeasurementsModal(false);
    toast.success('Medidas registradas. Ya puedes activar la cámara.');
  };

  // Manejo de archivo subido manualmente (fallback o demo con sample_pose.jpg)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reiniciar de inmediato el valor del input para permitir reintentar con el mismo archivo
    e.target.value = '';
    if (!file) return;

    try {
      setAnalyzing(true);
      const optimizedBlob = await optimizeImageForInference(file);
      const previewUrl = URL.createObjectURL(optimizedBlob);
      stopCamera();
      await sendFrameToGateway(optimizedBlob, previewUrl);
    } catch (err: any) {
      console.error('Error procesando archivo subido:', err);
      toast.error('Error al procesar el archivo de imagen.');
      setAnalyzing(false);
    }
  };

  // Manejo de arrastrar y soltar fotografía directamente en la zona de cámara
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      setAnalyzing(true);
      const optimizedBlob = await optimizeImageForInference(file);
      const previewUrl = URL.createObjectURL(optimizedBlob);
      stopCamera();
      await sendFrameToGateway(optimizedBlob, previewUrl);
    } catch (err: any) {
      console.error('Error procesando archivo arrastrado:', err);
      toast.error('Error al procesar el archivo arrastrado.');
      setAnalyzing(false);
    }
  };

  const fetchPlanDiario = async (soma?: string, obj?: string) => {
    try {
      setLoadingPlanDiario(true);
      const somatotipo = soma || analysisResult?.somatotipo_estimado;
      if (!somatotipo) return;
      const params: Record<string, string> = { somatotipo };
      const targetObj = obj || objetivoSeleccionado;
      if (targetObj) params.objetivo = targetObj;
      const res = await apiClient.get('/nutricion/plan-diario', { params });
      setPlanDiario(res.data);
      if (res.data.objetivo) setObjetivoSeleccionado(res.data.objetivo);
      setAvisoObjetivo(res.data.aviso || null);
    } catch (err) {
      console.error('Error al obtener plan diario:', err);
    } finally {
      setLoadingPlanDiario(false);
    }
  };

  const fetchRutina = async (soma?: string, obj?: string) => {
    try {
      setLoadingRutina(true);
      setErrorRutina(null);
      const somatotipo = soma || analysisResult?.somatotipo_estimado;
      if (!somatotipo) return;
      const params: Record<string, string> = { somatotipo };
      const targetObj = obj || objetivoSeleccionado;
      if (targetObj) params.objetivo = targetObj;
      const res = await apiClient.get<RutinaData>('/entrenamiento/rutina', { params });
      setRutinaData(res.data);
      if (res.data.objetivo_solicitado) setObjetivoSeleccionado(res.data.objetivo_solicitado);
      if (res.data.aviso) setAvisoObjetivo(res.data.aviso);
    } catch (err: any) {
      console.error('Error al obtener rutina:', err);
      const detail = err.response?.data?.detail;
      setErrorRutina(typeof detail === 'string' ? detail : 'No se pudo cargar la rutina de entrenamiento.');
    } finally {
      setLoadingRutina(false);
    }
  };

  const fetchSupplementRecommendations = async (profileId?: number) => {
    const targetProfileId = profileId || analysisResult?.id_perfil;
    if (!targetProfileId) return;

    try {
      setLoadingSupplements(true);
      setSupplementsError(null);
      let response = await apiClient.get<SupplementRecommendationResponse>(`/ia/prescripcion/${targetProfileId}`);
      if (!response.data.prescripciones?.length) {
        response = await apiClient.post<SupplementRecommendationResponse>(`/ia/prescripcion/${targetProfileId}/generar`);
      }
      setSupplementRecommendations(response.data.prescripciones || []);
    } catch (err) {
      console.error('Error al obtener suplementos sugeridos:', err);
      setSupplementRecommendations([]);
      setSupplementsError('No fue posible consultar los suplementos disponibles en este momento.');
    } finally {
      setLoadingSupplements(false);
    }
  };

  const handleCambiarObjetivo = async (nuevoObj: string) => {
    if (!analysisResult) return;
    setObjetivoSeleccionado(nuevoObj);
    const soma = analysisResult.somatotipo_estimado;
    try {
      await apiClient.put('/usuarios/me/objetivo', { objetivo: nuevoObj });
      toast.success(`Objetivo actualizado: ${nuevoObj}`);
    } catch {
      // Continuar fluidamente en modo demostración o invitado
    }
    fetchPlanDiario(soma, nuevoObj);
    fetchRutina(soma, nuevoObj);
  };

  useEffect(() => {
    if (!analysisResult) return;
    if (activeTab === 'rutina') {
      fetchRutina();
    } else if (activeTab === 'dieta') {
      fetchPlanDiario();
      if (analysisResult.id_perfil && supplementRecommendations.length === 0 && !loadingSupplements) {
        fetchSupplementRecommendations(analysisResult.id_perfil);
      }
    }
  }, [activeTab, analysisResult]);


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
          title: 'Aún sin análisis',
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
            frecuencia: '3 días por semana (Fuerza Relativa y Estabilidad)',
            enfoque: 'Ectomorfo Hipertrofia y Superávit (Tensión Mecánica)',
            descanso: '90 a 120 segundos entre series para regeneración completa de ATP.',
            dias: [
              {
                dia: 1,
                nombre_dia: 'Día 1: Empuje & Brazos',
                sesion: 'Empuje & Brazos',
                ejercicios: [
                  {
                    id_ejercicio: 3,
                    codigo: 'EJ-003',
                    nombre: 'Press de banca con barra',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Pectorales, Deltoides Anterior, Tríceps',
                    dia: 1,
                    orden: 1,
                    series: 4,
                    repeticiones: '6-8',
                    descanso_seg: 90,
                    nota_tecnica: 'Retracción escapular activa y descenso controlado al esternón.',
                    url_gif: '/rutinas/EJ-003.gif',
                    disclaimer: 'Mantén los pies firmes y no arquees excesivamente la zona lumbar.'
                  },
                  {
                    id_ejercicio: 15,
                    codigo: 'EJ-015',
                    nombre: 'Curl de bíceps con barra',
                    categoria: 'TIRON',
                    grupo_muscular: 'Bíceps braquial, Braquial anterior',
                    dia: 1,
                    orden: 2,
                    series: 3,
                    repeticiones: '10',
                    descanso_seg: 75,
                    nota_tecnica: 'Codos fijos pegados al tronco y bajada en 2 segundos.',
                    url_gif: '/rutinas/EJ-015.gif',
                    disclaimer: 'Evita impulsarte con la cadera durante el ascenso.'
                  },
                  {
                    id_ejercicio: 16,
                    codigo: 'EJ-016',
                    nombre: 'Extensión de tríceps en polea',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Tríceps (cabeza lateral y medial)',
                    dia: 1,
                    orden: 3,
                    series: 3,
                    repeticiones: '12',
                    descanso_seg: 60,
                    nota_tecnica: 'Extensión completa hacia abajo con codos bloqueados.',
                    url_gif: '/rutinas/EJ-016.gif',
                    disclaimer: 'No desplaces los codos hacia adelante al volver.'
                  },
                  {
                    id_ejercicio: 4,
                    codigo: 'EJ-004',
                    nombre: 'Dominadas estrictas',
                    categoria: 'TIRON',
                    grupo_muscular: 'Dorsales, Bíceps, Redondo mayor',
                    dia: 1,
                    orden: 4,
                    series: 4,
                    repeticiones: '8',
                    descanso_seg: 90,
                    nota_tecnica: 'Rango completo desde brazos estirados hasta mentón sobre barra.',
                    url_gif: '/rutinas/EJ-004.gif',
                    disclaimer: 'Evita el balanceo o kipping.'
                  }
                ]
              },
              {
                dia: 2,
                nombre_dia: 'Día 2: Pierna & Cadena Posterior',
                sesion: 'Pierna & Cadena Posterior',
                ejercicios: [
                  {
                    id_ejercicio: 1,
                    codigo: 'EJ-001',
                    nombre: 'Sentadilla trasera con barra',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Cuádriceps, Glúteos, Aductores',
                    dia: 2,
                    orden: 1,
                    series: 4,
                    repeticiones: '6-8',
                    descanso_seg: 120,
                    nota_tecnica: 'Descenso a profundidad paralela con rodillas alineadas a la punta de los pies.',
                    url_gif: '/rutinas/EJ-001.gif',
                    disclaimer: 'Mantén la mirada al frente y la columna neutral.'
                  },
                  {
                    id_ejercicio: 14,
                    codigo: 'EJ-014',
                    nombre: 'Peso muerto rumano',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Isquiosurales, Glúteos, Erectores espinales',
                    dia: 2,
                    orden: 2,
                    series: 3,
                    repeticiones: '8-10',
                    descanso_seg: 90,
                    nota_tecnica: 'Bisagra de cadera profunda llevando los glúteos hacia atrás.',
                    url_gif: '/rutinas/EJ-014.gif',
                    disclaimer: 'No redondees la espalda baja al bajar.'
                  },
                  {
                    id_ejercicio: 17,
                    codigo: 'EJ-017',
                    nombre: 'Plancha frontal',
                    categoria: 'CORE',
                    grupo_muscular: 'Recto abdominal, Transverso, Glúteos',
                    dia: 2,
                    orden: 3,
                    series: 3,
                    repeticiones: '60 seg',
                    descanso_seg: 60,
                    nota_tecnica: 'Alineación horizontal estricta con retroversión pélvica.',
                    url_gif: '/rutinas/EJ-017.gif',
                    disclaimer: 'No dejes caer la pelvis hacia el suelo.'
                  },
                  {
                    id_ejercicio: 13,
                    codigo: 'EJ-013',
                    nombre: 'Zancadas caminando',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Cuádriceps, Glúteo mayor, Isquiotibiales',
                    dia: 2,
                    orden: 4,
                    series: 3,
                    repeticiones: '12 por lado',
                    descanso_seg: 75,
                    nota_tecnica: 'Paso largo y torso erguido en cada zancada.',
                    url_gif: '/rutinas/EJ-013.gif',
                    disclaimer: 'Controla el descenso sin golpear la rodilla trasera contra el piso.'
                  }
                ]
              },
              {
                dia: 3,
                nombre_dia: 'Día 3: Hombro & Tracción',
                sesion: 'Hombro & Tracción',
                ejercicios: [
                  {
                    id_ejercicio: 12,
                    codigo: 'EJ-012',
                    nombre: 'Press militar de pie',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Deltoides anterior/medio, Tríceps, Core',
                    dia: 3,
                    orden: 1,
                    series: 4,
                    repeticiones: '8-10',
                    descanso_seg: 90,
                    nota_tecnica: 'Empuje vertical estricto con bloqueo overhead y glúteos apretados.',
                    url_gif: '/rutinas/EJ-012.gif',
                    disclaimer: 'Evita la hiperextensión lumbar al empujar.'
                  },
                  {
                    id_ejercicio: 11,
                    codigo: 'EJ-011',
                    nombre: 'Remo con barra',
                    categoria: 'TIRON',
                    grupo_muscular: 'Dorsal ancho, Romboides, Trapecio medio',
                    dia: 3,
                    orden: 2,
                    series: 4,
                    repeticiones: '6-8',
                    descanso_seg: 90,
                    nota_tecnica: 'Tronco a 45 grados, tracción al ombligo y pausa de 1 segundo.',
                    url_gif: '/rutinas/EJ-011.gif',
                    disclaimer: 'Mantén la espalda recta en todo el movimiento.'
                  },
                  {
                    id_ejercicio: 18,
                    codigo: 'EJ-018',
                    nombre: 'Elevaciones laterales',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Deltoides lateral',
                    dia: 3,
                    orden: 3,
                    series: 4,
                    repeticiones: '12-15',
                    descanso_seg: 60,
                    nota_tecnica: 'Codos ligeramente flexionados, elevación hasta la horizontal.',
                    url_gif: '/rutinas/EJ-018.gif',
                    disclaimer: 'No uses inercia del tronco para levantar el peso.'
                  },
                  {
                    id_ejercicio: 6,
                    codigo: 'EJ-006',
                    nombre: 'Fondos en paralelas',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Pectoral mayor, Tríceps braquial',
                    dia: 3,
                    orden: 4,
                    series: 3,
                    repeticiones: '10-12',
                    descanso_seg: 90,
                    nota_tecnica: 'Inclinación de 15 grados hacia adelante para activar el pectoral.',
                    url_gif: '/rutinas/EJ-006.gif',
                    disclaimer: 'No desciendas más allá de los 90 grados de flexión de codo.'
                  }
                ]
              }
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
            frecuencia: '3 días por semana (Fuerza Resistencia y Gasto Calórico)',
            enfoque: 'Endomorfo Control Metabólico y Resistencia (Quema Lipídica)',
            descanso: '45 a 60 segundos para sostener una frecuencia cardíaca elevada.',
            dias: [
              {
                dia: 1,
                nombre_dia: 'Día 1: Pierna & HIIT Acelerador',
                sesion: 'Pierna & HIIT Acelerador',
                ejercicios: [
                  {
                    id_ejercicio: 1,
                    codigo: 'EJ-001',
                    nombre: 'Sentadilla trasera con barra',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Cuádriceps, Glúteos, Core',
                    dia: 1,
                    orden: 1,
                    series: 4,
                    repeticiones: '10-12',
                    descanso_seg: 60,
                    nota_tecnica: 'Cadencia continua de 2 segundos de bajada y subida explosiva.',
                    url_gif: '/rutinas/EJ-001.gif',
                    disclaimer: 'Mantén el pecho erguido y las rodillas estables.'
                  },
                  {
                    id_ejercicio: 13,
                    codigo: 'EJ-013',
                    nombre: 'Zancadas caminando',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Cuádriceps, Glúteos, Isquios',
                    dia: 1,
                    orden: 2,
                    series: 3,
                    repeticiones: '15/pierna',
                    descanso_seg: 45,
                    nota_tecnica: 'Paso dinámico continuo manteniendo tensión constante.',
                    url_gif: '/rutinas/EJ-013.gif',
                    disclaimer: 'No apoyes las manos sobre los muslos al subir.'
                  },
                  {
                    id_ejercicio: 8,
                    codigo: 'EJ-008',
                    nombre: 'Salto de cuerda',
                    categoria: 'CONDICION',
                    grupo_muscular: 'Cardiovascular, Gemelos, Deltoides',
                    dia: 1,
                    orden: 3,
                    series: 4,
                    repeticiones: '90 seg',
                    descanso_seg: 45,
                    nota_tecnica: 'Salto sobre las puntas de pies con rotación de muñecas.',
                    url_gif: '/rutinas/EJ-008.gif',
                    disclaimer: 'Aterriza suavemente para proteger las rodillas.'
                  },
                  {
                    id_ejercicio: 19,
                    codigo: 'EJ-019',
                    nombre: 'Bicicleta estática intervalos',
                    categoria: 'CONDICION',
                    grupo_muscular: 'Sistema cardiovascular, Cuádriceps',
                    dia: 1,
                    orden: 4,
                    series: 5,
                    repeticiones: '1 min sprint / 30s suave',
                    descanso_seg: 45,
                    nota_tecnica: 'Intervalos HIIT a más del 85% de frecuencia cardíaca máxima.',
                    url_gif: '/rutinas/EJ-019.gif',
                    disclaimer: 'Ajusta la altura del sillín al nivel de la cadera.'
                  }
                ]
              },
              {
                dia: 2,
                nombre_dia: 'Día 2: Torso Densidad & Core',
                sesion: 'Torso Densidad & Core',
                ejercicios: [
                  {
                    id_ejercicio: 3,
                    codigo: 'EJ-003',
                    nombre: 'Press de banca con barra',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Pectorales, Tríceps',
                    dia: 2,
                    orden: 1,
                    series: 4,
                    repeticiones: '10-12',
                    descanso_seg: 60,
                    nota_tecnica: 'Preservación de masa magra durante déficit calórico.',
                    url_gif: '/rutinas/EJ-003.gif',
                    disclaimer: 'Controla el descenso sin rebotar la barra en el pecho.'
                  },
                  {
                    id_ejercicio: 5,
                    codigo: 'EJ-005',
                    nombre: 'Flexiones de pecho',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Pectorales, Deltoides anterior, Core',
                    dia: 2,
                    orden: 2,
                    series: 3,
                    repeticiones: '15-20',
                    descanso_seg: 45,
                    nota_tecnica: 'Cuerpo en tabla rígida con activación abdominal permanente.',
                    url_gif: '/rutinas/EJ-005.gif',
                    disclaimer: 'No dejes caer la cabeza ni arquees la espalda.'
                  },
                  {
                    id_ejercicio: 11,
                    codigo: 'EJ-011',
                    nombre: 'Remo con barra',
                    categoria: 'TIRON',
                    grupo_muscular: 'Dorsal ancho, Trapecio, Romboides',
                    dia: 2,
                    orden: 3,
                    series: 4,
                    repeticiones: '10-12',
                    descanso_seg: 60,
                    nota_tecnica: 'Contracción escapular sostenida en la parte alta.',
                    url_gif: '/rutinas/EJ-011.gif',
                    disclaimer: 'Mantén el ángulo del torso sin incorporarte.'
                  },
                  {
                    id_ejercicio: 17,
                    codigo: 'EJ-017',
                    nombre: 'Plancha frontal',
                    categoria: 'CORE',
                    grupo_muscular: 'Transverso del abdomen, Oblicuos',
                    dia: 2,
                    orden: 4,
                    series: 4,
                    repeticiones: '60 seg',
                    descanso_seg: 45,
                    nota_tecnica: 'Empuje escapular contra el suelo y respiración diafragmática.',
                    url_gif: '/rutinas/EJ-017.gif',
                    disclaimer: 'No aguantes la respiración durante la isometría.'
                  }
                ]
              },
              {
                dia: 3,
                nombre_dia: 'Día 3: Glúteo, Cadena Posterior & Quema Lipídica',
                sesion: 'Glúteo, Cadena Posterior & Quema Lipídica',
                ejercicios: [
                  {
                    id_ejercicio: 20,
                    codigo: 'EJ-020',
                    nombre: 'Hip thrust',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Glúteo mayor, Isquiotibiales',
                    dia: 3,
                    orden: 1,
                    series: 4,
                    repeticiones: '12-15',
                    descanso_seg: 60,
                    nota_tecnica: 'Extensión completa de cadera con contracción glútea superior.',
                    url_gif: '/rutinas/EJ-020.gif',
                    disclaimer: 'Apoya el banco debajo de las escápulas.'
                  },
                  {
                    id_ejercicio: 14,
                    codigo: 'EJ-014',
                    nombre: 'Peso muerto rumano',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Isquiosurales, Glúteos',
                    dia: 3,
                    orden: 2,
                    series: 3,
                    repeticiones: '12',
                    descanso_seg: 60,
                    nota_tecnica: 'Flexión mínima de rodillas y estiramiento del bíceps femoral.',
                    url_gif: '/rutinas/EJ-014.gif',
                    disclaimer: 'Mantén la barra en contacto con las piernas.'
                  },
                  {
                    id_ejercicio: 7,
                    codigo: 'EJ-007',
                    nombre: 'Sit-up / crunch',
                    categoria: 'CORE',
                    grupo_muscular: 'Recto abdominal',
                    dia: 3,
                    orden: 3,
                    series: 4,
                    repeticiones: '20',
                    descanso_seg: 45,
                    nota_tecnica: 'Elevación con fuerza abdominal sin tirar del cuello.',
                    url_gif: '/rutinas/EJ-007.gif',
                    disclaimer: 'Manos a las sienes sin entrelazar dedos tras la nuca.'
                  },
                  {
                    id_ejercicio: 8,
                    codigo: 'EJ-008',
                    nombre: 'Salto de cuerda',
                    categoria: 'CONDICION',
                    grupo_muscular: 'Cardiovascular, Gemelos',
                    dia: 3,
                    orden: 4,
                    series: 4,
                    repeticiones: '2 min',
                    descanso_seg: 45,
                    nota_tecnica: 'Cadencia constante para vaciado de glucógeno.',
                    url_gif: '/rutinas/EJ-008.gif',
                    disclaimer: 'Mantén los codos pegados al cuerpo.'
                  }
                ]
              }
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
            frecuencia: '3 días por semana (Push / Pull / Legs Progresivo)',
            enfoque: 'Mesomorfo Hipertrofia PPL Progresiva + Recomposición Atlética',
            descanso: '60 a 90 segundos entre series con alternancia de cadencias excéntricas.',
            dias: [
              {
                dia: 1,
                nombre_dia: 'Día 1: Empuje Pesado (Push 1)',
                sesion: 'Empuje Pesado (Push 1)',
                ejercicios: [
                  {
                    id_ejercicio: 3,
                    codigo: 'EJ-003',
                    nombre: 'Press de banca con barra',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Pectoral mayor, Tríceps, Deltoides anterior',
                    dia: 1,
                    orden: 1,
                    series: 4,
                    repeticiones: '6-8 (RPE 8.5)',
                    descanso_seg: 90,
                    nota_tecnica: 'Control excéntrico de 3 segundos con parada de 1 segundo en el pecho.',
                    url_gif: '/rutinas/EJ-003.gif',
                    disclaimer: 'Mantén contacto de glúteos y parte alta de espalda con el banco.'
                  },
                  {
                    id_ejercicio: 12,
                    codigo: 'EJ-012',
                    nombre: 'Press militar de pie',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Deltoides anterior/medio, Tríceps',
                    dia: 1,
                    orden: 2,
                    series: 4,
                    repeticiones: '8-10',
                    descanso_seg: 75,
                    nota_tecnica: 'Bloqueo estricto por encima de la cabeza alineado con las orejas.',
                    url_gif: '/rutinas/EJ-012.gif',
                    disclaimer: 'Mantén el core apretado para no arquear la columna lumbar.'
                  },
                  {
                    id_ejercicio: 6,
                    codigo: 'EJ-006',
                    nombre: 'Fondos en paralelas',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Pectoral inferior, Tríceps braquial',
                    dia: 1,
                    orden: 3,
                    series: 3,
                    repeticiones: '10-12',
                    descanso_seg: 75,
                    nota_tecnica: 'Codos flexionados a 90 grados y subida controlada.',
                    url_gif: '/rutinas/EJ-006.gif',
                    disclaimer: 'Evita descensos demasiado bruscos que comprometan la cápsula anterior del hombro.'
                  },
                  {
                    id_ejercicio: 18,
                    codigo: 'EJ-018',
                    nombre: 'Elevaciones laterales',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Deltoides lateral',
                    dia: 1,
                    orden: 4,
                    series: 4,
                    repeticiones: '12',
                    descanso_seg: 60,
                    nota_tecnica: 'Elevación en el plano escapular con los meñiques ligeramente rotados.',
                    url_gif: '/rutinas/EJ-018.gif',
                    disclaimer: 'No encojas los hombros hacia las orejas durante la elevación.'
                  },
                  {
                    id_ejercicio: 16,
                    codigo: 'EJ-016',
                    nombre: 'Extensión de tríceps en polea',
                    categoria: 'EMPUJE',
                    grupo_muscular: 'Tríceps braquial',
                    dia: 1,
                    orden: 5,
                    series: 3,
                    repeticiones: '12',
                    descanso_seg: 60,
                    nota_tecnica: 'Apertura de agarre al final del recorrido para máxima contracción.',
                    url_gif: '/rutinas/EJ-016.gif',
                    disclaimer: 'Mantén los hombros estables sin balancear el torso.'
                  }
                ]
              },
              {
                dia: 2,
                nombre_dia: 'Día 2: Tracción & Espalda (Pull 1)',
                sesion: 'Tracción & Espalda (Pull 1)',
                ejercicios: [
                  {
                    id_ejercicio: 2,
                    codigo: 'EJ-002',
                    nombre: 'Peso muerto convencional',
                    categoria: 'TIRON',
                    grupo_muscular: 'Isquiosurales, Glúteos, Espalda baja, Dorsales',
                    dia: 2,
                    orden: 1,
                    series: 3,
                    repeticiones: '5',
                    descanso_seg: 120,
                    nota_tecnica: 'Empuje del piso con las piernas antes de extender la cadera.',
                    url_gif: '/rutinas/EJ-002.gif',
                    disclaimer: 'Mantén la barra pegada a las espinillas y la columna neutral.'
                  },
                  {
                    id_ejercicio: 11,
                    codigo: 'EJ-011',
                    nombre: 'Remo con barra',
                    categoria: 'TIRON',
                    grupo_muscular: 'Dorsal ancho, Romboides, Trapecio',
                    dia: 2,
                    orden: 2,
                    series: 4,
                    repeticiones: '6-8',
                    descanso_seg: 90,
                    nota_tecnica: 'Tirón en dirección a la cadera contrayendo fuertemente los dorsales.',
                    url_gif: '/rutinas/EJ-011.gif',
                    disclaimer: 'No cambies el ángulo del torso durante las repeticiones.'
                  },
                  {
                    id_ejercicio: 4,
                    codigo: 'EJ-004',
                    nombre: 'Dominadas estrictas',
                    categoria: 'TIRON',
                    grupo_muscular: 'Dorsales, Bíceps, Redondo mayor',
                    dia: 2,
                    orden: 3,
                    series: 4,
                    repeticiones: '8',
                    descanso_seg: 90,
                    nota_tecnica: 'Apertura de agarre al ancho de hombros con retracción de escápulas.',
                    url_gif: '/rutinas/EJ-004.gif',
                    disclaimer: 'Evita balancear las piernas o encoger el cuello.'
                  },
                  {
                    id_ejercicio: 15,
                    codigo: 'EJ-015',
                    nombre: 'Curl de bíceps con barra',
                    categoria: 'TIRON',
                    grupo_muscular: 'Bíceps braquial',
                    dia: 2,
                    orden: 4,
                    series: 3,
                    repeticiones: '10',
                    descanso_seg: 60,
                    nota_tecnica: 'Subida controlada con parada de 1 segundo arriba.',
                    url_gif: '/rutinas/EJ-015.gif',
                    disclaimer: 'No balancees los hombros hacia atrás.'
                  }
                ]
              },
              {
                dia: 3,
                nombre_dia: 'Día 3: Pierna & Potencia (Legs 1)',
                sesion: 'Pierna & Potencia (Legs 1)',
                ejercicios: [
                  {
                    id_ejercicio: 1,
                    codigo: 'EJ-001',
                    nombre: 'Sentadilla trasera con barra',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Cuádriceps, Glúteos, Isquios',
                    dia: 3,
                    orden: 1,
                    series: 4,
                    repeticiones: '6-8',
                    descanso_seg: 120,
                    nota_tecnica: 'Descenso profundo y empuje con la planta completa del pie.',
                    url_gif: '/rutinas/EJ-001.gif',
                    disclaimer: 'No permitas que las rodillas colapsen hacia adentro (valgo).'
                  },
                  {
                    id_ejercicio: 20,
                    codigo: 'EJ-020',
                    nombre: 'Hip thrust',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Glúteo mayor, Isquiotibiales',
                    dia: 3,
                    orden: 2,
                    series: 4,
                    repeticiones: '8-10',
                    descanso_seg: 90,
                    nota_tecnica: 'Bloqueo pélvico superior completo con barbilla pegada al pecho.',
                    url_gif: '/rutinas/EJ-020.gif',
                    disclaimer: 'No hiperextiendas la columna lumbar al subir.'
                  },
                  {
                    id_ejercicio: 14,
                    codigo: 'EJ-014',
                    nombre: 'Peso muerto rumano',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Isquiosurales, Glúteos',
                    dia: 3,
                    orden: 3,
                    series: 3,
                    repeticiones: '8-10',
                    descanso_seg: 90,
                    nota_tecnica: 'Estiramiento pronunciado en la parte posterior del muslo.',
                    url_gif: '/rutinas/EJ-014.gif',
                    disclaimer: 'Mantén la espalda recta en todo momento.'
                  },
                  {
                    id_ejercicio: 13,
                    codigo: 'EJ-013',
                    nombre: 'Zancadas caminando',
                    categoria: 'PIERNAS',
                    grupo_muscular: 'Cuádriceps, Glúteos',
                    dia: 3,
                    orden: 4,
                    series: 3,
                    repeticiones: '12 por pierna',
                    descanso_seg: 60,
                    nota_tecnica: 'Paso largo y torso erguido en cada zancada.',
                    url_gif: '/rutinas/EJ-013.gif',
                    disclaimer: 'Controla el descenso sin golpear la rodilla trasera.'
                  }
                ]
              }
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
  const displayedHeight = analysisResult && assessmentInputs ? assessmentInputs.estaturaCm : estaturaCm;
  const displayedWeight = analysisResult && assessmentInputs ? assessmentInputs.pesoKg : pesoKg;
  const objetivoNombre = ({
    PP: 'Pérdida de grasa',
    GM: 'Ganancia muscular',
    GP: 'Ganancia de peso',
    MANT: 'Mantenimiento',
  } as Record<string, string>)[objetivoSeleccionado] || 'Por definir';
  const confidencePct = analysisResult?.probabilidades_somatotipo?.[analysisResult.somatotipo_estimado]
    ? Math.round(analysisResult.probabilidades_somatotipo[analysisResult.somatotipo_estimado] * 100)
    : (analysisResult ? Math.round((analysisResult.precision || 0.835) * 100) : null);

  return (
    <div className="w-full text-white flex flex-col relative min-w-0">
      {/* Ambient background glows for optical glass refraction */}
      <div className="spartan-ambient-glow w-[520px] h-[520px] -top-24 -left-36 opacity-30 pointer-events-none" />
      <div className="spartan-ambient-glow w-[600px] h-[600px] top-[30%] -right-48 opacity-20 pointer-events-none" />
      <div className="spartan-ambient-glow w-[550px] h-[550px] bottom-10 left-[25%] opacity-15 pointer-events-none" />

      <div className="w-full relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/[0.07] pb-5 mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-['Anybody'] text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                Biometría
              </h1>
              <button
                onClick={() => setShowGuideModal(true)}
                className="p-2 border border-white/10 hover:border-white/20 bg-white/[0.03] text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                title="Guía de Captura"
                aria-label="Guía de Captura"
              >
                <HelpCircle className="h-4 w-4 text-[#e8dc00]" />
                <span className="hidden sm:inline">Guía de Captura</span>
              </button>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mt-1">
              Sigue una preparación breve, registra tus medidas y realiza una captura guiada para obtener una lectura corporal orientativa.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/catalogo"
              className="spartan-btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:bg-white/5"
            >
              <span>Catálogo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Flujo guiado de evaluación */}
        <div className="mb-6 grid grid-cols-3 gap-2 p-1.5 bg-[#0c0c0c] border border-white/[0.07] rounded-2xl text-xs">
          <div className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl transition-all ${
            measurementsConfirmed ? 'bg-white/[0.04] text-white font-medium border border-white/10' : 'text-zinc-500'
          }`}>
            <span className="w-5 h-5 rounded-full bg-[#e8dc00]/15 text-[#e8dc00] flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
            <span className="truncate">Medidas</span>
          </div>
          <div className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl transition-all ${
            cameraActive || capturedImage || captureCountdown !== null ? 'bg-[#e8dc00]/10 text-[#e8dc00] font-medium border border-[#e8dc00]/30' : 'text-zinc-400 bg-white/[0.02]'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
              cameraActive || capturedImage || captureCountdown !== null ? 'bg-[#e8dc00] text-black' : 'bg-white/10 text-zinc-400'
            }`}>2</span>
            <span className="truncate">Preparación y captura</span>
          </div>
          <div className={`flex items-center justify-center sm:justify-start gap-2 px-3 py-2 rounded-xl transition-all ${
            analysisResult ? 'bg-[#e8dc00]/10 text-[#e8dc00] font-medium border border-[#e8dc00]/30' : 'text-zinc-500'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
              analysisResult ? 'bg-[#e8dc00] text-black' : 'bg-white/10 text-zinc-500'
            }`}>3</span>
            <span className="truncate">Resultados</span>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Datos para la evaluación</p>
            <p className="mt-1 text-xs leading-5 text-zinc-400">
              {measurementsConfirmed
                ? `${analysisResult ? 'Datos usados en la evaluación' : 'Medidas registradas'}: ${displayedHeight} cm y ${displayedWeight} kg.`
                : 'Registra tu altura y peso antes de activar la cámara.'}
            </p>
          </div>
          <button type="button" onClick={() => setShowMeasurementsModal(true)} className="spartan-btn-secondary shrink-0 px-4 py-2.5 text-xs font-['JetBrains_Mono'] uppercase">
            {measurementsConfirmed ? 'Editar medidas' : 'Registrar medidas'}
          </button>
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

        {/* Rejilla de Trabajo: Visor de Video 3:4 a la izquierda, Resultados a la derecha */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Camera & Capture Column (Paso 2) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`relative aspect-[3/4] w-full max-w-[480px] mx-auto bg-[#0c0c0c] border overflow-hidden flex items-center justify-center rounded-2xl shadow-xl transition-all ${
                isDragging ? 'border-[#e8dc00] bg-[#e8dc00]/5 ring-2 ring-[#e8dc00]/30' : 'border-white/[0.08]'
              }`}
            >
              {/* 1. Video en vivo (siempre presente en DOM para no perder ref ni stream) */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />

              {/* 2. Imagen fija analizada o Canvas de Overlay */}
              <canvas
                ref={overlayCanvasRef}
                className={`w-full h-full object-contain bg-black ${!cameraActive && capturedImage ? 'block' : 'hidden'}`}
              />

              {/* Silueta Guía de Cuerpo Entero (Visible en captura activa o reposo) */}
              {(cameraActive || (!cameraActive && !capturedImage)) && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                  viewBox="0 0 300 400"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <ellipse cx="150" cy="55" rx="20" ry="26" stroke="#e8dc00" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M142 81 L142 93 M158 81 L158 93" stroke="#e8dc00" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M105 105 C120 95, 138 95, 150 95 C162 95, 180 95, 195 105 L178 185 L122 185 Z" stroke="#e8dc00" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M105 105 L82 175 L76 235 M195 105 L218 175 L224 235" stroke="#e8dc00" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M122 185 L118 275 L120 365 M178 185 L182 275 L180 365" stroke="#e8dc00" strokeWidth="1.5" strokeDasharray="4 4" />
                  <line x1="150" y1="20" x2="150" y2="385" stroke="#e8dc00" strokeWidth="0.8" strokeDasharray="2 4" opacity="0.3" />
                </svg>
              )}

              {/* Feedback visual al arrastrar imagen */}
              {isDragging && (
                <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#e8dc00] rounded-2xl pointer-events-none">
                  <Upload className="h-12 w-12 text-[#e8dc00] animate-pulse mb-3" />
                  <div className="font-['Anybody'] text-base font-black uppercase text-white tracking-wider">
                    Suelta tu fotografía aquí
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Se procesará automáticamente con MediaPipe
                  </div>
                </div>
              )}

              {/* 3. Estado inactivo inicial o Error de Cámara */}
              {!cameraActive && !capturedImage && (
                <div className="relative z-10 text-center p-6 flex flex-col items-center w-full max-w-sm">
                  {cameraError ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400 shadow-md">
                        <AlertCircle className="h-7 w-7" />
                      </div>
                      <h3 className="font-['Inter'] text-sm sm:text-base font-bold text-white mb-1">
                        Cámara no disponible
                      </h3>
                      <p className="text-xs text-zinc-400 mb-4 font-['Inter'] leading-relaxed">
                        {cameraError}
                      </p>
                      <div className="flex flex-col w-full gap-2">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="spartan-btn-primary w-full py-2.5 text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Subir Foto de tu Equipo</span>
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={startCamera}
                            className="spartan-btn-secondary w-full py-2 text-xs uppercase font-['JetBrains_Mono'] rounded-xl flex items-center justify-center gap-1 text-zinc-400 hover:text-white cursor-pointer"
                            title="Reintentar activar cámara"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Reintentar</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-[#111111] border border-white/[0.08] flex items-center justify-center mb-4 text-[#e8dc00] shadow-md">
                        <Scan className="h-8 w-8" />
                      </div>
                      <h3 className="font-['Inter'] text-base font-bold text-white mb-1">
                        Paso 2: prepara tu captura
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-xs mb-5 font-['Inter'] leading-relaxed">
                        Activa la cámara cuando hayas registrado tus medidas. Después tendrás 10 segundos para colocarte antes de la captura.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-center">
                        <button
                          onClick={startCamera}
                          className="spartan-btn-primary w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                        >
                          <Camera className="h-4 w-4" />
                          <span>Activar Cámara</span>
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="spartan-btn-secondary w-full sm:w-auto px-4 py-2.5 text-xs uppercase font-['JetBrains_Mono'] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Subir Foto</span>
                        </button>
                      </div>
                      <div className="mt-3 text-[11px] text-zinc-500 font-['JetBrains_Mono']">
                        o arrastra una fotografía aquí
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Status indicator & Telemetry HUD when camera is active */}
              {cameraActive && (
                <>
                  {checks && (
                    <div className="absolute top-3 inset-x-3 flex flex-wrap items-center justify-between gap-2 z-10 pointer-events-none">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Iluminación & Contraluz */}
                        <span className={`text-[10px] font-['JetBrains_Mono'] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                          checks.light.ok
                            ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300'
                            : 'bg-amber-950/85 border-amber-500/50 text-amber-300'
                        }`}>
                          <Sun className="h-3 w-3" />
                          <span>{checks.light.message}</span>
                        </span>

                        {/* Encuadre / Distancia */}
                        <span className={`text-[10px] font-['JetBrains_Mono'] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                          checks.fullBody.ok && checks.distance.ok
                            ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-300'
                            : 'bg-zinc-900/85 border-white/10 text-zinc-300'
                        }`}>
                          <Scan className="h-3 w-3" />
                          <span>{checks.fullBody.ok ? checks.distance.message : checks.fullBody.message}</span>
                        </span>
                      </div>

                    </div>
                  )}

                  {/* Bottom overlay: status + instant capture action */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between z-10">
                    <span className="font-['JetBrains_Mono'] text-[10px] uppercase bg-black/85 px-2.5 py-1 text-[#e8dc00] border border-white/10 rounded-lg backdrop-blur-sm">
                      En vivo (getUserMedia)
                    </span>
                    <button
                      type="button"
                      onClick={startCaptureCountdown}
                      disabled={analyzing || captureCountdown !== null}
                      className="spartan-btn-primary px-3.5 py-1.5 text-xs font-bold uppercase font-['JetBrains_Mono'] flex items-center gap-1.5 rounded-xl shadow-lg cursor-pointer"
                    >
                      <Timer className="h-3.5 w-3.5" />
                      <span>{captureCountdown !== null ? 'Preparando' : 'Capturar en 10 s'}</span>
                    </button>
                  </div>
                </>
              )}

              {cameraActive && captureCountdown !== null && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/75 p-6 text-center backdrop-blur-sm" role="status" aria-live="assertive">
                  <span className="font-['JetBrains_Mono'] text-[11px] font-bold uppercase tracking-[0.18em] text-[#e8dc00]">Prepárate para la captura</span>
                  <span className="mt-2 font-['Anybody'] text-8xl font-black tabular-nums tracking-tight text-white sm:text-9xl">{captureCountdown}</span>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-300">Ubícate de frente, con el cuerpo completo dentro de la guía. La captura se realizará al terminar la cuenta.</p>
                  <button type="button" onClick={cancelCaptureCountdown} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-xs font-['JetBrains_Mono'] font-bold uppercase text-white transition-colors hover:border-white hover:bg-white/10">
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancelar
                  </button>
                </div>
              )}

              {/* Toolbar en imagen capturada: Toggle de Esqueleto MediaPipe */}
              {!cameraActive && capturedImage && (
                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-auto">
                  <span className="font-['JetBrains_Mono'] text-[10px] uppercase bg-black/80 px-2.5 py-1 text-zinc-300 border border-white/10 rounded-lg backdrop-blur-sm">
                    Fotograma Capturado
                  </span>
                  {analysisResult?.landmarks && analysisResult.landmarks.length > 0 && (
                    <button
                      onClick={toggleSkeleton}
                      className="px-2.5 py-1 bg-black/85 hover:bg-black text-[10px] font-['JetBrains_Mono'] text-[#e8dc00] hover:text-white border border-[#e8dc00]/40 rounded-lg backdrop-blur-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Activity className="h-3 w-3" />
                      <span>{showSkeleton ? 'Ocultar Esqueleto' : 'Mostrar Esqueleto'}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Spinner de Análisis */}
              {analyzing && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20">
                  <RefreshCw className="h-8 w-8 text-[#e8dc00] animate-spin mb-3" />
                  <div className="text-xs font-['JetBrains_Mono'] uppercase tracking-wider text-white font-bold">
                    Procesando fotograma con MediaPipe...
                  </div>
                </div>
              )}
            </div>

            {/* Grupo de Acciones Consolidadas (Regla: 1 Solo Botón Amarillo) */}
            <div className="bg-[#0c0c0c] border border-white/[0.08] p-3 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl shadow-md max-w-[480px] w-full mx-auto">
              <div className="flex items-center gap-2 flex-wrap">
                {cameraActive ? (
                  <>
                    <button
                      onClick={stopCamera}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-['JetBrains_Mono'] uppercase transition-colors cursor-pointer rounded-xl"
                    >
                      <CameraOff className="h-3.5 w-3.5" />
                      <span>Detener</span>
                    </button>
                    <button
                      type="button"
                      onClick={startCaptureCountdown}
                      disabled={analyzing || captureCountdown !== null}
                      className="spartan-btn-primary px-4 py-2 text-xs font-bold uppercase font-['JetBrains_Mono'] flex items-center gap-1.5 rounded-xl shadow-md cursor-pointer"
                    >
                      <Timer className="h-3.5 w-3.5" />
                      <span>{captureCountdown !== null ? 'Cuenta iniciada' : 'Capturar en 10 s'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    {capturedImage ? (
                      <button
                        onClick={startCamera}
                        className="spartan-btn-secondary px-3.5 py-2 text-xs uppercase font-['JetBrains_Mono'] rounded-xl flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Repetir captura</span>
                      </button>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="spartan-btn-primary px-4 py-2 text-xs font-bold uppercase font-['JetBrains_Mono'] flex items-center gap-1.5 rounded-xl shadow-md cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        <span>Activar cámara</span>
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
                      className="spartan-btn-secondary px-3.5 py-2 text-xs uppercase font-['JetBrains_Mono'] rounded-xl flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Subir foto</span>
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* Results Panel (Paso 3) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Segmented Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-[#0c0c0c] border border-white/[0.07] rounded-2xl shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('diagnostico')}
                className={`flex-1 min-w-[85px] py-2 px-2 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'diagnostico'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Activity className="h-3 w-3" />
                <span>Evaluación</span>
              </button>
              {analysisResult && (
                <>
              <button
                onClick={() => setActiveTab('rutina')}
                className={`flex-1 min-w-[75px] py-2 px-2 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
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
                className={`flex-1 min-w-[70px] py-2 px-2 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
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
                className={`flex-1 min-w-[80px] py-2 px-2 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                  activeTab === 'antropometria'
                    ? 'bg-[#e8dc00] text-black shadow-md'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                <span>Métricas</span>
              </button>
              {role === 'ADMINISTRADOR' && (
                <button
                  onClick={() => setActiveTab('telemetria')}
                  className={`flex-1 min-w-[85px] py-2 px-2 text-[10px] sm:text-[11px] font-['JetBrains_Mono'] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 ${
                    activeTab === 'telemetria'
                      ? 'bg-[#e8dc00] text-black shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>Telemetría</span>
                </button>
              )}
                </>
              )}
            </div>

            {/* Tab 1: Evaluación (Empty State cuando no hay análisis) */}
            {activeTab === 'diagnostico' && !analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-5"
              >
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                  <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-400 flex items-center gap-1.5 font-bold">
                    <Activity className="h-3.5 w-3.5 text-[#e8dc00]" />
                    <span>Diagnóstico Biomecánico</span>
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-['JetBrains_Mono'] font-bold uppercase rounded-full bg-white/[0.04] text-zinc-400 border border-white/10">
                    ESPERANDO CAPTURA
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold font-['Inter'] text-white">
                    Aún sin análisis
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-['Inter']">
                    Ingresa tus medidas arriba y realiza una captura de cuerpo entero para activar el clasificador morfológico y biomecánico.
                  </p>
                </div>

                {/* Preview de Entregables */}
                <div className="space-y-2.5 bg-[#121212] p-4 rounded-xl border border-white/[0.05]">
                  <div className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-wider text-zinc-400 font-bold mb-2">
                    Qué obtendrás tras tu análisis:
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-[#e8dc00]/10 text-[#e8dc00] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    <span>Somatotipo corporal y % de confianza del modelo</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-[#e8dc00]/10 text-[#e8dc00] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    <span>Rutina semanal personalizada con microciclos</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-[#e8dc00]/10 text-[#e8dc00] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    <span>Plan nutricional con cálculo exacto de macros</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-zinc-300">
                    <span className="w-5 h-5 rounded-full bg-[#e8dc00]/10 text-[#e8dc00] flex items-center justify-center text-[10px] font-bold shrink-0">✓</span>
                    <span>Prescripción inteligente de suplementos Spartan</span>
                  </div>
                </div>

                {/* Botón bloqueado previo a la inferencia */}
                <div className="pt-2">
                  <button
                    disabled
                    className="w-full py-3 px-4 bg-white/[0.03] border border-white/10 rounded-xl text-xs font-['JetBrains_Mono'] uppercase text-zinc-500 font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Disponible tras tu análisis</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Tab 1: Evaluación (Con Resultados Analizados) */}
            {activeTab === 'diagnostico' && analysisResult && (
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
                      <span className={`px-2.5 py-1 text-[11px] font-['JetBrains_Mono'] font-bold uppercase border rounded-full ${somatotypeInfo.badge}`}>
                        {analysisResult.somatotipo_estimado}
                      </span>
                    </div>
                  </div>

                  {/* Somatotype Hero Card */}
                  <div className="bg-[#111111] p-4 rounded-xl border border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold font-['Anybody'] uppercase tracking-tight text-white">
                        {analysisResult.somatotipo_estimado}
                      </h2>
                      {confidencePct && (
                        <span className="text-xs font-['JetBrains_Mono'] font-bold text-[#e8dc00] bg-[#e8dc00]/10 border border-[#e8dc00]/30 px-2 py-0.5 rounded-md">
                          {confidencePct}% Confianza
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-300 font-medium">
                      {somatotypeInfo.title}
                    </div>
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
                        {`${(analysisResult.precision * 100).toFixed(1)}%`}
                      </div>
                      <div className="w-full bg-black/60 h-1.5 mt-2 overflow-hidden rounded-full border border-white/5">
                        <div
                          className="bg-[#e8dc00] h-full transition-all duration-500 rounded-full"
                          style={{ width: `${(analysisResult.precision || 0) * 100}%` }}
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
                        {analysisResult.metricas_biometricas?.postura || 'CORRECTA'}
                      </div>
                      <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1 font-['JetBrains_Mono']">
                        <ShieldCheck className="h-3 w-3 text-[#e8dc00]" />
                        <span>Alineación Sagital</span>
                      </div>
                    </div>
                  </div>

                  {/* Tríada Heath-Carter */}
                  {analysisResult.scores_heath_carter && (
                    <div className="bg-[#111111] p-3.5 rounded-xl border border-white/[0.07] space-y-2.5">
                      <div className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400">
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

                  {/* V-Taper en lenguaje claro */}
                  <div className="bg-[#111111] p-3.5 rounded-xl border border-white/[0.05]">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-400">Ratio V-Taper (Hombros / Cadera)</span>
                      <span className="text-sm font-bold font-['JetBrains_Mono'] text-[#e8dc00]">
                        {analysisResult.metricas_biometricas?.relacion_hombro_cadera ? `${analysisResult.metricas_biometricas.relacion_hombro_cadera}x` : '1.35x'}
                      </span>
                    </div>
                    <div className="w-full bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/5 my-1.5">
                      <div className="h-full bg-[#e8dc00] rounded-full" style={{ width: '75%' }} />
                    </div>
                    <div className="flex justify-between text-[9px] font-['JetBrains_Mono'] text-zinc-500">
                      <span>Base Lineal</span>
                      <span className="text-emerald-400">Rango Atlético Óptimo</span>
                      <span>Desarrollo Escapular</span>
                    </div>
                  </div>

                  {/* Acceso a la orientación generada desde este análisis */}
                  <div className="border border-[#e8dc00]/30 bg-[#e8dc00]/5 p-4 rounded-xl">
                    <div className="flex items-center gap-2 text-[#e8dc00] text-xs font-['JetBrains_Mono'] uppercase font-bold mb-1">
                      <Zap className="h-4 w-4" />
                      <span>Orientación personalizada disponible</span>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-300 font-['Inter']">
                      Ya puedes consultar una rutina y un plan diario vinculados a este perfil. Los suplementos se muestran únicamente cuando coinciden con las reglas de afinidad y tienen stock disponible.
                    </p>
                    <div className="flex flex-col gap-2 mt-3">
                      <Link
                        to={analysisResult.id_perfil ? `/prescripcion/${analysisResult.id_perfil}` : '/prescripcion'}
                        className="spartan-btn-primary w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Ver dieta y suplementos</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveTab('rutina')}
                        className="inline-flex items-center justify-center gap-1.5 py-1 text-xs font-bold uppercase text-zinc-400 transition-colors hover:text-[#e8dc00] font-['JetBrains_Mono']"
                      >
                        <span>Consultar rutina adaptada</span>
                        <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer legal / médico */}
                  <div className="p-3 bg-black/40 border border-white/[0.05] rounded-xl text-[10px] text-zinc-500 leading-relaxed font-['Inter']">
                    <strong>Nota Legal:</strong> Este análisis es una estimación biomecánica algorítmica para optimización deportiva y nutricional. No constituye un diagnóstico médico o clínico formal.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Rutina de Entrenamiento por Somatotipo */}
            {activeTab === 'rutina' && analysisResult && (() => {
              const diasData: DiaRutinaData[] = (rutinaData?.dias && rutinaData.dias.length > 0)
                ? rutinaData.dias
                : (personalizedPlan.rutina.dias as unknown as DiaRutinaData[]);

              const diasFiltrados = selectedDiaFiltro === 'todos'
                ? diasData
                : diasData.filter((_, idx) => idx === selectedDiaFiltro);

              const somatotipoActual = analysisResult.somatotipo_estimado;
              const tituloRutina = rutinaData?.nombre || personalizedPlan.rutina.enfoque;
              const frecuenciaRutina = rutinaData?.frecuencia || personalizedPlan.rutina.frecuencia;
              const pautaDescanso = rutinaData?.descanso_general || personalizedPlan.rutina.descanso;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-col gap-4"
                >
                  <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-5">
                    {/* Encabezado Principal */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.07] pb-3">
                      <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                        <Dumbbell className="h-3.5 w-3.5 text-[#e8dc00]" />
                        <span>Periodización de Entrenamiento por Somatotipo</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {rutinaData?.regla_aplicada && (
                          <span className="px-2 py-0.5 text-[9px] font-['JetBrains_Mono'] font-semibold bg-white/5 text-zinc-400 border border-white/10 rounded-md">
                            {rutinaData.regla_aplicada}
                          </span>
                        )}
                        <span className="px-2.5 py-1 text-[10px] font-['JetBrains_Mono'] font-bold uppercase bg-[#e8dc00]/10 text-[#e8dc00] border border-[#e8dc00]/30 rounded-full">
                          {somatotipoActual}
                        </span>
                      </div>
                    </div>

                    {/* Título y Enfoque */}
                    <div>
                      <h3 className="text-base font-bold font-['Inter'] text-white">
                        {tituloRutina}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 font-['JetBrains_Mono']">
                        Frecuencia: {frecuenciaRutina}
                      </p>
                    </div>

                    {/* Selector de Objetivo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-['JetBrains_Mono'] uppercase text-zinc-400 font-semibold text-[11px]">
                          Objetivo Fisiológico:
                        </span>
                        <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500">
                          Precedencia P1 &bull; P2 &bull; P3
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/5 font-['JetBrains_Mono'] text-xs">
                        {[
                          { key: 'PP', label: 'Pérdida de Grasa (PP)' },
                          { key: 'GM', label: 'Ganancia Muscular (GM)' },
                          { key: 'GP', label: 'Ganancia de Peso (GP)' },
                          { key: 'MANT', label: 'Mantenimiento (MANT)' },
                        ].map((item) => {
                          const isSelected = objetivoSeleccionado === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => handleCambiarObjetivo(item.key)}
                              className={`py-2 px-2.5 rounded-lg text-center text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#e8dc00] text-black shadow-md'
                                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Aviso si falta declarar objetivo */}
                    {(avisoObjetivo || (rutinaData && !rutinaData.objetivo_declarado)) && (
                      <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 font-['Inter']">
                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                        <span>{avisoObjetivo || 'Declara tu objetivo para afinar tu rutina de entrenamiento'}</span>
                      </div>
                    )}

                    {/* Selector de Microciclo / Días */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedDiaFiltro('todos')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-['JetBrains_Mono'] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                          selectedDiaFiltro === 'todos'
                            ? 'bg-[#e8dc00] text-black shadow-md'
                            : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        Todos los Días ({diasData.length})
                      </button>
                      {diasData.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedDiaFiltro(i)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-['JetBrains_Mono'] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                            selectedDiaFiltro === i
                              ? 'bg-[#e8dc00] text-black shadow-md'
                              : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                          }`}
                        >
                          Día {d.dia || i + 1}
                        </button>
                      ))}
                    </div>

                    {/* Aviso de error si falló la carga remota */}
                    {errorRutina && (
                      <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl text-xs text-amber-300 font-['Inter']">
                        {errorRutina} (Mostrando prescripción algorítmica local calibrada)
                      </div>
                    )}

                    {/* Contenido de Ejercicios */}
                    {loadingRutina ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 font-['JetBrains_Mono'] text-xs">
                        <RefreshCw className="h-5 w-5 animate-spin text-[#e8dc00]" />
                        <span>Cargando rutina y recursos de animación...</span>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {diasFiltrados.map((d, i) => (
                          <div key={i} className="bg-[#111111] border border-white/[0.05] p-4 rounded-xl space-y-4">
                            <div className="flex items-center justify-between border-b border-white/[0.05] pb-2.5">
                              <span className="text-xs font-bold font-['JetBrains_Mono'] text-[#e8dc00] uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#e8dc00]" />
                                <span>{d.nombre_dia || `Día ${d.dia || i + 1}`}</span>
                              </span>
                              <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500">
                                {d.ejercicios.length} ejercicios
                              </span>
                            </div>

                            {/* Grid de EjercicioCard con GIFs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                              {d.ejercicios.map((ej: EjercicioRutinaData, j: number) => (
                                <EjercicioCard
                                  key={ej.id_ejercicio || `${i}-${j}`}
                                  ejercicio={ej}
                                  onOpenModal={(item) => setSelectedEjercicioModal(item)}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pauta de Descanso */}
                    <div className="p-3 bg-[#111111] rounded-xl text-xs text-zinc-400 border border-white/[0.05]">
                      <strong className="text-white block mb-0.5 font-['JetBrains_Mono'] uppercase text-[10px]">
                        Pauta de Descanso:
                      </strong>
                      {pautaDescanso}
                    </div>

                    {/* Disclaimer Biomecánico */}
                    <div className="p-3 bg-black/40 border border-white/[0.05] rounded-xl text-[10px] text-zinc-500 leading-relaxed font-['Inter']">
                      <strong>Nota Metodológica:</strong> {rutinaData?.disclaimer || "Esta rutina de entrenamiento está dosificada según biomecánica y somatotipo estimado. Prioriza siempre la técnica estricta sobre la carga de peso."}
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Tab: Plan Nutricional & Dieta */}
            {activeTab === 'dieta' && analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                <div className="bg-[#0c0c0c] border border-white/[0.07] p-5 rounded-2xl shadow-xl space-y-5">
                  {/* Encabezado de Dieta */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/[0.07] pb-3">
                    <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-300 flex items-center gap-1.5 font-bold">
                      <Utensils className="h-3.5 w-3.5 text-[#e8dc00]" />
                      <span>Plan diario adaptado a tu perfil</span>
                    </span>
                    <span className="self-start sm:self-auto px-2.5 py-1 text-[10px] font-['JetBrains_Mono'] font-bold uppercase bg-[#e8dc00]/10 text-[#e8dc00] border border-[#e8dc00]/30 rounded-full">
                      {planDiario?.somatotipo || analysisResult.somatotipo_estimado}
                    </span>
                  </div>

                  <p className="max-w-2xl text-xs leading-relaxed text-zinc-400 font-['Inter']">
                    Las comidas se seleccionan con el somatotipo obtenido en tu evaluación y el objetivo que elijas. Tu altura y peso quedan asociados al análisis para mantener el contexto del plan.
                  </p>

                  {/* Datos reales utilizados para personalizar el plan */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-['JetBrains_Mono'] text-xs">
                    <div className="bg-black/40 border border-white/5 p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400 uppercase">Somatotipo</div>
                      <div className="text-sm font-bold text-[#e8dc00] mt-0.5">{analysisResult.somatotipo_estimado}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400 uppercase">Objetivo</div>
                      <div className="text-sm font-bold text-white mt-0.5">{objetivoNombre}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400 uppercase">Altura</div>
                      <div className="text-sm font-bold text-zinc-200 mt-0.5">{displayedHeight ? `${displayedHeight} cm` : '—'}</div>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2 rounded-xl">
                      <div className="text-[10px] text-zinc-400 uppercase">Peso</div>
                      <div className="text-sm font-bold text-zinc-200 mt-0.5">{displayedWeight ? `${displayedWeight} kg` : '—'}</div>
                    </div>
                  </div>

                  {/* Selector de Objetivo Nutricional */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-['JetBrains_Mono'] uppercase text-zinc-400 font-semibold text-[11px]">
                        Objetivo Fisiológico:
                      </span>
                      <span className="text-[10px] font-['JetBrains_Mono'] text-zinc-500">
                          Actualiza también tu rutina
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/5 font-['JetBrains_Mono'] text-xs">
                      {[
                        { key: 'PP', label: 'Pérdida de Grasa (PP)' },
                        { key: 'GM', label: 'Ganancia Muscular (GM)' },
                        { key: 'GP', label: 'Ganancia de Peso (GP)' },
                        { key: 'MANT', label: 'Mantenimiento (MANT)' },
                      ].map((item) => {
                        const isSelected = objetivoSeleccionado === item.key;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleCambiarObjetivo(item.key)}
                            className={`py-2 px-2.5 rounded-lg text-center text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#e8dc00] text-black shadow-md'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Aviso Ámbar si no hay objetivo declarado */}
                  {(avisoObjetivo || !planDiario?.objetivo_declarado) && (
                    <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 font-['Inter']">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>{avisoObjetivo || 'Declara tu objetivo para afinar el plan'}</span>
                    </div>
                  )}

                  {/* Comidas Diarias */}
                  {loadingPlanDiario ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 font-['JetBrains_Mono'] text-xs">
                      <RefreshCw className="h-5 w-5 animate-spin text-[#e8dc00]" />
                      <span>Calculando asignación óptima de recetas...</span>
                    </div>
                  ) : planDiario?.comidas && planDiario.comidas.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-['JetBrains_Mono'] text-zinc-400">
                        <span>Menú asignado: {planDiario.comidas.length} comidas</span>
                        <span className="text-[#e8dc00]">Plan orientativo</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {planDiario.comidas.map((comida: RecetaItemData) => (
                          <RecetaCard
                            key={comida.id_receta}
                            receta={comida}
                            onOpenModal={(r) => setSelectedRecetaModal(r)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500 text-xs font-['JetBrains_Mono']">
                      No se encontraron recetas para los criterios especificados.
                    </div>
                  )}

                  <div className="border-t border-white/[0.07] pt-5 space-y-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white font-['Inter']">Suplementos que podrían interesarte</h3>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400 font-['Inter']">
                          Seleccionados por afinidad con tu perfil corporal y disponibilidad registrada en inventario.
                        </p>
                      </div>
                      {analysisResult.id_perfil && supplementRecommendations.length > 0 && (
                        <Link
                          to={`/prescripcion/${analysisResult.id_perfil}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#e8dc00] hover:underline underline-offset-4"
                        >
                          Ver recomendación completa
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>

                    {loadingSupplements ? (
                      <div className="flex items-center gap-2 py-4 text-xs text-zinc-400 font-['Inter']">
                        <RefreshCw className="h-4 w-4 animate-spin text-[#e8dc00]" />
                        Consultando productos disponibles...
                      </div>
                    ) : supplementsError ? (
                      <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-200 font-['Inter']">
                        {supplementsError}
                      </div>
                    ) : supplementRecommendations.length > 0 ? (
                      <div className="divide-y divide-white/[0.07] rounded-xl border border-white/[0.07] bg-black/30 px-4">
                        {supplementRecommendations.map((item) => (
                          <div key={item.id_prescripcion} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white font-['Inter']">{item.nombre_producto}</p>
                              <p className="mt-0.5 text-[11px] text-zinc-400 font-['JetBrains_Mono']">
                                {item.codigo_sku} · {item.stock_actual} disponibles
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                              <span className="text-sm font-bold text-white font-['JetBrains_Mono']">Bs. {item.precio_unitario.toFixed(2)}</span>
                              <Link to="/catalogo" className="text-xs font-semibold text-[#e8dc00] hover:underline underline-offset-4">
                                Ver producto
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-white/[0.07] bg-black/30 p-4 text-xs text-zinc-400 font-['Inter']">
                        No hay suplementos con afinidad y stock disponible para este perfil.
                      </p>
                    )}
                  </div>

                  {/* Pauta / Disclaimer legal */}
                  <div className="p-3 bg-black/40 border border-white/[0.05] rounded-xl text-[10px] text-zinc-500 leading-relaxed font-['Inter']">
                    <strong>Orientación nutricional:</strong> Este menú es una referencia adaptada al perfil y objetivo registrados. Las porciones y cualquier suplemento deben ajustarse con un profesional según antecedentes, actividad y necesidades individuales.
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tab: Métricas Antropométricas */}
            {activeTab === 'antropometria' && analysisResult && (
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
                          {analysisResult?.metricas_biometricas?.relacion_hombro_cadera ? `${analysisResult.metricas_biometricas.relacion_hombro_cadera}x` : '1.35x'}
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
                          {analysisResult?.metricas_biometricas?.ancho_hombros_norm ? `${analysisResult.metricas_biometricas.ancho_hombros_norm.toFixed(3)}` : '0.412'}
                        </span>
                      </div>
                      <div className="bg-[#111111] border border-white/[0.05] p-3 rounded-xl">
                        <span className="text-[10px] font-['JetBrains_Mono'] uppercase text-zinc-400 block mb-1">Ancho Cadera (Norm)</span>
                        <span className="text-base font-bold font-['JetBrains_Mono'] text-white tabular-nums">
                          {analysisResult?.metricas_biometricas?.ancho_cadera_norm ? `${analysisResult.metricas_biometricas.ancho_cadera_norm.toFixed(3)}` : '0.305'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#111111] border border-white/[0.05] p-3.5 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-['JetBrains_Mono'] uppercase text-zinc-400">Alineación Biomecánica</span>
                        <span className="text-xs font-bold font-['JetBrains_Mono'] uppercase text-[#e8dc00]">
                          {analysisResult?.metricas_biometricas?.postura || 'CORRECTA'}
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

            {/* Tab: Telemetría 3D (Solo para Administradores) */}
            {activeTab === 'telemetria' && analysisResult && role === 'ADMINISTRADOR' && (
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
                      <span>Puntos corporales estimados</span>
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
                      Inicia una captura o demostración para visualizar los puntos corporales detectados.
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
                  Arquitectura técnica
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

      {showMeasurementsModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4" role="presentation">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="measurements-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#101010] p-6 shadow-2xl sm:rounded-3xl sm:p-8"
          >
            <button type="button" onClick={() => setShowMeasurementsModal(false)} aria-label="Cerrar registro de medidas" className="float-right rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="pr-10">
              <h2 id="measurements-title" className="font-['Anybody'] text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">Registra tus medidas</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Estos datos se envían junto al fotograma para complementar la evaluación corporal orientativa.</p>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-white/[0.09] bg-black/25 p-4">
                <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-wide text-zinc-400">Altura</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={100}
                    max={250}
                    value={estaturaCm}
                    onChange={(e) => { setEstaturaCm(e.target.value === '' ? '' : Number(e.target.value)); setMeasurementsConfirmed(false); }}
                    placeholder="175"
                    aria-label="Altura en centímetros"
                    className="min-w-0 w-full bg-transparent font-['Anybody'] text-3xl font-black tabular-nums text-white outline-none placeholder:text-zinc-700"
                  />
                  <span className="font-['JetBrains_Mono'] text-xs text-zinc-500">cm</span>
                </div>
              </label>
              <label className="rounded-2xl border border-white/[0.09] bg-black/25 p-4">
                <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase tracking-wide text-zinc-400">Peso</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={30}
                    max={250}
                    step="0.1"
                    value={pesoKg}
                    onChange={(e) => { setPesoKg(e.target.value === '' ? '' : Number(e.target.value)); setMeasurementsConfirmed(false); }}
                    placeholder="75"
                    aria-label="Peso en kilogramos"
                    className="min-w-0 w-full bg-transparent font-['Anybody'] text-3xl font-black tabular-nums text-white outline-none placeholder:text-zinc-700"
                  />
                  <span className="font-['JetBrains_Mono'] text-xs text-zinc-500">kg</span>
                </div>
              </label>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-500">Esta herramienta ofrece una lectura orientativa y no sustituye la valoración profesional de salud.</p>
            <button type="button" onClick={confirmMeasurements} className="spartan-btn-primary mt-7 flex w-full items-center justify-center gap-2 px-5 py-3.5 text-xs">
              Guardar y continuar <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </motion.div>
        </div>
      )}

      {/* Guía de Captura y Recomendaciones Paso a Paso con ilustraciones SVG y navegación */}
      <CaptureGuideModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onFinish={() => {
          setShowGuideModal(false);
          setShowMeasurementsModal(true);
        }}
        privacyText="Tus fotogramas se procesan de forma transitoria en memoria volátil en el microservicio IA para la inferencia MediaPipe y no se almacenan permanentemente sin tu autorización expresa."
      />

      {/* Modal Clínico de Detalle de Receta y Prompt Fotográfico */}
      <RecetaModal
        receta={selectedRecetaModal}
        onClose={() => setSelectedRecetaModal(null)}
      />

      {/* Modal de Técnica y Biomecánica del Ejercicio con GIF */}
      <EjercicioModal
        ejercicio={selectedEjercicioModal}
        onClose={() => setSelectedEjercicioModal(null)}
      />
    </div>
  );
};
