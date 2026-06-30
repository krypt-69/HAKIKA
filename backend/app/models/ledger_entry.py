import uuid
from sqlalchemy import Numeric, TIMESTAMP, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class LedgerTransactionType(str, enum.Enum):
    payment_in = "payment_in"
    hakika_fee = "hakika_fee"
    business_settlement = "business_settlement"
    refund = "refund"
    adjustment = "adjustment"

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_type: Mapped[LedgerTransactionType] = mapped_column(SAEnum(LedgerTransactionType), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    payment_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    business_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
