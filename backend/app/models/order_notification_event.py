import uuid
from sqlalchemy import Integer, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime

class OrderNotificationEvent(Base):
    __tablename__ = "order_notification_events"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    status_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default="now()", nullable=False)

    __table_args__ = (
        UniqueConstraint('order_id', 'status_version', name='uq_order_notification_events_order_version'),
    )
