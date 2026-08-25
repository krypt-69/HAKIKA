from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists
from app.models.payment_policy import PaymentPolicy

class PaymentPolicyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, key: str) -> PaymentPolicy | None:
        result = await self.db.execute(
            select(PaymentPolicy).where(PaymentPolicy.key == key)
        )
        return result.scalar_one_or_none()

    async def exists(self, key: str) -> bool:
        result = await self.db.execute(
            select(exists().where(PaymentPolicy.key == key))
        )
        return result.scalar_one()

    async def list_all(self) -> list[PaymentPolicy]:
        result = await self.db.execute(
            select(PaymentPolicy).order_by(PaymentPolicy.key)
        )
        return list(result.scalars().all())
