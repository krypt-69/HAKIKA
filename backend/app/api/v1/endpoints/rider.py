from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.rider_repository import RiderRepository
from app.repositories.business_repository import BusinessRepository
from app.services.rider_service import RiderService
from app.schemas.rider import RiderCreate, RiderResponse
import uuid

router = APIRouter(prefix="/riders", tags=["riders"])

def get_rider_service(db: AsyncSession = Depends(get_db)):
    rider_repo = RiderRepository(db)
    business_repo = BusinessRepository(db)
    return RiderService(rider_repo, business_repo)

@router.post("/{business_id}", response_model=RiderResponse, status_code=status.HTTP_201_CREATED)
async def create_rider(
    business_id: str,
    data: RiderCreate,
    current_user: User = Depends(get_current_user),
    service: RiderService = Depends(get_rider_service)
):
    return await service.create_rider(current_user, uuid.UUID(business_id), data)

@router.get("/{business_id}", response_model=list[RiderResponse])
async def list_riders(
    business_id: str,
    current_user: User = Depends(get_current_user),
    service: RiderService = Depends(get_rider_service)
):
    return await service.list_riders(current_user, uuid.UUID(business_id))
