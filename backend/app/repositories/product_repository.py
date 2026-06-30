from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product import Product
from datetime import datetime
import uuid

class ProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, name: str, description: str | None,
                     original_price: float, discount_price: float | None, image_url: str | None) -> Product:
        product = Product(
            business_id=business_id,
            name=name,
            description=description,
            original_price=original_price,
            discount_price=discount_price,
            image_url=image_url,
            is_available=True
        )
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def get_by_id(self, product_id: uuid.UUID) -> Product | None:
        result = await self.db.execute(
            select(Product).where(Product.id == product_id, Product.deleted_at == None)
        )
        return result.scalar_one_or_none()

    async def list_by_business(self, business_id: uuid.UUID) -> list[Product]:
        result = await self.db.execute(
            select(Product).where(
                Product.business_id == business_id,
                Product.deleted_at == None
            )
        )
        return result.scalars().all()

    async def update(self, product: Product, **kwargs):
        for key, value in kwargs.items():
            if hasattr(product, key):
                setattr(product, key, value)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def soft_delete(self, product: Product):
        product.deleted_at = datetime.utcnow()
        await self.db.commit()
