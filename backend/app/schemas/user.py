from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=32)
    nickname: Optional[str] = None


class UserLogin(BaseModel):
    username_or_email: str
    password: str


class UserOut(BaseModel):
    id: str
    username: str
    nickname: Optional[str] = None
    email: EmailStr
    avatar_url: Optional[str] = None
    target_role: Optional[str] = None
    role_detail: Optional[str] = None
    tech_stack: Optional[str] = None
    target_company: Optional[str] = None
    job_description: Optional[str] = None
    graduation_year: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    target_role: Optional[str] = None
    role_detail: Optional[str] = None
    tech_stack: Optional[str] = None
    target_company: Optional[str] = None
    job_description: Optional[str] = None
    graduation_year: Optional[int] = None
