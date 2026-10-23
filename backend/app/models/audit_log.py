from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from app.database.base import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)  # e.g., 'login', 'export', 'delete', 'role_change'
    resource_type = Column(String(50), nullable=True)  # e.g., 'call', 'user', 'organization'
    resource_id = Column(String(50), nullable=True)  # ID of the affected resource
    details = Column(Text, nullable=True)  # Additional context
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
