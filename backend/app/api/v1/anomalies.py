"""
Anomaly Investigation API endpoints
POST /api/v1/anomalies/investigate  — Trigger a full investigation
GET  /api/v1/anomalies/             — List all investigations
GET  /api/v1/anomalies/stats        — Dashboard statistics
GET  /api/v1/anomalies/{id}         — Get investigation details
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.core.database import get_db
from app.models.investigation import Investigation, InvestigationStatus
from app.models.transaction import Transaction, RiskLevel
from app.schemas.investigation import InvestigateRequest, InvestigationResponse, InvestigationSummary
from app.agents.graph import run_investigation

router = APIRouter(prefix="/anomalies", tags=["Anomaly Investigations"])


async def _run_investigation_task(
    investigation_id: str,
    request_data: dict,
) -> None:
    """Background task that runs the full LangGraph pipeline."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            # Update status to running
            result = await db.execute(
                select(Investigation).where(Investigation.id == investigation_id)
            )
            inv = result.scalar_one_or_none()
            if not inv:
                return

            inv.status = InvestigationStatus.RUNNING
            await db.commit()

            # Run the full agent graph
            final_state = await run_investigation(request_data, investigation_id)

            # Determine risk level from anomaly score
            score = final_state.get("anomaly_score", 0.0)
            reported_risk = final_state.get("risk_level", "")
            if reported_risk in ("low", "medium", "high", "critical"):
                risk_level = reported_risk
            else:
                risk_level = ("critical" if score >= 0.85 else
                              "high" if score >= 0.7 else
                              "medium" if score >= 0.4 else "low")

            # Save investigation results
            inv.status = InvestigationStatus.COMPLETED
            inv.anomaly_score = score
            inv.confidence_score = final_state.get("confidence_score", 0.0)
            inv.rerun_count = final_state.get("rerun_count", 0)
            inv.explanation = final_state.get("explanation", "")
            inv.root_cause = final_state.get("root_cause", "")
            inv.final_report = final_state.get("final_report", "")
            inv.recommended_actions = final_state.get("recommended_actions", [])
            inv.similar_cases = final_state.get("similar_cases", [])
            inv.anomaly_flags = final_state.get("anomaly_flags", [])
            inv.risk_level = risk_level
            inv.completed_at = datetime.utcnow()

            # Update the linked transaction
            tx_result = await db.execute(
                select(Transaction).where(Transaction.id == request_data["transaction_id"])
            )
            tx = tx_result.scalar_one_or_none()
            if tx:
                tx.anomaly_score = score
                tx.is_anomaly = final_state.get("is_anomaly", False)
                tx.risk_level = risk_level

            await db.commit()

        except Exception as e:
            await db.rollback()
            result = await db.execute(
                select(Investigation).where(Investigation.id == investigation_id)
            )
            inv = result.scalar_one_or_none()
            if inv:
                inv.status = InvestigationStatus.FAILED
                inv.completed_at = datetime.utcnow()
                await db.commit()
            print(f"[Investigation] Failed {investigation_id}: {e}")


@router.post("/investigate", response_model=InvestigationSummary, status_code=202)
async def trigger_investigation(
    request: InvestigateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger an autonomous financial anomaly investigation."""
    investigation_id = str(uuid.uuid4())

    inv = Investigation(
        id=investigation_id,
        transaction_id=request.transaction_id,
        account_id=request.account_id,
        status=InvestigationStatus.PENDING,
        anomaly_score=0.0,
        confidence_score=0.0,
        rerun_count=0,
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow(),
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    # Queue the investigation as a background task
    background_tasks.add_task(
        _run_investigation_task,
        investigation_id,
        request.model_dump(),
    )

    return inv


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Dashboard statistics."""
    total_inv = await db.scalar(select(func.count(Investigation.id))) or 0
    completed = await db.scalar(
        select(func.count(Investigation.id)).where(
            Investigation.status == InvestigationStatus.COMPLETED
        )
    ) or 0
    running = await db.scalar(
        select(func.count(Investigation.id)).where(
            Investigation.status == InvestigationStatus.RUNNING
        )
    ) or 0
    anomalies = await db.scalar(
        select(func.count(Investigation.id)).where(
            Investigation.anomaly_score >= 0.6
        )
    ) or 0
    avg_confidence = await db.scalar(
        select(func.avg(Investigation.confidence_score)).where(
            Investigation.status == InvestigationStatus.COMPLETED
        )
    ) or 0.0
    avg_reruns = await db.scalar(
        select(func.avg(Investigation.rerun_count)).where(
            Investigation.status == InvestigationStatus.COMPLETED
        )
    ) or 0.0

    return {
        "total_investigations": total_inv,
        "completed": completed,
        "running": running,
        "anomalies_detected": anomalies,
        "avg_confidence_score": round(float(avg_confidence), 3),
        "avg_rerun_count": round(float(avg_reruns), 2),
    }


@router.get("/", response_model=list[InvestigationSummary])
async def list_investigations(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if status and status in ("pending", "running", "completed", "failed"):
        filters.append(Investigation.status == InvestigationStatus(status))

    stmt = (
        select(Investigation)
        .where(*filters if filters else [True])
        .order_by(Investigation.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{investigation_id}", response_model=InvestigationResponse)
async def get_investigation(
    investigation_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Investigation).where(Investigation.id == investigation_id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv
