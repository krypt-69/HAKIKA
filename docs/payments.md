# Hakika Payment System

## Money Flow
1. Customer confirms delivery.
2. Order status -> PAYMENT_PENDING.
3. Hakika sends STK Push via IntaSend.
4. Customer enters M-Pesa PIN.
5. IntaSend sends webhook callback.
6. Payment verified, ledger entries created.
7. Settlement created (pending).
8. Admin processes settlement -> business receives money.

## Ledger Example
For 1,000 KES with 2% fee:
- payment_in: +1,000
- hakika_fee: -20
- business_settlement: -980
Sum = 0.

## IntaSend Integration
- Sandbox: https://sandbox.intasend.com
- Production: https://payment.intasend.com
- Auth: Authorization: Bearer {Secret Key}
- STK Push: POST /api/v1/payment/mpesa-stk-push/
- Callback: POST /api/v1/payments/callback

## Idempotency
Every payment has a unique idempotency_key. Duplicate callbacks are rejected.

## Webhook Security
Production callbacks must include X-IntaSend-Signature header. HMAC-SHA256 verified.

## Reconciliation
Cron job every 5 minutes queries IntaSend for pending payments and processes completed ones.
