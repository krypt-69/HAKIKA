from sqlalchemy.ext.asyncio import AsyncSession
from app.models.payment_method import PaymentMethod, PaymentMethodType
import uuid

class PaymentMethodRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, type: PaymentMethodType, account_number: str) -> PaymentMethod:
        # In production, account_number should be encrypted; for V1 we store directly.
        # We'll only reveal last four digits in API responses.
        last_four = account_number[-4:] if len(account_number) >= 4 else account_number
        pm = PaymentMethod(
            business_id=business_id,
            type=type,
            encrypted_account_number=account_number,  # placeholder for future encryption
            last_four_digits=last_four
        )
        self.db.add(pm)
        await self.db.commit()
        await self.db.refresh(pm)
        return pm

    async def get_by_business(self, business_id: uuid.UUID) -> list[PaymentMethod]:
        from sqlalchemy import select
        result = await self.db.execute(
            select(PaymentMethod).where(PaymentMethod.business_id == business_id, PaymentMethod.is_active == True)
        )
        return result.scalars().all()

    async def update(self, pm: PaymentMethod, **kwargs):
        for key, value in kwargs.items():
            if hasattr(pm, key):
                setattr(pm, key, value)
        await self.db.commit()
        await self.db.refresh(pm)
        return pm
