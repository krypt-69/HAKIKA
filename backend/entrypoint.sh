#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  sleep 1
done

echo "PostgreSQL is ready. Running migrations..."
alembic upgrade head

echo "Starting Hakika API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
