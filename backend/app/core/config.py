from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Application
    APP_NAME: str
    APP_VERSION: str
    DEBUG: bool

    # Server
    HOST: str
    PORT: int

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # AI / Diarization
    HUGGINGFACE_TOKEN: str = ""
    DIARIZATION_MODEL: str = "pyannote/speaker-diarization-3.1"
    DIARIZATION_ENGINE: str = "lightweight"  # "lightweight" or "pyannote"

    # AI / Gemini Analysis
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()