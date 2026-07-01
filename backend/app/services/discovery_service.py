from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import to_shape
from app.models.business import Business
from app.models.location import Location
from app.models.product import Product
from app.models.category import Category
from app.models.operating_hours import OperatingHours
from app.repositories.category_repository import CategoryRepository
from fastapi import HTTPException
from typing import List, Optional
import uuid

class DiscoveryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.category_repo = CategoryRepository(db)

    async def list_categories(self) -> list[Category]:
        return await self.category_repo.list_all()

    async def discover_businesses(
        self,
        lat: float,
        lon: float,
        radius: float = 5000.0,
        category_id: Optional[int] = None,
    ) -> List[dict]:
        if radius > 50000:
            raise HTTPException(status_code=400, detail="Maximum radius is 50km")

        point_wkt = f'SRID=4326;POINT({lon} {lat})'

        subq = (
            select(
                Location.business_id,
                func.ST_Distance(Location.coordinates, func.ST_GeogFromText(point_wkt)).label('distance')
            )
            .where(
                func.ST_DWithin(Location.coordinates, func.ST_GeogFromText(point_wkt), radius)
            )
            .subquery()
        )

        # Explicitly load slug by selecting the whole Business model
        query = (
            select(Business, subq.c.distance)
            .join(subq, Business.id == subq.c.business_id)
            .where(Business.deleted_at == None)
            .order_by(Business.trust_score.desc(), subq.c.distance.asc())
        )

        if category_id is not None:
            query = query.where(Business.category_id == category_id)

        result = await self.db.execute(query)
        rows = result.all()

        businesses = []
        for business, distance in rows:
            loc_query = select(Location).where(
                Location.business_id == business.id,
                Location.is_primary == True
            )
            loc_result = await self.db.execute(loc_query)
            location = loc_result.scalar_one_or_none()
            lat_lon = {"lat": 0.0, "lon": 0.0}
            if location:
                point = to_shape(location.coordinates)
                lat_lon = {"lat": point.y, "lon": point.x}

            businesses.append({
                "id": str(business.id),
                "name": business.name,
                "category_id": business.category_id,
                "description": business.description,
                "trust_score": float(business.trust_score),
                "logo_url": business.logo_url,
                "slug": business.slug,
                "distance_meters": round(distance, 2),
                "location": lat_lon,
            })
        return businesses
