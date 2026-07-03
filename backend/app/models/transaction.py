import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum as SAEnum, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class TransactionType(str, enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"
    TRANSFER = "transfer"
    REFUND = "refund"
    WITHDRAWAL = "withdrawal"
    DEPOSIT = "deposit"
    PAYMENT = "payment"


class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(50), index=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    transaction_type: Mapped[TransactionType] = mapped_column(
        String(50), nullable=False
    )
    merchant: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_level: Mapped[RiskLevel] = mapped_column(
        String(50), default=RiskLevel.LOW
    )
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    # Dataset-specific fields
    fraud_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    velocity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    geo_anomaly_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    spending_deviation: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_used: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_channel: Mapped[str | None] = mapped_column(String(50), nullable=True)
