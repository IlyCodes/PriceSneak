import datetime
import uuid
import enum
from sqlalchemy import Column, Boolean, Numeric, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.core.database import Base, TimestampMixin


class ValueTypeEnum(str, enum.Enum):
    PERCENTAGE = "percentage"
    AMOUNT = "amount"


class ComparisonOperatorEnum(str, enum.Enum):
    LOWER_THAN = "lower_than"
    HIGHER_THAN = "higher_than"


class PositionEnum(str, enum.Enum):
    CHEAPEST = "cheapest"
    AVG = "avg"
    HIGHEST = "highest"


class FrequencyEnum(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class EventTypeEnum(str, enum.Enum):
    PRICE_DROP = "price_drop"
    PRICE_INCREASE = "price_increase"


class EventScopeEnum(str, enum.Enum):
    COMPETITOR = "competitor"
    MARKET_AVERAGE = "market_average"


class PricingRule(Base, TimestampMixin):
    __tablename__ = "pricing_rules"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String(255), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    is_equal = Column(Boolean, default=False, nullable=False)
    auto_update_price = Column(Boolean, default=False, nullable=False)
    value = Column(Numeric(10, 2), nullable=True)

    value_type = Column(SQLEnum(ValueTypeEnum), nullable=True)
    comparison_operator = Column(SQLEnum(ComparisonOperatorEnum), nullable=True)
    position = Column(SQLEnum(PositionEnum), nullable=False)
    frequency = Column(SQLEnum(FrequencyEnum), nullable=True)
    event_type = Column(SQLEnum(EventTypeEnum), nullable=True)
    event_scope = Column(SQLEnum(EventScopeEnum), nullable=True)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id", ondelete="SET NULL"), nullable=True)
    last_executed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="pricing_rules")

    # Une règle s'applique à N produits (relation inversée)
    products = relationship("Product", back_populates="pricing_rule")
