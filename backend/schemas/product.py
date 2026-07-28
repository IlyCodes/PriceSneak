from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from backend.schemas.product_analysis import ProductAnalysisResponse


class ProductBase(BaseModel):
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    my_current_price: Optional[float] = None
    cost_price: float
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=255)
    brand: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    my_current_price: Optional[float] = None
    cost_price: Optional[float] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: UUID
    user_id: UUID
    rule_id: Optional[UUID] = None
    analysis: Optional[ProductAnalysisResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedProductResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    size: int
    pages: int
