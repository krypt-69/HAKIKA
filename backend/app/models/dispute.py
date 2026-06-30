import uuid
from sqlalchemy import String, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class DisputeStatus(str, enum.Enum):
    pending = "pending"
    under_review = "under_review"
    resolved_customer = "resolved_customer"
    resolved_business = "resolved_business"

class Dispute(Base):
    __tablename__ = "disputes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[DisputeStatus] = mapped_column(
        ENUM(DisputeStatus, name='dispute_status', create_type=False),
        default=DisputeStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    resolved_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
