from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
import uuid
from datetime import datetime

class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    phone: str | None = None
    role: UserRole = UserRole.owner

class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    phone: str | None
    role: UserRole

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class CustomerSessionRequest(BaseModel):
    phone: str

class CustomerSessionResponse(BaseModel):
    session_token: str
    customer_id: uuid.UUID
