from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.customer_repository import CustomerRepository
from app.core.security import (
    hash_password, verify_password, hash_token,
    create_access_token, create_refresh_token, decode_refresh_token
)
from app.schemas.user import TokenResponse, CustomerSessionResponse
from app.database.redis import store_customer_session
from datetime import datetime, timedelta
import uuid

class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        refresh_repo: RefreshTokenRepository,
        customer_repo: CustomerRepository
    ):
        self.user_repo = user_repo
        self.refresh_repo = refresh_repo
        self.customer_repo = customer_repo

    async def register(self, email: str, password: str, phone: str | None, role: str):
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")
        hashed = hash_password(password)
        user = await self.user_repo.create(email, hashed, phone, role)
        return user

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        access = create_access_token(str(user.id), user.role.value)
        refresh = create_refresh_token(str(user.id))
        # Store deterministic hash of the refresh token
        token_hash = hash_token(refresh)
        expires = datetime.utcnow() + timedelta(days=30)
        await self.refresh_repo.create(user.id, token_hash, expires)
        return TokenResponse(access_token=access, refresh_token=refresh)

    async def refresh(self, token: str) -> TokenResponse:
        try:
            payload = decode_refresh_token(token)
            user_id = payload.get("sub")
            if not user_id:
                raise ValueError()
        except Exception:
            raise ValueError("Invalid refresh token")
        # Lookup using deterministic hash
        token_hash = hash_token(token)
        rt = await self.refresh_repo.get_valid_token(token_hash)
        if not rt:
            raise ValueError("Refresh token not found or expired")
        await self.refresh_repo.revoke(rt)
        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise ValueError("User not found")
        access = create_access_token(str(user.id), user.role.value)
        new_refresh = create_refresh_token(str(user.id))
        new_hash = hash_token(new_refresh)
        expires = datetime.utcnow() + timedelta(days=30)
        await self.refresh_repo.create(user.id, new_hash, expires)
        return TokenResponse(access_token=access, refresh_token=new_refresh)

    async def customer_session(self, phone: str) -> CustomerSessionResponse:
        if phone.startswith("0"):
            normalized = "+254" + phone[1:]
        elif phone.startswith("254"):
            normalized = "+" + phone
        else:
            normalized = phone
        customer = await self.customer_repo.get_or_create(phone, normalized)
        token = await store_customer_session(str(customer.id), normalized)
        return CustomerSessionResponse(session_token=token, customer_id=customer.id)
