"""
Pydantic schemas for Transaction endpoints — enhanced with dataset fields.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.transaction import TransactionType, RiskLevel


class TransactionCreate(BaseModel):
    account_id: str
    amount: float
    currency: str = "USD"
    transaction_type: str
    merchant: str | None = None
    location: str | None = None
    description: str | None = None
    timestamp: datetime | None = None
    # Dataset-specific fields
    fraud_type: Optional[str] = None
    velocity_score: Optional[float] = None
    geo_anomaly_score: Optional[float] = None
    spending_deviation: Optional[float] = None
    device_used: Optional[str] = None
    payment_channel: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    account_id: str
    amount: float
    currency: str
    transaction_type: str
    merchant: str | None
    location: str | None
    description: str | None
    anomaly_score: float
    risk_level: str
    is_anomaly: bool
    timestamp: datetime
    created_at: datetime
    # Dataset-specific fields
    fraud_type: str | None = None
    velocity_score: float | None = None
    geo_anomaly_score: float | None = None
    spending_deviation: float | None = None
    device_used: str | None = None
    payment_channel: str | None = None
    has_investigation: bool = False

    model_config = {"from_attributes": True}
