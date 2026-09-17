import uuid
from sqlalchemy import Numeric, Integer, TIMESTAMP, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class SettlementStatus(str, enum.Enum):
    pending = "pending"
    waiting_for_funds = "waiting_for_funds"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class Settlement(Base):
    __tablename__ = "settlements"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[SettlementStatus] = mapped_column(ENUM(SettlementStatus, name='settlement_status', create_type=False), default=SettlementStatus.pending)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    provider_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    payout_reference: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)
    provider_payout_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    last_retry_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, default=datetime.utcnow)

    # P3 fields
    next_retry_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    first_waiting_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    escalated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
