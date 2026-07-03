import asyncio
import csv
import os
import sys
import uuid
import time
from datetime import datetime
from sqlalchemy import insert, text

# Add the backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import init_db, AsyncSessionLocal, engine
from app.models.transaction import Transaction

DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "filtered_dataset.csv")

async def seed_postgres_bulk():
    if not os.path.exists(DATASET_PATH):
        print(f"Error: {DATASET_PATH} not found.")
        return

    print("Initializing Database...")
    await init_db()

    print(f"Starting bulk insert from {DATASET_PATH}...")
    start_time = time.time()
    
    # We will use SQLAlchemy core inserts for speed
    
    tx_type_map = {
        "withdrawal": "withdrawal",
        "deposit": "deposit",
        "payment": "payment",
        "transfer": "transfer",
    }
    
    batch_size = 2000
    batch = []
    total_inserted = 0
    total_fraud = 0
    
    async with AsyncSessionLocal() as db:
        # We will truncate transactions table before bulk loading to ensure a clean slate
        # since the user clicked seed 100 times, let's reset it and insert the 650k cleanly.
        try:
            await db.execute(text("TRUNCATE TABLE transactions CASCADE;"))
            await db.commit()
            print("Cleared existing transactions table.")
        except Exception as e:
            print(f"Could not truncate: {e}")
        
        with open(DATASET_PATH, encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                tx_type_str = row.get("transaction_type", "payment").lower()
                tx_type = tx_type_map.get(tx_type_str, "payment")
                
                is_fraud = str(row.get("is_fraud", "False")).strip().lower() == "true"
                
                try:
                    amount_val = float(row.get("amount", 0))
                    vel = float(row.get("velocity_score", 0) or 0)
                    geo = float(row.get("geo_anomaly_score", 0) or 0)
                    dev = float(row.get("spending_deviation_score", 0) or 0)
                except ValueError:
                    continue

                if is_fraud:
                    risk = "critical"
                    total_fraud += 1
                elif vel >= 8 or geo >= 0.85:
                    risk = "high"
                elif vel >= 5 or geo >= 0.6:
                    risk = "medium"
                else:
                    risk = "low"
                    
                timestamp_str = row.get("timestamp")
                if not timestamp_str:
                    timestamp = datetime.utcnow()
                else:
                    try:
                        timestamp = datetime.fromisoformat(timestamp_str)
                    except ValueError:
                        timestamp = datetime.utcnow()

                batch.append({
                    "id": str(uuid.uuid4()),
                    "account_id": row.get("sender_account", "UNKNOWN"),
                    "amount": amount_val,
                    "currency": "USD",
                    "transaction_type": tx_type,
                    "merchant": row.get("merchant_category", "other"),
                    "location": row.get("location", "Unknown"),
                    "description": f"{row.get('merchant_category', 'unknown')} {tx_type_str}",
                    "anomaly_score": min(vel / 10 * 0.4 + geo * 0.6, 1.0) if is_fraud else 0.0,
                    "risk_level": risk,
                    "is_anomaly": is_fraud,
                    "timestamp": timestamp,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "fraud_type": row.get("fraud_type") or None,
                    "velocity_score": vel,
                    "geo_anomaly_score": geo,
                    "spending_deviation": dev,
                    "device_used": row.get("device_used"),
                    "payment_channel": row.get("payment_channel")
                })
                
                if len(batch) >= batch_size:
                    await db.execute(insert(Transaction).values(batch))
                    await db.commit()
                    total_inserted += len(batch)
                    batch = []
                    print(f"Inserted {total_inserted} records... (Fraud so far: {total_fraud})")
                    
        # Insert any remaining records
        if batch:
            await db.execute(insert(Transaction).values(batch))
            await db.commit()
            total_inserted += len(batch)
            print(f"Inserted {total_inserted} records... (Fraud so far: {total_fraud})")
            
    end_time = time.time()
    print(f"\n[OK] Bulk insert complete!")
    print(f"Total time: {end_time - start_time:.2f} seconds")
    print(f"Total inserted: {total_inserted} rows")
    print(f"Total fraud rows inserted: {total_fraud}")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_postgres_bulk())
