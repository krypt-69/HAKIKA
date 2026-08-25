from pydantic import BaseModel
from app.models.business import PaymentModel
import uuid
from datetime import time, datetime
from app.models.payment_method import PaymentMethodType

class LocationCreate(BaseModel):
    lat: float
    lon: float
    address_text: str | None = None
    is_primary: bool = True

class LocationResponse(BaseModel):
    id: uuid.UUID
    lat: float
    lon: float
    address_text: str | None
    is_primary: bool
    class Config:
        from_attributes = True

class OperatingHoursCreate(BaseModel):
    day_of_week: int
    opens_at: time | None = None
    closes_at: time | None = None
    is_closed: bool = False

class OperatingHoursResponse(BaseModel):
    id: uuid.UUID
    day_of_week: int
    opens_at: time | None
    closes_at: time | None
    is_closed: bool
    class Config:
        from_attributes = True

class PaymentMethodCreate(BaseModel):
    type: PaymentMethodType
    account_number: str
    paybill_short_code: str | None = None
    paybill_short_code: str | None = None

class PaymentMethodResponse(BaseModel):
    id: uuid.UUID
    type: PaymentMethodType
    last_four_digits: str | None
    is_active: bool
    class Config:
        from_attributes = True

class BusinessCreateRequest(BaseModel):
    name: str
    category_id: int
    description: str | None = None
    location: LocationCreate
    operating_hours: list[OperatingHoursCreate] = []
    payment_method: PaymentMethodCreate
    collect_payment_before_delivery: bool = False
    payment_model: PaymentModel = PaymentModel.pay_as_you_go

class BusinessUpdateRequest(BaseModel):
    collect_payment_before_delivery: bool | None = None
    name: str | None = None
    description: str | None = None
    location: LocationCreate | None = None
    operating_hours: list[OperatingHoursCreate] | None = None
    payment_method: PaymentMethodCreate | None = None

class BusinessResponse(BaseModel):
    id: uuid.UUID
    name: str
    category_id: int
    description: str | None
    trust_score: float
    credit_balance: float | None = None
    remaining_credit_volume: float | None = None
    payment_model: str | None = None
    collect_payment_before_delivery: bool | None = None
    logo_url: str | None
    locations: list[LocationResponse] = []
    operating_hours: list[OperatingHoursResponse] = []
    payment_methods: list[PaymentMethodResponse] = []
    class Config:
        from_attributes = True
