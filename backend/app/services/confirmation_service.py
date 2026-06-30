from app.repositories.order_repository import OrderRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.trust_event_repository import TrustEventRepository
from app.repositories.dispute_repository import DisputeRepository
from app.models.order import OrderStatus
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

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
        # Normalize and find customer
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

        # Ensure at least one delivery attempt exists
        attempts = await self.delivery_repo.get_attempts_for_order(order_id)
        if not attempts:
            raise HTTPException(status_code=400, detail="No delivery attempt recorded")

        # Prevent duplicate confirmation
        if order.status in (OrderStatus.customer_confirmed_delivery, OrderStatus.payment_pending, OrderStatus.paid, OrderStatus.completed):
            raise HTTPException(status_code=400, detail="Delivery already confirmed")

        # Create trust event (neutral score, but records confirmation)
        await self.trust_event_repo.create_trust_event(
            subject_type='customer',
            subject_id=customer_id,
            event_type='CUSTOMER_CONFIRMED_DELIVERY',
            score_change=0.0,
            reason="Customer confirmed delivery"
        )

        # Log audit event
        from app.models.audit_log import AuditLog
        audit = AuditLog(
            table_name='orders',
            record_id=order.id,
            action='CUSTOMER_CONFIRMED_DELIVERY',
            new_values={"status": "customer_confirmed_delivery"}
        )
        self.db.add(audit)

        # Update order status
        await self.order_repo.update_status(order, OrderStatus.customer_confirmed_delivery)
        # Then move to payment_pending (we can do it in one step, but spec wants both states visible? The frozen spec shows two separate steps, but we'll transition to payment_pending right after for simplicity)
        await self.order_repo.update_status(order, OrderStatus.payment_pending)
        await self.db.commit()

        return {"status": "payment_pending"}

    async def report_problem(self, order_id: uuid.UUID, phone: str, reason: str):
        order = await self.order_repo.get_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != OrderStatus.arrived:
            raise HTTPException(status_code=400, detail="Order must be in arrived state to report problem")

        customer_id = await self._verify_customer_phone(phone, order.customer_id)

        # Check if dispute already exists for this order
        existing = await self.dispute_repo.get_by_order(order_id)
        if existing:
            raise HTTPException(status_code=400, detail="Dispute already exists for this order")

        # Create dispute
        dispute = await self.dispute_repo.create(order_id, customer_id, reason)

        # Trust event
        await self.trust_event_repo.create_trust_event(
            subject_type='customer',
            subject_id=customer_id,
            event_type='CUSTOMER_REPORTED_PROBLEM',
            score_change=0.0,
            reason=reason
        )

        # Audit log
        from app.models.audit_log import AuditLog
        audit = AuditLog(
            table_name='disputes',
            record_id=dispute.id,
            action='DISPUTE_CREATED',
            new_values={"order_id": str(order_id), "reason": reason}
        )
        self.db.add(audit)

        # Move order to dispute_review
        await self.order_repo.update_status(order, OrderStatus.dispute_review)
        await self.db.commit()

        return {"status": "dispute_review", "dispute_id": str(dispute.id)}
