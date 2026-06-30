import uuid
from sqlalchemy import Integer, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class PaymentAttemptStatus(str, enum.Enum):
    initiated = "initiated"
    sent = "sent"
    failed = "failed"

class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"))
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)
    provider_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status: Mapped[PaymentAttemptStatus] = mapped_column(
        ENUM(PaymentAttemptStatus, name='payment_attempt_status', create_type=False),
        default=PaymentAttemptStatus.initiated
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
