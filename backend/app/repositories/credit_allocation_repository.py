from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.credit_allocation import CreditAllocation
from datetime import datetime
import uuid

class CreditAllocationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_noncommit(self, allocation: CreditAllocation) -> CreditAllocation:
        self.db.add(allocation)
        return allocation

    async def get_by_merchant_credit_order_id(self, mco_id: uuid.UUID) -> CreditAllocation | None:
        result = await self.db.execute(
            select(CreditAllocation).where(CreditAllocation.merchant_credit_order_id == mco_id)
        )
        return result.scalar_one_or_none()

    async def get_valid_totals_for_business(
        self, business_id: uuid.UUID, now: datetime
    ) -> tuple[float, float]:
        """Return (available_credit, available_volume) from non-expired allocations."""
        from sqlalchemy import func
        result = await self.db.execute(
            select(func.coalesce(func.sum(CreditAllocation.remaining_credit), 0),
                   func.coalesce(func.sum(CreditAllocation.remaining_volume), 0))
            .where(
                CreditAllocation.business_id == business_id,
                CreditAllocation.remaining_credit > 0,
                CreditAllocation.remaining_volume > 0,
                CreditAllocation.expires_at > now,
            )
        )
        row = result.one()
        return float(row[0]), float(row[1])

    async def lock_valid_allocations(
        self, business_id: uuid.UUID, now: datetime
    ) -> list[CreditAllocation]:
        result = await self.db.execute(
            select(CreditAllocation)
            .where(
                CreditAllocation.business_id == business_id,
                CreditAllocation.remaining_credit > 0,
                CreditAllocation.remaining_volume > 0,
                CreditAllocation.expires_at > now,
            )
            .order_by(CreditAllocation.expires_at)
            .with_for_update()
        )
        return list(result.scalars().all())

    async def deduct_from_valid_allocations(
        self,
        business_id: uuid.UUID,
        credit_deduction: float,
        volume_deduction: float,
        now: datetime,
    ) -> None:
        """Reduce remaining credit/volume across valid allocations proportionally."""
        allocations = await self.lock_valid_allocations(business_id, now)
        if not allocations:
            return

        total_credit = sum(float(a.remaining_credit) for a in allocations)
        total_volume = sum(float(a.remaining_volume) for a in allocations)

        if total_credit <= 0 or total_volume <= 0:
            return

        credit_remaining_to_deduct = credit_deduction
        volume_remaining_to_deduct = volume_deduction

        for allocation in allocations:
            if credit_remaining_to_deduct <= 0 and volume_remaining_to_deduct <= 0:
                break

            credit_share = min(
                float(allocation.remaining_credit),
                (float(allocation.remaining_credit) / total_credit) * credit_deduction
            )
            volume_share = min(
                float(allocation.remaining_volume),
                (float(allocation.remaining_volume) / total_volume) * volume_deduction
            )

            allocation.remaining_credit = round(float(allocation.remaining_credit) - credit_share, 2)
            allocation.remaining_volume = round(float(allocation.remaining_volume) - volume_share, 2)

        await self.db.flush()

    async def list_valid_for_business(self, business_id: uuid.UUID, now: datetime) -> list[CreditAllocation]:
        result = await self.db.execute(
            select(CreditAllocation)
            .where(
                CreditAllocation.business_id == business_id,
                CreditAllocation.remaining_credit > 0,
                CreditAllocation.remaining_volume > 0,
                CreditAllocation.expires_at > now,
            )
            .order_by(CreditAllocation.expires_at)
        )
        return list(result.scalars().all())
