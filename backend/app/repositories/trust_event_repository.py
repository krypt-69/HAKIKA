from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trust_event import TrustEvent
import uuid

class TrustEventRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_trust_event(
        self,
        subject_type: str,  # 'customer' or 'business'
        subject_id: uuid.UUID,
        event_type: str,
        score_change: float,
        reason: str | None = None
    ) -> TrustEvent:
        event = TrustEvent(
            subject_type=subject_type,
            subject_id=subject_id,
            event_type=event_type,
            score_change=score_change,
            reason=reason
        )
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event
