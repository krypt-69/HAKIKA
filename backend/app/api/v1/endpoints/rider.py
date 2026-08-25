from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User, UserRole
from app.repositories.rider_repository import RiderRepository
from app.models.rider import Rider
from app.repositories.business_repository import BusinessRepository
from app.services.rider_service import RiderService
from app.schemas.rider import RiderCreate, RiderResponse
from app.utils.images import validate_and_process
from fastapi.responses import Response
import uuid

router = APIRouter(prefix="/riders", tags=["riders"])

def get_rider_service(db: AsyncSession = Depends(get_db)):
    rider_repo = RiderRepository(db)
    business_repo = BusinessRepository(db)
    return RiderService(rider_repo, business_repo)

@router.get("/me", response_model=RiderResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    profile_picture_url = f"/api/v1/riders/{rider.id}/profile-picture" if rider.profile_picture_data else None
    return RiderResponse(
        id=rider.id,
        business_id=rider.business_id,
        name=rider.name or "",
        email=rider.email or "",
        phone=rider.phone or "",
        status=rider.status.value,
        profile_picture_url=profile_picture_url,
    )

@router.post("/me/profile-picture", response_model=RiderResponse)
async def upload_my_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")

    image_data = validate_and_process(file, max_dim=800, max_bytes=200_000)
    rider.profile_picture_data = image_data
    await db.commit()
    await db.refresh(rider)

    profile_picture_url = f"/api/v1/riders/{rider.id}/profile-picture"
    return RiderResponse(
        id=rider.id,
        business_id=rider.business_id,
        name=rider.name or "",
        email=rider.email or "",
        phone=rider.phone or "",
        status=rider.status.value,
        profile_picture_url=profile_picture_url,
    )

@router.get("/{rider_id}/profile-picture", response_class=Response)
async def get_rider_profile_picture(
    rider_id: str,
    db: AsyncSession = Depends(get_db)
):
    try:
        rid = uuid.UUID(rider_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rider ID")
    rider = await db.get(Rider, rid)
    if not rider or not rider.profile_picture_data:
        raise HTTPException(status_code=404, detail="Profile picture not found")
    return Response(content=rider.profile_picture_data, media_type="image/webp")

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
