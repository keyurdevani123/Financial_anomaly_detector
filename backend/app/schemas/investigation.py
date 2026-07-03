"""
Pydantic schemas for Investigation endpoints — enhanced with dataset fields.
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel
from app.models.investigation import InvestigationStatus


class InvestigateRequest(BaseModel):
    transaction_id: str
    account_id: str
    amount: float
    currency: str = "USD"
    transaction_type: str = "debit"
    merchant: str = "Unknown"
    location: str = "Unknown"
    description: str = ""
    timestamp: str = ""
    # Dataset-specific enrichment fields
    fraud_type: Optional[str] = None
    velocity_score: Optional[float] = None
    geo_anomaly_score: Optional[float] = None
    spending_deviation: Optional[float] = None
    device_used: Optional[str] = None
    payment_channel: Optional[str] = None


class InvestigationResponse(BaseModel):
    id: str
    transaction_id: str
    account_id: str
    status: InvestigationStatus
    anomaly_score: float
    confidence_score: float
    rerun_count: int
    explanation: str | None
    root_cause: str | None
    final_report: str | None
    recommended_actions: list | None
    similar_cases: list | None
    anomaly_flags: list | None = None
    risk_level: str | None = None
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvestigationSummary(BaseModel):
    id: str
    transaction_id: str
    account_id: str
    status: InvestigationStatus
    anomaly_score: float
    confidence_score: float
    rerun_count: int
    started_at: datetime
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
