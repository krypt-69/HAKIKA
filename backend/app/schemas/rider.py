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
    class Config:
        from_attributes = True
