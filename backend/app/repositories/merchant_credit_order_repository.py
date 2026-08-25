from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.merchant_credit_order import MerchantCreditOrder, MerchantCreditOrderStatus
import uuid

class MerchantCreditOrderRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, order_data: dict) -> MerchantCreditOrder:
        order = MerchantCreditOrder(**order_data)
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order

    async def get_by_id(self, order_id: uuid.UUID) -> MerchantCreditOrder | None:
        result = await self.db.execute(
            select(MerchantCreditOrder).where(MerchantCreditOrder.id == order_id)
        )
        return result.scalar_one_or_none()

    async def get_by_payment_reference(self, ref: str) -> MerchantCreditOrder | None:
        result = await self.db.execute(
            select(MerchantCreditOrder).where(MerchantCreditOrder.payment_reference == ref)
        )
        return result.scalar_one_or_none()

    async def get_by_provider_reference(self, ref: str) -> MerchantCreditOrder | None:
        result = await self.db.execute(
            select(MerchantCreditOrder).where(MerchantCreditOrder.provider_reference == ref)
        )
        return result.scalar_one_or_none()

    async def update_status(self, order: MerchantCreditOrder, status: MerchantCreditOrderStatus, provider_ref: str | None = None):
        order.status = status
        if provider_ref:
            order.provider_reference = provider_ref
        if status == MerchantCreditOrderStatus.completed:
            order.completed_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(order)

    async def list_by_business(self, business_id: uuid.UUID, limit: int = 50) -> list[MerchantCreditOrder]:
        result = await self.db.execute(
            select(MerchantCreditOrder)
            .where(MerchantCreditOrder.business_id == business_id)
            .order_by(MerchantCreditOrder.initiated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())
