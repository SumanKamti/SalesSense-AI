from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True, index=True)

    full_name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password = Column(String(255), nullable=False)

    role = Column(
        String(50),
        default="rep",
        nullable=False
    )  # "admin", "manager", "rep"

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    organization = relationship("Organization", back_populates="members", foreign_keys=[organization_id])
    conversations = relationship("Conversation", back_populates="user")