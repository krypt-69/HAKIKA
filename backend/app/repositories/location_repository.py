from sqlalchemy.ext.asyncio import AsyncSession
from app.models.location import Location
from geoalchemy2.elements import WKTElement
import uuid

class LocationRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, business_id: uuid.UUID, lat: float, lon: float, address_text: str | None = None, is_primary: bool = True) -> Location:
        point = WKTElement(f"POINT({lon} {lat})", srid=4326)
        location = Location(
            business_id=business_id,
            coordinates=point,
            address_text=address_text,
            is_primary=is_primary
        )
        self.db.add(location)
        await self.db.commit()
        await self.db.refresh(location)
        return location

    async def get_by_business(self, business_id: uuid.UUID) -> list[Location]:
        from sqlalchemy import select
        result = await self.db.execute(select(Location).where(Location.business_id == business_id))
        return result.scalars().all()

    async def update(self, location: Location, **kwargs):
        if 'lat' in kwargs and 'lon' in kwargs:
            point = WKTElement(f"POINT({kwargs['lon']} {kwargs['lat']})", srid=4326)
            location.coordinates = point
            del kwargs['lat']
            del kwargs['lon']
        for key, value in kwargs.items():
            if hasattr(location, key):
                setattr(location, key, value)
        await self.db.commit()
        await self.db.refresh(location)
        return location
