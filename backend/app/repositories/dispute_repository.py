from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dispute import Dispute, DisputeStatus
import uuid
from datetime import datetime

class DisputeRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, order_id: uuid.UUID, customer_id: uuid.UUID, reason: str) -> Dispute:
        dispute = Dispute(
            order_id=order_id,
            customer_id=customer_id,
            reason=reason,
            status=DisputeStatus.pending
        )
        self.db.add(dispute)
        await self.db.commit()
        await self.db.refresh(dispute)
        return dispute

    async def get_by_order(self, order_id: uuid.UUID) -> Dispute | None:
        result = await self.db.execute(select(Dispute).where(Dispute.order_id == order_id))
        return result.scalar_one_or_none()

    async def update_status(self, dispute: Dispute, status: DisputeStatus, resolved_by: uuid.UUID | None = None):
        dispute.status = status
        if resolved_by:
            dispute.resolved_by = resolved_by
        if status in (DisputeStatus.resolved_customer, DisputeStatus.resolved_business):
            dispute.resolved_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(dispute)
