from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.customer_repository import CustomerRepository
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_refresh_token
from app.schemas.user import TokenResponse, CustomerSessionResponse
from app.database.redis import store_customer_session
from datetime import datetime, timezone, timedelta
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
        # Check if user exists
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
        # Store refresh token hash
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        await self.refresh_repo.create(user.id, hash_password(refresh), expires)
        return TokenResponse(access_token=access, refresh_token=refresh)

    async def refresh(self, token: str) -> TokenResponse:
        try:
            payload = decode_refresh_token(token)
            user_id = payload.get("sub")
            if not user_id:
                raise ValueError()
        except Exception:
            raise ValueError("Invalid refresh token")
        # Verify token hash exists and is valid
        rt = await self.refresh_repo.get_valid_token(hash_password(token))
        if not rt:
            raise ValueError("Refresh token not found or expired")
        # Revoke old token
        await self.refresh_repo.revoke(rt)
        user = await self.user_repo.get_by_id(uuid.UUID(user_id))
        if not user:
            raise ValueError("User not found")
        # Issue new pair
        access = create_access_token(str(user.id), user.role.value)
        new_refresh = create_refresh_token(str(user.id))
        expires = datetime.now(timezone.utc) + timedelta(days=30)
        await self.refresh_repo.create(user.id, hash_password(new_refresh), expires)
        return TokenResponse(access_token=access, refresh_token=new_refresh)

    async def customer_session(self, phone: str) -> CustomerSessionResponse:
        # Normalize phone (simple: remove leading 0 and add +254 if needed)
        if phone.startswith("0"):
            normalized = "+254" + phone[1:]
        elif phone.startswith("254"):
            normalized = "+" + phone
        else:
            normalized = phone
        customer = await self.customer_repo.get_or_create(phone, normalized)
        token = await store_customer_session(str(customer.id), normalized)
        return CustomerSessionResponse(session_token=token, customer_id=customer.id)
