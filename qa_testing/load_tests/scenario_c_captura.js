import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const unexpectedErrors = new Rate('unexpected_errors');
export const poseCaptureDuration = new Trend('pose_capture_duration');

const imgFile = open('/assets/sample_pose.jpg', 'b');
const CLIENTE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0Iiwicm9sIjoiQ0xJRU5URSIsImVtYWlsIjoiY2xpZW50ZUBzcGFydGFuLmRldiIsImV4cCI6MTc5MjUzNDAzMX0.pO1LM1vTjIzPHJ_P2pbYJ6KP6ZTuda9wDHP008JYi60';
const BASE_URL = 'http://backend:8000';

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    'pose_capture_duration': ['p(95)<5000'],
    'unexpected_errors': ['rate<0.01'],
  },
};

export default function () {
  const data = {
    estatura_cm: '175.0',
    peso_kg: '75.0',
    file: http.file(imgFile, 'sample_pose.jpg', 'image/jpeg'),
  };

  const params = {
    headers: {
      Authorization: `Bearer ${CLIENTE_TOKEN}`,
    },
    timeout: '12s',
  };

  const res = http.post(`${BASE_URL}/ia/pose/analizar`, data, params);
  poseCaptureDuration.add(res.timings.duration);
  unexpectedErrors.add(res.status !== 200);

  check(res, {
    'status es 200': (r) => r.status === 200,
  });

  sleep(1.5 + Math.random() * 0.5);
}
