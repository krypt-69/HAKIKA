from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User
from app.repositories.business_repository import BusinessRepository
from app.repositories.rider_repository import RiderRepository
from app.repositories.business_rider_repository import BusinessRiderRepository
from app.schemas.rider import RiderResponse
import uuid
from app.services.ws_manager import manager

router = APIRouter(prefix="/businesses/{business_id}/riders", tags=["business_riders"])


@router.get("/search")
async def search_riders(
    business_id: str,
    q: str = "",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_repo = BusinessRepository(db)
    biz = await business_repo.get_by_id(uuid.UUID(business_id))
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if not q.strip():
        return []
    rider_repo = RiderRepository(db)
    riders = await rider_repo.search(q.strip(), limit=20)
    result = []
    for rider in riders:
        result.append({
            "id": str(rider.id),
            "username": rider.username,
            "name": rider.name,
            "email": rider.email,
            "status": rider.status.value,
        })
    return result

@router.get("")
async def get_business_riders(
    business_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    active_only: bool = False,
):
    business_repo = BusinessRepository(db)
    biz = await business_repo.get_by_id(uuid.UUID(business_id))
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    br_repo = BusinessRiderRepository(db)
    rider_repo = RiderRepository(db)
    assocs = await br_repo.list_riders_by_business(uuid.UUID(business_id))
    if active_only:
        assocs = [a for a in assocs if a.status == 'active']
    riders = []
    for assoc in assocs:
        rider = await rider_repo.get_by_id(assoc.rider_id)
        if rider:
            profile_picture_url = f"/api/v1/riders/{rider.id}/profile-picture" if rider.profile_picture_data else None
            riders.append({
                "id": str(rider.id),
                "username": rider.username,
                "name": rider.name,
                "email": rider.email,
                "phone": rider.phone,
                "status": assoc.status,
                "profile_picture_url": profile_picture_url,
            })
    return riders

@router.post("/{rider_id}", status_code=201)
async def add_business_rider(
    business_id: str,
    rider_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_repo = BusinessRepository(db)
    biz = await business_repo.get_by_id(uuid.UUID(business_id))
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rider_repo = RiderRepository(db)
    rider = await rider_repo.get_by_id(uuid.UUID(rider_id))
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    br_repo = BusinessRiderRepository(db)
    if await br_repo.exists(uuid.UUID(business_id), uuid.UUID(rider_id)):
        raise HTTPException(status_code=409, detail="Association already exists")
    await br_repo.create(uuid.UUID(business_id), uuid.UUID(rider_id), 'active')
    return {"status": "associated"}


@router.post("/{rider_id}/invite", status_code=201)
async def invite_rider(
    business_id: str,
    rider_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_repo = BusinessRepository(db)
    biz = await business_repo.get_by_id(uuid.UUID(business_id))
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rider_repo = RiderRepository(db)
    rider = await rider_repo.get_by_id(uuid.UUID(rider_id))
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")
    br_repo = BusinessRiderRepository(db)
    existing = await br_repo.get(uuid.UUID(business_id), uuid.UUID(rider_id))
    if existing and existing.status == 'active':
        raise HTTPException(status_code=409, detail="Already active")
    await br_repo.create_pending_invitation(uuid.UUID(business_id), uuid.UUID(rider_id))
    # Send WebSocket notification to rider
    await manager.send_event(rider_id, {
        "type": "business_invitation",
        "payload": {
            "business_id": business_id,
            "business_name": biz.name,
            "rider_id": rider_id,
        },
    })
    return {"status": "pending"}

@router.delete("/{rider_id}", status_code=200)
async def remove_business_rider(
    business_id: str,
    rider_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    business_repo = BusinessRepository(db)
    biz = await business_repo.get_by_id(uuid.UUID(business_id))
    if not biz or biz.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    br_repo = BusinessRiderRepository(db)
    removed = await br_repo.remove(uuid.UUID(business_id), uuid.UUID(rider_id))
    if not removed:
        raise HTTPException(status_code=404, detail="Association not found")
    return {"status": "removed"}
