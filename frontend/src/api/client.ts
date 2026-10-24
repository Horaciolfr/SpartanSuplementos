import axios from 'axios';
import {
  STORAGE_KEYS,
  getSecureItem,
  removeSecureItem,
  purgeLegacyStorage,
} from '../utils/security';

// En Docker/Nginx se usa el proxy same-origin `/api`, lo que permite acceder
// desde otros dispositivos de la red sin convertir localhost en la dirección
// del teléfono. Vite conserva su URL explícita para desarrollo local.
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
});

// Interceptor de solicitudes: inyecta el token de la sesion si existe.
apiClient.interceptors.request.use(
  (config) => {
    const token = getSecureItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

import { toast } from 'sonner';

// Interceptor de Respuestas: ante 401 Unauthorized limpia sesión segura y redirige a /login. Ante 409 Conflict emite notificación global.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      removeSecureItem(STORAGE_KEYS.TOKEN);
      removeSecureItem(STORAGE_KEYS.ROLE);
      removeSecureItem(STORAGE_KEYS.USER);
      purgeLegacyStorage();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response && error.response.status === 409) {
      const detalle = error.response.data?.detail || 'Conflicto de concurrencia o quiebre de stock.';
      toast.error('Conflicto detectado', {
        description: typeof detalle === 'string' ? detalle : JSON.stringify(detalle),
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
