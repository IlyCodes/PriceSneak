from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime

class FAQBase(BaseModel):
    question: str
    answer: str
    is_active: bool = True

class FAQCreate(FAQBase):
    pass

class FAQUpdate(BaseModel):
    question: str | None = None
    answer: str | None = None
    is_active: bool | None = None

class FAQResponse(FAQBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ChatMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
