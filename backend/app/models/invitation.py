from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    invite_code = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)  # Optional restriction to specific email
    role = Column(String(50), default="rep", nullable=False)  # "manager" or "rep"
    
    # Reusable & Capacity Tracking
    max_uses = Column(Integer, nullable=True, default=None)  # None = Unlimited
    used_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    
    used = Column(Boolean, default=False, nullable=False)  # True when capacity reached or revoked
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Last user or initial redeemer
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    organization = relationship("Organization", back_populates="invitations")
    used_by = relationship("User", foreign_keys=[used_by_id])
