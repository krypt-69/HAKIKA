from app.repositories.user_repository import UserRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.rider_repository import RiderRepository
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
        customer_repo: CustomerRepository,
        rider_repo: RiderRepository = None
    ):
        self.user_repo = user_repo
        self.refresh_repo = refresh_repo
        self.customer_repo = customer_repo
        self.rider_repo = rider_repo

    async def register(self, email: str, password: str, phone: str | None, role: str):
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")
        hashed = hash_password(password)
        user = await self.user_repo.create(email, hashed, phone, role)

        # If rider, try to link to a pending rider record with the same email
        if role == 'rider' and self.rider_repo:
            rider = await self.rider_repo.get_by_email(email)
            if rider and rider.status.value == 'pending':
                await self.rider_repo.link_user(rider, user.id)

        return user

    async def login(self, email: str, password: str) -> TokenResponse:
        user = await self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")
        access = create_access_token(str(user.id), user.role.value)
        refresh = create_refresh_token(str(user.id))
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

    async def check_activation(self, identifier: str):
        # Normalize phone
        if identifier.startswith("0"):
            normalized = "+254" + identifier[1:]
        elif identifier.startswith("254"):
            normalized = "+" + identifier
        else:
            normalized = identifier

        rider = await self.rider_repo.get_by_email_or_phone(normalized, identifier)
        if not rider:
            return None
        # Check if rider already has a user account with password
        if rider.user_id:
            user = await self.user_repo.get_by_id(rider.user_id)
            if user and user.password_hash:
                return None  # already activated
        # Get business name
        from app.repositories.business_repository import BusinessRepository
        business_repo = BusinessRepository(self.rider_repo.db)
        business = await business_repo.get_by_id(rider.business_id)
        business_name = business.name if business else "Unknown"

        return {
            "rider_id": rider.id,
            "name": rider.name,
            "business_name": business_name,
            "email": rider.email,
            "can_activate": True
        }
    async def activate(self, identifier: str, password: str):
        # Normalize phone
        if identifier.startswith("0"):
            normalized = "+254" + identifier[1:]
        elif identifier.startswith("254"):
            normalized = "+" + identifier
        else:
            normalized = identifier

        rider = await self.rider_repo.get_by_email_or_phone(normalized, identifier)
        if not rider:
            raise ValueError("No pending rider found")
        if rider.user_id:
            user = await self.user_repo.get_by_id(rider.user_id)
            if user and user.password_hash:
                raise ValueError("Account already activated")
            # User exists but no password, update it
            if user:
                hashed = hash_password(password)
                await self.user_repo.update_password(user.id, hashed)
                # Update rider status
                await self.rider_repo.update_status(rider.id, 'active')
                return user
        # No user account yet, create one
        user = await self.user_repo.create(
            email=rider.email,
            password_hash=hash_password(password),
            phone=rider.phone,
            role='rider'
        )
        # Link rider to user
        await self.rider_repo.link_user(rider, user.id)
        # Update rider status
        await self.rider_repo.update_status(rider.id, 'active')
        return user
