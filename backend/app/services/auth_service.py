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
from app.core.phone import normalize_phone
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

    async def register(self, email: str, password: str, phone: str | None, role: str, username: str | None = None):
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        if role == 'rider' and self.rider_repo:
            # Check username uniqueness before creating user
            existing_username = await self.rider_repo.get_by_username(username or email.split('@')[0])
            if existing_username:
                raise ValueError("Username already taken")

        hashed = hash_password(password)
        user = await self.user_repo.create(email, hashed, phone, role)

        if role == 'rider' and self.rider_repo:
            rider = await self.rider_repo.create_from_registration(
                username=username or email.split('@')[0],
                name=None,
                email=email,
                phone=phone,
            )
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
        identifier = identifier.strip()
        # Determine identifier type
        if '@' in identifier and '.' in identifier.split('@')[-1]:
            # Email
            rider = await self.rider_repo.get_by_email(identifier.lower())
        else:
            # Phone
            phone = normalize_phone(identifier)
            if not phone:
                return None
            rider = await self.rider_repo.get_by_phone(phone)

        if not rider:
            return None
        # Check if rider already has a user account with password
        if rider.user_id:
            user = await self.user_repo.get_by_id(rider.user_id)
            if user and user.password_hash:
                return None  # already activated
        # Get first business name from business_riders
        from app.repositories.business_repository import BusinessRepository
        from app.repositories.business_rider_repository import BusinessRiderRepository
        business_repo = BusinessRepository(self.rider_repo.db)
        br_repo = BusinessRiderRepository(self.rider_repo.db)
        assocs = await br_repo.list_businesses_by_rider(rider.id)
        business_name = "Unknown"
        if assocs:
            first_biz = await business_repo.get_by_id(assocs[0].business_id)
            business_name = first_biz.name if first_biz else "Unknown"

        return {
            "rider_id": rider.id,
            "name": rider.name,
            "business_name": business_name,
            "email": rider.email,
            "can_activate": True
        }

    async def activate(self, identifier: str, password: str):
        identifier = identifier.strip()
        # Determine identifier type
        if '@' in identifier and '.' in identifier.split('@')[-1]:
            # Email
            rider = await self.rider_repo.get_by_email(identifier.lower())
        else:
            # Phone
            phone = normalize_phone(identifier)
            if not phone:
                raise ValueError("Invalid phone number format")
            rider = await self.rider_repo.get_by_phone(phone)

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
