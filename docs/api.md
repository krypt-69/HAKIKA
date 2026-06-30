# Hakika API Documentation

## Authentication

### Business Owners, Riders, Admins
- JWT access tokens (15 min) + refresh tokens (30 days).
- Refresh token rotation with hashed storage.
- Endpoints: POST /api/v1/auth/register, POST /api/v1/auth/login, POST /api/v1/auth/refresh.

### Customers
- Phone-based session tokens stored in Redis (24 hours).
- Endpoint: POST /api/v1/auth/customer/session.

## API Structure

All endpoints prefixed with /api/v1/.

| Group | Purpose |
|-------|---------|
| /auth | Registration, login, token refresh, customer sessions |
| /businesses | Business CRUD (owners), public discovery, public profile |
| /products | Product CRUD (owners), public listing |
| /orders | Order creation, acceptance/cancellation, state machine |
| /delivery | Rider assignment, arrival, attempts, evidence |
| /confirmation | Customer confirms delivery or reports problem |
| /payments | Payment initiation, callback, status, mock callback |
| /settlements | Business views own settlements |
| /admin | Admin: settlements, disputes, business suspension |

## Error Format
{"success": false, "error": {"code": "ERROR_CODE", "message": "Description"}}

## Permission Matrix
- Products: Customer Read, Business CRUD, Rider None, Admin CRUD
- Orders: Customer Create/Read Own, Business Read Own/Update Status, Rider Read Assigned/Update Status, Admin CRUD
- Customers: Business Read (no phone except Contact Customer), Rider Read phone after ARRIVED, Admin Full
- Payments: Customer Initiate via confirm, Business Read own, Rider Read status, Admin Full
- Trust scores: Customer Read business, Business Read own, Admin CRUD
- Settlements: Business Read own, Admin Manage
