from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.business_home_snippet import BusinessHomeSnippet
import uuid

class BusinessHomeSnippetRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_business(self, business_id: uuid.UUID) -> BusinessHomeSnippet | None:
        result = await self.db.execute(
            select(BusinessHomeSnippet).where(BusinessHomeSnippet.business_id == business_id)
        )
        return result.scalar_one_or_none()

    async def create(self, business_id: uuid.UUID, title: str | None) -> BusinessHomeSnippet:
        snippet = BusinessHomeSnippet(business_id=business_id, title=title)
        self.db.add(snippet)
        await self.db.commit()
        await self.db.refresh(snippet)
        return snippet

    async def update(self, snippet: BusinessHomeSnippet, title: str | None):
        snippet.title = title
        await self.db.commit()
        await self.db.refresh(snippet)
        return snippet
