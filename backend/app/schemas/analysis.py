"""
Pydantic schemas for the AI Conversation Analysis endpoint.
"""

from typing import List

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request
# ---------------------------------------------------------------------------

class ConversationTurn(BaseModel):
    """A single turn in the conversation."""
    speaker: str
    text: str


class AnalysisRequest(BaseModel):
    """Request body for POST /analysis/analyze."""
    conversation: List[ConversationTurn] = Field(
        ..., min_length=1, description="Speaker-separated conversation turns."
    )
    conversation_id: int | None = None



# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class AnalysisResult(BaseModel):
    """Structured analysis returned by Gemini."""
    summary: str
    sentiment: str  # "Positive", "Neutral", or "Negative"
    sales_score: int = Field(..., ge=0, le=100)
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]


class AnalysisResponse(BaseModel):
    """Response body for POST /analysis/analyze."""
    analysis: AnalysisResult
