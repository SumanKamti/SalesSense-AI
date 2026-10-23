from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "SalesSense AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Database (PostgreSQL default, with SQLite fallback support)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/salessense_db"

    # Security
    SECRET_KEY: str = "salessense-secret-key-change-in-production-use"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # AI / Diarization
    HUGGINGFACE_TOKEN: str = ""
    DIARIZATION_MODEL: str = "pyannote/speaker-diarization-3.1"
    DIARIZATION_ENGINE: str = "lightweight"  # "lightweight" or "pyannote"

    # AI / Gemini Analysis
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode='after')
    def validate_secret_key(self) -> 'Settings':
        if self.SECRET_KEY == "salessense-secret-key-change-in-production-use":
            if not self.DEBUG:
                raise ValueError("SECURITY: SECRET_KEY must be changed from default in production. Set a secure SECRET_KEY in your .env file.")
            else:
                import warnings
                warnings.warn("SECURITY: Using default SECRET_KEY in debug mode. Do not use in production.")
        return self



settings = Settings()