# Hakika Caddy Reverse Proxy Guide

Version: 1.0

---

# Purpose

This document explains how Hakika uses Caddy as its reverse proxy.

Rather than exposing multiple ports to users, Caddy presents the entire platform as a single website while internally routing requests to the correct application.

This document describes the complete setup process, explains every configuration option, documents the routing architecture, and provides verification and troubleshooting procedures.

---

# Why Caddy?

Hakika consists of multiple independent applications.

- Business Portal
- Customer Portal
- Rider Portal
- Admin Portal
- FastAPI Backend

Each application runs on its own port during development.

Without a reverse proxy, users would need to access different URLs such as:
localhost:3001
localhost:3002
localhost:3003
localhost:3004
localhost:8000


This is inconvenient, insecure, and unsuitable for production.

Instead, Caddy exposes a single entry point.

Example


http://localhost:8080/business


http://localhost:8080/customer
http://localhost:8080/rider
http://localhost:8080/admin
http://localhost:8080/api

The browser never communicates directly with the internal services.

All traffic first reaches Caddy.

---

# Reverse Proxy Architecture

                Browser
                   │
                   │
         http://localhost:8080
                   │
                   ▼
          +------------------+
          |      CADDY       |
          +------------------+
                   │
  ┌────────┬────────┬────────┬────────┬────────┐
  │        │        │        │        │
  ▼        ▼        ▼        ▼        ▼

Business Customer Rider Admin FastAPI
:3001 :3002 :3003 :3004 :8000


Caddy becomes the single public entry point into the Hakika platform.

Every request is inspected before being forwarded to the correct internal application.

---

# Routing Strategy

Hakika routes requests using URL prefixes.

| URL | Destination |
|------|-------------|
| /business | Business App |
| /customer | Customer App |
| /rider | Rider App |
| /admin | Admin App |
| /api | FastAPI Backend |
| /uploads | Backend Static Files |

Because every application lives behind Caddy, the browser only communicates with one server.

This greatly simplifies deployment while improving security.

---

# Installing Caddy

Update Ubuntu.

```bash
sudo apt update

Install required packages.

sudo apt install -y \
debian-keyring \
debian-archive-keyring \
apt-transport-https \
curl

Add the official Caddy repository.

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
| sudo gpg --dearmor \
-o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
| sudo tee /etc/apt/sources.list.d/caddy-stable.list

Update package lists.

sudo apt update

Install Caddy.

sudo apt install -y caddy

Verify installation.

caddy version

Expected output

v2.x.x

