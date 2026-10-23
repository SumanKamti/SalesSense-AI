from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)
    organization_name: Optional[str] = Field(None, max_length=200)
    invite_code: Optional[str] = Field(None, max_length=64)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: str
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: int | None = None