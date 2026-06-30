import uuid
from sqlalchemy import TIMESTAMP, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class AssignmentStatus(str, enum.Enum):
    assigned = "assigned"
    unassigned = "unassigned"

class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    rider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("riders.id"))
    assigned_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    status: Mapped[AssignmentStatus] = mapped_column(SAEnum(AssignmentStatus), default=AssignmentStatus.assigned)
