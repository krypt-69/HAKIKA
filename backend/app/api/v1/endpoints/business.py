from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.api.dependencies import get_current_user
from app.models.user import User, UserRole
from app.repositories.business_repository import BusinessRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.location_repository import LocationRepository
from app.repositories.operating_hours_repository import OperatingHoursRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.services.business_service import BusinessService
from app.schemas.business import BusinessCreateRequest, BusinessUpdateRequest, BusinessResponse
import uuid

router = APIRouter(prefix="/businesses", tags=["businesses"])

def get_business_service(db: AsyncSession = Depends(get_db)):
    business_repo = BusinessRepository(db)
    category_repo = CategoryRepository(db)
    location_repo = LocationRepository(db)
    hours_repo = OperatingHoursRepository(db)
    payment_repo = PaymentMethodRepository(db)
    return BusinessService(business_repo, category_repo, location_repo, hours_repo, payment_repo)

@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
async def create_business(
    data: BusinessCreateRequest,
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    # Enforce one business per owner
    existing_businesses = await service.business_repo.get_by_owner(current_user.id)
    if existing_businesses:
        raise HTTPException(status_code=400, detail="You already have a business. Only one business per account is allowed in Hakika V1.")
    return await service.create_business(current_user, data)

@router.get("", response_model=list[BusinessResponse])
async def list_my_businesses(
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    return await service.get_my_businesses(current_user)

@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(
    business_id: str,
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    return await service.get_business_detail(uuid.UUID(business_id), current_user)

@router.put("/{business_id}", response_model=BusinessResponse)
async def update_business(
    business_id: str,
    data: BusinessUpdateRequest,
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    return await service.update_business(uuid.UUID(business_id), current_user, data)

@router.delete("/{business_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_business(
    business_id: str,
    current_user: User = Depends(get_current_user),
    service: BusinessService = Depends(get_business_service)
):
    await service.delete_business(uuid.UUID(business_id), current_user)
