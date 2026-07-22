from fastapi import APIRouter
from sqlalchemy.orm import Session
from fastapi import Depends

from app.database.database import get_db

router = APIRouter()


@router.get("/database")
def database_health(db: Session = Depends(get_db)):

    return {
        "message": "Database session created successfully"
    }