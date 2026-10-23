from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database.database import get_db

router = APIRouter()


@router.get("")
@router.get("/")
def health_check(db: Session = Depends(get_db)):
    """Verify application and database health."""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database connectivity check failed: {exc}")


@router.get("/database")
def database_health(db: Session = Depends(get_db)):
    return health_check(db)