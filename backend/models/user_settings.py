import uuid
import enum
from sqlalchemy import Column, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from backend.core.database import Base, TimestampMixin


class CurrencyEnum(str, enum.Enum):
    USD = "USD"
    MAD = "MAD"
    EUR = "EUR"


class LanguageEnum(str, enum.Enum):
    AR = "AR"
    ENG = "ENG"
    FR = "FR"


class UserSettings(Base, TimestampMixin):
    __tablename__ = "user_settings"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        unique=True,
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    currency = Column(SQLEnum(CurrencyEnum), default=CurrencyEnum.USD, nullable=False)
    dashboard_notification = Column(Boolean, default=True, nullable=False)
    email_notification = Column(Boolean, default=True, nullable=False)
    language = Column(SQLEnum(LanguageEnum), default=LanguageEnum.ENG, nullable=False)

    user = relationship("User", back_populates="settings")
