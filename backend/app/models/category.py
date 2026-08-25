from sqlalchemy import String, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base

class Category(Base):
    __tablename__ = "categories"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    acceptance_timeout_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    requires_deposit: Mapped[bool] = mapped_column(Boolean, default=False)
