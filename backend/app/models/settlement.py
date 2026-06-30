import uuid
from sqlalchemy import Numeric, Integer, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class SettlementStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"

class Settlement(Base):
    __tablename__ = "settlements"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    status: Mapped[SettlementStatus] = mapped_column(ENUM(SettlementStatus, name='settlement_status', create_type=False), default=SettlementStatus.pending)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    last_retry_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
