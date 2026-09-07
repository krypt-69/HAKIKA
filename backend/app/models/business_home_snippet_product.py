from sqlalchemy import Integer, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
import uuid

class BusinessHomeSnippetProduct(Base):
    __tablename__ = "business_home_snippet_products"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snippet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("business_home_snippets.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        UniqueConstraint('snippet_id', 'position', name='uq_snippet_position'),
        UniqueConstraint('snippet_id', 'product_id', name='uq_snippet_product'),
        CheckConstraint('position BETWEEN 1 AND 5', name='ck_snippet_position_1_5'),
    )
