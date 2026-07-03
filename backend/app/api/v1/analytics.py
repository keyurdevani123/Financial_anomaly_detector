"""
Analytics API endpoints for dashboard charts and statistics.
GET /api/v1/analytics/risk-distribution   — Count by risk level
GET /api/v1/analytics/anomaly-timeline    — Anomalies by day (last 30 days)
GET /api/v1/analytics/fraud-type-stats    — Fraud type breakdown
GET /api/v1/analytics/account-stats       — Top accounts by anomaly count
GET /api/v1/analytics/pinecone-stats      — Pinecone index statistics
"""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, Integer, and_

from app.core.database import get_db
from app.models.transaction import Transaction, RiskLevel
from app.models.investigation import Investigation, InvestigationStatus

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/risk-distribution")
async def get_risk_distribution(db: AsyncSession = Depends(get_db)):
    """Distribution of transactions by risk level — for donut chart."""
    results = await db.execute(
        select(Transaction.risk_level, func.count(Transaction.id).label("count"))
        .where(Transaction.id.in_(select(Investigation.transaction_id)))
        .group_by(Transaction.risk_level)
    )
    rows = results.all()
    distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for row in rows:
        r_level = str(row.risk_level).lower() if row.risk_level else ""
        if r_level in distribution:
            distribution[r_level] = row.count
    total = sum(distribution.values())
    return {
        "data": distribution,
        "total": total,
        "anomaly_count": distribution["high"] + distribution["critical"],
    }


@router.get("/anomaly-timeline")
async def get_anomaly_timeline(months: int = 12, db: AsyncSession = Depends(get_db)):
    """Anomaly count by month for the last N months — for line/bar chart."""
    since = datetime.utcnow() - timedelta(days=months * 30)
    
    result = await db.execute(
        select(
            func.to_char(Transaction.timestamp, 'YYYY-MM').label("month"),
            func.count(Transaction.id).label("total"),
            func.sum(func.cast(Transaction.is_anomaly, type_=Integer)).label("anomalies")
        )
        .where(and_(
            Transaction.timestamp >= since,
            Transaction.id.in_(select(Investigation.transaction_id))
        ))
        .group_by(text("month"))
        .order_by(text("month"))
    )
    rows = result.all()
    
    # Build month-by-month dict
    timeline = {}
    for i in range(months):
        dt = datetime.utcnow() - timedelta(days=(months - 1 - i) * 30)
        month_str = dt.strftime("%Y-%m")
        timeline[month_str] = {"date": month_str, "total": 0, "anomalies": 0}
    
    for row in rows:
        m = str(row.month)
        if m in timeline:
            timeline[m]["total"] = row.total or 0
            timeline[m]["anomalies"] = int(row.anomalies or 0)
    
    return {"timeline": list(timeline.values()), "months": months}


@router.get("/location-stats")
async def get_location_stats(db: AsyncSession = Depends(get_db)):
    """Top locations by fraud count — for bar chart."""
    result = await db.execute(
        select(
            Transaction.location,
            func.count(Transaction.id).label("total"),
            func.sum(func.cast(Transaction.is_anomaly, type_=Integer)).label("fraud_count"),
        )
        .where(and_(
            Transaction.location.isnot(None),
            Transaction.id.in_(select(Investigation.transaction_id))
        ))
        .group_by(Transaction.location)
        .order_by(func.count(Transaction.id).desc())
        .limit(10)
    )
    rows = result.all()
    return {
        "locations": [
            {
                "location": row.location,
                "total": row.total,
                "fraud_count": int(row.fraud_count or 0),
                "fraud_rate": round(int(row.fraud_count or 0) / row.total * 100, 1) if row.total else 0,
            }
            for row in rows
        ]
    }


@router.get("/merchant-stats")
async def get_merchant_stats(db: AsyncSession = Depends(get_db)):
    """Top merchant categories by fraud count."""
    result = await db.execute(
        select(
            Transaction.merchant,
            func.count(Transaction.id).label("total"),
            func.sum(func.cast(Transaction.is_anomaly, type_=Integer)).label("fraud_count"),
        )
        .where(and_(
            Transaction.merchant.isnot(None),
            Transaction.id.in_(select(Investigation.transaction_id))
        ))
        .group_by(Transaction.merchant)
        .order_by(func.count(Transaction.id).desc())
        .limit(8)
    )
    rows = result.all()
    return {
        "merchants": [
            {
                "merchant": row.merchant,
                "total": row.total,
                "fraud_count": int(row.fraud_count or 0),
                "fraud_rate": round(int(row.fraud_count or 0) / row.total * 100, 1) if row.total else 0,
            }
            for row in rows
        ]
    }


@router.get("/account-stats")
async def get_account_stats(limit: int = 10, db: AsyncSession = Depends(get_db)):
    """Top accounts by anomaly count."""
    result = await db.execute(
        select(
            Transaction.account_id,
            func.count(Transaction.id).label("total_transactions"),
            func.sum(func.cast(Transaction.is_anomaly, type_=Integer)).label("anomaly_count"),
            func.avg(Transaction.anomaly_score).label("avg_score"),
        )
        .where(Transaction.id.in_(select(Investigation.transaction_id)))
        .group_by(Transaction.account_id)
        .order_by(func.sum(func.cast(Transaction.is_anomaly, type_=Integer)).desc())
        .limit(limit)
    )
    rows = result.all()
    return {
        "accounts": [
            {
                "account_id": row.account_id,
                "total_transactions": row.total_transactions,
                "anomaly_count": int(row.anomaly_count or 0),
                "avg_anomaly_score": round(float(row.avg_score or 0), 3),
            }
            for row in rows
        ]
    }


@router.get("/pinecone-stats")
async def get_pinecone_stats():
    """Pinecone vector index statistics."""
    try:
        from app.services.pinecone_service import get_index_stats
        stats = await get_index_stats()
        return {"status": "connected", **stats}
    except Exception as e:
        return {"status": "error", "error": str(e), "total_vector_count": 0}


@router.get("/overview")
async def get_overview(db: AsyncSession = Depends(get_db)):
    """Combined overview stats for dashboard header."""
    # Hardcode total_tx to 100 to match dashboard view as requested by user
    total_tx = 100
    
    # All other stats only reflect investigated transactions
    anomaly_tx = await db.scalar(
        select(func.count(Transaction.id)).where(and_(
            Transaction.is_anomaly == True,
            Transaction.id.in_(select(Investigation.transaction_id))
        ))
    ) or 0
    total_inv = await db.scalar(select(func.count(Investigation.id))) or 0
    completed_inv = await db.scalar(
        select(func.count(Investigation.id)).where(
            Investigation.status == InvestigationStatus.COMPLETED
        )
    ) or 0
    avg_confidence = await db.scalar(
        select(func.avg(Investigation.confidence_score)).where(
            Investigation.status == InvestigationStatus.COMPLETED
        )
    ) or 0.0
    critical_count = await db.scalar(
        select(func.count(Transaction.id)).where(and_(
            Transaction.risk_level == "critical",
            Transaction.id.in_(select(Investigation.transaction_id))
        ))
    ) or 0

    return {
        "total_transactions": total_tx,
        "anomaly_transactions": anomaly_tx,
        "total_investigations": total_inv,
        "completed_investigations": completed_inv,
        "avg_confidence_score": round(float(avg_confidence), 3),
        "critical_alerts": critical_count,
        "anomaly_rate": round(anomaly_tx / total_inv * 100, 2) if total_inv else 0,
    }
