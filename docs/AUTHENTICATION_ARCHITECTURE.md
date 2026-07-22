# Hakika Authentication & Security Architecture

**Project:** Hakika Marketplace Platform

**Version:** 1.0

**Status:** Architecture Documentation

---

# Executive Summary

Authentication is the first line of defense for the Hakika platform. Every protected operation—including business management, rider operations, administrative functions, and payment-related actions—passes through the authentication layer before any business logic is executed.

Hakika uses a layered authentication architecture built around modern security principles. User passwords are protected using bcrypt hashing, authenticated sessions are represented using signed JSON Web Tokens (JWTs), refresh tokens are securely rotated and stored as SHA-256 hashes inside PostgreSQL, and authorization decisions are enforced through FastAPI dependency injection and role-based access control (RBAC).

The architecture separates authentication from authorization. Authentication verifies a user's identity, while authorization determines which resources that authenticated identity may access.

This document explains the complete authentication lifecycle, beginning with user registration and ending with authorization inside protected API endpoints. It also examines the frontend authentication flow, backend security mechanisms, token management strategy, rider activation process, customer session model, and the overall trust architecture used throughout Hakika.

---

# Objectives

This document has four primary goals:

1. Explain how identities are created within Hakika.
2. Describe how authenticated sessions are established and maintained.
3. Demonstrate how protected resources are secured.
4. Document the security decisions that protect the platform.

---

# Scope

This document covers:

- User registration
- Rider activation
- Login process
- Password security
- JWT generation
- Refresh token lifecycle
- Customer temporary sessions
- Backend authorization
- Frontend authentication
- Protected routes
- Role-Based Access Control (RBAC)
- Security strengths
- Future improvements

Items outside the scope of this document include:

- Payment security
- M-Pesa integration
- Business trust scoring
- Settlement processing
- Order lifecycle

Those systems are documented separately.

---

# High-Level Authentication Architecture

```text
                         +---------------------------+
                         |      React Frontends      |
                         |---------------------------|
                         | Business Portal           |
                         | Rider Portal              |
                         | Customer Portal           |
                         | Admin Portal              |
                         +-------------+-------------+
                                       |
                                       |
                            HTTPS API Requests
                                       |
                                       v
                     +------------------------------+
                     | Authentication Endpoints     |
                     | FastAPI (/auth/*)            |
                     +--------------+---------------+
                                    |
                                    v
                          Authentication Service
                                    |
          +-------------------------+--------------------------+
          |                         |                          |
          v                         v                          v
   User Repository        Refresh Token Repository    Customer Repository
          |                         |                          |
          +------------+------------+--------------------------+
                       |
                       v
                 PostgreSQL Database
                       |
                       v
                Refresh Token Storage
                       |
                       v
                  JWT Token Generator
                       |
             +---------+---------+
             |                   |
             v                   v
      Access Token         Refresh Token
             |
             v
     Protected API Routes
             |
             v
      Role-Based Access Control

---

# 2. Authentication Architecture

The authentication system follows a layered architecture.
             React Frontend
                   │
                   ▼
           FastAPI Auth Routes
                   │
                   ▼
             Authentication Service
             (Business Logic Layer)
              │                │
              ▼                ▼
     User Repository   Refresh Repository
              │                │
              └────────┬───────┘
                       ▼
                 PostgreSQL Database
                       │
                       ▼
               Security Module (JWT)
                       │
              Access & Refresh Tokens
Every authentication request passes through the service layer before interacting with the database.

The router receives HTTP requests, the service performs all authentication logic, repositories communicate with PostgreSQL, and the security module is responsible for password hashing and JWT generation.

This separation keeps the authentication system modular, testable, and easy to audit.

---

# 3. Authentication Components

The authentication system is divided into several independent components.

| Component | Responsibility |
|-----------|----------------|
| Auth Router | Exposes authentication endpoints |
| AuthService | Authentication business logic |
| User Repository | Creates and retrieves users |
| RefreshTokenRepository | Stores and revokes refresh tokens |
| Security Module | Password hashing, JWT creation and validation |
| API Dependencies | Validates access tokens and permissions |
| Frontend Auth Package | Stores tokens and authenticates API requests |

Each component has a single responsibility, reducing coupling and making the authentication system easier to maintain.


---

# 4. Authentication Lifecycle

Authentication in Hakika follows a well-defined lifecycle. Every identity progresses through a sequence of stages from account creation to accessing protected resources.
                +-------------------+
                |   User Registers  |
                +---------+---------+
                          |
                          v
                 Password is Hashed
                          |
                          v
                  User Stored in DB
                          |
                          v
                     User Logs In
                          |
                          v
               Credentials Verified
                          |
                          v
             Access Token Generated
                          |
                          |
             Refresh Token Generated
                          |
                          v
         Refresh Token Hash Stored in DB
                          |
                          v
            Tokens Returned to Frontend
                          |
                          v
      Frontend Stores Authentication State
                          |
                          v
    Authenticated API Requests Begin
                          |
                          v
     Backend Validates Access Token
                          |
                          v
          User Retrieved from Database
                          |
                          v
       Role-Based Authorization Applied
                          |
                          v
          Protected Resource Accessed
The lifecycle is intentionally divided into independent phases.

Each phase has a single responsibility:

- Identity creation
- Credential verification
- Session creation
- Session maintenance
- Authorization
- Session renewal

This separation improves maintainability while reducing the attack surface.

---

# 5. Registration Flow

Registration is responsible for creating a permanent identity within the Hakika platform.

The registration endpoint accepts:

- Email address
- Password
- Phone number (optional depending on role)
- User role

Only supported public roles may register directly.

The endpoint rejects unsupported roles before any database operation is performed.

Registration request flow:
Client
│
▼
POST /auth/register
│
▼
Auth Router
│
▼
AuthService.register()
│
▼
Check Existing Email
│
├── Exists
│ │
│ ▼
│ Reject Request
│
▼
Hash Password (bcrypt)
│
▼
Create User
│
▼
Store User
│
▼
Return User Information
The service never stores plaintext passwords.

Instead, every password is processed through bcrypt before being written to the database.

This ensures that compromise of the database does not expose user passwords.

