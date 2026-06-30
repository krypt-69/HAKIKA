from pydantic import BaseModel
import uuid
from decimal import Decimal

class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int

class OrderCreate(BaseModel):
    business_id: uuid.UUID
    items: list[OrderItemCreate]
    delivery_lat: float
    delivery_lon: float

class OrderItemResponse(BaseModel):
    id: uuid.UUID
    product_name: str
    unit_price: Decimal
    quantity: int

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: uuid.UUID
    order_number: str
    status: str
    subtotal: Decimal
    delivery_fee: Decimal
    total_amount: Decimal

    class Config:
        from_attributes = True
