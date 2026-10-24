# Fase 1: Build de la SPA con Vite y Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Inyectar URL del API en tiempo de compilación para Vite
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Copiar manifiestos e instalar dependencias
COPY frontend/package*.json ./
RUN npm ci

# Copiar código fuente y compilar bundle de producción
COPY frontend/ .
RUN npm run build

# Fase 2: Servidor Nginx ultra-liviano para producción
FROM nginx:alpine

# Copiar bundle compilado a la raíz de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada con soporte SPA
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
