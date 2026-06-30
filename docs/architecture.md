# Hakika System Architecture

## Overview
Hakika is a digital commerce and trust platform that connects Kenyan businesses with customers through a verified ordering, delivery, and payment system. The platform acts as a trusted intermediary – it holds payment after delivery confirmation and releases money to the business only after the customer confirms receipt of goods.

## User Roles

### Customer
- No account required. Identified by phone number.
- Browsing businesses, product discovery, ordering.
- Confirms delivery and authorises payment.
- Receives a cryptographically verifiable payment receipt.

### Business Owner
- Email + password account. Can own multiple businesses.
- Dashboard: manage products, orders, riders, view transactions.
- For high-commitment orders, can reveal customer phone after acceptance (logged for audit).
- No access to customer payment details.

### Rider
- Belongs to exactly one business. Pre-registered by business.
- Receives assigned deliveries, captures GPS/photo evidence.
- Sees customer phone only after marking arrival.
- Verifies customer payment confirmation – does NOT initiate payment.

### Admin
- Platform oversight: categories, disputes, settlements, trust scores, account suspension.
- All actions logged in audit_logs.

## Order State Machine

CREATED -> WAITING_BUSINESS_ACCEPTANCE -> ACCEPTED -> PREPARING -> READY_FOR_DELIVERY -> OUT_FOR_DELIVERY -> ARRIVED -> CUSTOMER_CONFIRMED_DELIVERY -> PAYMENT_PENDING -> PAID -> COMPLETED

## Trust System
- Trust events are immutable rows.
- Scores recalculated nightly.
- Business trust starts at 80%, customer at 100%.
- Ranking combines trust, distance, and activity.

## Payment Architecture
Hakika acts as an intermediary: Customer -> IntaSend -> Hakika ledger -> business settlement.
Payment is unlocked only after the customer confirms delivery.
