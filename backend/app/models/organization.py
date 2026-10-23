from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    members = relationship("User", back_populates="organization", foreign_keys="User.organization_id")
    invitations = relationship("Invitation", back_populates="organization", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="organization")
