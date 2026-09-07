from pydantic import BaseModel
import uuid

class ProductImageResponse(BaseModel):
    id: uuid.UUID
    position: int
    url: str

class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    original_price: float
    discount_price: float | None = None
    image_url: str | None = None
    currency: str = 'KES'
    selling_unit: str = 'Piece'
    track_inventory: bool = False
    stock_quantity: int | None = None
    min_order_quantity: int = 1
    max_order_quantity: int | None = None
    category_id: int | None = None

class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    original_price: float | None = None
    discount_price: float | None = None
    image_url: str | None = None
    is_available: bool | None = None
    currency: str | None = None
    selling_unit: str | None = None
    track_inventory: bool | None = None
    stock_quantity: int | None = None
    min_order_quantity: int | None = None
    max_order_quantity: int | None = None
    category_id: int | None = None

class ProductResponse(BaseModel):
    id: uuid.UUID
    business_id: uuid.UUID
    name: str
    description: str | None
    original_price: float
    discount_price: float | None
    image_url: str | None
    is_available: bool
    currency: str
    selling_unit: str
    track_inventory: bool
    stock_quantity: int | None
    min_order_quantity: int
    max_order_quantity: int | None
    category_id: int | None = None
    images: list[ProductImageResponse] = []
    class Config:
        from_attributes = True
