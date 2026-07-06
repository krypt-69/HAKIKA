from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.rider_repository import RiderRepository
from app.repositories.business_repository import BusinessRepository
from app.services.auth_service import AuthService
from app.schemas.user import (
    UserCreateRequest,
    UserResponse,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    CustomerSessionRequest,
    CustomerSessionResponse
)
from app.models.user import UserRole, User
from app.api.dependencies import get_current_user
from app.core.security import create_access_token, create_refresh_token, hash_token
from datetime import datetime, timedelta
from datetime import timedelta
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

def get_auth_service(db: AsyncSession = Depends(get_db)):
    user_repo = UserRepository(db)
    refresh_repo = RefreshTokenRepository(db)
    customer_repo = CustomerRepository(db)
    rider_repo = RiderRepository(db)
    return AuthService(user_repo, refresh_repo, customer_repo, rider_repo)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserCreateRequest,
    service: AuthService = Depends(get_auth_service)
):
    if request.role not in [UserRole.owner, UserRole.rider]:
        raise HTTPException(status_code=400, detail="Invalid role for public registration")
    try:
        user = await service.register(
            email=request.email,
            password=request.password,
            phone=request.phone,
            role=request.role.value
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    service: AuthService = Depends(get_auth_service)
):
    try:
        return await service.login(request.email, request.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    request: RefreshRequest,
    service: AuthService = Depends(get_auth_service)
):
    try:
        return await service.refresh(request.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/customer/session", response_model=CustomerSessionResponse)
async def customer_session(
    request: CustomerSessionRequest,
    service: AuthService = Depends(get_auth_service)
):
    return await service.customer_session(request.phone)

@router.get("/me")
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    data = {"id": str(current_user.id), "email": current_user.email, "role": current_user.role.value}
    if current_user.role == UserRole.owner:
        business_repo = BusinessRepository(db)
        businesses = await business_repo.get_by_owner(current_user.id)
        if businesses:
            data["business_id"] = str(businesses[0].id)
    elif current_user.role == UserRole.rider:
        rider_repo = RiderRepository(db)
        # find rider record
        from sqlalchemy import select as sa_select
        from app.models.rider import Rider
        rider_result = await db.execute(sa_select(Rider).where(Rider.user_id == current_user.id))
        rider = rider_result.scalar_one_or_none()
        if rider:
            data["rider_id"] = str(rider.id)
            data["business_id"] = str(rider.business_id)
    return data

from app.schemas.auth import ActivationCheckRequest, ActivationCheckResponse

@router.post("/activate/check", response_model=ActivationCheckResponse)
async def check_activation(
    request: ActivationCheckRequest,
    service: AuthService = Depends(get_auth_service)
):
    result = await service.check_activation(request.identifier)
    if not result:
        raise HTTPException(status_code=404, detail="No pending rider found")
    return result

from app.schemas.auth import ActivationRequest

@router.post("/activate", response_model=TokenResponse)
async def activate_account(
    request: ActivationRequest,
    service: AuthService = Depends(get_auth_service)
):
    try:
        user = await service.activate(request.identifier, request.password)
        # Generate tokens for immediate login
        access = create_access_token(str(user.id), user.role.value)
        refresh = create_refresh_token(str(user.id))
        token_hash = hash_token(refresh)
        expires = datetime.utcnow() + timedelta(days=30)
        await service.refresh_repo.create(user.id, token_hash, expires)
        return TokenResponse(access_token=access, refresh_token=refresh)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
