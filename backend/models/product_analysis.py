import uuid
from sqlalchemy import Column, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.core.database import Base, TimestampMixin


class ProductAnalysis(Base, TimestampMixin):
    __tablename__ = "product_analysis"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    product_id = Column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    cheapest_price = Column(Numeric(10, 2), nullable=True)
    avg_price = Column(Numeric(10, 2), nullable=True)
    highest_price = Column(Numeric(10, 2), nullable=True)

    product = relationship("Product", back_populates="analysis")
