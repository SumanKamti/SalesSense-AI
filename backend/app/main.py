from fastapi import FastAPI
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION
)

app.include_router(
    api_router,
    prefix="/api/v1"
)


@app.get("/")
def home():

    return {
        "Application": settings.APP_NAME,
        "Version": settings.APP_VERSION
    }