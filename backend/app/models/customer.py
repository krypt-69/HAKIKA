import uuid
from sqlalchemy import String, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_original: Mapped[str] = mapped_column(String, nullable=False)
    phone_normalized: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    trust_score: Mapped[float] = mapped_column(Numeric(5,2), default=100)
