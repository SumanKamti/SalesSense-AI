from fastapi import APIRouter, File, HTTPException, UploadFile
import logging
import os
import shutil

from app.services.diarization_service import (
    DiarizationError,
    PipelineNotLoadedError,
    diarize_audio,
)

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@router.post("/diarize")
async def diarize(file: UploadFile = File(...)):
    """Upload an audio file and receive speaker-segmented diarization."""

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    try:
        # ---- persist the uploaded file ----
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

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