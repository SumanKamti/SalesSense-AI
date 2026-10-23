from datetime import timedelta, datetime, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, get_current_user, oauth2_scheme
from app.database.database import get_db
from app.models.user import User
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import authenticate_user, create_user

router = APIRouter()

# In-memory password reset tokens (production should use DB + email)
_reset_tokens = {}  # {token: {email, expires_at}}


def _format_user_response(user: User) -> dict:
    org_name = user.organization.name if user.organization else None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "organization_id": user.organization_id,
        "organization_name": org_name,
        "created_at": user.created_at,
    }


@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = create_user(db, user)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )
    return _format_user_response(db_user)


@router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = authenticate_user(db, user.email, user.password)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    access_token = create_access_token(
        data={"sub": str(db_user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _format_user_response(current_user)

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Logout and revoke the current JWT token."""
    from app.core.security import revoke_token
    try:
        revoke_token(token, db)
    except Exception:
        pass  # Token may already be expired/invalid
    return {"message": "Successfully logged out"}


@router.post("/forgot-password")
def forgot_password(payload: dict, db: Session = Depends(get_db)):
    """Request a password reset. Returns a reset token (in production, this would be emailed)."""
    email = payload.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    user = db.query(User).filter(User.email == email).first()
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Generate reset token
    token = secrets.token_urlsafe(32)
    _reset_tokens[token] = {
        "email": email,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    
    # In production, send email with reset link
    # For development, return the token directly
    return {
        "message": "If an account with that email exists, a password reset link has been sent.",
        "reset_token": token,  # Remove in production
    }


@router.post("/reset-password")
def reset_password(payload: dict, db: Session = Depends(get_db)):
    """Reset password using a reset token."""
    token = payload.get("token", "").strip()
    new_password = payload.get("new_password", "")
    
    if not token or not new_password:
        raise HTTPException(status_code=400, detail="Token and new_password are required.")
    
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    
    token_data = _reset_tokens.get(token)
    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    
    if datetime.now(timezone.utc) > token_data["expires_at"]:
        del _reset_tokens[token]
        raise HTTPException(status_code=400, detail="Reset token has expired.")
    
    user = db.query(User).filter(User.email == token_data["email"]).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token.")
    
    from app.core.security import hash_password
    user.hashed_password = hash_password(new_password)
    db.commit()
    
    # Clean up used token
    del _reset_tokens[token]
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}