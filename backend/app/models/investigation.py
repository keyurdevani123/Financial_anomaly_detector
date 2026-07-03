import enum
from datetime import datetime
from sqlalchemy import String, Float, DateTime, Enum as SAEnum, Text, Integer, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


class InvestigationStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    transaction_id: Mapped[str] = mapped_column(String(36), index=True)
    account_id: Mapped[str] = mapped_column(String(50), index=True)

    # Agent state
    status: Mapped[InvestigationStatus] = mapped_column(
        SAEnum(InvestigationStatus, name="investigationstatus", create_constraint=True),
        default=InvestigationStatus.PENDING
    )
    anomaly_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    rerun_count: Mapped[int] = mapped_column(Integer, default=0)
    risk_level: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Analysis output
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    final_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_actions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    similar_cases: Mapped[list | None] = mapped_column(JSON, nullable=True)
    anomaly_flags: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
