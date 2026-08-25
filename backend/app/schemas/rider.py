from pydantic import BaseModel
import uuid

class RiderCreate(BaseModel):
    name: str
    email: str
    phone: str

class RiderResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    email: str
    phone: str
    status: str
    profile_picture_url: str | None = None
    class Config:
        from_attributes = True
