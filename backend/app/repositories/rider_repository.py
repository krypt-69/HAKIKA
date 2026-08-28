from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.rider import Rider, RiderStatus
import uuid

class RiderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_from_registration(self, username: str, name: str | None, email: str, phone: str | None) -> Rider:
        rider = Rider(
            user_id=None,
            business_id=None,  # business relationships later via business_riders
            username=username,
            name=name,
            email=email,
            phone=phone,
            status=RiderStatus.active
        )
        self.db.add(rider)
        await self.db.commit()
        await self.db.refresh(rider)
        return rider

    async def get_by_id(self, rider_id: uuid.UUID) -> Rider | None:
        result = await self.db.execute(select(Rider).where(Rider.id == rider_id))
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Rider | None:
        result = await self.db.execute(select(Rider).where(Rider.email == email))
        return result.scalars().first()

    async def list_by_business(self, business_id: uuid.UUID) -> list[Rider]:
        # authoritative via business_riders
        from app.models.business_rider import BusinessRider
        result = await self.db.execute(
            select(Rider).join(BusinessRider, BusinessRider.rider_id == Rider.id).where(BusinessRider.business_id == business_id)
        )
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

    async def update_status(self, rider_id: uuid.UUID, status: str):
        rider = await self.get_by_id(rider_id)
        if not rider:
            return None
        rider.status = status
        await self.db.commit()
        return rider


    async def get_by_username(self, username: str) -> Rider | None:
        result = await self.db.execute(select(Rider).where(Rider.username == username))
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> Rider | None:
        result = await self.db.execute(select(Rider).where(Rider.phone == phone))
        return result.scalars().first()

    async def search(self, query: str, limit: int = 20) -> list[Rider]:
        q = f"%{query}%"
        result = await self.db.execute(
            select(Rider).where(
                or_(
                    Rider.username.ilike(q),
                    Rider.name.ilike(q),
                    Rider.email.ilike(q),
                )
            ).limit(limit)
        )
        return result.scalars().all()
