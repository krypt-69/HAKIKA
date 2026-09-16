import asyncio
from datetime import datetime
import logging
import uuid
from fastapi import HTTPException
from app.repositories.payment_repository import PaymentRepository
from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.ledger_repository import LedgerRepository
from app.repositories.settlement_repository import SettlementRepository
from app.repositories.credit_transaction_repository import CreditTransactionRepository
from app.repositories.merchant_credit_order_repository import MerchantCreditOrderRepository
from app.repositories.business_repository import BusinessRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.payment.credit_purchase_handler import CreditPurchaseHandler
from app.payment.providers.factory import PaymentProviderFactory
from app.payment.providers.base import PaymentProviderContext, PaymentProvider
from app.payment.providers.payhero_callback import normalise_payhero_callback
from app.core.config import settings
from app.payment.providers.mock import MockProvider
from app.services.fee_calculator import calculate_processing_fee, calculate_payg_fee
from app.services.order_events import publish_order_update
from app.services.payment_policy_service import PaymentPolicyService
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.models.payment import Payment, PaymentStatus
from app.models.order_notification_event import OrderNotificationEvent
from app.models.payment_attempt import PaymentAttemptStatus
from app.models.order import Order, OrderStatus
from app.models.merchant_credit_order import MerchantCreditOrderStatus
from app.models.credit_transaction import CreditTransactionStatus, CreditTransactionType, CreditTransactionDirection
from app.models.credit_plan import CreditPlan
from app.models.business import PaymentModel
from app.models.ledger_entry import LedgerTransactionType
from app.models.settlement import SettlementStatus
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import HakikaHTTPException

logger = logging.getLogger("hakika.payment")

class PaymentService:
    def __init__(
        self,
        payment_repo: PaymentRepository,
        order_repo: OrderRepository,
        customer_repo: CustomerRepository,
        ledger_repo: LedgerRepository,
        policy_service: PaymentPolicyService,
        provider: PaymentProvider | None = None,
    ):
        self.payment_repo = payment_repo
        self.order_repo = order_repo
        self.customer_repo = customer_repo
        self.ledger_repo = ledger_repo
        self.policy_service = policy_service
        self._injected_provider = provider  # highest priority

    def _resolve_provider(self, *, payment_model: str | None = None, stored_provider: str | None = None) -> PaymentProvider:
        """Resolve the payment provider, respecting injection priority."""
        if self._injected_provider is not None:
            return self._injected_provider
        if stored_provider is not None:
            return PaymentProviderFactory.by_name(stored_provider)
        if payment_model is not None:
            return PaymentProviderFactory.for_model(payment_model)
        raise ValueError("Cannot resolve payment provider")

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
            # Determine provider from business payment model
            business = await BusinessRepository(self.payment_repo.db).get_by_id(order.business_id)
            if not business.is_active:
                raise HTTPException(status_code=409, detail="Business is currently unavailable.")
            provider = PaymentProviderFactory.for_model(business.payment_model)
            provider_name = 'payhero' if business.payment_model == PaymentModel.credit else 'intasend'
            payment = await self.payment_repo.create_payment(
                order_id=order_id,
                amount=float(order.total_amount),
                provider=provider_name
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

        business = await BusinessRepository(self.payment_repo.db).get_by_id(order.business_id)
        if not business.is_active:
            raise HTTPException(status_code=409, detail="Business is currently unavailable.")
        context = PaymentProviderContext(channel_id=business.channel_id if business else None)

        # Defensive volume check for Credit Plan merchants
        if business and business.payment_model == PaymentModel.credit:
            if business.remaining_credit_volume < float(order.total_amount):
                await self.payment_repo.update_status(payment, PaymentStatus.failed)
                raise HakikaHTTPException(
                    status_code=409,
                    detail="Insufficient credit volume for payment initiation.",
                    code="INSUFFICIENT_CREDIT"
                )

        provider = PaymentProviderFactory.by_name(payment.provider)
        try:
            response = await provider.initiate_payment(
                phone=customer.phone_normalized,
                amount=float(order.total_amount),
                reference=payment.idempotency_key,
                context=context,
            )
            checkout_id = response.get('id')
            if not checkout_id:
                raise ValueError("No checkout ID in response")
            await self.payment_repo.update_status(
                payment, PaymentStatus.pending, provider_reference=checkout_id
            )
            if payment.provider == "payhero":
                psd = payment.provider_specific_data or {}
                if response.get("CheckoutRequestID"):
                    psd["checkout_request_id"] = response.get("CheckoutRequestID")
                if response.get("MerchantRequestID"):
                    psd["merchant_request_id"] = response.get("MerchantRequestID")
                payment.provider_specific_data = psd
                await self.payment_repo.db.commit()
            if isinstance(provider, MockProvider):
                asyncio.create_task(self._auto_complete_mock_payment(payment.id, checkout_id))
            return {
                "status": "initiated",
                "payment_id": str(payment.id),
                "checkout_id": checkout_id,
            }
        except Exception as e:
            logger.error(f"Payment initiation failed: {e}")
            raise HTTPException(status_code=500, detail=f"Payment initiation failed: {str(e)}")

    async def _auto_complete_mock_payment(self, payment_id: uuid.UUID, checkout_id: str):
        await asyncio.sleep(2)
        try:
            callback_payload = {
                "api_ref": str(payment_id),
                "state": "COMPLETE"
            }
            result = await self.process_callback(callback_payload)
            logger.info(f"Auto-completed mock payment {payment_id}: {result}")
        except Exception as e:
            logger.error(f"Failed to auto-complete mock payment {payment_id}: {e}")

    async def _process_credit_callback_transaction(
        self,
        payment: Payment,
        business,
        order: Order,
    ) -> Order:
        """Atomically complete a credit payment callback."""
        from decimal import Decimal, ROUND_HALF_UP
        from sqlalchemy.dialects.postgresql import insert
        from app.repositories.credit_transaction_repository import CreditTransactionRepository
        from app.repositories.order_notification_repository import OrderNotificationRepository

        # Lock payment row
        locked_payment = await self.payment_repo.get_and_lock(payment.id)
        if locked_payment and locked_payment.status == PaymentStatus.verified:
            return order  # already verified

        if locked_payment is None:
            raise ValueError("Payment not found")

        from datetime import datetime
        from app.repositories.credit_allocation_repository import CreditAllocationRepository
        alloc_repo = CreditAllocationRepository(self.payment_repo.db)
        valid_credit, valid_volume = await alloc_repo.get_valid_totals_for_business(
            business.id, datetime.utcnow()
        )
        # Update cached aggregates from non-expired allocations
        business.credit_balance = Decimal(str(valid_credit))
        business.remaining_credit_volume = Decimal(str(valid_volume))

        current_credit = Decimal(str(business.credit_balance))
        current_volume = Decimal(str(business.remaining_credit_volume))
        order_amount = Decimal(str(payment.amount))
        rate = current_credit / current_volume
        deduction = (order_amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Update business credit
        business.credit_balance = (current_credit - deduction).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        business.remaining_credit_volume = (current_volume - order_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Synchronize allocations to prevent spent credit resurrection
        await alloc_repo.deduct_from_valid_allocations(
            business.id,
            credit_deduction=float(deduction),
            volume_deduction=float(order_amount),
            now=datetime.utcnow(),
        )

        # Payment status non-commit
        await self.payment_repo.set_status_noncommit(locked_payment, PaymentStatus.verified)

        # Credit transaction non-commit
        ct_repo = CreditTransactionRepository(self.payment_repo.db)
        await ct_repo.add_noncommit({
            "business_id": business.id,
            "order_id": order.id,
            "type": CreditTransactionType.order_processing_fee,
            "status": CreditTransactionStatus.completed,
            "amount": deduction,
            "direction": CreditTransactionDirection.DEBIT,
            "reference": order.order_number,
            "description": f"Processing fee for order {order.order_number}",
        })

        # Transition order paid with version/event/unread
        order = await self.order_repo.get_by_id(order.id)
        next_version = order.status_version + 1
        order.status = OrderStatus.paid
        order.status_version = next_version

        notif_event = OrderNotificationEvent(order_id=order.id, status_version=next_version)
        stmt = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=next_version,
            created_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=['order_id', 'status_version']).returning(OrderNotificationEvent.id)
        result = await self.payment_repo.db.execute(stmt)
        inserted = result.scalar_one_or_none()

        if inserted:
            on_repo = OrderNotificationRepository(self.payment_repo.db)
            await on_repo.add_or_increment(order.customer_id, order.id)

        await self.payment_repo.db.commit()
        await self.payment_repo.db.refresh(order)
        return order

    async def _process_payg_callback_transaction(
        self,
        payment: Payment,
        business,
        order: Order,
        fee: float,
    ) -> Order:
        """Atomically complete PAYG payment callback DB portion."""
        from sqlalchemy.dialects.postgresql import insert
        from app.repositories.settlement_repository import SettlementRepository
        from app.repositories.order_notification_repository import OrderNotificationRepository

        locked_payment = await self.payment_repo.get_and_lock(payment.id)
        if locked_payment and locked_payment.status == PaymentStatus.verified:
            return order  # already verified
        if locked_payment is None:
            raise ValueError("Payment not found")

        await self.payment_repo.set_status_noncommit(locked_payment, PaymentStatus.verified)

        await self.ledger_repo.add_noncommit(
            LedgerTransactionType.payment_in, float(payment.amount),
            order_id=payment.order_id, payment_id=payment.id,
            business_id=order.business_id
        )
        await self.ledger_repo.add_noncommit(
            LedgerTransactionType.hakika_fee, -fee,
            order_id=payment.order_id, payment_id=payment.id,
            business_id=order.business_id
        )

        # Settlement creation is now part of the SAME transaction
        # as payment/ledger/order (P2 atomicity correction).
        net_amount = float(payment.amount) - fee
        payout_ref = f"STL-{uuid.uuid4().hex[:20]}"
        settlement_repo = SettlementRepository(self.payment_repo.db)
        settlement = await settlement_repo.add_noncommit(
            business_id=order.business_id,
            amount=net_amount,
            order_id=order.id,
            payment_id=payment.id,
            payout_reference=payout_ref,
        )

        # Transition order paid
        next_version = order.status_version + 1
        order.status = OrderStatus.paid
        order.status_version = next_version

        from app.models.order_notification_event import OrderNotificationEvent
        stmt = insert(OrderNotificationEvent).values(
            order_id=order.id,
            status_version=next_version,
            created_at=datetime.utcnow(),
        )
        stmt = stmt.on_conflict_do_nothing(index_elements=['order_id', 'status_version']).returning(OrderNotificationEvent.id)
        result = await self.payment_repo.db.execute(stmt)
        inserted = result.scalar_one_or_none()

        if inserted:
            on_repo = OrderNotificationRepository(self.payment_repo.db)
            await on_repo.add_or_increment(order.customer_id, order.id)

        # Flush so IDs are available; the caller owns the single commit.
        await self.payment_repo.db.flush()
        return order, settlement

    async def process_callback(self, payload: dict) -> dict:
        logger.info(f"Callback payload: {payload}")
        normalised = normalise_payhero_callback(payload)
        state = normalised.get("state")
        api_ref = normalised.get("api_ref")
        if state == "UNRECOGNISED":
            logger.error("Unrecognised callback shape")
            raise HTTPException(status_code=422, detail="Unrecognised callback shape")
        if not api_ref:
            logger.error("Missing api_ref in callback")
            raise HTTPException(status_code=400, detail="Missing api_ref in callback")

        from sqlalchemy import select
        from app.models.payment import Payment

        result = await self.payment_repo.db.execute(
            select(Payment).where(Payment.idempotency_key == api_ref)
        )
        payment = result.scalar_one_or_none()

        if not payment:
            try:
                payment_uuid = uuid.UUID(api_ref)
                result = await self.payment_repo.db.execute(
                    select(Payment).where(Payment.id == payment_uuid)
                )
                payment = result.scalar_one_or_none()
            except ValueError:
                pass

        if not payment:
            logger.error(f"Payment not found for api_ref: {api_ref}")
            raise HTTPException(status_code=404, detail="Payment not found")

        # --- P1 validation: compare callback fields to stored payment ---
        if state == "COMPLETE":
            expected_amount = float(payment.amount)
            received_amount = normalised.get("amount")
            if received_amount is not None and abs(float(received_amount) - expected_amount) > 0.01:
                logger.error(
                    f"Callback amount mismatch: expected {expected_amount}, got {received_amount}"
                )
                raise HTTPException(status_code=422, detail="Callback amount mismatch")

            stored_checkout = None
            if payment.provider_specific_data:
                stored_checkout = payment.provider_specific_data.get("checkout_request_id")
            incoming_checkout = normalised.get("provider_reference")
            if stored_checkout and incoming_checkout and stored_checkout != incoming_checkout:
                logger.error(
                    f"Callback CheckoutRequestID mismatch: stored {stored_checkout}, got {incoming_checkout}"
                )
                raise HTTPException(status_code=422, detail="Callback reference mismatch")

            order_pre = await self.order_repo.get_by_id(payment.order_id)
            business_pre = await BusinessRepository(self.payment_repo.db).get_by_id(order_pre.business_id)
            customer_pre = await self.customer_repo.get_by_id(order_pre.customer_id)

            incoming_channel = normalised.get("channel_id")
            if business_pre and business_pre.channel_id and incoming_channel is not None:
                if int(incoming_channel) != int(business_pre.channel_id):
                    logger.error(
                        f"Callback ChannelID mismatch: business {business_pre.channel_id}, got {incoming_channel}"
                    )
                    raise HTTPException(status_code=422, detail="Callback channel mismatch")

            incoming_phone = normalised.get("phone")
            if customer_pre and customer_pre.phone_normalized and incoming_phone:
                def _canon_phone(v):
                    s = str(v).strip().replace("+", "").replace(" ", "")
                    if s.startswith("0"):
                        s = "254" + s[1:]
                    if not s.startswith("254"):
                        s = "254" + s
                    return s
                if _canon_phone(incoming_phone) != _canon_phone(customer_pre.phone_normalized):
                    logger.error(
                        f"Callback Phone mismatch: customer {customer_pre.phone_normalized}, got {incoming_phone}"
                    )
                    raise HTTPException(status_code=422, detail="Callback phone mismatch")
        # --- end P1 validation ---

        if payment.status == PaymentStatus.verified:
            logger.info(f"Payment {payment.id} already verified.")
            return {"status": "already_verified"}

        if state != 'COMPLETE':
            return {"status": "pending", "state": state}

        # Resolve provider from stored payment record
        provider = PaymentProviderFactory.by_name(payment.provider)

        order = await self.order_repo.get_by_id(payment.order_id)
        business = await BusinessRepository(self.payment_repo.db).get_by_id(order.business_id)
        if not business.is_active:
            raise HTTPException(status_code=409, detail="Business is currently unavailable.")
        if not business:
            logger.error(f"Business not found for order {order.id}")
            raise HTTPException(status_code=404, detail="Business not found")

        if business.payment_model == PaymentModel.credit:
            prev = order.status
            order = await self._process_credit_callback_transaction(payment, business, order)
            await publish_order_update(order, prev)
            logger.info(f"Credit Plan: order {order.id} paid.")
            return {"status": "verified", "settlement": "none"}

        else:
            fee = await calculate_processing_fee(self.payment_repo.db, float(payment.amount))
            prev = order.status
            order, settlement = await self._process_payg_callback_transaction(payment, business, order, fee)

            # SINGLE COMMIT for payment + ledger + order + settlement
            await self.payment_repo.db.commit()
            await self.payment_repo.db.refresh(order)
            await self.payment_repo.db.refresh(settlement)
            logger.info(f"Settlement created for payment {payment.id} (atomic with payment/order)")

            await publish_order_update(order, prev)

            settlement_repo = SettlementRepository(self.payment_repo.db)

            try:
                payment_method_repo = PaymentMethodRepository(self.payment_repo.db)
                methods = await payment_method_repo.get_by_business(order.business_id)
                active_method = next((m for m in methods if m.is_active), None)
                if not active_method:
                    logger.error(f"No active payment method for business {order.business_id}")
                    await settlement_repo.update_status(settlement, SettlementStatus.failed)
                    return {"status": "verified", "settlement": "failed_no_payment_method"}

                account_type = "PayBill" if active_method.type.value == "paybill" else "TillNumber"
                account_number = active_method.encrypted_account_number
                account_reference = order.order_number[:20]

                business_repo = BusinessRepository(self.payment_repo.db)
                business = await business_repo.get_by_id(order.business_id)
                business_name = business.name if business else "Business"

                await settlement_repo.update_status(settlement, SettlementStatus.processing)

                payout_response = await provider.initiate_payout(
                    amount=settlement.amount,
                    account_number=account_number,
                    account_type=account_type,
                    account_reference=account_reference,
                    business_name=business_name,
                    payout_reference=settlement.payout_reference,
                )
                logger.info(f"B2B payout response: {payout_response}")
                tracking_id = payout_response.get('tracking_id') or payout_response.get('file_id') or payout_response.get('transaction_id')
                if tracking_id:
                    settlement.provider_payout_reference = tracking_id
                provider_ref = payout_response.get('file_id') or payout_response.get('transaction_id') or payout_response.get('reference')
                await settlement_repo.update_status(settlement, SettlementStatus.completed,
                                                    provider_reference=provider_ref)
                logger.info(f"Settlement {settlement.id} completed.")
                return {"status": "verified", "settlement": "completed"}
            except Exception as e:
                logger.error(f"B2B payout failed for settlement {settlement.id}: {e}")
                await settlement_repo.update_status(settlement, SettlementStatus.failed)
                return {"status": "verified", "settlement": "failed_b2b_error", "error": str(e)}

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
                    provider = PaymentProviderFactory.by_name(payment.provider)
                    if isinstance(provider, MockProvider):
                        callback_payload = {
                            "api_ref": payment.idempotency_key,
                            "state": "COMPLETE"
                        }
                        res = await self.process_callback(callback_payload)
                        results.append({"payment_id": str(payment.id), "result": res})
                    else:
                        status_data = await provider.get_payment_status(payment.provider_reference)
                        invoice = status_data.get('invoice', status_data)
                        if invoice.get('state') == 'COMPLETE':
                            callback_payload = {
                                "api_ref": payment.idempotency_key,
                                "state": "COMPLETE"
                            }
                            res = await self.process_callback(callback_payload)
                            results.append({"payment_id": str(payment.id), "result": res})
                except Exception as e:
                    logger.error(f"Reconciliation error for payment {payment.id}: {e}")
        return results

    async def initiate_credit_purchase(
        self,
        business_id: uuid.UUID,
        credit_plan_id: uuid.UUID,
        phone: str,
    ) -> dict:
        # Credit purchases always use PayHero; no order payment record involved.
        provider = PaymentProviderFactory.by_name("payhero")
        business = await BusinessRepository(self.payment_repo.db).get_by_id(business_id)
        if not business or not business.is_active:
            raise HTTPException(status_code=409, detail="Business is currently unavailable.")

        from sqlalchemy import select
        result = await self.payment_repo.db.execute(
            select(CreditPlan).where(CreditPlan.id == credit_plan_id, CreditPlan.active == True)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid or inactive credit plan")

        payment_ref = f"CREDIT-{uuid.uuid4().hex[:8].upper()}"
        handler = CreditPurchaseHandler(self.payment_repo.db)
        order, transaction = await handler.create_pending_order(
            business_id=business_id,
            credit_plan_id=credit_plan_id,
            amount_paid=float(plan.price),
            credit_received=float(plan.credit_amount),
            payment_reference=payment_ref,
        )
        # Validate Hakika collection channel is configured
        if settings.payhero_collection_channel_id is None:
            raise HakikaHTTPException(
                status_code=500,
                detail="Credit purchase channel is not configured.",
                code="CREDIT_CHANNEL_NOT_CONFIGURED",
            )
        collection_channel_id = settings.payhero_collection_channel_id
        context = PaymentProviderContext(channel_id=collection_channel_id)
        try:
            response = await provider.initiate_payment(
                phone=phone,
                amount=float(plan.price),
                reference=payment_ref,
                context=context,
            )
            return {"checkout_url": response.get('id', '')}  # simplified; real flow returns checkout ID
        except Exception as e:
            logger.error(f"Credit purchase initiation failed: {e}")
            raise HTTPException(status_code=500, detail="Credit purchase failed")

    async def process_credit_callback(self, payload: dict) -> dict:
        logger.info(f"Credit callback payload: {payload}")
        normalised = normalise_payhero_callback(payload)
        state = normalised.get("state")
        api_ref = normalised.get("api_ref")
        if state == "UNRECOGNISED":
            raise HTTPException(status_code=422, detail="Unrecognised callback shape")
        if not api_ref:
            logger.error("Missing api_ref in credit callback")
            raise HTTPException(status_code=400, detail="Missing api_ref in callback")
        if state != "COMPLETE":
            return {"status": "ignored", "state": state}
        # Delegate to CreditPurchaseHandler for completion
        from app.repositories.merchant_credit_order_repository import MerchantCreditOrderRepository
        mco_repo = MerchantCreditOrderRepository(self.payment_repo.db)
        order = await mco_repo.get_by_payment_reference(api_ref)
        if not order:
            raise HTTPException(status_code=404, detail="Credit order not found")
        handler = CreditPurchaseHandler(self.payment_repo.db)
        return await handler.complete_purchase(order.id, api_ref)
    async def get_order_payment_state(self, order_id: uuid.UUID) -> str:
        """Return 'unpaid', 'pending', 'paid', or 'failed' for the order's latest FINAL_PAYMENT."""
        payment = await self.payment_repo.get_latest_final_payment(order_id)
        if not payment:
            return "unpaid"
        if payment.status == PaymentStatus.verified:
            return "paid"
        if payment.status == PaymentStatus.pending:
            return "pending"
        if payment.status == PaymentStatus.failed:
            return "failed"
        return "unpaid"

