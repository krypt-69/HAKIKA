# Hakika V1 – Production Deployment Guide

## 1. Provision Infrastructure

**Option chosen: VPS + Managed Database**

- **VPS:** Ubuntu 24.04, >=2 GB RAM (DigitalOcean, Hetzner, etc.)
- **Managed PostgreSQL:** version 15+ with public access (or accessible from VPS)
- **Redis:** runs on the same VPS (lightweight for V1)

## 2. VPS Setup

SSH into the VPS and run:

sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker

Copy the project to the VPS:

On your local machine:
  cd ~/projects && tar czf hakika.tar.gz hakika
  scp hakika.tar.gz user@VPS_IP:~/

Back on VPS:
  tar xzf hakika.tar.gz && cd hakika

## 3. Production Environment

Create and fill the production env file:

cp backend/.env.production.example backend/.env.production
nano backend/.env.production

Required variables:

APP_ENV=production
INTASEND_MODE=real
INTASEND_PUBLIC_KEY=ISPubKey_live_...
INTASEND_SECRET_KEY=ISSecretKey_live_...
INTASEND_WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL=postgresql+asyncpg://user:pass@managed-db-host:5432/hakika_db?sslmode=require
DATABASE_URL_SYNC=postgresql+psycopg2://user:pass@managed-db-host:5432/hakika_db?sslmode=require
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-random-secret
JWT_REFRESH_SECRET_KEY=another-random-secret
SENTRY_DSN=https://...   (optional)

## 4. Production Docker Compose

Create docker-compose.prod.yml on the VPS with this content:

services:
  api:
    build: ./backend
    restart: always
    ports:
      - "127.0.0.1:8000:8000"
    env_file:
      - backend/.env.production
    command: >
      sh -c "alembic upgrade head &&
             gunicorn app.main:app
               --workers 4
               --worker-class uvicorn.workers.UvicornWorker
               --bind 0.0.0.0:8000"
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - hakika

  redis:
    image: redis:7-alpine
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
    networks:
      - hakika

networks:
  hakika:

Start the stack:

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

## 5. Nginx & SSL

Install Nginx and Certbot:

sudo apt install -y nginx certbot python3-certbot-nginx

Create Nginx config:

sudo nano /etc/nginx/sites-available/hakika

Content:

server {
    listen 80;
    server_name api.hakika.co.ke;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

Enable and reload:

sudo ln -s /etc/nginx/sites-available/hakika /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

Get SSL certificate:

sudo certbot --nginx -d api.hakika.co.ke

## 6. IntaSend Webhook

Set production webhook URL in IntaSend dashboard to:

https://api.hakika.co.ke/api/v1/payments/callback

## 7. Verification

- Health check: https://api.hakika.co.ke/api/v1/health
- Test a small live transaction (KES 10) after confirming live credentials.

**Remember:** Never commit .env.production to version control.
