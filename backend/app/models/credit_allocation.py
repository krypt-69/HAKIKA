import uuid
from sqlalchemy import String, DECIMAL, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime

class CreditAllocationType(str):
    paid = "paid"
    trial = "trial"
    legacy = "legacy"

class CreditAllocation(Base):
    __tablename__ = "credit_allocations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="RESTRICT"), nullable=False)
    merchant_credit_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("merchant_credit_orders.id", ondelete="RESTRICT"), nullable=True)
    credit_plan_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("credit_plans.id", ondelete="RESTRICT"), nullable=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    original_credit: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    remaining_credit: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    original_volume: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    remaining_volume: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default="now()", nullable=False)

    __table_args__ = (
        UniqueConstraint('merchant_credit_order_id', name='uq_credit_allocations_mco'),
    )
