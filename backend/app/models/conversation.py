from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="Untitled Call")
    audio_filename = Column(String(255))
    duration_seconds = Column(Float, nullable=True)
    transcript_json = Column(Text, nullable=True)  
    analysis_json = Column(Text, nullable=True)   
    sales_score = Column(Integer, nullable=True)
    sentiment = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
