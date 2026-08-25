# Hakika VPS Setup and Deployment Guide

> Version: 1.0
>
> Repository:
> https://github.com/krypt-69/HAKIKA.git

---

# 1. Introduction

This document explains how to deploy the Hakika platform onto a completely new Linux VPS.

The goal is that a system administrator can simply follow this document from top to bottom without making assumptions or searching for missing information.

Every command has been verified against the current repository before being documented.

Whenever possible:

- configuration files are created using `cat <<EOF`
- every step includes verification commands
- failures can be detected immediately before continuing

---

# Current Project Structure

The repository contains the following major components.

```
HAKIKA/

├── backend/
│   ├── app/
│   ├── alembic/
│   ├── scripts/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── apps/
│   │   ├── business/
│   │   ├── customer/
│   │   ├── rider/
│   │   └── admin/
│   │
│   └── packages/
│
├── documentation/
│
├── Caddyfile
│
└── README.md
```

---

# Backend

Technology Stack

- Python
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Redis
- Uvicorn

Default Backend Port

```
8000
```

API Prefix

```
/api/v1
```

---

# Frontend

The frontend is a Vite workspace.

Applications

| Application | Base Path | Dev Port |
|-------------|----------|----------|
| Customer | /customer | 3002 |
| Business | /business | 3001 |
| Rider | /rider | 3003 |
| Admin | /admin | 3004 |

---

# Reverse Proxy

The project uses

Caddy

Current public port

```
8080
```

Caddy routes requests as follows

```
/customer  -> localhost:3002

/business  -> localhost:3001

/rider     -> localhost:3003

/admin     -> localhost:3004

/api/v1    -> localhost:8000

/uploads   -> localhost:8000
```

---

# Deployment Philosophy

The deployment procedure documented here reproduces the current project architecture exactly as verified from the repository.

It does not invent additional services or infrastructure.

The deployment includes

- PostgreSQL
- Redis
- Python virtual environment
- Node workspace
- FastAPI
- Vite applications
- Caddy reverse proxy

---

# Deployment Flow

The deployment will be completed in the following order.

1. Prepare VPS
2. Install required packages
3. Clone repository
4. Configure PostgreSQL
5. Configure Redis
6. Configure backend
7. Configure frontend
8. Configure Caddy
9. Run database migrations
10. Start backend
11. Start frontend applications
12. Verify deployment

Do not skip any step.

Every section finishes with verification commands.


# 2. VPS Requirements and Operating System Preparation

This guide assumes a fresh Ubuntu Server installation.

Recommended Operating System

- Ubuntu Server 24.04 LTS

Minimum Recommended Resources

| Resource | Minimum |
|-----------|----------|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Storage | 40 GB SSD |
| Network | Public IPv4 |

Recommended Domain

Example

```
api.example.com
```

or

```
hakika.example.com
```

---

# Login to the Server

Connect using SSH.

Example

```bash
ssh username@SERVER_IP
```

Verify the current user.

```bash
whoami
```

Expected Result

```
username
```

Verify the operating system.

```bash
cat /etc/os-release
```

Expected Result

Ubuntu 24.04 LTS (or another supported Ubuntu release)

---

# Update the Operating System

Run all updates before installing software.

```bash
sudo apt update

sudo apt upgrade -y
```

Verification

```bash
sudo apt update
```

Expected Result

```
All packages are up to date.
```

---

# Install Essential Utilities

Install the utilities required throughout the deployment.

```bash
sudo apt install -y \
git \
curl \
wget \
unzip \
zip \
build-essential \
software-properties-common \
ca-certificates \
apt-transport-https \
gnupg \
lsb-release \
tree
```

Verification

```bash
git --version

curl --version

wget --version

tree --version
```

Each command should print its installed version.

---

# Configure Timezone

Verify the server timezone.

```bash
timedatectl
```

If necessary, change it.

Example

```bash
sudo timedatectl set-timezone Africa/Nairobi
```

Verify

```bash
timedatectl
```

---

# Create Project Directory

Create the directory that will contain the Hakika repository.

```bash
mkdir -p ~/projects

cd ~/projects
```

Verification

```bash
pwd

ls
```

Expected Result

```
/home/<username>/projects
```

---

# Verify Internet Connectivity

Confirm that the VPS can reach GitHub.

```bash
ping -c 4 github.com
```

Expected Result

Four successful replies.

If the ping fails, resolve network connectivity before continuing.

---

# Section Verification Checklist

Run the following commands.

```bash
whoami

pwd

git --version

curl --version

wget --version

tree --version

timedatectl
```

If every command succeeds, continue to the next section.

