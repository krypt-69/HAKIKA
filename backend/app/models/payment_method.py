import uuid
from sqlalchemy import String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class PaymentMethodType(str, enum.Enum):
    paybill = "paybill"
    till = "till"

class PaymentMethod(Base):
    __tablename__ = "payment_methods"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    type: Mapped[PaymentMethodType] = mapped_column(ENUM(PaymentMethodType, name='payment_method_type', create_type=False), nullable=False)
    encrypted_account_number: Mapped[str] = mapped_column(String, nullable=False)
    last_four_digits: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    effective_from: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    effective_to: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
