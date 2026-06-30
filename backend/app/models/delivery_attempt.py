import uuid
from sqlalchemy import String, Boolean, TIMESTAMP, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geography
from app.models.base import Base
from datetime import datetime
import enum

class DeliveryAttemptStatus(str, enum.Enum):
    successful = "successful"
    failed = "failed"
    customer_unavailable = "customer_unavailable"
    customer_refused = "customer_refused"
    wrong_location = "wrong_location"

class DeliveryAttempt(Base):
    __tablename__ = "delivery_attempts"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    rider_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[DeliveryAttemptStatus] = mapped_column(ENUM(DeliveryAttemptStatus, name='delivery_attempt_status', create_type=False), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    gps_point = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    attempt_time: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    evidence_required: Mapped[bool] = mapped_column(Boolean, default=True)
