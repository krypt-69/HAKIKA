from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.settlement import Settlement, SettlementStatus
import uuid
from datetime import datetime

class SettlementRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, amount: float,
                     order_id: uuid.UUID, payment_id: uuid.UUID) -> Settlement:
        settlement = Settlement(
            business_id=business_id,
            order_id=order_id,
            payment_id=payment_id,
            amount=amount,
            status=SettlementStatus.pending
        )
        self.db.add(settlement)
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement

    async def get_by_id(self, settlement_id: uuid.UUID) -> Settlement | None:
        result = await self.db.execute(select(Settlement).where(Settlement.id == settlement_id))
        return result.scalar_one_or_none()

    async def get_by_business(self, business_id: uuid.UUID) -> list[Settlement]:
        result = await self.db.execute(
            select(Settlement).where(Settlement.business_id == business_id)
            .order_by(Settlement.created_at.desc())
        )
        return result.scalars().all()

    async def get_pending(self) -> list[Settlement]:
        result = await self.db.execute(
            select(Settlement).where(Settlement.status == SettlementStatus.pending)
        )
        return result.scalars().all()

    async def update_status(self, settlement: Settlement, status: SettlementStatus,
                            provider_reference: str | None = None):
        settlement.status = status
        if provider_reference:
            settlement.provider_reference = provider_reference
        if status == SettlementStatus.processing:
            settlement.retry_count = (settlement.retry_count or 0) + 1
            settlement.last_retry_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(settlement)
        return settlement
