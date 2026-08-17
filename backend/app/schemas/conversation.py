from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ConversationListItem(BaseModel):
    id: int
    title: str
    audio_filename: Optional[str] = None
    duration_seconds: Optional[float] = None
    sales_score: Optional[int] = None
    sentiment: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

class ConversationDetail(ConversationListItem):
    transcript_json: Optional[str] = None
    analysis_json: Optional[str] = None
