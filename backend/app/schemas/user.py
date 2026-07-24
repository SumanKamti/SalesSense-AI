from pydantic import BaseModel, EmailStr
from datetime import datetime
class UserBase(BaseModel):
    full_name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime
    model_config = {
        "from_attributes": True
    }