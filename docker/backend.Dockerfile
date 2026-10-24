FROM python:3.11-slim

# Evitar generación de .pyc y forzar buffer no bloqueante en stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

# Instalar cliente PostgreSQL para healthchecks y herramientas de red básicas
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Copiar código fuente, tests, datos y artefactos de modelos
COPY app ./app
# backend/ no contiene la aplicación ASGI activa; solo se copia el entorno
# Alembic. El Gateway autoritativo se encuentra en app/.
COPY backend/alembic ./backend/alembic
COPY alembic.ini ./
COPY scripts ./scripts
COPY tests ./tests
COPY data ./data
COPY artifacts ./artifacts
COPY pytest.ini ./
COPY docker/backend_entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
