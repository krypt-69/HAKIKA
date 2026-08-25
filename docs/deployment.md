# Hakika Deployment Guide

## Local Development
docker compose up --build
Services: api (port 8000), db (PostgreSQL + PostGIS), redis.
Health check: GET /api/v1/health

## Environment Files
- .env.development – mock payments, debug enabled.
- .env.sandbox – real IntaSend sandbox, debug off.
- .env.production – real IntaSend live, all secrets required.

## Production Startup Validation
App refuses to start if:
- APP_ENV=production and INTASEND_MODE=mock
- JWT secrets are default values
- Webhook secret is missing

## Database Backup
cd backend && DB_PASSWORD=xxx ./scripts/backup_database.sh
Backups stored in backups/ directory with timestamps.

## Database Restore
cd backend && DB_PASSWORD=xxx ./scripts/restore_database.sh ../backups/hakika_backup_YYYYMMDD_HHMMSS.sql

## Production Docker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
Uses Gunicorn with 4 Uvicorn workers, no hot-reload, production credentials.
