import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Métricas personalizadas para SLOs
export const unexpectedErrors = new Rate('unexpected_errors');
export const posMultiSkuDuration = new Trend('pos_multi_sku_duration');
export const poseCaptureDuration = new Trend('pose_capture_duration');
export const adminClientesDuration = new Trend('admin_clientes_duration');
export const mixedReadDuration = new Trend('mixed_read_duration');
export const mixedWriteDuration = new Trend('mixed_write_duration');
export const catalogoSpikeDuration = new Trend('catalogo_spike_duration');

// Carga de activo de pose anatómica (sample_pose.jpg en el mismo directorio)
const imgFile = open('./sample_pose.jpg', 'b');

// Tokens JWT válidos con expiración extendida
const CAJERO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sIjoiRU1QTEVBRE8iLCJlbWFpbCI6ImNhamVyb0BzcGFydGFuLmRldiIsImV4cCI6MTc5MzE1NTIzOX0.Q8UyZLV7bZvuBCiSLcOAtqRwQLvcgtvSB68ixTTvUY8';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwicm9sIjoiQURNSU5JU1RSQURPUiIsImVtYWlsIjoiYWRtaW5Ac3BhcnRhbi5kZXYiLCJleHAiOjE3OTMxNTUyMzl9.jauuVyTcUB6t0w3dUmC6p3dV3hwgJeKUH4iSjayHrgY';
const CLIENTE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0Iiwicm9sIjoiQ0xJRU5URSIsImVtYWlsIjoiY2xpZW50ZUBzcGFydGFuLmRldiIsImV4cCI6MTc5MzE1NTIzOX0.M2ZlGiTsQ8nxSmPbXDRKlnE5udSPYMXpNar2FuVRQzo';

const BASE_URL = __ENV.BASE_URL || 'http://backend:8000';

// Pool de 30 SKUs reales de la empresa
const PRODUCT_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30
];

export const options = {
  scenarios: {
    // (a) POS Multi-SKU: 100 VUs con rampa de 5 min, mezcla de 30 SKUs
    pos_multi_sku: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      exec: 'posMultiSkuScenario',
      tags: { scenario: 'pos_multi_sku' },
    },

    // (b) Mixto 70/30: 30 VUs, 5 min (lectura: /ia/perfiles/search y /admin/clientes con filtros; escritura: POS)
    mixed_read_write: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'mixedReadWriteScenario',
      tags: { scenario: 'mixed_read_write' },
    },

    // (c) Capturas sostenidas: 20 VUs durante 5 min contra /ia/pose/analizar
    pose_capture: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      exec: 'poseCaptureScenario',
      tags: { scenario: 'pose_capture' },
    },

    // (d) Pico: 150 VUs durante 60 s sobre /catalogo/productos
    spike_catalogo: {
      executor: 'ramping-vus',
      startTime: '1m', // Se activa tras 1 minuto de calentamiento
      stages: [
        { duration: '10s', target: 150 },
        { duration: '40s', target: 150 },
        { duration: '10s', target: 0 },
      ],
      exec: 'spikeCatalogoScenario',
      tags: { scenario: 'spike_catalogo' },
    },
  },

  thresholds: {
    // SLO 1: p95 POS < 1000 ms
    'pos_multi_sku_duration': ['p(95)<1000'],
    // SLO 2: p95 Captura de pose < 5000 ms
    'pose_capture_duration': ['p(95)<5000'],
    // SLO 3: p95 /admin/clientes < 500 ms
    'admin_clientes_duration': ['p(95)<500'],
    // SLO 4: Tasa de error < 1% (excluyendo 409 Conflict esperados)
    'unexpected_errors': ['rate<0.01'],
  },
};

export default function() {
  // Fallback para ejecución CLI simple
}

// Generador de canasta multi-SKU aleatoria
function getRandomItems() {
  const count = Math.floor(Math.random() * 3) + 1; // 1 a 3 items
  const shuffled = PRODUCT_IDS.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((id) => ({
    id_producto: id,
    cantidad: 1,
  }));
}

// ---------------------------------------------------------------------------
// Escenario (a): POS Multi-SKU
// ---------------------------------------------------------------------------
export function posMultiSkuScenario() {
  const payload = JSON.stringify({
    id_cliente: 4,
    items: getRandomItems(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CAJERO_TOKEN}`,
    },
    tags: { name: 'POST /pos/ventas (Multi-SKU)' },
  };

  const res = http.post(`${BASE_URL}/pos/ventas`, payload, params);
  posMultiSkuDuration.add(res.timings.duration);

  const isExpected = (res.status === 201 || res.status === 409);
  unexpectedErrors.add(!isExpected);

  check(res, {
    'pos_multi_sku status 201 o 409': (r) => r.status === 201 || r.status === 409,
  });

  sleep(0.1 + Math.random() * 0.1);
}

// ---------------------------------------------------------------------------
// Escenario (b): Tráfico Mixto 70% Lectura / 30% Escritura
// ---------------------------------------------------------------------------
export function mixedReadWriteScenario() {
  const roll = Math.random();

  if (roll < 0.70) {
    // 70% Lectura dividida equitativamente entre búsqueda GIN y directorio CRM admin
    if (Math.random() < 0.50) {
      // 1. Búsqueda de landmarks sobre índice GIN en JSONB
      const landmarks = ['NOSE', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_HIP', 'RIGHT_HIP'];
      const lm = landmarks[Math.floor(Math.random() * landmarks.length)];
      const res = http.get(`${BASE_URL}/ia/perfiles/search?nombre_landmark=${lm}&min_visibility=0.5`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        tags: { name: 'GET /ia/perfiles/search (GIN)' },
      });
      mixedReadDuration.add(res.timings.duration);
      unexpectedErrors.add(res.status !== 200);
      check(res, { 'search_gin status 200': (r) => r.status === 200 });
    } else {
      // 2. Consulta de clientes con filtros combinados (somatotipo + conversión + orden)
      const somatotipos = [1, 2, 3];
      const sm = somatotipos[Math.floor(Math.random() * somatotipos.length)];
      const res = http.get(`${BASE_URL}/admin/clientes?somatotipo=${sm}&conversion=true&orden=registro_reciente&pagina=1&tamano=20`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        tags: { name: 'GET /admin/clientes (Filtros combinados)' },
      });
      adminClientesDuration.add(res.timings.duration);
      mixedReadDuration.add(res.timings.duration);
      unexpectedErrors.add(res.status !== 200);
      check(res, { 'admin_clientes status 200': (r) => r.status === 200 });
    }
  } else {
    // 30% Escritura: Venta transaccional POS
    const payload = JSON.stringify({
      id_cliente: 4,
      items: getRandomItems(),
    });
    const res = http.post(`${BASE_URL}/pos/ventas`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CAJERO_TOKEN}`,
      },
      tags: { name: 'POST /pos/ventas (Mixto)' },
    });
    mixedWriteDuration.add(res.timings.duration);
    const isExpected = (res.status === 201 || res.status === 409);
    unexpectedErrors.add(!isExpected);
    check(res, { 'pos_escritura status 201 o 409': (r) => r.status === 201 || r.status === 409 });
  }

  sleep(0.15 + Math.random() * 0.1);
}

// ---------------------------------------------------------------------------
// Escenario (c): Inferencia de Pose Sostenida (20 VUs)
// ---------------------------------------------------------------------------
export function poseCaptureScenario() {
  const data = {
    estatura_cm: '175.0',
    peso_kg: '75.0',
    file: http.file(imgFile, 'sample_pose.jpg', 'image/jpeg'),
  };

  const params = {
    headers: {
      'Authorization': `Bearer ${CLIENTE_TOKEN}`,
    },
    tags: { name: 'POST /ia/pose/analizar' },
    timeout: '15s',
  };

  const res = http.post(`${BASE_URL}/ia/pose/analizar`, data, params);
  poseCaptureDuration.add(res.timings.duration);
  unexpectedErrors.add(res.status !== 200);

  check(res, {
    'pose_capture status 200': (r) => r.status === 200,
  });

  sleep(0.3 + Math.random() * 0.2);
}

// ---------------------------------------------------------------------------
// Escenario (d): Pico de 150 VUs sobre Catálogo de Productos
// ---------------------------------------------------------------------------
export function spikeCatalogoScenario() {
  const res = http.get(`${BASE_URL}/catalogo/productos`, {
    tags: { name: 'GET /catalogo/productos (Spike)' },
  });

  catalogoSpikeDuration.add(res.timings.duration);
  unexpectedErrors.add(res.status !== 200);

  check(res, {
    'catalogo_spike status 200': (r) => r.status === 200,
  });

  sleep(0.05 + Math.random() * 0.05);
}

// ---------------------------------------------------------------------------
// Exportación de Resultados Estructurados en JSON
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    '/scripts/summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  return '=== RESUMEN DE PRUEBAS DE CARGA K6 COMPLETADO ===';
}
