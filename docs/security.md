# Hakika Security Model

## Authentication Security
- Passwords hashed with bcrypt.
- JWT access tokens expire after 15 minutes.
- Refresh tokens rotated on each use, stored as SHA-256 hashes.
- Customer sessions are random tokens in Redis with 24-hour TTL.

## Payment Security
- STK Push requests are idempotent.
- Webhook callbacks must be signed (HMAC-SHA256) in production.
- Payment amounts validated on callback.
- Duplicate callbacks ignored.
- Payment secrets never logged.

## Access Control

### Rider
- Cannot see customer phone before ARRIVED.
- Cannot initiate or confirm payment.
- Only accesses assigned deliveries.

### Business Owner
- Cannot see customer phone (except high-commitment orders, logged).
- Cannot access other businesses' data.
- Cannot process settlements.

### Customer
- Views only own orders via phone.
- Cannot access dashboards.
- Cannot modify orders after creation.

### Admin
- All actions logged in audit_logs.

## Data Protection
- Customer phones stored normalized.
- Payment method account numbers stored encrypted (future).
- Soft deletes preserve history.
- audit_logs record all sensitive changes.
