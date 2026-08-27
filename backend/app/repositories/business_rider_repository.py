from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.models.business_rider import BusinessRider, BusinessRiderStatus
import uuid

class BusinessRiderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, rider_id: uuid.UUID, status: str = 'active') -> BusinessRider:
        br = BusinessRider(
            business_id=business_id,
            rider_id=rider_id,
            status=BusinessRiderStatus(status)
        )
        self.db.add(br)
        await self.db.commit()
        await self.db.refresh(br)
        return br

    async def get(self, business_id: uuid.UUID, rider_id: uuid.UUID) -> BusinessRider | None:
        result = await self.db.execute(
            select(BusinessRider).where(
                BusinessRider.business_id == business_id,
                BusinessRider.rider_id == rider_id
            )
        )
        return result.scalar_one_or_none()

    async def exists(self, business_id: uuid.UUID, rider_id: uuid.UUID) -> bool:
        br = await self.get(business_id, rider_id)
        return br is not None and br.status == 'active'

    async def list_riders_by_business(self, business_id: uuid.UUID) -> list[BusinessRider]:
        result = await self.db.execute(
            select(BusinessRider).where(BusinessRider.business_id == business_id)
        )
        return result.scalars().all()

    async def list_businesses_by_rider(self, rider_id: uuid.UUID) -> list[BusinessRider]:
        result = await self.db.execute(
            select(BusinessRider).where(BusinessRider.rider_id == rider_id)
        )
        return result.scalars().all()

    async def remove(self, business_id: uuid.UUID, rider_id: uuid.UUID) -> bool:
        br = await self.get(business_id, rider_id)
        if not br:
            return False
        await self.db.delete(br)
        await self.db.commit()
        return True

    async def create_pending_invitation(self, business_id: uuid.UUID, rider_id: uuid.UUID) -> BusinessRider:
        br = await self.get(business_id, rider_id)
        if br:
            return br
        br = BusinessRider(
            business_id=business_id,
            rider_id=rider_id,
            status='pending'
        )
        self.db.add(br)
        await self.db.commit()
        await self.db.refresh(br)
        return br

    async def update_status(self, business_id: uuid.UUID, rider_id: uuid.UUID, status: str) -> BusinessRider | None:
        br = await self.get(business_id, rider_id)
        if not br:
            return None
        br.status = status
        await self.db.commit()
        await self.db.refresh(br)
        return br

    async def get_by_id(self, br_id: uuid.UUID) -> BusinessRider | None:
        result = await self.db.execute(select(BusinessRider).where(BusinessRider.id == br_id))
        return result.scalar_one_or_none()
