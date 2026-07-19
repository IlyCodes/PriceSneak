import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.core.database import Base, TimestampMixin

class CompetitorProduct(Base, TimestampMixin):
    __tablename__ = "competitor_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    competitor_id = Column(UUID(as_uuid=True), ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False)
    product_url = Column(String(2048), nullable=False)
    current_price = Column(Numeric(10, 2), nullable=True)
    is_in_stock = Column(Boolean, default=True, nullable=False)
    last_scraped_at = Column(DateTime, nullable=True)

    # Relations ORM
    product = relationship("Product", back_populates="competitor_products")
    competitor = relationship("Competitor", back_populates="competitor_products")
    alerts = relationship("Alert", back_populates="competitor_product", cascade="all, delete-orphan")
