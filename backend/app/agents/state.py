"""
LangGraph State Definition
TypedDict that flows through every node in the investigation graph.
"""
from typing import TypedDict, Annotated, Optional
import operator


class InvestigationState(TypedDict):
    # Input — core transaction fields
    transaction_id: str
    account_id: str
    amount: float
    currency: str
    transaction_type: str
    merchant: str
    location: str
    description: str
    timestamp: str

    # Input — dataset-specific enrichment fields
    velocity_score: Optional[float]
    geo_anomaly_score: Optional[float]
    spending_deviation: Optional[float]
    fraud_type: Optional[str]
    device_used: Optional[str]
    payment_channel: Optional[str]

    # Stage 1 — Anomaly Detection
    anomaly_score: float          # 0.0 → 1.0
    anomaly_flags: list[str]      # e.g. ["large_amount", "high_velocity", "geo_anomaly"]
    is_anomaly: bool

    # Stage 2 — Data Retrieval
    historical_patterns: list[dict]   # from Pinecone RAG
    similar_cases: list[dict]          # raw Pinecone matches

    # Stage 3 — Root Cause Analysis
    root_cause: str
    explanation: str

    # Stage 4 — Reflection Loop
    confidence_score: float        # LLM self-scores its own explanation
    rerun_count: int               # guard against infinite loops
    query_expansion: str           # expanded query for retry

    # Stage 5 — Report Generation
    final_report: str
    recommended_actions: list[str]
    risk_level: str                # "low" | "medium" | "high" | "critical"

    # Meta
    investigation_id: str
    error: str | None
