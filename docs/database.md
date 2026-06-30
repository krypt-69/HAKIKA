# Hakika Database Design

## Technology
- PostgreSQL 15 with PostGIS extension for geographic queries.
- Redis for caching and customer session tokens.

## Core Entities

### users
Business owners, riders, and admins. Stores hashed password, email, role.

### customers
Phone-based identity. phone_original and phone_normalized (unique). Created automatically on first order.

### businesses
Owned by a user. Has category, logo, description, trust score. Supports soft-delete.

### locations
Geography point (PostGIS) for each business. Supports multiple locations per business.

### products
Belongs to a business. Original and discount price. Soft-deletable.

### orders
Central transaction record. Status uses PostgreSQL enum. Snapshot of coordinates, subtotal, delivery fee, total. requires_deposit reserved for V2.

### order_items
Snapshot of each product at order time: product_name, unit_price, quantity.

### riders
Belongs to a business. Linked to a user record after registration.

### delivery_assignments
Tracks rider assignment with reassignment history.

### delivery_attempts
Each attempt (successful or failed) with GPS, photo URL, timestamp.

### payments
Links to order. Provider, idempotency_key (unique), amount, status. provider_specific_data (JSONB) holds provider-specific fields.

### ledger_entries
Immutable financial records. Types: payment_in, hakika_fee, business_settlement, refund, adjustment.

### settlements
Tracks money movement to businesses. Status: pending, processing, completed, failed.

### trust_events
Immutable events feeding nightly trust score calculation.

### audit_logs
Generic audit trail for all sensitive operations.

### customer_contact_logs
Records when a business reveals a customer's phone number.

## Design Decisions

### Product snapshot
Order items duplicate product name and price so future changes don't affect historical orders.

### Immutable ledger
Ledger rows are never updated or deleted. Always auditable.

### Soft deletes
Businesses, products, and riders use deleted_at instead of physical deletion.
