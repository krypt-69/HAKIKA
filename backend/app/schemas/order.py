from pydantic import BaseModel
import uuid
from datetime import datetime

class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int

class OrderCreateRequest(BaseModel):
    phone: str
    business_id: uuid.UUID
    items: list[OrderItemCreate]
    delivery_lat: float
    delivery_lon: float

class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_name: str
    unit_price: float
    quantity: int
    product_id: uuid.UUID | None
    thumbnail_url: str | None = None

class OrderResponse(BaseModel):
    distance_km: float | None = None
    delivery_location: dict | None = None
    delivery_coordinates: dict | None = None
    customer_phone: str | None = None
    id: uuid.UUID
    order_number: str
    status: str
    subtotal: float
    delivery_fee: float
    total_amount: float
    customer_id: uuid.UUID
    business_id: uuid.UUID
    business_name: str | None = None
    business_logo_url: str | None = None
    business_cover_url: str | None = None
    items: list[OrderItemResponse] = []
    created_at: datetime | None

    class Config:
        from_attributes = True
