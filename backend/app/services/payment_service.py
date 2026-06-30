from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.models.payment import PaymentStatus
from app.models.payment_attempt import PaymentAttemptStatus
from app.models.order import OrderStatus
from app.models.ledger_entry import LedgerTransactionType
from app.integrations.intasend import IntaSendClient
from app.core.config import settings
from fastapi import HTTPException, status
import uuid

class PaymentService:
    def __init__(
        self,
        payment_repo: PaymentRepository,
        order_repo: OrderRepository,
        customer_repo: CustomerRepository,
        ledger_repo: LedgerRepository
    ):
        self.payment_repo = payment_repo
        self.order_repo = order_repo
        self.customer_repo = customer_repo
        self.ledger_repo = ledger_repo
        self.intasend = IntaSendClient()

    async def initiate_payment(self, order_id: uuid.UUID) -> dict:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.payment_pending:
            raise HTTPException(status_code=400, detail="Order is not ready for payment")

        # Check if payment already exists
        existing = await self.payment_repo.get_by_order(order_id)
        if existing:
            if existing.status == PaymentStatus.verified:
                raise HTTPException(status_code=400, detail="Payment already completed")
            # Use existing payment, don't create duplicate
            payment = existing
        else:
            # Create payment record
            payment = await self.payment_repo.create_payment(
                order_id=order_id,
                amount=float(order.total_amount),
                provider="INTASEND"
            )

        # Get customer phone
        customer = await self.customer_repo.get_by_id(order.customer_id)
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")

        # Get current attempt count
        attempts = await self.payment_repo.get_attempts(payment.id)
        attempt_number = len(attempts) + 1

        # Create attempt record
        attempt = await self.payment_repo.create_attempt(
            payment_id=payment.id,
            attempt_number=attempt_number,
            status=PaymentAttemptStatus.initiated
        )

        try:
            # Send STK Push via IntaSend
            response = await self.intasend.send_stk_push(
                phone=customer.phone_normalized,
                amount=float(order.total_amount),
                reference=payment.idempotency_key
            )
            # Update attempt as sent
            await self.payment_repo.db.merge(attempt)
            attempt.status = PaymentAttemptStatus.sent
            attempt.provider_response = response
            await self.payment_repo.db.commit()

            # Update payment with provider reference
            checkout_id = response.get('id') or response.get('checkout_request_id')
            await self.payment_repo.update_status(
                payment, PaymentStatus.pending, provider_reference=checkout_id
            )
            return {"status": "initiated", "payment_id": str(payment.id)}

        except Exception as e:
            # Mark attempt as failed
            attempt.status = PaymentAttemptStatus.failed
            attempt.provider_response = {"error": str(e)}
            await self.payment_repo.db.commit()
            raise HTTPException(status_code=500, detail=f"STK Push failed: {str(e)}")

    async def process_callback(self, payload: dict) -> dict:
        # Extract identifiers from callback
        checkout_request_id = payload.get('checkout_request_id') or payload.get('id')
        mpesa_receipt = payload.get('mpesa_receipt_number') or payload.get('receipt_number')
        result_code = payload.get('result_code') or payload.get('status_code')
        amount = payload.get('amount')

        # Find payment by provider reference (checkout_request_id)
        # We need to query payments by provider_reference; add a method to repository
        # For now, we'll search via provider_specific_data or provider_reference
        # Simpler: we stored checkout_request_id as provider_reference
        from sqlalchemy import select
        from app.models.payment import Payment
        result = await self.payment_repo.db.execute(
            select(Payment).where(Payment.provider_reference == checkout_request_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        # Prevent duplicate processing
        if payment.status == PaymentStatus.verified:
            return {"status": "already_verified"}

        # Verify amount matches
        if amount and abs(float(amount) - float(payment.amount)) > 1.0:
            raise HTTPException(status_code=400, detail="Amount mismatch")

        # Update payment status
        if str(result_code) == "0":  # Success
            await self.payment_repo.update_status(payment, PaymentStatus.verified)

            # Create ledger entries
            order = await self.order_repo.get_by_id(payment.order_id)
            fee = round(float(payment.amount) * settings.hakika_fee_percentage / 100, 2)

            await self.ledger_repo.create_entry(
                LedgerTransactionType.payment_in, float(payment.amount),
                order_id=payment.order_id, payment_id=payment.id,
                business_id=order.business_id
            )
            await self.ledger_repo.create_entry(
                LedgerTransactionType.hakika_fee, -fee,
                order_id=payment.order_id, payment_id=payment.id,
                business_id=order.business_id
            )

            # Update order status to paid
            await self.order_repo.update_status(order, OrderStatus.paid)

            return {"status": "verified"}
        else:
            # Payment failed
            await self.payment_repo.update_status(payment, PaymentStatus.failed)
            return {"status": "failed", "detail": payload.get('result_desc')}

    async def get_payment_status(self, order_id: uuid.UUID) -> dict:
        payment = await self.payment_repo.get_by_order(order_id)
        if not payment:
            return {"status": "not_initiated"}
        return {"status": payment.status.value, "amount": float(payment.amount)}

    async def reconcile_pending(self):
        """Cron job: check pending payments with IntaSend"""
        pending = await self.payment_repo.get_pending_payments()
        results = []
        for payment in pending:
            if payment.provider_reference:
                try:
                    status_data = await self.intasend.check_transaction_status(payment.provider_reference)
                    # Simulate callback-like processing
                    callback_payload = {
                        "checkout_request_id": payment.provider_reference,
                        "result_code": status_data.get('result_code', '1'),
                        "amount": status_data.get('amount'),
                        "mpesa_receipt_number": status_data.get('mpesa_receipt_number')
                    }
                    res = await self.process_callback(callback_payload)
                    results.append({"payment_id": str(payment.id), "result": res})
                except Exception as e:
                    results.append({"payment_id": str(payment.id), "error": str(e)})
        return results
