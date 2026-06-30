from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.rider import Rider, RiderStatus
import uuid

class RiderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, name: str, email: str, phone: str) -> Rider:
        rider = Rider(
            business_id=business_id,
            name=name,
            email=email,
            phone=phone,
            status=RiderStatus.pending
        )
        self.db.add(rider)
        await self.db.commit()
        await self.db.refresh(rider)
        return rider

    async def get_by_id(self, rider_id: uuid.UUID) -> Rider | None:
        result = await self.db.execute(select(Rider).where(Rider.id == rider_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Rider | None:
        result = await self.db.execute(select(Rider).where(Rider.email == email))
        return result.scalar_one_or_none()

    async def list_by_business(self, business_id: uuid.UUID) -> list[Rider]:
        result = await self.db.execute(select(Rider).where(Rider.business_id == business_id))
        return result.scalars().all()

    async def link_user(self, rider: Rider, user_id: uuid.UUID):
        rider.user_id = user_id
        rider.status = RiderStatus.active
        await self.db.commit()
        await self.db.refresh(rider)
        return rider

    async def update(self, rider: Rider, **kwargs):
        for key, value in kwargs.items():
            if hasattr(rider, key):
                setattr(rider, key, value)
        await self.db.commit()
        await self.db.refresh(rider)
        return rider
