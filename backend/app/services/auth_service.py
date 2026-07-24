from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import hash_password


def create_user(db: Session, user: UserCreate):
    """
    Create a new user account.
    Returns:
        User object if successful.
    Returns None if email already exists.
    """
    
    existing_user = (
        db.query(User)
        .filter(User.email == user.email)
        .first()
    )

    if existing_user:
        return None

    db_user = User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hash_password(user.password)
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user