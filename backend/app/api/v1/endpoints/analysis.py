"""
AI Conversation Analysis endpoint.

POST /analyze — accepts a speaker-separated conversation and returns
structured Gemini analysis.
"""

import logging

from fastapi import APIRouter, HTTPException

from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_service import (
    AnalysisError,
    APIKeyMissingError,
    analyze_conversation,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest):
    """Analyze a sales conversation using Gemini AI."""

    try:
        # Convert Pydantic models to plain dicts for the service
        conversation = [turn.model_dump() for turn in request.conversation]

        result = analyze_conversation(conversation)

        return {"analysis": result}

    except APIKeyMissingError as exc:
        logger.error("Gemini API key missing: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="AI analysis service is not configured. "
                   "Please set GEMINI_API_KEY in the server environment.",
        )

    except AnalysisError as exc:
        logger.error("Analysis error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        logger.exception("Unexpected error during AI analysis.")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during AI analysis.",
        )
