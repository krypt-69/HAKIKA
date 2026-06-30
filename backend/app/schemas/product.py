from pydantic import BaseModel
import uuid

class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    original_price: float
    discount_price: float | None = None
    image_url: str | None = None

class ProductResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    original_price: float
    discount_price: float | None
    is_available: bool

    class Config:
        from_attributes = True
