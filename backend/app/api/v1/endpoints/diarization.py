from fastapi import APIRouter, File, HTTPException, UploadFile
import logging
import os
import tempfile

from app.services.diarization_service import (
    DiarizationError,
    PipelineNotLoadedError,
    diarize_audio,
)

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}
MAX_FILE_SIZE = 50 * 1024 * 1024

@router.post("/diarize")
async def diarize(file: UploadFile = File(...)):
    """Upload an audio file and receive speaker-segmented diarization."""

    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file extension.")
    
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds limit.")

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext, dir=UPLOAD_FOLDER)
    file_path = temp_file.name

    try:
        # ---- persist the uploaded file ----
        temp_file.write(contents)
        temp_file.close()

        # ---- run diarization ----
        segments = diarize_audio(file_path)

        return {"speakers": segments}

    except PipelineNotLoadedError as exc:
        logger.error("Pipeline unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="Diarization service is unavailable. "
                   "The pipeline failed to load at startup.",
        )

    except DiarizationError as exc:
        logger.error("Diarization error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        logger.exception("Unexpected error during diarization.")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during diarization.",
        )

    finally:
        # ---- clean up the temporary file ----
        if os.path.exists(file_path):
            os.remove(file_path)