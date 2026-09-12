from pydantic import BaseModel
from typing import Optional, List
import uuid
from app.schemas.product import ProductImageResponse

class CategoryResponse(BaseModel):
    id: int
    name: str
    image_url: Optional[str] = None
    class Config:
        from_attributes = True

class SnippetProductInfo(BaseModel):
    id: uuid.UUID
    name: str
    image_url: Optional[str] = None

class DiscoveredBusiness(BaseModel):
    id: str
    name: str
    category_id: int
    category_name: Optional[str] = None
    description: Optional[str] = None
    trust_score: float
    logo_url: Optional[str] = None
    slug: Optional[str] = None
    distance_meters: Optional[float] = None
    location: Optional[dict] = None
    address_text: Optional[str] = None
    cover_url: Optional[str] = None
    operating_hours: list = []
    snippet_title: Optional[str] = None
    snippet_products: list[SnippetProductInfo] = []

class ProductInfo(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    original_price: float
    discount_price: Optional[float]
    image_url: Optional[str]

class OperatingHourInfo(BaseModel):
    day_of_week: int
    opens_at: Optional[str]
    closes_at: Optional[str]
    is_closed: bool

class BusinessProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    category_id: int
    description: Optional[str]
    trust_score: float
    logo_url: Optional[str]
    location: Optional[dict]
    operating_hours: List[OperatingHourInfo]
    products: List[ProductInfo]


class DiscoverResponse(BaseModel):
    businesses: list[DiscoveredBusiness]
    next_cursor: Optional[str] = None


class CustomerProductInfo(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    original_price: float
    discount_price: Optional[float]
    selling_unit: str
    min_order_quantity: int
    max_order_quantity: Optional[int]
    track_inventory: bool
    stock_quantity: Optional[int]
    category_id: Optional[int]
    images: List[ProductImageResponse] = []
