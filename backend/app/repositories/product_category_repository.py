from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.product_category import ProductCategory

class ProductCategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db
    async def get_by_id(self, category_id: int) -> ProductCategory | None:
        result = await self.db.execute(select(ProductCategory).where(ProductCategory.id == category_id))
        return result.scalar_one_or_none()
    async def list_all(self) -> list[ProductCategory]:
        result = await self.db.execute(select(ProductCategory).order_by(ProductCategory.name))
        return result.scalars().all()
