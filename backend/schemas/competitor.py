from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CompetitorBase(BaseModel):
    name: str
    domain_url: str


class CompetitorResponse(CompetitorBase):
    id: UUID

    class Config:
        from_attributes = True


class CompetitorProductCreate(BaseModel):
    product_url: HttpUrl


class CompetitorProductResponse(BaseModel):
    id: UUID
    product_id: UUID
    product_url: str
    current_price: Optional[float] = None
    is_in_stock: bool
    last_scraped_at: Optional[datetime] = None
    competitor: CompetitorResponse

    class Config:
        from_attributes = True


class PriceHistoryPoint(BaseModel):
    recorded_at: datetime
    price: float


class PriceHistoryResponse(BaseModel):
    competitor_product_id: UUID
    history: List[PriceHistoryPoint]
