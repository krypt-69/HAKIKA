from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.credit_plan import CreditPlan
import uuid

class CreditPlanRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_active(self) -> list[CreditPlan]:
        result = await self.db.execute(
            select(CreditPlan)
            .where(CreditPlan.active == True)
            .order_by(CreditPlan.price)
        )
        return list(result.scalars().all())

    async def get_by_id(self, plan_id: uuid.UUID) -> CreditPlan | None:
        result = await self.db.execute(
            select(CreditPlan).where(CreditPlan.id == plan_id)
        )
        return result.scalar_one_or_none()
