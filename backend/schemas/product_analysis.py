from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProductAnalysisResponse(BaseModel):
    id: UUID
    product_id: UUID
    cheapest_price: Optional[float] = None
    avg_price: Optional[float] = None
    highest_price: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
