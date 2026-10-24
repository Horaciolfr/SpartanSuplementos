import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const unexpectedErrors = new Rate('unexpected_errors');
export const posMultiSkuDuration = new Trend('pos_multi_sku_duration');

const CAJERO_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzIiwicm9sIjoiRU1QTEVBRE8iLCJlbWFpbCI6ImNhamVyb0BzcGFydGFuLmRldiIsImV4cCI6MTc5MjUzNDAzMX0.z8h9LkX9K09V83LGpz72oI84Ut3KUbIy053sBNWQvm4';
const BASE_URL = 'http://backend:8000';

const PRODUCT_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30
];

export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'pos_multi_sku_duration': ['p(95)<1000'],
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
  const payload = JSON.stringify({
    id_cliente: 4,
    items: getRandomItems(),
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CAJERO_TOKEN}`,
    },
    tags: { name: 'POST /pos/ventas' },
  };

  const res = http.post(`${BASE_URL}/pos/ventas`, payload, params);
  posMultiSkuDuration.add(res.timings.duration);

  const isExpected = (res.status === 201 || res.status === 409);
  unexpectedErrors.add(!isExpected);

  check(res, {
    'status es 201 o 409': (r) => r.status === 201 || r.status === 409,
  });

  sleep(1.2 + Math.random() * 0.6);
}
