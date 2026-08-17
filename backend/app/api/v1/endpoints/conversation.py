import json
import logging
import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Header
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.models.conversation import Conversation
from app.models.user import User
from app.services.conversation_service import build_conversation
from app.services.diarization_service import (
    DiarizationError,
    PipelineNotLoadedError,
)

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024


def _get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    """Try to extract user from JWT, but don't fail if not provided."""
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


@router.post("/analyze")
async def analyze_conversation(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_get_optional_user),
):
    """Upload an audio file -> transcribe -> diarize -> merge -> return conversation."""

    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension.")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds limit.")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=UPLOAD_FOLDER)
    file_path = temp_file.name

    try:
        temp_file.write(contents)
        temp_file.close()

        conversation = build_conversation(file_path)

        # Save to database if user is authenticated
        conversation_id = None
        if current_user:
            # Auto-generate title from first transcript line
            title = "Untitled Call"
            if conversation and len(conversation) > 0:
                first_text = conversation[0].get("text", "")
                title = first_text[:80] + "..." if len(first_text) > 80 else first_text
                if not title.strip():
                    title = "Untitled Call"
            
            # Calculate duration from last turn's end time
            duration = None
            if conversation and len(conversation) > 0:
                last_turn = conversation[-1]
                duration = last_turn.get("end", None)

            db_conversation = Conversation(
                user_id=current_user.id,
                title=title,
                audio_filename=file.filename or "unknown",
                duration_seconds=duration,
                transcript_json=json.dumps(conversation),
            )
            db.add(db_conversation)
            db.commit()
            db.refresh(db_conversation)
            conversation_id = db_conversation.id

        return {
            "conversation": conversation,
            "conversation_id": conversation_id,
        }

    except PipelineNotLoadedError as exc:
        logger.error("Pipeline unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Diarization service is unavailable. The pipeline failed to load at startup.",
        )

    except DiarizationError as exc:
        logger.error("Diarization error: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    except Exception as exc:
        logger.exception("Unexpected error during conversation analysis.")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during conversation analysis.",
        )

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
