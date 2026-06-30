from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.models.payment import PaymentStatus
from app.models.payment_attempt import PaymentAttemptStatus
from app.models.order import OrderStatus
from app.models.ledger_entry import LedgerTransactionType
from app.integrations.intasend.payments import IntaSendPayments
from app.integrations.intasend.mock_client import mock_instance
from app.core.config import settings
from fastapi import HTTPException, status
import uuid
import logging

logger = logging.getLogger("hakika.payment")

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
        # FORCE MOCK for verification
        self.intasend = mock_instance

    async def initiate_payment(self, order_id: uuid.UUID) -> dict:
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.payment_pending:
            raise HTTPException(status_code=400, detail="Order is not ready for payment")

        existing = await self.payment_repo.get_by_order(order_id)
        if existing:
            if existing.status == PaymentStatus.verified:
                raise HTTPException(status_code=400, detail="Payment already completed")
            payment = existing
        else:
            payment = await self.payment_repo.create_payment(
                order_id=order_id,
                amount=float(order.total_amount),
                provider="INTASEND"
            )

        customer = await self.customer_repo.get_by_id(order.customer_id)
        if not customer:
            raise HTTPException(status_code=400, detail="Customer not found")

        attempts = await self.payment_repo.get_attempts(payment.id)
        attempt_number = len(attempts) + 1

        await self.payment_repo.create_attempt(
            payment_id=payment.id,
            attempt_number=attempt_number,
            status=PaymentAttemptStatus.initiated
        )

        try:
            response = await self.intasend.send_stk_push(
                phone=customer.phone_normalized,
                amount=float(order.total_amount),
                reference=payment.idempotency_key
            )
            checkout_id = response.get('id')
            if not checkout_id:
                raise ValueError("No checkout ID in response")
            await self.payment_repo.update_status(
                payment, PaymentStatus.pending, provider_reference=checkout_id
            )
            logger.info(f"Mock checkout created for payment {payment.id}, checkout_id: {checkout_id}")
            return {
                "status": "initiated",
                "payment_id": str(payment.id),
                "checkout_id": checkout_id,
            }

        except Exception as e:
            logger.error(f"Mock checkout failed for payment {payment.id}: {e}")
            await self.payment_repo.create_attempt(
                payment_id=payment.id,
                attempt_number=attempt_number,
                status=PaymentAttemptStatus.failed,
                provider_response={"error": str(e)}
            )
            raise HTTPException(status_code=500, detail=f"Payment initiation failed: {str(e)}")

    # ... rest unchanged
    async def process_callback(self, payload: dict) -> dict:
        checkout_id = payload.get('checkout_id') or payload.get('id')
        if not checkout_id:
            raise HTTPException(status_code=400, detail="Missing checkout_id")

        from sqlalchemy import select
        from app.models.payment import Payment
        result = await self.payment_repo.db.execute(
            select(Payment).where(Payment.provider_reference == checkout_id)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status == PaymentStatus.verified:
            return {"status": "already_verified"}

        amount = payload.get('amount')
        if amount and abs(float(amount) - float(payment.amount)) > 1.0:
            raise HTTPException(status_code=400, detail="Amount mismatch")

        is_paid = payload.get('paid', False) or payload.get('status_code') == '0'

        if is_paid:
            await self.payment_repo.update_status(payment, PaymentStatus.verified)

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

            await self.order_repo.update_status(order, OrderStatus.paid)

            from app.repositories.settlement_repository import SettlementRepository
            settlement_repo = SettlementRepository(self.payment_repo.db)
            net_amount = float(payment.amount) - fee
            await settlement_repo.create(
                business_id=order.business_id,
                amount=net_amount,
                order_id=order.id,
                payment_id=payment.id
            )
            logger.info(f"Payment {payment.id} verified, settlement created")
            return {"status": "verified"}
        else:
            await self.payment_repo.update_status(payment, PaymentStatus.failed)
            return {"status": "failed"}

    async def get_payment_status(self, order_id: uuid.UUID) -> dict:
        payment = await self.payment_repo.get_by_order(order_id)
        if not payment:
            return {"status": "not_initiated"}
        return {"status": payment.status.value, "amount": float(payment.amount)}

    async def reconcile_pending(self):
        pending = await self.payment_repo.get_pending_payments()
        results = []
        for payment in pending:
            if payment.provider_reference:
                try:
                    status_data = await self.intasend.check_transaction_status(payment.provider_reference)
                    is_paid = status_data.get('paid', False)
                    callback_payload = {
                        "id": payment.provider_reference,
                        "paid": is_paid,
                        "amount": status_data.get('amount'),
                    }
                    res = await self.process_callback(callback_payload)
                    results.append({"payment_id": str(payment.id), "result": res})
                except Exception as e:
                    results.append({"payment_id": str(payment.id), "error": str(e)})
        return results
