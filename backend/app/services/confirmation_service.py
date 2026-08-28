from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.repositories.dispute_repository import DisputeRepository
from app.repositories.payment_policy_repository import PaymentPolicyRepository
from app.services.payment_policy_service import PaymentPolicyService
from app.services.order_events import publish_order_update
from app.models.order import OrderStatus
from app.models.audit_log import AuditLog
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import logging

logger = logging.getLogger("hakika.confirmation")

class ConfirmationService:
    def __init__(
        self,
        order_repo: OrderRepository,
        customer_repo: CustomerRepository,
        delivery_repo: DeliveryRepository,
        trust_event_repo: TrustEventRepository,
        dispute_repo: DisputeRepository,
        db: AsyncSession
    ):
        self.order_repo = order_repo
        self.customer_repo = customer_repo
        self.delivery_repo = delivery_repo
        self.trust_event_repo = trust_event_repo
        self.dispute_repo = dispute_repo
        self.db = db

    async def _verify_customer_phone(self, phone: str, order_customer_id: uuid.UUID) -> uuid.UUID:
        if phone.startswith("0"):
            normalized = "+254" + phone[1:]
        elif phone.startswith("254"):
            normalized = "+" + phone
        else:
            normalized = phone
        customer = await self.customer_repo.get_or_create(phone, normalized)
        if customer.id != order_customer_id:
            raise HTTPException(status_code=403, detail="Customer phone does not match order")
        return customer.id

    async def confirm_delivery(self, order_id: uuid.UUID, phone: str):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.arrived:
            raise HTTPException(status_code=400, detail="Order is not in arrived state")

        customer_id = await self._verify_customer_phone(phone, order.customer_id)

        attempts = await self.delivery_repo.get_attempts_for_order(order_id)
        if not attempts:
            raise HTTPException(status_code=400, detail="No delivery attempt recorded")

        if order.status in (OrderStatus.customer_confirmed_delivery, OrderStatus.payment_pending,
                            OrderStatus.paid, OrderStatus.completed):
            raise HTTPException(status_code=400, detail="Delivery already confirmed")

        prev1 = order.status
        order = await self.order_repo.confirm_delivery_transaction(
            order_id=order.id,
            customer_id=customer_id,
            trust_event={
                "subject_type": "customer",
                "subject_id": customer_id,
                "event_type": "CUSTOMER_CONFIRMED_DELIVERY",
                "score_change": 0.0,
                "reason": "Customer confirmed delivery",
            },
        )
        await publish_order_update(order, prev1)
        await publish_order_update(order, OrderStatus.customer_confirmed_delivery)

        # Payment initiation outside transaction
        policy_repo = PaymentPolicyRepository(self.db)
        policy_service = PaymentPolicyService(policy_repo)

        from app.repositories.payment_repository import PaymentRepository
        from app.repositories.customer_repository import CustomerRepository
        from app.repositories.ledger_repository import LedgerRepository
        from app.services.payment_service import PaymentService

        payment_repo = PaymentRepository(self.db)
        customer_repo = CustomerRepository(self.db)
        ledger_repo = LedgerRepository(self.db)
        payment_service = PaymentService(payment_repo, self.order_repo, customer_repo, ledger_repo, policy_service)

        payment_result = await payment_service.initiate_payment(order_id)

        return {
            "status": "payment_pending",
            "payment": payment_result
        }

    async def report_problem(self, order_id: uuid.UUID, phone: str, reason: str):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.arrived:
            raise HTTPException(status_code=400, detail="Order must be in arrived state to report problem")

        customer_id = await self._verify_customer_phone(phone, order.customer_id)

        existing = await self.dispute_repo.get_by_order(order_id)
        if existing:
            raise HTTPException(status_code=400, detail="Dispute already exists for this order")

        prev = order.status
        order = await self.order_repo.report_problem_transaction(
            order_id=order.id,
            customer_id=customer_id,
            reason=reason,
        )
        await publish_order_update(order, prev)

        dispute = await self.dispute_repo.get_by_order(order_id)

        return {"status": "dispute_review", "dispute_id": str(dispute.id)}
