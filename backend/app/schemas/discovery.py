from pydantic import BaseModel
from typing import Optional, List
import uuid

class CategoryResponse(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True

class DiscoveredBusiness(BaseModel):
    id: uuid.UUID
    name: str
    category_id: int
    description: Optional[str]
    trust_score: float
    logo_url: Optional[str]
    distance_meters: float
    location: Optional[dict]

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
