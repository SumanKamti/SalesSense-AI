from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from app.services.whisper_service import transcribe_audio
from app.core.security import get_current_user
from app.models.user import User
from app.core.limiter import limiter
import tempfile
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter()
UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024

@router.post("/transcribe")
@limiter.limit("5/minute")
async def transcribe(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
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

        transcript = transcribe_audio(file_path)
        return {
            "transcript": transcript
        }
    except Exception as exc:
        logger.exception("Unexpected error during transcription.")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during transcription.",
        )
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)