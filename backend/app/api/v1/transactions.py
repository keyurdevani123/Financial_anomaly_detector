"""
Transaction CRUD endpoints — list, create, seed, delete, filter
"""
import uuid
import csv
import io
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.transaction import Transaction, TransactionType, RiskLevel
from app.schemas.transaction import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/transactions", tags=["Transactions"])

DATASET_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'filtered_dataset.csv')


@router.post("/", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
):
    # Map CSV transaction types to our enum
    tx_type_map = {
        "withdrawal": TransactionType.WITHDRAWAL,
        "deposit": TransactionType.DEPOSIT,
        "payment": TransactionType.PAYMENT,
        "transfer": TransactionType.TRANSFER,
        "debit": TransactionType.DEBIT,
        "credit": TransactionType.CREDIT,
        "refund": TransactionType.REFUND,
    }
    
    tx = Transaction(
        id=str(uuid.uuid4()),
        account_id=data.account_id,
        amount=data.amount,
        currency=data.currency,
        transaction_type=data.transaction_type,
        merchant=data.merchant,
        location=data.location,
        description=data.description,
        timestamp=data.timestamp or datetime.utcnow(),
        anomaly_score=0.0,
        risk_level=RiskLevel.LOW,
        is_anomaly=False,
        fraud_type=data.fraud_type,
        velocity_score=data.velocity_score,
        geo_anomaly_score=data.geo_anomaly_score,
        spending_deviation=data.spending_deviation,
        device_used=data.device_used,
        payment_channel=data.payment_channel,
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)
    return tx


@router.get("/", response_model=list[TransactionResponse])
async def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    risk_level: Optional[str] = Query(None),
    is_anomaly: Optional[bool] = Query(None),
    account_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if risk_level and risk_level in ("low", "medium", "high", "critical"):
        filters.append(Transaction.risk_level == RiskLevel(risk_level))
    if is_anomaly is not None:
        filters.append(Transaction.is_anomaly == is_anomaly)
    if account_id:
        filters.append(Transaction.account_id == account_id)

    stmt = (
        select(Transaction)
        .where(and_(*filters) if filters else True)
        .order_by(Transaction.timestamp.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    txs = result.scalars().all()
    
    if not txs:
        return []
        
    from app.models.investigation import Investigation
    tx_ids = [t.id for t in txs]
    inv_stmt = select(Investigation.transaction_id).where(Investigation.transaction_id.in_(tx_ids))
    inv_res = await db.execute(inv_stmt)
    investigated_ids = set(inv_res.scalars().all())
    
    response = []
    for t in txs:
        t_dict = TransactionResponse.model_validate(t).model_dump()
        t_dict["has_investigation"] = t.id in investigated_ids
        response.append(t_dict)
        
    return response


@router.get("/count")
async def count_transactions(db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    # Use Postgres system table for instant approximate count of large tables
    count = await db.scalar(text("SELECT reltuples::bigint FROM pg_class WHERE relname = 'transactions'"))
    
    # Fallback to exact count if the estimate is somehow 0 (e.g. table just created and not analyzed yet)
    if not count:
        from sqlalchemy import func, select
        from app.models.transaction import Transaction
        count = await db.scalar(select(func.count(Transaction.id)))
        
    return {"count": count or 0}


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(transaction_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Transaction).where(Transaction.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    await db.delete(tx)
    await db.commit()
    return None


@router.post("/seed-demo", summary="Seed demo transactions for testing")
async def seed_demo_transactions(db: AsyncSession = Depends(get_db)):
    """Create realistic demo transactions including both normal and anomalous ones."""
    demos = [
        # Anomalous — high value, unusual location
        {"account_id": "ACC-001", "amount": 45000, "currency": "USD", "transaction_type": "payment",
         "merchant": "online", "location": "Dubai", "description": "High-value online purchase",
         "velocity_score": 9, "geo_anomaly_score": 0.92, "spending_deviation": 3.5},
        # Normal
        {"account_id": "ACC-001", "amount": 12.99, "currency": "USD", "transaction_type": "payment",
         "merchant": "entertainment", "location": "New York", "description": "Monthly subscription"},
        # Suspicious — multiple rapid withdrawals
        {"account_id": "ACC-002", "amount": 500, "currency": "USD", "transaction_type": "withdrawal",
         "merchant": "other", "location": "New York", "description": "ATM withdrawal 1",
         "velocity_score": 8, "geo_anomaly_score": 0.3, "spending_deviation": -0.5},
        {"account_id": "ACC-002", "amount": 500, "currency": "USD", "transaction_type": "withdrawal",
         "merchant": "other", "location": "New York", "description": "ATM withdrawal 2",
         "velocity_score": 9, "geo_anomaly_score": 0.35, "spending_deviation": -0.4},
        {"account_id": "ACC-002", "amount": 500, "currency": "USD", "transaction_type": "withdrawal",
         "merchant": "other", "location": "Berlin", "description": "ATM withdrawal 3 — different city",
         "velocity_score": 10, "geo_anomaly_score": 0.88, "spending_deviation": -0.3},
        # Critical — large offshore transfer
        {"account_id": "ACC-003", "amount": 150000, "currency": "USD", "transaction_type": "transfer",
         "merchant": "online", "location": "Singapore", "description": "Large wire transfer",
         "velocity_score": 5, "geo_anomaly_score": 0.95, "spending_deviation": 4.2},
        # High risk — crypto
        {"account_id": "ACC-004", "amount": 9999, "currency": "USD", "transaction_type": "payment",
         "merchant": "online", "location": "London", "description": "Crypto exchange payment",
         "velocity_score": 7, "geo_anomaly_score": 0.75, "spending_deviation": 2.1},
        # Normal
        {"account_id": "ACC-005", "amount": 55.00, "currency": "USD", "transaction_type": "payment",
         "merchant": "grocery", "location": "New York", "description": "Weekly groceries"},
        # Normal — travel
        {"account_id": "ACC-005", "amount": 350, "currency": "USD", "transaction_type": "payment",
         "merchant": "travel", "location": "Tokyo", "description": "Hotel booking"},
        # Suspicious — casino
        {"account_id": "ACC-006", "amount": 3500, "currency": "EUR", "transaction_type": "payment",
         "merchant": "entertainment", "location": "Singapore", "description": "Entertainment venue",
         "velocity_score": 6, "geo_anomaly_score": 0.82, "spending_deviation": 1.9},
        # Normal
        {"account_id": "ACC-007", "amount": 89.99, "currency": "USD", "transaction_type": "payment",
         "merchant": "retail", "location": "Toronto", "description": "Clothing purchase"},
        # Anomalous — geo jump
        {"account_id": "ACC-007", "amount": 2200, "currency": "USD", "transaction_type": "payment",
         "merchant": "travel", "location": "Sydney", "description": "Flight booking - location mismatch",
         "velocity_score": 4, "geo_anomaly_score": 0.91, "spending_deviation": 2.8},
    ]

    created = []
    for d in demos:
        tx = Transaction(
            id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            anomaly_score=0.0,
            risk_level=RiskLevel.LOW,
            is_anomaly=False,
            currency=d.get("currency", "USD"),
            fraud_type=None,
            velocity_score=d.get("velocity_score"),
            geo_anomaly_score=d.get("geo_anomaly_score"),
            spending_deviation=d.get("spending_deviation"),
            account_id=d["account_id"],
            amount=d["amount"],
            transaction_type=TransactionType(d["transaction_type"]),
            merchant=d.get("merchant"),
            location=d.get("location"),
            description=d.get("description"),
        )
        db.add(tx)
        created.append(tx.id)

    await db.commit()
    return {"message": f"Created {len(created)} demo transactions", "ids": created}


@router.post("/seed-from-csv", summary="Seed transactions from the filtered dataset CSV")
async def seed_from_csv(
    limit: int = Query(5000, ge=100, le=10000, description="Number of records to import"),
    db: AsyncSession = Depends(get_db),
):
    """Import records from the filtered dataset CSV into the database."""
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(
            status_code=404,
            detail=f"Filtered dataset not found at {DATASET_PATH}. Run create_filtered_dataset.py first."
        )

    tx_type_map = {
        "withdrawal": TransactionType.WITHDRAWAL,
        "deposit": TransactionType.DEPOSIT,
        "payment": TransactionType.PAYMENT,
        "transfer": TransactionType.TRANSFER,
    }

    created = 0
    skipped = 0
    batch = []
    batch_size = 500

    with open(DATASET_PATH, encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if created >= limit:
                break
            try:
                tx_type_str = row.get("transaction_type", "payment").lower()
                tx_type = tx_type_map.get(tx_type_str, TransactionType.PAYMENT)
                
                is_fraud = row.get("is_fraud", "False") == "True"
                amount_val = float(row.get("amount", 0))
                vel = float(row.get("velocity_score", 0) or 0)
                geo = float(row.get("geo_anomaly_score", 0) or 0)
                dev = float(row.get("spending_deviation_score", 0) or 0)

                # Determine initial risk level from dataset scores
                if is_fraud:
                    risk = RiskLevel.CRITICAL
                elif vel >= 8 or geo >= 0.85:
                    risk = RiskLevel.HIGH
                elif vel >= 5 or geo >= 0.6:
                    risk = RiskLevel.MEDIUM
                else:
                    risk = RiskLevel.LOW

                tx = Transaction(
                    id=str(uuid.uuid4()),
                    account_id=row.get("sender_account", "UNKNOWN"),
                    amount=amount_val,
                    currency="USD",
                    transaction_type=tx_type,
                    merchant=row.get("merchant_category", "other"),
                    location=row.get("location", "Unknown"),
                    description=f"{row.get('merchant_category', 'unknown')} {tx_type_str}",
                    anomaly_score=min(vel / 10 * 0.4 + geo * 0.6, 1.0) if is_fraud else 0.0,
                    risk_level=risk,
                    is_anomaly=is_fraud,
                    timestamp=datetime.fromisoformat(row.get("timestamp", datetime.utcnow().isoformat())),
                    fraud_type=row.get("fraud_type") or None,
                    velocity_score=vel,
                    geo_anomaly_score=geo,
                    spending_deviation=dev,
                    device_used=row.get("device_used") or None,
                    payment_channel=row.get("payment_channel") or None,
                )
                batch.append(tx)
                created += 1

                if len(batch) >= batch_size:
                    db.add_all(batch)
                    await db.commit()
                    batch = []

            except Exception as e:
                skipped += 1
                continue

    if batch:
        db.add_all(batch)
        await db.commit()

    return {
        "message": f"Imported {created} transactions from dataset",
        "created": created,
        "skipped": skipped,
    }
