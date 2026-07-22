# HAKIKA VPS DEPLOYMENT GUIDE
Version: 1.0

---

# Purpose

This document describes the complete deployment process for Hakika on a brand-new Ubuntu VPS.

The goal is that a person with basic Linux knowledge can deploy Hakika by copying commands from this document in order.

This guide is based on the current repository structure and configuration and does not intentionally introduce any configuration that does not already exist in the project.

Repository investigated:

- backend/
- frontend/
- Caddy
- FastAPI
- PostgreSQL
- Redis
- Vite workspace

Deployment style:

- Ubuntu VPS
- GitHub source
- FastAPI
- Uvicorn
- PostgreSQL
- Redis
- Caddy reverse proxy

---

# Repository Structure

Expected repository after cloning:

```
hakika/
├── backend/
├── frontend/
├── docs/
├── Caddyfile
├── README.md
└── ...
```

Backend:

- FastAPI
- Alembic
- PostgreSQL
- Redis

Frontend:

- Customer App
- Business App
- Rider App
- Admin App

---

# Ports Used

Verified from the project.

| Service | Port |
|----------|------|
| Backend API | 8000 |
| Business | 3001 |
| Customer | 3002 |
| Rider | 3003 |
| Admin | 3004 |
| Caddy | 80 / 443 (production) |

---

# Reverse Proxy

Verified from repository Caddyfile.

Routes:

```
/customer/
/business/
/rider/
/admin/
/api/v1/
/uploads/
```

---

# VPS Requirements

Minimum

- Ubuntu 24.04 LTS
- 2 CPU
- 4 GB RAM
- 40 GB SSD

Recommended

- 4 CPU
- 8 GB RAM
- 80 GB SSD

---

# Login

SSH into the server.

Example

```bash
ssh root@YOUR_SERVER_IP
```

Verify current user

```bash
whoami
```

Expected output

```
root
```

Verify Ubuntu version

```bash
lsb_release -a
```

Verify architecture

```bash
uname -m
```

Verify disk

```bash
df -h
```

---

# Update Ubuntu

```bash
apt update
apt upgrade -y
apt autoremove -y
```

Verify

```bash
apt --version
```

---

# Install Basic Utilities

```bash
apt install -y \
git \
curl \
wget \
unzip \
zip \
nano \
vim \
tree \
jq \
build-essential \
software-properties-common \
ca-certificates \
gnupg \
lsb-release
```

Verify

```bash
git --version
curl --version
tree --version
```

---

# Create Hakika Directory

```bash
mkdir -p /opt/hakika
cd /opt/hakika
pwd
```

Expected

```
/opt/hakika
```

---

# Clone Repository

Replace with your repository if it changes.

```bash
git clone https://github.com/krypt-69/HAKIKA.git .
```

Verify

```bash
git remote -v
git branch
```

Expected remote

```
https://github.com/krypt-69/HAKIKA.git
```

Expected branch

```
main
```

---

# Verify Repository Structure

```bash
ls

find backend -maxdepth 1

find frontend -maxdepth 1
```

You should see

- backend
- frontend
- docs
- Caddyfile

Do not continue if these directories are missing.

---

END OF PART 1

# ============================================================
# PART 2 — INSTALL SYSTEM DEPENDENCIES
# ============================================================

---

# Install Python

Hakika backend uses Python 3.13.

Check existing version

```bash
python3 --version
```

Check pip

```bash
pip3 --version
```

If Python is not installed

```bash
apt install -y python3 python3-pip python3-venv
```

Verify

```bash
python3 --version

pip3 --version

which python3
```

Expected

```
Python 3.x.x
```

---

# Install PostgreSQL

Install PostgreSQL server

```bash
apt install -y postgresql postgresql-contrib
```

Enable PostgreSQL

```bash
systemctl enable postgresql

systemctl start postgresql
```

Verify

```bash
systemctl status postgresql --no-pager

pg_isready
```

Expected

```
accepting connections
```

---

# Create Database

Become postgres user

```bash
sudo -u postgres psql
```

Create user

```sql
CREATE USER hakika WITH PASSWORD 'CHANGE_ME_DATABASE_PASSWORD';
```

Create database

```sql
CREATE DATABASE hakika_db OWNER hakika;
```

Grant privileges

```sql
GRANT ALL PRIVILEGES ON DATABASE hakika_db TO hakika;
```

Exit

```sql
\q
```

Verify login

```bash
psql \
postgresql://hakika:CHANGE_ME_DATABASE_PASSWORD@localhost/hakika_db \
-c "\dt"
```

Expected

Database connects successfully.

---

# Install Redis

```bash
apt install -y redis-server
```

Enable Redis

```bash
systemctl enable redis-server

systemctl start redis-server
```

Verify

```bash
redis-cli ping
```

Expected

```
PONG
```

Check service

```bash
systemctl status redis-server --no-pager
```

---

# Install Node.js

Check if Node already exists

```bash
node -v

npm -v
```

If missing

```bash
apt install -y nodejs npm
```

Verify

```bash
node -v

npm -v
```

---

# Verify All Required Software

```bash
python3 --version

pip3 --version

node -v

npm -v

psql --version

redis-server --version

git --version
```

All commands should return a version.

---

# Install Backend Dependencies

Go to backend

```bash
cd /opt/hakika/backend
```

Create virtual environment

```bash
python3 -m venv venv
```

Activate

```bash
source venv/bin/activate
```

Verify

```bash
which python

which pip
```

Expected

```
/opt/hakika/backend/venv/bin/python
```

Upgrade pip

```bash
pip install --upgrade pip
```

Install requirements

```bash
pip install -r requirements.txt
```

Verify

```bash
pip list

python -c "import fastapi"

python -c "import sqlalchemy"

python -c "import uvicorn"
```

No errors should appear.

---

# Install Frontend Dependencies

```bash
cd /opt/hakika/frontend
```

Install packages

```bash
npm install
```

Verify workspace

```bash
npm ls --depth=0
```

Verify workspaces

```bash
npm run
```

The following scripts should exist

- dev:business
- dev:customer
- dev:admin
- dev:rider

---

END OF PART 2

