from pydantic import BaseModel
import uuid

class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    original_price: float
    discount_price: float | None = None
    image_url: str | None = None

class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    original_price: float | None = None
    discount_price: float | None = None
    image_url: str | None = None
    is_available: bool | None = None

class ProductResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    description: str | None
    original_price: float
    discount_price: float | None
    image_url: str | None
    is_available: bool
    class Config:
        from_attributes = True
