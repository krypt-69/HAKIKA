import uuid
from datetime import datetime
from sqlalchemy import String, Text, Numeric, Boolean, TIMESTAMP, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
import enum

class SellingUnit(str, enum.Enum):
    PIECE = "Piece"
    KG = "Kg"
    GRAM = "Gram"
    LITRE = "Litre"
    MILLILITRE = "Millilitre"
    METRE = "Metre"
    PAIR = "Pair"
    SET = "Set"
    PACK = "Pack"
    OTHER = "Other"


class Product(Base):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id"))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    original_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    discount_price: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    currency: Mapped[str] = mapped_column(String(3), default='KES')
    selling_unit: Mapped[str] = mapped_column(String(50), default=SellingUnit.PIECE.value)
    track_inventory: Mapped[bool] = mapped_column(Boolean, default=False)
    stock_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_order_quantity: Mapped[int] = mapped_column(Integer, default=1)
    max_order_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    category_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("product_categories.id"), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, server_default='NOW()')
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
