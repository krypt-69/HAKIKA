from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.payment_attempt import PaymentAttempt, PaymentAttemptStatus
import uuid

class PaymentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_payment(
        self, order_id: uuid.UUID, amount: float, provider: str = "INTASEND",
        idempotency_key: str | None = None
    ) -> Payment:
        import uuid as _uuid
        key = idempotency_key or str(_uuid.uuid4())
        payment = Payment(
            order_id=order_id,
            provider=provider,
            idempotency_key=key,
            amount=amount,
            payment_type=PaymentType.FINAL_PAYMENT,
            status=PaymentStatus.pending
        )
        self.db.add(payment)
        await self.db.commit()
        await self.db.refresh(payment)
        return payment

    async def get_by_id(self, payment_id: uuid.UUID) -> Payment | None:
        result = await self.db.execute(select(Payment).where(Payment.id == payment_id))
        return result.scalar_one_or_none()

    async def get_by_order(self, order_id: uuid.UUID) -> Payment | None:
        result = await self.db.execute(select(Payment).where(Payment.order_id == order_id))
        return result.scalar_one_or_none()

    async def get_pending_payments(self) -> list[Payment]:
        result = await self.db.execute(select(Payment).where(Payment.status == PaymentStatus.pending))
        return result.scalars().all()

    async def update_status(self, payment: Payment, status: PaymentStatus, provider_reference: str | None = None):
        payment.status = status
        if provider_reference:
            payment.provider_reference = provider_reference
        await self.db.commit()
        await self.db.refresh(payment)

    async def create_attempt(self, payment_id: uuid.UUID, attempt_number: int,
                             status: PaymentAttemptStatus, provider_response: dict | None = None) -> PaymentAttempt:
        attempt = PaymentAttempt(
            payment_id=payment_id,
            attempt_number=attempt_number,
            status=status,
            provider_response=provider_response
        )
        self.db.add(attempt)
        await self.db.commit()
        await self.db.refresh(attempt)
        return attempt

    async def get_attempts(self, payment_id: uuid.UUID) -> list[PaymentAttempt]:
        result = await self.db.execute(
            select(PaymentAttempt).where(PaymentAttempt.payment_id == payment_id)
            .order_by(PaymentAttempt.created_at.desc())
        )
        return result.scalars().all()
