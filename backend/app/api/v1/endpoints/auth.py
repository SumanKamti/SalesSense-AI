from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import create_user

router = APIRouter()


@router.post(
    "/register",
    response_model=UserResponse
)
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    db_user = create_user(db, user)

    if db_user is None:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    return db_user