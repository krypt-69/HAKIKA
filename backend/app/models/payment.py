import uuid
from sqlalchemy import String, Numeric, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from app.models.business import PaymentModel
from datetime import datetime
import enum

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    failed = "failed"

class PaymentType(str, enum.Enum):
    FINAL_PAYMENT = "FINAL_PAYMENT"

class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)

    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    payment_type: Mapped[PaymentType] = mapped_column(ENUM(PaymentType, name='payment_type', create_type=False), default=PaymentType.FINAL_PAYMENT)
    status: Mapped[PaymentStatus] = mapped_column(ENUM(PaymentStatus, name='payment_status', create_type=False), default=PaymentStatus.pending)
    provider_specific_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    last_checked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    payment_model: Mapped[PaymentModel] = mapped_column(ENUM(PaymentModel, name="payment_model"), default=PaymentModel.pay_as_you_go)
    initiated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)

