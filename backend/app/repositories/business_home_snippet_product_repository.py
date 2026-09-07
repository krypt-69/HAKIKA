from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.business_home_snippet_product import BusinessHomeSnippetProduct
import uuid

class BusinessHomeSnippetProductRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_snippet(self, snippet_id: uuid.UUID) -> list[BusinessHomeSnippetProduct]:
        result = await self.db.execute(
            select(BusinessHomeSnippetProduct)
            .where(BusinessHomeSnippetProduct.snippet_id == snippet_id)
            .order_by(BusinessHomeSnippetProduct.position)
        )
        return result.scalars().all()

    async def replace_products(self, snippet_id: uuid.UUID, items: list[dict]):
        # Delete old
        existing = await self.list_by_snippet(snippet_id)
        for old in existing:
            await self.db.delete(old)
        await self.db.flush()
        # Add new
        for item in items:
            row = BusinessHomeSnippetProduct(
                snippet_id=snippet_id,
                product_id=item["product_id"],
                position=item["position"],
            )
            self.db.add(row)
        await self.db.commit()
