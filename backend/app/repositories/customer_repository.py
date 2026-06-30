from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.customer import Customer
import uuid

class CustomerRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_or_create(self, phone_original: str, phone_normalized: str) -> Customer:
        result = await self.db.execute(select(Customer).where(Customer.phone_normalized == phone_normalized))
        customer = result.scalar_one_or_none()
        if customer:
            return customer
        customer = Customer(
            phone_original=phone_original,
            phone_normalized=phone_normalized
        )
        self.db.add(customer)
        await self.db.commit()
        await self.db.refresh(customer)
        return customer

    async def get_by_id(self, customer_id: uuid.UUID) -> Customer | None:
        result = await self.db.execute(select(Customer).where(Customer.id == customer_id))
        return result.scalar_one_or_none()
