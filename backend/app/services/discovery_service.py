from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from geoalchemy2 import Geography
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
        radius: float = 5000.0,  # meters, default 5km
        category_id: Optional[int] = None,
    ) -> List[dict]:
        # Limit radius
        if radius > 50000:
            raise HTTPException(status_code=400, detail="Maximum radius is 50km")

        # Create point WKT
        point_wkt = f'SRID=4326;POINT({lon} {lat})'

        # Subquery to get business distances
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

        # Main query: join businesses, filter by category, order by trust and distance
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
            # Get location details
            loc_query = select(Location).where(Location.business_id == business.id, Location.is_primary == True)
            loc_result = await self.db.execute(loc_query)
            location = loc_result.scalar_one_or_none()
            lat_lon = {"lat": 0.0, "lon": 0.0}
            if location:
                point = to_shape(location.coordinates)
                lat_lon = {"lat": point.y, "lon": point.x}

            businesses.append({
                "id": business.id,
                "name": business.name,
                "category_id": business.category_id,
                "description": business.description,
                "trust_score": float(business.trust_score),
                "logo_url": business.logo_url,
                "distance_meters": round(distance, 2),
                "location": lat_lon
            })
        return businesses

    async def get_public_business_profile(self, business_id: uuid.UUID) -> dict:
        business_result = await self.db.execute(
            select(Business).where(Business.id == business_id, Business.deleted_at == None)
        )
        business = business_result.scalar_one_or_none()
        if not business:
            raise HTTPException(status_code=404, detail="Business not found")

        # Products (available, not deleted)
        product_result = await self.db.execute(
            select(Product).where(
                Product.business_id == business_id,
                Product.deleted_at == None,
                Product.is_available == True
            )
        )
        products = product_result.scalars().all()
        product_list = [{
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "original_price": float(p.original_price),
            "discount_price": float(p.discount_price) if p.discount_price else None,
            "image_url": p.image_url
        } for p in products]

        # Primary location
        loc_result = await self.db.execute(
            select(Location).where(Location.business_id == business_id, Location.is_primary == True)
        )
        location = loc_result.scalar_one_or_none()
        location_data = None
        if location:
            point = to_shape(location.coordinates)
            location_data = {"lat": point.y, "lon": point.x, "address_text": location.address_text}

        # Operating hours
        hours_result = await self.db.execute(
            select(OperatingHours).where(OperatingHours.business_id == business_id).order_by(OperatingHours.day_of_week)
        )
        hours = hours_result.scalars().all()
        hours_list = [{
            "day_of_week": h.day_of_week,
            "opens_at": str(h.opens_at) if h.opens_at else None,
            "closes_at": str(h.closes_at) if h.closes_at else None,
            "is_closed": h.is_closed
        } for h in hours]

        return {
            "id": business.id,
            "name": business.name,
            "category_id": business.category_id,
            "description": business.description,
            "trust_score": float(business.trust_score),
            "logo_url": business.logo_url,
            "location": location_data,
            "operating_hours": hours_list,
            "products": product_list
        }
