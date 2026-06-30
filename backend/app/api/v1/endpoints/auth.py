from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db
from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.customer_repository import CustomerRepository
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
from app.models.user import UserRole

router = APIRouter(prefix="/auth", tags=["auth"])

def get_auth_service(db: AsyncSession = Depends(get_db)):
    user_repo = UserRepository(db)
    refresh_repo = RefreshTokenRepository(db)
    customer_repo = CustomerRepository(db)
    return AuthService(user_repo, refresh_repo, customer_repo)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: UserCreateRequest,
    service: AuthService = Depends(get_auth_service)
):
    # Only allow owner registration publicly; rider registration requires separate flow
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
