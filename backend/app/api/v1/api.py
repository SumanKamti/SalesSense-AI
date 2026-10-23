from fastapi import APIRouter
from app.api.v1.endpoints import (
    analysis,
    auth,
    conversation,
    diarization,
    health,
    transcription,
    history,
    organization,
    analytics,
    export,
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
    organization.router,
    prefix="/organization",
    tags=["Organization & Team"]
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

api_router.include_router(
    analysis.router,
    prefix="/analysis",
    tags=["AI Analysis"]
)

api_router.include_router(
    history.router,
    prefix="/history",
    tags=["Call History"]
)

api_router.include_router(
    analytics.router,
    prefix="/analytics",
    tags=["Manager Analytics"]
)

api_router.include_router(
    export.router,
    prefix="/export",
    tags=["Data Export & Compliance"]
)