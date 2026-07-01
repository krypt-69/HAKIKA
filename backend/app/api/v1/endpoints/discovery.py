from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.shape import to_shape
from app.database.session import get_db
from app.services.discovery_service import DiscoveryService
from app.models.business import Business
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.location import Location
from app.models.operating_hours import OperatingHours
from app.schemas.discovery import CategoryResponse, DiscoveredBusiness, BusinessProfileResponse
from typing import Optional, List
import uuid

router = APIRouter(tags=["discovery"])

def get_discovery_service(db: AsyncSession = Depends(get_db)):
    return DiscoveryService(db)

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(service: DiscoveryService = Depends(get_discovery_service)):
    return await service.list_categories()

@router.get("/businesses/discover", response_model=List[DiscoveredBusiness])
async def discover_businesses(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius: float = Query(5000, ge=100, le=50000),
    category_id: Optional[int] = Query(None),
    service: DiscoveryService = Depends(get_discovery_service),
):
    return await service.discover_businesses(lat, lon, radius, category_id)

@router.get("/b/{identifier}")
async def business_public_profile(
    identifier: str,
    db: AsyncSession = Depends(get_db)
):
    """Public business profile by slug OR business ID."""
    # Try slug first
    result = await db.execute(
        select(Business).where(Business.slug == identifier, Business.deleted_at == None)
    )
    business = result.scalar_one_or_none()

    # Fallback to UUID
    if not business:
        try:
            biz_id = uuid.UUID(identifier)
            result = await db.execute(
                select(Business).where(Business.id == biz_id, Business.deleted_at == None)
            )
            business = result.scalar_one_or_none()
        except ValueError:
            raise HTTPException(status_code=404, detail="Business not found")

    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    # Products with images
    product_result = await db.execute(
        select(Product).where(
            Product.business_id == business.id,
            Product.deleted_at == None,
            Product.is_available == True
        )
    )
    products = product_result.scalars().all()

    product_list = []
    for p in products:
        # Fetch images for this product
        img_result = await db.execute(
            select(ProductImage).where(ProductImage.product_id == p.id).order_by(ProductImage.position)
        )
        images = img_result.scalars().all()
        image_list = [{"id": str(i.id), "position": i.position, "url": f"/api/v1/product/{i.id}"} for i in images]

        product_list.append({
            "id": str(p.id),
            "name": p.name,
            "description": p.description,
            "original_price": float(p.original_price),
            "discount_price": float(p.discount_price) if p.discount_price else None,
            "images": image_list
        })

    # Primary location
    loc_result = await db.execute(
        select(Location).where(Location.business_id == business.id, Location.is_primary == True)
    )
    location = loc_result.scalar_one_or_none()
    location_data = None
    if location:
        point = to_shape(location.coordinates)
        location_data = {
            "lat": point.y,
            "lon": point.x,
            "address_text": location.address_text
        }

    # Operating hours
    hours_result = await db.execute(
        select(OperatingHours).where(OperatingHours.business_id == business.id).order_by(OperatingHours.day_of_week)
    )
    hours = hours_result.scalars().all()
    hours_list = [{
        "day_of_week": h.day_of_week,
        "opens_at": str(h.opens_at) if h.opens_at else None,
        "closes_at": str(h.closes_at) if h.closes_at else None,
        "is_closed": h.is_closed
    } for h in hours]

    return {
        "id": str(business.id),
        "name": business.name,
        "description": business.description,
        "trust_score": float(business.trust_score),
        "slug": business.slug,
        "location": location_data,
        "operating_hours": hours_list,
        "products": product_list
    }
