from sqlalchemy.ext.asyncio import AsyncSession
from app.models.operating_hours import OperatingHours
import uuid
from datetime import time

class OperatingHoursRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, day_of_week: int, opens_at: time | None, closes_at: time | None, is_closed: bool = False) -> OperatingHours:
        hours = OperatingHours(
            business_id=business_id,
            day_of_week=day_of_week,
            opens_at=opens_at,
            closes_at=closes_at,
            is_closed=is_closed
        )
        self.db.add(hours)
        await self.db.commit()
        await self.db.refresh(hours)
        return hours

    async def get_by_business(self, business_id: uuid.UUID) -> list[OperatingHours]:
        from sqlalchemy import select
        result = await self.db.execute(select(OperatingHours).where(OperatingHours.business_id == business_id))
        return result.scalars().all()

    async def update(self, hours: OperatingHours, **kwargs):
        for key, value in kwargs.items():
            if hasattr(hours, key):
                setattr(hours, key, value)
        await self.db.commit()
        await self.db.refresh(hours)
        return hours
