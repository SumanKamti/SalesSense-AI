import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.services.diarization_service import load_pipeline

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan — startup & shutdown hooks
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load heavy resources once at startup; clean up on shutdown."""

    # --- Startup ---
    try:
        load_pipeline()
    except Exception as exc:
        # Log but don't crash — the /diarize endpoint will return 503.
        logger.warning(
            "Diarization pipeline could not be loaded: %s. "
            "The /diarize endpoint will be unavailable.",
            exc,
        )

    yield  # application runs here

    # --- Shutdown ---
    logger.info("Application shutting down.")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    api_router,
    prefix="/api/v1",
)


@app.get("/")
def home():
    return {
        "Application": settings.APP_NAME,
        "Version": settings.APP_VERSION,
    }