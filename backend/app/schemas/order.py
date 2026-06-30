from pydantic import BaseModel
import uuid
from decimal import Decimal
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

class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    status: str
    subtotal: float
    delivery_fee: float
    total_amount: float
    customer_id: uuid.UUID
    business_id: uuid.UUID
    items: list[OrderItemResponse] = []
    created_at: datetime | None

    class Config:
        from_attributes = True
