import uuid
from sqlalchemy import String, DECIMAL, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class MerchantCreditOrderStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"

class MerchantCreditOrder(Base):
    __tablename__ = "merchant_credit_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="RESTRICT"), nullable=False)
    credit_plan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("credit_plans.id", ondelete="RESTRICT"), nullable=False)
    amount_paid: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    credit_received: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    status: Mapped[MerchantCreditOrderStatus] = mapped_column(ENUM(MerchantCreditOrderStatus, name='merchant_credit_order_status'), default=MerchantCreditOrderStatus.pending)
    payment_reference: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    provider_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    initiated_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
