import uuid
from sqlalchemy import String, DECIMAL, Text, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class CreditTransactionType(str, enum.Enum):
    purchase = "purchase"
    deduction = "deduction"
    trial = "trial"
    adjustment = "adjustment"
    order_processing_fee = "order_processing_fee"

class CreditTransactionDirection(str, enum.Enum):
    CREDIT = "CREDIT"
    DEBIT = "DEBIT"

class CreditTransactionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    reversed = "reversed"

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="RESTRICT"), nullable=False)
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="RESTRICT"), nullable=True)
    merchant_credit_order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("merchant_credit_orders.id", ondelete="RESTRICT"), nullable=True)
    type: Mapped[CreditTransactionType] = mapped_column(ENUM(CreditTransactionType, name='credit_transaction_type'), nullable=False)
    status: Mapped[CreditTransactionStatus] = mapped_column(ENUM(CreditTransactionStatus, name='credit_transaction_status'), default=CreditTransactionStatus.pending)
    amount: Mapped[float] = mapped_column(DECIMAL(12,2), nullable=False)
    direction: Mapped[CreditTransactionDirection] = mapped_column(ENUM(CreditTransactionDirection, name='credit_transaction_direction'), nullable=False)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
