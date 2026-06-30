import uuid
from sqlalchemy import String, Text, TIMESTAMP, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime
import enum

class NotificationTypeEnum(str, enum.Enum):
    pwa_push = "pwa_push"
    sms = "sms"
    whatsapp = "whatsapp"

class RecipientTypeEnum(str, enum.Enum):
    customer = "customer"
    business = "business"
    rider = "rider"

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    recipient_type: Mapped[RecipientTypeEnum] = mapped_column(SAEnum(RecipientTypeEnum), nullable=False)
    type: Mapped[NotificationTypeEnum] = mapped_column(SAEnum(NotificationTypeEnum), nullable=False)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="sent")
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)
