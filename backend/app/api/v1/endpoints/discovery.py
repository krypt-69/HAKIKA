from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.services.discovery_service import DiscoveryService
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
    radius: float = Query(5000, ge=100, le=50000, description="Radius in meters (max 50km)"),
    category_id: Optional[int] = Query(None),
    service: DiscoveryService = Depends(get_discovery_service),
):
    return await service.discover_businesses(lat, lon, radius, category_id)

@router.get("/businesses/{business_id}/profile", response_model=BusinessProfileResponse)
async def business_public_profile(
    business_id: str,
    service: DiscoveryService = Depends(get_discovery_service),
):
    return await service.get_public_business_profile(uuid.UUID(business_id))
