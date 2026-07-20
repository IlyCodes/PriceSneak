from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=72)

class UserResponse(UserBase):
    id: UUID
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True
