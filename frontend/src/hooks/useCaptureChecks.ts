import { useEffect, useRef, useState } from "react";

/* Landmark de MediaPipe Pose (coordenadas normalizadas 0..1) */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface Check {
  ok: boolean;
  message: string;
}

export interface CaptureChecks {
  fullBody: Check;
  distance: Check;
  light: Check;
  posture: Check;
  allOk: boolean;
}

// Índices de MediaPipe Pose
const NOSE = 0;
const L_SHOULDER = 11, R_SHOULDER = 12;
const L_HIP = 23, R_HIP = 24;
const L_ANKLE = 27, R_ANKLE = 28;

const VIS_MIN = 0.5;

/* Luminancia media + detección de contraluz con un canvas pequeño */
const probe = typeof document !== "undefined" ? document.createElement("canvas") : null;

export function measureLight(video: HTMLVideoElement): { mean: number; backlit: boolean } | null {
  if (!probe || video.videoWidth === 0) return null;
  const S = 32;
  probe.width = S;
  probe.height = S;
  const ctx = probe.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, S, S);
  const data = ctx.getImageData(0, 0, S, S).data;

  let total = 0, center = 0, border = 0, nCenter = 0, nBorder = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      total += lum;
      const inCenter = x > S * 0.3 && x < S * 0.7 && y > S * 0.15 && y < S * 0.85;
      if (inCenter) { center += lum; nCenter++; } else { border += lum; nBorder++; }
    }
  }
  const mean = total / (S * S);
  // Si el centro (persona) es mucho más oscuro que el entorno → contraluz
  const backlit = center / (nCenter || 1) < (border / (nBorder || 1)) * 0.6;
  return { mean, backlit };
}

/* Evaluación pura de un fotograma: fácil de testear */
export function evaluateFrame(
  lm: Landmark[] | null,
  light: { mean: number; backlit: boolean } | null,
): CaptureChecks {
  const none: Check = { ok: false, message: "Colócate frente a la cámara" };
  if (!lm || lm.length < 33) {
    return { fullBody: none, distance: none, light: lightCheck(light), posture: none, allOk: false };
  }

  const vis = (i: number) => ((lm[i] && (lm[i].visibility !== undefined ? lm[i].visibility! : 1)) >= VIS_MIN);
  const bodyVisible =
    vis(NOSE) && vis(L_ANKLE) && vis(R_ANKLE) &&
    [NOSE, L_ANKLE, R_ANKLE].every((i) => lm[i] && lm[i].y > 0.02 && lm[i].y < 0.98);

  const fullBody: Check = bodyVisible
    ? { ok: true, message: "Cabeza y pies visibles" }
    : { ok: false, message: "Aléjate hasta que se vea todo tu cuerpo" };

  // Distancia: proporción del alto del cuadro que ocupa la persona (nariz → tobillos)
  const ankleY = ((lm[L_ANKLE]?.y || 0) + (lm[R_ANKLE]?.y || 0)) / 2;
  const span = ankleY - (lm[NOSE]?.y || 0);
  let distance: Check;
  if (!bodyVisible) distance = { ok: false, message: "Primero encuadra todo tu cuerpo" };
  else if (span < 0.7) distance = { ok: false, message: "Acércate un poco" };
  else if (span > 0.92) distance = { ok: false, message: "Aléjate un poco" };
  else distance = { ok: true, message: "Distancia correcta" };

  // Postura: hombros y caderas nivelados (de frente a la cámara)
  const shoulderTilt = Math.abs((lm[L_SHOULDER]?.y || 0) - (lm[R_SHOULDER]?.y || 0));
  const hipTilt = Math.abs((lm[L_HIP]?.y || 0) - (lm[R_HIP]?.y || 0));
  const posture: Check =
    shoulderTilt < 0.03 && hipTilt < 0.03
      ? { ok: true, message: "Postura de frente" }
      : { ok: false, message: "Ponte derecho y de frente" };

  const lightResult = lightCheck(light);
  const allOk = fullBody.ok && distance.ok && lightResult.ok && posture.ok;
  return { fullBody, distance, light: lightResult, posture, allOk };
}

function lightCheck(light: { mean: number; backlit: boolean } | null): Check {
  if (!light) return { ok: false, message: "Midiendo la luz…" };
  if (light.backlit) return { ok: false, message: "Hay contraluz: gírate hacia la luz" };
  if (light.mean < 70) return { ok: false, message: "Poca luz: enciende más iluminación" };
  if (light.mean > 220) return { ok: false, message: "Demasiada luz directa" };
  return { ok: true, message: "Iluminación correcta" };
}

/**
 * Evalúa en vivo y dispara onReady cuando todo está en verde
 * de forma sostenida (holdMs), con cuenta regresiva para la UI.
 *
 * latestLandmarks: ref que tu loop de MediaPipe actualiza en cada fotograma.
 */
export function useCaptureChecks(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  latestLandmarks: React.MutableRefObject<Landmark[] | null>,
  onReady: () => void,
  { holdMs = 3000, intervalMs = 250, enabled = true, autoCapture = true } = {},
) {
  const [checks, setChecks] = useState<CaptureChecks | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const okSince = useRef<number | null>(null);
  const fired = useRef(false);
  const readyCb = useRef(onReady);
  readyCb.current = onReady;

  useEffect(() => {
    if (!enabled) return;
    fired.current = false;
    okSince.current = null;

    const id = setInterval(() => {
      const video = videoRef.current;
      const light = video ? measureLight(video) : null;
      const result = evaluateFrame(latestLandmarks.current, light);
      setChecks(result);

      if (result.allOk) {
        okSince.current ??= performance.now();
        const elapsed = performance.now() - okSince.current;
        setCountdown(autoCapture ? Math.max(0, Math.ceil((holdMs - elapsed) / 1000)) : null);
        if (autoCapture && elapsed >= holdMs && !fired.current) {
          fired.current = true;
          readyCb.current();
        }
      } else {
        okSince.current = null;
        setCountdown(null);
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [enabled, holdMs, intervalMs, videoRef, latestLandmarks]);

  return { checks, countdown };
}
