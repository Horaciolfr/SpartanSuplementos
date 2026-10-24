import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const unexpectedErrors = new Rate('unexpected_errors');
export const mixedDuration = new Trend('mixed_duration');

const CAJERO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sIjoiRU1QTEVBRE8iLCJlbWFpbCI6ImNhamVyb0BzcGFydGFuLmRldiIsImV4cCI6MTc5MjUzNDAzMX0.z8h9LkX9K09V83LGpz72oI84Ut3KUbIy053sBNWQvm4';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyIiwicm9sIjoiQURNSU5JU1RSQURPUiIsImVtYWlsIjoiYWRtaW5Ac3BhcnRhbi5kZXYiLCJleHAiOjE3OTI1MzQwMzF9.zqnmE39HQLWqqtA-WAFE_8umXbjliqj5n7Am13Am8nQ';
const BASE_URL = 'http://backend:8000';

const PRODUCT_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30
];

export const options = {
  vus: 30,
  duration: '1m',
  thresholds: {
    'mixed_duration': ['p(95)<1000'],
    'unexpected_errors': ['rate<0.01'],
  },
};

function getRandomItems() {
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = PRODUCT_IDS.slice().sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((id) => ({
    id_producto: id,
    cantidad: 1,
  }));
}

export default function () {
  const roll = Math.random();

  if (roll < 0.70) {
    if (Math.random() < 0.50) {
      const res = http.get(`${BASE_URL}/catalogo/productos`);
      mixedDuration.add(res.timings.duration);
      unexpectedErrors.add(res.status !== 200);
      check(res, { 'catalogo status 200': (r) => r.status === 200 });
    } else {
      const landmarks = ['NOSE', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_HIP', 'RIGHT_HIP'];
      const lm = landmarks[Math.floor(Math.random() * landmarks.length)];
      const res = http.get(`${BASE_URL}/ia/perfiles/search?nombre_landmark=${lm}&min_visibility=0.5`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      mixedDuration.add(res.timings.duration);
      unexpectedErrors.add(res.status !== 200);
      check(res, { 'gin search status 200': (r) => r.status === 200 });
    }
  } else {
    const payload = JSON.stringify({
      id_cliente: 4,
      items: getRandomItems(),
    });
    const res = http.post(`${BASE_URL}/pos/ventas`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CAJERO_TOKEN}`,
      },
    });
    mixedDuration.add(res.timings.duration);
    const isExpected = (res.status === 201 || res.status === 409);
    unexpectedErrors.add(!isExpected);
    check(res, { 'pos venta status 201 o 409': (r) => r.status === 201 || r.status === 409 });
  }

  sleep(0.5 + Math.random() * 0.3);
}
