from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.settlement_repository import SettlementRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.repositories.business_repository import BusinessRepository
from app.models.payment import PaymentStatus
from app.models.payment_attempt import PaymentAttemptStatus
from app.models.order import OrderStatus
from app.models.ledger_entry import LedgerTransactionType
from app.models.settlement import SettlementStatus
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

        if settings.intasend_mode == "mock":
            from app.integrations.intasend.mock_client import mock_instance
            self.intasend = mock_instance
        else:
            from app.integrations.intasend.payments import IntaSendPayments
            self.intasend = IntaSendPayments()

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
            return {
                "status": "initiated",
                "payment_id": str(payment.id),
                "checkout_id": checkout_id,
            }
        except Exception as e:
            logger.error(f"Payment initiation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Payment initiation failed: {str(e)}")

    async def process_callback(self, payload: dict) -> dict:
        state = payload.get('state')
        api_ref = payload.get('api_ref')
        if not api_ref:
            raise HTTPException(status_code=400, detail="Missing api_ref in callback")

        from sqlalchemy import select
        from app.models.payment import Payment
        result = await self.payment_repo.db.execute(
            select(Payment).where(Payment.idempotency_key == api_ref)
        )
        payment = result.scalar_one_or_none()
        if not payment:
            raise HTTPException(status_code=404, detail="Payment not found")

        if payment.status == PaymentStatus.verified:
            return {"status": "already_verified"}

        if state == 'COMPLETE':
            # Update payment status
            await self.payment_repo.update_status(payment, PaymentStatus.verified)

            order = await self.order_repo.get_by_id(payment.order_id)
            fee = round(float(payment.amount) * settings.hakika_fee_percentage / 100, 2)

            # Create ledger entries
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

            # Update order status
            await self.order_repo.update_status(order, OrderStatus.paid)

            # Settlement: idempotency check
            settlement_repo = SettlementRepository(self.payment_repo.db)
            existing_settlement = await settlement_repo.get_by_payment_id(payment.id)
            if existing_settlement:
                settlement = existing_settlement
                logger.info(f"Settlement already exists for payment {payment.id}, skipping creation.")
            else:
                net_amount = float(payment.amount) - fee
                settlement = await settlement_repo.create(
                    business_id=order.business_id,
                    amount=net_amount,
                    order_id=order.id,
                    payment_id=payment.id
                )
                logger.info(f"Settlement created for payment {payment.id}, status: {settlement.status}")

            # Fetch business payment method
            payment_method_repo = PaymentMethodRepository(self.payment_repo.db)
            methods = await payment_method_repo.get_by_business(order.business_id)
            active_method = None
            for m in methods:
                if m.is_active:
                    active_method = m
                    break
            if not active_method:
                await settlement_repo.update_status(settlement, SettlementStatus.failed)
                logger.error(f"No active payment method for business {order.business_id}")
                return {"status": "verified", "settlement": "failed_no_payment_method"}

            # Prepare B2B payload
            account_type = "PayBill" if active_method.type.value == "paybill" else "TillNumber"
            account_number = active_method.encrypted_account_number
            account_reference = order.order_number[:20]
            business_name = order.business_name

            if not business_name:
                business_repo = BusinessRepository(self.payment_repo.db)
                business = await business_repo.get_by_id(order.business_id)
                business_name = business.name if business else "Business"

            # Transition settlement to processing
            await settlement_repo.update_status(settlement, SettlementStatus.processing)

            # Call B2B API
            try:
                b2b_response = await self.intasend.send_b2b_payout(
                    amount=settlement.amount,
                    account_number=account_number,
                    account_type=account_type,
                    account_reference=account_reference,
                    business_name=business_name
                )
                provider_ref = b2b_response.get('file_id') or b2b_response.get('transaction_id')
                await settlement_repo.update_status(settlement, SettlementStatus.completed,
                                                    provider_reference=provider_ref)
                logger.info(f"B2B payout successful for settlement {settlement.id}, provider_ref: {provider_ref}")
                return {"status": "verified", "settlement": "completed"}
            except Exception as e:
                logger.error(f"B2B payout failed for settlement {settlement.id}: {e}")
                await settlement_repo.update_status(settlement, SettlementStatus.failed)
                return {"status": "verified", "settlement": "failed_b2b_error", "error": str(e)}
        else:
            return {"status": "pending", "state": state}

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
                    invoice = status_data.get('invoice', status_data)
                    state = invoice.get('state') or status_data.get('state')
                    callback_payload = {
                        "api_ref": payment.idempotency_key,
                        "state": state,
                    }
                    res = await self.process_callback(callback_payload)
                    results.append({"payment_id": str(payment.id), "result": res})
                except Exception as e:
                    results.append({"payment_id": str(payment.id), "error": str(e)})
        return results
