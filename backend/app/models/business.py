import uuid
from sqlalchemy import String, Text, Numeric, DECIMAL, ForeignKey, TIMESTAMP, Integer, LargeBinary, Boolean
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class PaymentModel(str, enum.Enum):
    credit = "credit"
    pay_as_you_go = "pay_as_you_go"

class ChannelType(str, enum.Enum):
    paybill = "paybill"
    till = "till"
    bank = "bank"

class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("categories.id"))
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    trust_score: Mapped[float] = mapped_column(Numeric(5,2), default=80)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    logo_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    cover_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    logo_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    cover_updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    payment_model: Mapped[PaymentModel] = mapped_column(ENUM(PaymentModel, name="payment_model"), default=PaymentModel.pay_as_you_go)
    channel_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    channel_type: Mapped[ChannelType | None] = mapped_column(ENUM(ChannelType, name="channel_type"), nullable=True)
    channel_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    credit_balance: Mapped[float] = mapped_column(DECIMAL(12,2), default=0.0)
    remaining_credit_volume: Mapped[float] = mapped_column(DECIMAL(12,2), default=0.0)
    collect_payment_before_delivery: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
