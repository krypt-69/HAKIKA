# Hakika V1 Payment Model

## Lifecycle
1. Customer confirms delivery → order enters `PAYMENT_PENDING`.
2. Hakika sends STK Push via IntaSend.
3. Customer pays via M‑Pesa.
4. IntaSend webhook verifies payment.
5. Hakika ledger records:
   - `PAYMENT_IN`  (+ full order total)
   - `HAKIKA_FEE`  (– platform commission)
   - `BUSINESS_SETTLEMENT`  (– amount payable to business)
6. Settlement created (status `PENDING`).
7. Admin processes settlement → real B2B payout to business PayBill/Till.
8. Settlement status → `COMPLETED`.

## Fee Calculation
- Hakika commission: **2%** of the customer payment (configurable via `HAKIKA_FEE_PERCENTAGE`).
- Business receives: **98%** of the customer payment.
- IntaSend’s processing fees are absorbed by the Hakika wallet (not reflected in the ledger).

## Ledger Rules
- Entries are immutable (no updates or deletions).
- For any payment: `PAYMENT_IN + HAKIKA_FEE + BUSINESS_SETTLEMENT = 0`.

## IntaSend Wallet
- A single Hakika merchant wallet (`Y74E6JY` in sandbox) receives all customer payments.
- All B2B payouts originate from this wallet.

## B2B Payout
- Payout destination is read from the business’s `payment_methods` record.
- The payout is triggered by the admin and calls `POST /send-money/initiate/`.
- The response stores `file_id`, `tracking_id`, and `transaction_id` on the settlement record.

## Future Improvements
- Track IntaSend processing fees as a separate expense in the ledger.
- Support different fee percentages per category or business tier.
