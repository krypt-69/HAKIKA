from pydantic import BaseModel
import uuid

class RiderCreate(BaseModel):
    name: str | None
    email: str
    phone: str | None

class RiderResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID | None
    name: str | None
    email: str
    phone: str | None
    status: str
    profile_picture_url: str | None = None
    class Config:
        from_attributes = True
