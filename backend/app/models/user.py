from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    nickname: str = Field(..., min_length=2, max_length=30)
    email: EmailStr
    role: str = "user"

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    nickname: str = Field(..., min_length=2, max_length=30)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    nickname: Optional[str] = Field(None, min_length=2, max_length=30)
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class PasswordReset(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    username: str
    nickname: str
    email: EmailStr
    role: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    role: str
