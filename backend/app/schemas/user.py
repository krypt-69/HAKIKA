from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
import uuid

class UserCreate(BaseModel):
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

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
