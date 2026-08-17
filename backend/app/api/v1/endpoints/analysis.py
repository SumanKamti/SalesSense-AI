import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.schemas.analysis import AnalysisRequest, AnalysisResponse
from app.services.analysis_service import (
    AnalysisError,
    APIKeyMissingError,
    analyze_conversation,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(
    request: AnalysisRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """Analyze a sales conversation using Gemini AI."""
    try:
        conversation = [turn.model_dump() for turn in request.conversation]
        result = analyze_conversation(conversation)

        # Save analysis to DB if conversation_id is provided and user is authenticated
        if request.conversation_id and current_user:
            db_conv = (
                db.query(Conversation)
                .filter(
                    Conversation.id == request.conversation_id,
                    Conversation.user_id == current_user.id,
                )
                .first()
            )
            if db_conv:
                db_conv.analysis_json = json.dumps(result)
                db_conv.sales_score = result.get("sales_score")
                db_conv.sentiment = result.get("sentiment")
                db.commit()

        return {"analysis": result}

    except APIKeyMissingError as exc:
        logger.error("Gemini API key missing: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="AI analysis service is not configured. Please set GEMINI_API_KEY in the server environment.",
        )
    except AnalysisError as exc:
        logger.error("Analysis error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during AI analysis.")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during AI analysis.",
        )
