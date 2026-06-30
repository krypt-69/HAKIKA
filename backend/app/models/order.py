import uuid
from sqlalchemy import String, Numeric, Boolean, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from geoalchemy2 import Geography
from app.models.base import Base
from datetime import datetime

class Order(Base):
    __tablename__ = "orders"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"))
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    status: Mapped[str] = mapped_column(String, nullable=False, default="created")  # ENUM in DB
    subtotal: Mapped[float] = mapped_column(Numeric, nullable=False)
    delivery_fee: Mapped[float] = mapped_column(Numeric, nullable=False, default=0)
    total_amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    delivery_coordinates = mapped_column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    requires_deposit: Mapped[bool] = mapped_column(Boolean, default=False)
    deposit_amount: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, default=datetime.utcnow)

class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"))
    product_name: Mapped[str] = mapped_column(String, nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
