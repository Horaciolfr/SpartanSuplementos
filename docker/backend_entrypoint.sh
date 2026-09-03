#!/bin/sh
set -e

echo "==> [Spartan Backend] Esperando a que PostgreSQL esté listo..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USER:-postgres}"; do
  echo "    Esperando a la base de datos..."
  sleep 2
done

echo "==> [Spartan Backend] Base de datos en línea. Ejecutando migraciones Alembic..."
alembic upgrade head || echo "    Migraciones ya al día o esquema inicial presente."

echo "==> [Spartan Backend] Iniciando servidor FastAPI ERP en 0.0.0.0:8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
