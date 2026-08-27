import uuid
from sqlalchemy import String, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class BusinessRiderStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    inactive = "inactive"

class BusinessRider(Base):
    __tablename__ = "business_riders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False)
    rider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("riders.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default='pending')
