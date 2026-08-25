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


---

# Creating the Caddy Configuration

Hakika uses a single Caddy server to expose all frontend applications and the backend API through one public entry point.

The configuration file is located at:

```bash
/etc/caddy/Caddyfile
```

---

# Backup Existing Configuration

Before making any changes, create a backup.

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup
```

Verify

```bash
ls -lh /etc/caddy
```

You should see

```
Caddyfile
Caddyfile.backup
```

---

# Create the Hakika Caddy Configuration

Replace the existing configuration.

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'CADDY'
:8080 {

    handle_path /business/* {
        reverse_proxy localhost:3001
    }

    handle_path /customer/* {
        reverse_proxy localhost:3002
    }

    handle_path /rider/* {
        reverse_proxy localhost:3003
    }

    handle_path /admin/* {
        reverse_proxy localhost:3004
    }

    handle_path /api/* {
        reverse_proxy localhost:8000
    }

    handle_path /uploads/* {
        reverse_proxy localhost:8000
    }

}
CADDY
```

---

# Verify the Configuration File

Display the contents.

```bash
cat /etc/caddy/Caddyfile
```

The output should match the configuration above.

---

# Validate the Configuration

Before restarting Caddy, validate the syntax.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

Expected output

```
Valid configuration
```

Do not continue until the configuration validates successfully.

---

# Restart Caddy

Reload the configuration.

```bash
sudo systemctl restart caddy
```

Verify

```bash
sudo systemctl status caddy --no-pager
```

Expected

```
active (running)
```

---

# Enable Automatic Startup

Ensure Caddy starts automatically after every reboot.

```bash
sudo systemctl enable caddy
```

Verify

```bash
systemctl is-enabled caddy
```

Expected

```
enabled
```

---

# Verify Listening Port

Confirm that Caddy is listening on port 8080.

```bash
sudo ss -tlnp | grep 8080
```

Expected output

```
LISTEN
```

---

# Verify Reverse Proxy Routes

Test the Business application.

```bash
curl -I http://localhost:8080/business
```

Test the Customer application.

```bash
curl -I http://localhost:8080/customer
```

Test the Rider application.

```bash
curl -I http://localhost:8080/rider
```

Test the Admin application.

```bash
curl -I http://localhost:8080/admin
```

Test the Backend API.

```bash
curl http://localhost:8080/api/v1/health
```

Expected

```
HTTP/1.1 200 OK
```

or a valid JSON response from the API.

---

# Verify Browser Access

Open the following URLs in your browser.

```
http://localhost:8080/business
```

```
http://localhost:8080/customer
```

```
http://localhost:8080/rider
```

```
http://localhost:8080/admin
```

Verify that:

- Business Portal loads.
- Customer Portal loads.
- Rider Portal loads.
- Admin Portal loads.
- API requests complete successfully.
- Images are served correctly.
- No CORS errors appear in the browser console.

---

# Verify All Backend Services

Ensure every required service is running.

```bash
systemctl status caddy --no-pager
systemctl status postgresql --no-pager
systemctl status redis-server --no-pager
```

Verify the backend process.

```bash
ps aux | grep uvicorn
```

Verify frontend development servers.

```bash
ss -tlnp | grep -E '3001|3002|3003|3004|8000|8080'
```

Expected ports

```
3001
3002
3003
3004
8000
8080
```

---

# Deployment Verification Checklist

The deployment is considered successful when all of the following are true.

✓ Caddy configuration validates successfully.

✓ Caddy service is running.

✓ Port 8080 is listening.

✓ Backend API responds successfully.

✓ Business application loads.

✓ Customer application loads.

✓ Rider application loads.

✓ Admin application loads.

✓ Static uploads are accessible.

✓ No browser console errors are present.

At this point, Hakika is fully operational behind the Caddy reverse proxy.

