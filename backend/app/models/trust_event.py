import uuid
from sqlalchemy import String, Numeric, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class TrustSubjectType(str, enum.Enum):
    customer = "customer"
    business = "business"
    rider = "rider"

class TrustEvent(Base):
    __tablename__ = "trust_events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_type: Mapped[TrustSubjectType] = mapped_column(ENUM(TrustSubjectType, name='trust_subject_type', create_type=False), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    score_change: Mapped[float] = mapped_column(Numeric, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
