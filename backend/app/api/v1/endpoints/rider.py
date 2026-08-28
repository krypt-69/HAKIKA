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



@router.post("/invitations/{br_id}/accept")
async def accept_invitation(
    br_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    from app.repositories.business_rider_repository import BusinessRiderRepository
    br_repo = BusinessRiderRepository(db)
    br = await br_repo.get_by_id(uuid.UUID(br_id))
    if not br:
        raise HTTPException(status_code=404, detail="Invitation not found")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider or br.rider_id != rider.id:
        raise HTTPException(status_code=403, detail="Not your invitation")
    await br_repo.update_status(br.business_id, br.rider_id, 'active')
    return {"status": "accepted"}

@router.post("/invitations/{br_id}/decline")
async def decline_invitation(
    br_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    from app.repositories.business_rider_repository import BusinessRiderRepository
    br_repo = BusinessRiderRepository(db)
    br = await br_repo.get_by_id(uuid.UUID(br_id))
    if not br:
        raise HTTPException(status_code=404, detail="Invitation not found")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider or br.rider_id != rider.id:
        raise HTTPException(status_code=403, detail="Not your invitation")
    await br_repo.remove(br.business_id, br.rider_id)
    return {"status": "declined"}


@router.get("/invitations")
async def get_pending_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    from app.repositories.business_rider_repository import BusinessRiderRepository
    br_repo = BusinessRiderRepository(db)
    all_assocs = await br_repo.list_businesses_by_rider(rider.id)
    # Return pending only
    pending = [a for a in all_assocs if a.status == 'pending']
    result = []
    from app.repositories.business_repository import BusinessRepository
    biz_repo = BusinessRepository(db)
    for a in pending:
        biz = await biz_repo.get_by_id(a.business_id)
        if biz:
            result.append({
                "id": str(a.id),
                "business_id": str(biz.id),
                "business_name": biz.name,
                "status": a.status,
            })
    return result

@router.get("/me/businesses")
async def get_my_businesses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    from app.repositories.business_rider_repository import BusinessRiderRepository
    br_repo = BusinessRiderRepository(db)
    assocs = await br_repo.list_businesses_by_rider(rider.id)
    result = []
    from app.repositories.business_repository import BusinessRepository
    business_repo = BusinessRepository(db)
    for assoc in assocs:
        business = await business_repo.get_by_id(assoc.business_id)
        if business:
            result.append({
                "business_id": str(business.id),
                "business_name": business.name,
                "status": assoc.status,
            })
    return result


@router.get("/me/businesses")
async def get_my_businesses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != UserRole.rider:
        raise HTTPException(status_code=403, detail="Not a rider")
    rider_result = await db.execute(select(Rider).where(Rider.user_id == current_user.id))
    rider = rider_result.scalar_one_or_none()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider profile not found")
    from app.repositories.business_rider_repository import BusinessRiderRepository
    br_repo = BusinessRiderRepository(db)
    assocs = await br_repo.list_businesses_by_rider(rider.id)
    result = []
    from app.repositories.business_repository import BusinessRepository
    business_repo = BusinessRepository(db)
    for assoc in assocs:
        business = await business_repo.get_by_id(assoc.business_id)
        if business:
            result.append({
                "business_id": str(business.id),
                "business_name": business.name,
                "status": assoc.status,
            })
    return result

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
    profile_picture_url = None
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


@router.get("/{rider_id}/profile")
async def get_rider_profile(
    rider_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        rid = uuid.UUID(rider_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid rider ID")
    rider = await db.get(Rider, rid)
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    return {
        "id": str(rider.id),
        "username": rider.username,
        "name": rider.name,
        "email": rider.email,
        "status": rider.status.value,
    }

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
        raise HTTPException(status_code=404, detail="Profile picture not available")
    return Response(content=rider.profile_picture_data, media_type="image/webp")

@router.get("/{business_id}", response_model=list[RiderResponse])
async def list_riders(
    business_id: str,
    current_user: User = Depends(get_current_user),
    service: RiderService = Depends(get_rider_service)
):
    return await service.list_riders(current_user, uuid.UUID(business_id))
