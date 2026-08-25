# HAKIKA ENVIRONMENT CONFIGURATION

Version: 1.0

---

# Purpose

This document recreates every environment configuration currently used by the Hakika project.

Following this document produces the same environment layout used during development.

Repository inspected:

backend/
frontend/apps/

Verified environment files:

backend/.env
backend/.env.development
backend/.env.production
backend/.env.sandbox
backend/.env.docker
backend/.env.example

frontend/apps/admin/.env
frontend/apps/business/.env
frontend/apps/customer/.env
frontend/apps/rider/.env

---

# Backend Environment

Go to backend

```bash
cd /opt/hakika/backendCreate .env

cat > .env <<'ENV'
# Database
DATABASE_URL=postgresql+asyncpg://hakika:hakika_dev@localhost:5432/hakika_db
DATABASE_URL_SYNC=postgresql+psycopg2://hakika:hakika_dev@localhost:5432/hakika_db

# Redis
REDIS_URL=redis://localhost:6379/0

# App
SECRET_KEY=change-me-in-production-123!
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

JWT_SECRET_KEY=hakika-dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET_KEY=hakika-dev-refresh-secret-change-in-production

INTASEND_PUBLIC_KEY=ISPubKey_test_35765bec-9160-4a45-9446-18720b254e71
INTASEND_SECRET_KEY=ISSecretKey_test_47f7ca32-65f7-46d0-871c-34604a9753e2
INTASEND_WALLET_ID=Y74E6JY
INTASEND_MODE=real
ENV

Verify

cat .env
Development Environment
cat > .env.development <<'ENV'
APP_ENV=development
INTASEND_MODE=mock

DATABASE_URL=postgresql+asyncpg://hakika:hakika_dev@localhost:5432/hakika_db
DATABASE_URL_SYNC=postgresql+psycopg2://hakika:hakika_dev@localhost:5432/hakika_db

REDIS_URL=redis://localhost:6379/0

JWT_SECRET_KEY=dev-jwt-secret-change-me
JWT_REFRESH_SECRET_KEY=dev-refresh-secret-change-me

DEBUG=true
ENV

Verify

cat .env.development
Production Environment
cat > .env.production <<'ENV'
APP_ENV=production
INTASEND_MODE=real

INTASEND_PUBLIC_KEY=
INTASEND_SECRET_KEY=
INTASEND_WEBHOOK_SECRET=

DATABASE_URL=
DATABASE_URL_SYNC=

REDIS_URL=

JWT_SECRET_KEY=
JWT_REFRESH_SECRET_KEY=

DEBUG=false
SENTRY_DSN=
ENV

Verify

cat .env.production
Sandbox Environment
cat > .env.sandbox <<'ENV'
APP_ENV=sandbox
INTASEND_MODE=real

INTASEND_PUBLIC_KEY=ISPubKey_test_xxx
INTASEND_SECRET_KEY=ISSecretKey_test_xxx
INTASEND_WEBHOOK_SECRET=

DATABASE_URL=postgresql+asyncpg://hakika:hakika_dev@sandbox-db:5432/hakika_db
DATABASE_URL_SYNC=postgresql+psycopg2://hakika:hakika_dev@sandbox-db:5432/hakika_db

REDIS_URL=redis://sandbox-redis:6379/0

JWT_SECRET_KEY=sandbox-jwt-secret
JWT_REFRESH_SECRET_KEY=sandbox-refresh-secret

DEBUG=false
SENTRY_DSN=
ENV

Verify

cat .env.sandbox
Docker Environment
cat > .env.docker <<'ENV'
APP_ENV=development

DB_HOST=db
DB_PORT=5432
DB_USER=hakika
DB_PASSWORD=hakika_dev
DB_NAME=hakika_db

DATABASE_URL=postgresql+asyncpg://hakika:hakika_dev@db:5432/hakika_db
DATABASE_URL_SYNC=postgresql+psycopg2://hakika:hakika_dev@db:5432/hakika_db

REDIS_URL=redis://redis:6379/0

JWT_SECRET_KEY=docker-dev-jwt-secret
JWT_REFRESH_SECRET_KEY=docker-dev-refresh-secret

INTASEND_MODE=mock
ENV

Verify

cat .env.docker
Frontend Environment Files

Go to frontend

cd /opt/hakika/frontend/apps

Business

cat > business/.env <<'ENV'
VITE_API_BASE=/api/v1
VITE_ROUTER_BASENAME=/business
VITE_CUSTOMER_BASE=/customer
VITE_BUSINESS_BASE=/business
VITE_RIDER_BASE=/rider
VITE_ADMIN_BASE=/admin
VITE_UPLOAD_BASE=/uploads
ENV

Customer

cat > customer/.env <<'ENV'
VITE_API_BASE=/api/v1
VITE_ROUTER_BASENAME=/customer
VITE_CUSTOMER_BASE=/customer
VITE_BUSINESS_BASE=/business
VITE_RIDER_BASE=/rider
VITE_ADMIN_BASE=/admin
VITE_UPLOAD_BASE=/uploads
ENV

Rider

cat > rider/.env <<'ENV'
VITE_API_BASE=/api/v1
VITE_ROUTER_BASENAME=/rider
VITE_CUSTOMER_BASE=/customer
VITE_BUSINESS_BASE=/business
VITE_RIDER_BASE=/rider
VITE_ADMIN_BASE=/admin
VITE_UPLOAD_BASE=/uploads
ENV

Admin

cat > admin/.env <<'ENV'
VITE_API_BASE_URL=http://localhost:8000
ENV
Verify Environment Files
find /opt/hakika \
-type f \
\( \
-name ".env" \
-o -name ".env.*" \
\) | sort

Expected output

backend/.env
backend/.env.development
backend/.env.production
backend/.env.sandbox
backend/.env.docker

frontend/apps/admin/.env
frontend/apps/business/.env
frontend/apps/customer/.env
frontend/apps/rider/.env
Final Verification

Verify backend variables

cd /opt/hakika/backend

grep DATABASE_URL .env
grep REDIS_URL .env
grep JWT_SECRET_KEY .env

Verify frontend variables

cd /opt/hakika/frontend

find apps -name ".env" -exec echo "==== {} ====" \; -exec cat {} \;

If all files match this document, the VPS environment configuration is identical to the development machine.

