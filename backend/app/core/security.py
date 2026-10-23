from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
import jwt
import uuid
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.database import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly, truncating to 72 bytes."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hash_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hash_bytes)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    jti = str(uuid.uuid4())
    to_encode.update({"exp": expire, "jti": jti})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    
    jti = payload.get("jti")
    if jti:
        from app.models.token_blacklist import TokenBlacklist
        blacklisted = db.query(TokenBlacklist).filter(TokenBlacklist.jti == jti).first()
        if blacklisted:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Try to extract user from JWT, but don't fail if not provided."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(User).filter(User.id == int(user_id)).first()
        return user
    except Exception:
        return None


def require_role(*allowed_roles: str):
    """Dependency factory that checks if current_user has one of the allowed roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role is one of {allowed_roles}, but your role is '{current_user.role}'.",
            )
        return current_user
    return role_checker


require_admin = require_role("admin")
require_admin_or_manager = require_role("admin", "manager")

def revoke_token(token: str, db: Session) -> None:
    """Add a token to the blacklist."""
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    jti = payload.get("jti")
    exp = payload.get("exp")
    if jti and exp:
        from app.models.token_blacklist import TokenBlacklist
        expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
        blacklist_entry = TokenBlacklist(jti=jti, expires_at=expires_at)
        db.add(blacklist_entry)
        db.commit()