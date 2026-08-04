from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    conversation,
    diarization,
    health,
    transcription,
)

api_router = APIRouter()

api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"]
)

api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

api_router.include_router(
    transcription.router,
    prefix="/transcription",
    tags=["Transcription"]
)

api_router.include_router(
    diarization.router,
    prefix="/diarization",
    tags=["Speaker Diarization"]
)

api_router.include_router(
    conversation.router,
    prefix="/conversation",
    tags=["Conversation Analysis"]
)