import logging
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.base import Base
import app.models  # Ensure models are imported for metadata creation

logger = logging.getLogger(__name__)

# Keep terminal clean and readable: mute verbose SQL execution output
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Normalize legacy postgres:// URI schema if provided
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Configure engine arguments based on dialect
if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    # PostgreSQL / other production DBs: enable robust connection pooling
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=False,
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """Dependency for providing a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all database tables if they do not exist."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.warning("Could not automatically initialize database tables: %s", exc)


# Initialize tables on load
init_db()