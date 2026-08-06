from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class Token(BaseModel):
    access_token: str
    token_type: str


class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)


class UserPasswordUpdate(BaseModel):
    current_password: str = Field(..., min_length=6, max_length=72)
    new_password: str = Field(..., min_length=6, max_length=72)


class UserResponse(UserBase):
    id: UUID
    is_admin: bool
    created_at: datetime
    pending_email: Optional[str] = None

    class Config:
        from_attributes = True


class UserSettingsBase(BaseModel):
    currency: str
    dashboard_notification: bool
    email_notification: bool
    language: str


class UserSettingsUpdate(BaseModel):
    currency: Optional[str] = None
    language: Optional[str] = None
    dashboard_notification: Optional[bool] = None
    email_notification: Optional[bool] = None


class EmailVerify(BaseModel):
    email: EmailStr
    code: str


class ResendVerification(BaseModel):
    email: EmailStr


class UserSettingsResponse(UserSettingsBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True
