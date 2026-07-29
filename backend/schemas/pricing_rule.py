from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from backend.models.pricing_rule import (
    ValueTypeEnum,
    ComparisonOperatorEnum,
    PositionEnum,
    FrequencyEnum,
    EventTypeEnum,
    EventScopeEnum,
)

class PricingRuleBase(BaseModel):
    name: str
    is_enabled: bool = True
    is_equal: bool = False
    auto_update_price: bool = False
    value: Optional[float] = None
    value_type: Optional[ValueTypeEnum] = None
    comparison_operator: Optional[ComparisonOperatorEnum] = None
    position: PositionEnum
    frequency: Optional[FrequencyEnum] = None
    event_type: Optional[EventTypeEnum] = None
    event_scope: Optional[EventScopeEnum] = None
    competitor_id: Optional[UUID] = None

class PricingRuleCreate(PricingRuleBase):
    product_ids: Optional[List[UUID]] = None

class PricingRuleUpdate(BaseModel):
    name: Optional[str] = None
    is_enabled: Optional[bool] = None
    is_equal: Optional[bool] = None
    auto_update_price: Optional[bool] = None
    value: Optional[float] = None
    value_type: Optional[ValueTypeEnum] = None
    comparison_operator: Optional[ComparisonOperatorEnum] = None
    position: Optional[PositionEnum] = None
    frequency: Optional[FrequencyEnum] = None
    event_type: Optional[EventTypeEnum] = None
    event_scope: Optional[EventScopeEnum] = None
    competitor_id: Optional[UUID] = None
    product_ids: Optional[List[UUID]] = None

class PricingRuleResponse(PricingRuleBase):
    id: UUID
    user_id: UUID
    last_executed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    products_count: int = 0
    product_ids: List[UUID] = []

    model_config = ConfigDict(from_attributes=True)
