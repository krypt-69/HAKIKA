from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.category import Category

class CategoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, category_id: int) -> Category | None:
        result = await self.db.execute(select(Category).where(Category.id == category_id))
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Category]:
        result = await self.db.execute(select(Category).order_by(Category.name))
        return result.scalars().all()
