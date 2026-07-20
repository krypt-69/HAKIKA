
# Hakika Platform Architecture

**Version:** 1.0  
**Date:** 2026-07-20  
**Status:** Approved  

---

## 1. Project Vision

Hakika is a Kenyan marketplace platform that connects customers, businesses, and riders. It enables:

- Customers to discover local businesses and order products.
- Businesses to manage products, accept orders, and assign riders.
- Riders to receive delivery assignments and complete deliveries.
- All parties to trust the system through an automated escrow payment flow, double‑entry ledger, and automatic settlements.

The platform is designed to be **fair**, **transparent**, and **automated** – reducing manual intervention and building trust through verifiable transactions.

---

## 2. Core Principles

1. **Source of Truth** – The backend is the single source of truth for all business logic, order state, and financial records.
2. **Separation of Concerns** – Frontends are presentation layers; backends own data and logic.
3. **Escrow First** – Payments go through Hakika’s IntaSend wallet; businesses are paid only after delivery confirmation.
4. **Automation** – B2B payouts are triggered automatically; no manual admin approval in the normal flow.
5. **Configuration over Code** – Deployment URLs, API bases, and routing paths come from environment variables, never hardcoded.
6. **Idempotency** – All external calls (payment callbacks, webhooks) are idempotent to prevent duplicate processing.
7. **Reversibility** – Every change has a rollback plan; every deployment is reversible.
8. **Auditability** – All financial transactions are recorded in an immutable ledger and settlement system.
9. **Security** – Customer data is protected; authentication and authorization are enforced at the API layer.
10. **Simplicity** – Start simple, extend only when multiple applications truly need it.

---

## 3. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Internet                                  │
│  (Customer / Business / Rider / Admin)                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │    Nginx (Reverse   │
                        │     Proxy)          │
                        └─────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
   ┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
   │ Customer App  │    │  Business App   │    │   Rider App     │
   │   (PWA)       │    │  (Dashboard)    │    │   (PWA)         │
   └───────────────┘    └─────────────────┘    └─────────────────┘
           │                        │                        │
           └────────────────────────┼────────────────────────┘
                                    ▼
                            ┌───────────────┐
                            │   FastAPI     │
                            │   Backend     │
                            └───────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ PostgreSQL  │ │   Redis     │ │  IntaSend   │
            │  + PostGIS  │ │   (cache)   │ │ (External)  │
            └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 4. Repository Structure

```
hakika/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # FastAPI routes
│   │   ├── models/             # SQLAlchemy models
│   │   ├── services/           # Business logic
│   │   ├── repositories/       # Data access
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── integrations/       # IntaSend client, etc.
│   │   └── core/               # Config, logging, errors
│   ├── migrations/             # Alembic migrations
│   └── tests/
├── frontend/
│   ├── apps/
│   │   ├── customer/           # Customer PWA
│   │   ├── business/           # Business Dashboard
│   │   ├── rider/              # Rider PWA
│   │   └── admin/              # Admin Dashboard (future)
│   ├── packages/
│   │   ├── auth/               # Shared authentication context
│   │   ├── config/             # Shared environment & URL helpers
│   │   ├── types/              # Shared TypeScript types
│   │   └── api-client/         # Shared API client (optional)
│   └── package.json            # Workspace root
├── nginx/
│   └── nginx.conf              # Reverse proxy configuration
├── scripts/
│   └── deploy.sh               # Build & deployment script
└── HAKIKA_ARCHITECTURE.md      # This document
```

---

## 5. System Components

### 5.1 Backend (FastAPI)

- **Authentication:** JWT-based for owners, riders, admins; phone-based sessions for customers.
- **Business Management:** Registration, profile, logo/cover upload, product management.
- **Order Engine:** State machine (`created` → `accepted` → `out_for_delivery` → `arrived` → `payment_pending` → `paid` → `completed`).
- **Delivery:** Rider assignment, arrival marking, GPS evidence, delivery attempts.
- **Payment:** IntaSend STK Push, callback verification, double‑entry ledger, settlement generation.
- **Settlement:** Automatic B2B payout (IntaSend) with `requires_approval="NO"`.
- **Trust Score:** Events tracked; future trust calculations.
- **Admin:** Dispute resolution, business suspension, settlement processing (manual only for exceptional cases).

### 5.2 Customer PWA (React)

- **Discovery:** Browse businesses by location, category, and search.
- **Business Profile:** View products, operating hours, and ratings.
- **Cart & Checkout:** Add products, enter delivery location (GPS or manual).
- **Order Tracking:** Real-time status timeline, rider info, evidence (after arrival).
- **Delivery Confirmation:** Confirm delivery (triggers STK Push) or reject with reason.
- **Receipts:** Digital receipt with SHA-256 hash for integrity.

### 5.3 Business Dashboard (React)

- **Onboarding:** Create business profile, set operating hours, payment method (PayBill/Till).
- **Products:** CRUD with multiple images.
- **Orders:** Accept, prepare, assign riders.
- **Riders:** Create and manage riders (pending activation).
- **Settlements:** View settlement history and status.
- **Profile:** Edit business details, logo, cover, hours.

### 5.4 Rider PWA (React)

- **Login / Activation:** Business creates rider → rider activates with email/phone.
- **Assigned Orders:** List of deliveries with business info, product thumbnails, customer details (phone hidden until arrived).
- **Navigation:** Google Maps with route from business → customer (origin = business, destination = customer).
- **Arrival Marking:** Send GPS, update order status.
- **Evidence Upload:** Capture photo, upload, attach to delivery attempt.
- **Offline Queue:** Store actions locally and sync when online.
- **Travel Mode:** Toggle between Car and Boda (motorcycle) for routing.

### 5.5 Admin Dashboard (React) – Future

- **Settlements:** Process failed payouts manually (only exceptional).
- **Disputes:** Resolve delivery disputes.
- **Businesses:** Suspension and oversight.
- **Health:** System monitoring.

---

## 6. Application Lifecycle (Customer → Payment → Settlement)

```text
Customer discovers business and products
        │
        ▼
Customer places order (no payment yet)
        │
        ▼
Business accepts and prepares order
        │
        ▼
Business assigns rider (order → out_for_delivery)
        │
        ▼
Rider navigates to business → picks up → navigates to customer
        │
        ▼
Rider marks arrived (order → arrived)
        │
        ▼
Rider uploads evidence (photo)
        │
        ▼
Customer confirms delivery
        │
        ▼
STK Push sent (amount = order total)
        │
        ▼
Customer enters PIN → payment reaches Hakika IntaSend wallet
        │
        ▼
Payment callback verifies payment (order → paid)
        │
        ▼
Ledger entries created:
   + payment_in (full amount)
   - hakika_fee (2% platform fee)
        │
        ▼
Settlement record created (net amount, status = pending)
        │
        ▼
Automatic B2B payout triggered (requires_approval = NO)
        │
        ▼
Business PayBill/Till credited (settlement → completed)
        │
        ▼
Receipt generated (with SHA-256 hash)
        │
        ▼
Order → completed
```

---

## 7. Responsibility Boundaries

| Responsibility | Nginx | FastAPI | Frontend |
|----------------|-------|---------|----------|
| Reverse proxy | ✅ | ❌ | ❌ |
| Static file serving | ✅ | ❌ | ❌ |
| Routing (path-based) | ✅ | ❌ | ❌ |
| Compression / caching | ✅ | ❌ | ❌ |
| TLS termination (future) | ✅ | ❌ | ❌ |
| Security headers | ✅ | ❌ | ❌ |
| Rate limiting (future) | ✅ | ❌ | ❌ |
| Business logic | ❌ | ✅ | ❌ |
| Authentication / Authorization | ❌ | ✅ | ❌ |
| Database access | ❌ | ✅ | ❌ |
| Payments, ledger, settlement | ❌ | ✅ | ❌ |
| Uploads (with auth) | ❌ (proxies) | ✅ | ❌ |
| WebSocket upgrade (future) | ✅ | ✅ | ❌ |
| User interface | ❌ | ❌ | ✅ |
| API consumption | ❌ | ❌ | ✅ |

---

## 8. Environment Strategy

Hakika supports three distinct environments:

### 8.1 Development

- Frontend dev servers run on ports 3001–3004 (no Nginx).
- API runs on `localhost:8000`.
- `VITE_API_BASE = 'http://localhost:8000/api/v1'`
- `VITE_ROUTER_BASENAME = ''` (empty)
- Hot reload enabled.
- Database: local PostgreSQL.

### 8.2 Demo (ngrok)

- Frontends are built statically and served by Nginx.
- Nginx routes `/customer`, `/business`, `/rider`, `/api/v1`, `/uploads`.
- Single ngrok tunnel exposes Nginx.
- `VITE_API_BASE = '/api/v1'`
- `VITE_ROUTER_BASENAME = '/customer'` etc.
- All traffic goes through a public ngrok URL.

### 8.3 Production

- Same as Demo but with custom domain and SSL.
- `VITE_API_BASE = '/api/v1'` (or `https://api.hakika.app/api/v1` if separated later).
- Domain: e.g., `hakika.app`.
- TLS termination at Nginx or Cloudflare.

**Key principle:** The frontend code is identical across Demo and Production; only environment variables change.

---

## 9. Deployment Architecture

```
Development:
    Browser → Vite Dev Server (port 3002) → FastAPI (localhost:8000)

Demo / Production:
    Browser → Nginx (port 80) → static files or FastAPI proxy
```

Nginx configuration is environment-agnostic; only the backend URL changes.

---

## 10. Engineering Standards

- **Code Style:** Python (Black, isort), TypeScript (ESLint, Prettier).
- **Testing:** Backend tests use pytest; frontend testing planned.
- **Documentation:** Every endpoint and service is documented in `docs/`.
- **Version Control:** Git; commits are atomic and reference issue numbers.
- **CI/CD:** Future (GitHub Actions or GitLab CI) for automated testing and deployment.
- **Monitoring:** Future (Sentry for errors, Prometheus for metrics).

---

## 11. Architecture Governance

- **Architecture Owner:** krypt (lead engineer/architect).
- **Approvals:** All changes to architecture, environment strategy, or deployment model require explicit approval from the Architecture Owner.
- **Implementation Chats:** May only implement approved designs; they must not change architecture.
- **Documentation:** `HAKIKA_ARCHITECTURE.md` is the source of truth; it must be updated whenever the architecture changes.
- **ADR:** Major decisions are recorded in `docs/architecture/ADR/`.

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| **B2B** | Business-to-Business (M‑Pesa payout) |
| **Escrow** | Payment held by Hakika until delivery confirmation |
| **IntaSend** | Payment gateway for M‑Pesa integration |
| **Ledger** | Immutable double‑entry accounting record |
| **Settlement** | The process of transferring net amount to business |
| **STK Push** | M‑Pesa payment request sent to customer’s phone |
| **Trust Score** | A metric reflecting reliability of businesses, riders, and customers |

---

*This document is the authoritative source for Hakika’s architecture. It will evolve as the platform grows.*
EOF

# Verify the file exists and shows the first few lines
head -n 10 HAKIKA_ARCHITECTURE.md

# Stage and commit the file
git add HAKIKA_ARCHITECTURE.md
git commit -m "docs: add HAKIKA_ARCHITECTURE.md as living platform architecture"
```

---

## Explanation

- The `cat > ... <<'EOF'` block writes the entire document.
- The closing `EOF` is on its own line (no spaces), which terminates the heredoc.
- After the file is created, `head -n 10` verifies it.
- Finally, it's added and committed.

**Copy the entire block and paste it into your terminal.** It should run without the `heredoc>` prompt. After it finishes, I will stop and wait for your approval before Phase 2.