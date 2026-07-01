from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2.shape import to_shape
from app.models.business import Business
from app.models.location import Location
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

        # Preload category names
        cat_ids = {b.category_id for b, _ in rows}
        cat_map = {}
        if cat_ids:
            cat_result = await self.db.execute(
                select(Category).where(Category.id.in_(cat_ids))
            )
            for cat in cat_result.scalars().all():
                cat_map[cat.id] = cat.name

        businesses = []
        for business, distance in rows:
            # Location
            loc_query = select(Location).where(
                Location.business_id == business.id,
                Location.is_primary == True
            )
            loc_result = await self.db.execute(loc_query)
            location = loc_result.scalar_one_or_none()
            lat_lon = {"lat": 0.0, "lon": 0.0}
            address_text = None
            if location:
                point = to_shape(location.coordinates)
                lat_lon = {"lat": point.y, "lon": point.x}
                address_text = location.address_text

            # Operating hours (summary)
            hours_query = select(OperatingHours).where(
                OperatingHours.business_id == business.id
            ).order_by(OperatingHours.day_of_week)
            hours_result = await self.db.execute(hours_query)
            hours = hours_result.scalars().all()
            hours_list = [{
                "day_of_week": h.day_of_week,
                "opens_at": str(h.opens_at) if h.opens_at else None,
                "closes_at": str(h.closes_at) if h.closes_at else None,
                "is_closed": h.is_closed
            } for h in hours]

            businesses.append({
                "id": str(business.id),
                "name": business.name,
                "category_id": business.category_id,
                "category_name": cat_map.get(business.category_id, "Unknown"),
                "description": business.description,
                "trust_score": float(business.trust_score),
                "logo_url": business.logo_url,
                "slug": business.slug,
                "distance_meters": round(distance, 2),
                "location": lat_lon,
                "address_text": address_text,
                "cover_url": f"/api/v1/businesses/{business.id}/cover",
                "operating_hours": hours_list,
            })
        return businesses
