from fastapi import APIRouter, UploadFile, File
from app.services.whisper_service import transcribe_audio
import shutil
import os

router = APIRouter()
UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    transcript = transcribe_audio(file_path)
    return {
        "transcript": transcript
    }