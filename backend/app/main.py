import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.api import api_router
from app.services.diarization_service import load_pipeline
from app.services.whisper_service import load_whisper_model
from app.core.limiter import limiter
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Application lifespan — startup & shutdown hooks
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load heavy resources once at startup; clean up on shutdown."""

    # --- Startup ---
    from app.core.config import settings as app_settings

    if app_settings.DIARIZATION_ENGINE == "pyannote":
        try:
            load_pipeline()
        except Exception as exc:
            # Log but don't crash — the /diarize endpoint will return 503.
            logger.warning(
                "Diarization pipeline could not be loaded: %s. "
                "The /diarize endpoint will be unavailable.",
                exc,
            )
    else:
        logger.info(
            "Using '%s' diarization engine — skipping pyannote pipeline load.",
            app_settings.DIARIZATION_ENGINE,
        )

    try:
        load_whisper_model()
    except Exception as exc:
        logger.warning(
            "Whisper model could not be loaded: %s. ",
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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

from app.core.audit_middleware import audit_log_middleware

app.middleware("http")(audit_log_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
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