import uuid
from sqlalchemy import String, Integer, TIMESTAMP, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
from datetime import datetime

class OrderNotification(Base):
    __tablename__ = "order_notifications"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    unread_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default="now()", nullable=False)

    __table_args__ = (
        UniqueConstraint('customer_id', 'order_id', name='uq_order_notifications_customer_order'),
    )
