from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.business import Business
from datetime import datetime
import uuid
import re

def generate_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug).strip('-')
    slug = re.sub(r'-+', '-', slug)
    return slug[:100]

class BusinessRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, owner_id: uuid.UUID, name: str, category_id: int,
                     description: str | None = None, slug: str = None) -> Business:
        # Auto-generate slug if not provided
        if not slug:
            base_slug = generate_slug(name)
            slug = base_slug
            counter = 2
            while True:
                result = await self.db.execute(
                    select(Business).where(Business.slug == slug)
                )
                if not result.scalar_one_or_none():
                    break
                slug = f"{base_slug}-{counter}"
                counter += 1

        business = Business(
            owner_id=owner_id,
            name=name,
            category_id=category_id,
            description=description,
            slug=slug
        )
        self.db.add(business)
        await self.db.commit()
        await self.db.refresh(business)
        return business

    async def get_by_id(self, business_id: uuid.UUID) -> Business | None:
        result = await self.db.execute(
            select(Business).where(Business.id == business_id, Business.deleted_at == None)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Business | None:
        result = await self.db.execute(
            select(Business).where(Business.slug == slug, Business.deleted_at == None)
        )
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_id: uuid.UUID) -> list[Business]:
        result = await self.db.execute(
            select(Business).where(Business.owner_id == owner_id, Business.deleted_at == None)
        )
        return result.scalars().all()

    async def update(self, business: Business, **kwargs):
        for key, value in kwargs.items():
            if hasattr(business, key):
                setattr(business, key, value)
        await self.db.commit()
        await self.db.refresh(business)
        return business

    async def soft_delete(self, business: Business):
        business.deleted_at = datetime.utcnow()
        await self.db.commit()
