import uuid
from sqlalchemy import Column, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.core.database import Base, TimestampMixin

class Competitor(Base, TimestampMixin):
    __tablename__ = "competitors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    domain_url = Column(String(255), unique=True, nullable=False)

    competitor_products = relationship("CompetitorProduct", back_populates="competitor", cascade="all, delete-orphan")
