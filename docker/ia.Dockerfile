FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 libegl1 libgles2 \
    && rm -rf /var/lib/apt/lists/*

COPY services/ia/requirements_ia.txt ./requirements_ia.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements_ia.txt

# Copiar servicio de IA, modelos, tests y datos
COPY services ./services
COPY tests ./tests
COPY data ./data
COPY artifacts ./artifacts
COPY pytest.ini ./

EXPOSE 8001

CMD ["uvicorn", "services.ia.main:app", "--host", "0.0.0.0", "--port", "8001"]
