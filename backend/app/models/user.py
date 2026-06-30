import uuid
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base
import enum

class UserRole(str, enum.Enum):
    owner = "owner"
    rider = "rider"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[UserRole] = mapped_column(ENUM(UserRole, name='user_role', create_type=False), nullable=False)
