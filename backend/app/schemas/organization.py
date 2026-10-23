from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field


class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime
    member_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class InvitationCreate(BaseModel):
    email: Optional[EmailStr] = None
    role: str = Field(default="rep", pattern="^(manager|rep)$")
    max_uses: Optional[int] = Field(default=None, ge=1, le=1000, description="None = Unlimited uses")
    custom_code: Optional[str] = Field(default=None, min_length=3, max_length=50)


class InvitationResponse(BaseModel):
    id: int
    invite_code: str
    email: Optional[str] = None
    role: str
    max_uses: Optional[int] = None
    used_count: int = 0
    is_active: bool = True
    used: bool
    created_at: datetime
    expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    created_at: datetime
    call_count: int = 0
    avg_score: Optional[int] = None

    model_config = {"from_attributes": True}


class TeamMemberRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|manager|rep)$")


class RepStat(BaseModel):
    user_id: int
    full_name: str
    role: str
    call_count: int
    avg_score: Optional[int] = None
    last_call_at: Optional[datetime] = None


class TeamStatsResponse(BaseModel):
    total_calls: int
    avg_score: int
    total_members: int
    reps: List[RepStat]
