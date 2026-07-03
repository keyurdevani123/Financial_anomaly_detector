"""
Seed Pinecone from filtered dataset.
Takes the top ~3,000 fraud records, embeds them with Gemini, and upserts to Pinecone.
This is the RAG knowledge base for the investigation agent.

Run from backend directory:
  python scripts/seed_pinecone_from_csv.py
"""
import asyncio
import csv
import os
import sys
import time

# Add backend app to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

FILTERED_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'filtered_dataset.csv')
MAX_RECORDS = 200   # Reduced for quicker seeding
BATCH_SIZE = 10     # Embed N texts at a time (Gemini rate limit safe)


def build_case_text(row: dict) -> str:
    """Convert a CSV row to a rich text description for embedding."""
    fraud_type = row.get('fraud_type', 'unknown')
    tx_type = row.get('transaction_type', 'unknown')
    amount = row.get('amount', '0')
    merchant = row.get('merchant_category', 'unknown')
    location = row.get('location', 'unknown')
    velocity = row.get('velocity_score', '0')
    geo = row.get('geo_anomaly_score', '0')
    deviation = row.get('spending_deviation_score', '0')
    device = row.get('device_used', 'unknown')
    channel = row.get('payment_channel', 'unknown')
    
    return (
        f"Confirmed fraud: {fraud_type}. "
        f"{tx_type.capitalize()} transaction of ${float(amount):.2f} "
        f"at {merchant} merchant in {location}. "
        f"Device: {device}, Channel: {channel}. "
        f"Velocity score: {velocity}, Geo anomaly: {geo}, "
        f"Spending deviation: {deviation}."
    )


async def main():
    # Import services after path setup
    from app.core.config import settings
    from app.services.gemini_embeddings import get_embedding
    from app.services.pinecone_service import get_index, upsert_case
    
    print(f"[INFO] Pinecone index: {settings.pinecone_index_name}")
    print(f"[INFO] Reading fraud records from: {FILTERED_CSV}")
    
    if not os.path.exists(FILTERED_CSV):
        print(f"[ERROR] Filtered dataset not found! Run create_filtered_dataset.py first.")
        return
    
    # Read fraud records
    fraud_records = []
    with open(FILTERED_CSV, encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('is_fraud') == 'True':
                fraud_records.append(row)
                if len(fraud_records) >= MAX_RECORDS:
                    break
    
    print(f"[OK] Loaded {len(fraud_records):,} fraud records to embed")
    
    # Ensure Pinecone index exists
    index = get_index()
    print(f"[OK] Pinecone index ready")
    
    # Embed and upsert in batches
    success = 0
    failed = 0
    
    for i in range(0, len(fraud_records), BATCH_SIZE):
        batch = fraud_records[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(fraud_records) + BATCH_SIZE - 1) // BATCH_SIZE
        
        print(f"  Batch {batch_num}/{total_batches} ({i+1}–{min(i+BATCH_SIZE, len(fraud_records))})...")
        
        for j, row in enumerate(batch):
            try:
                case_id = f"fraud-{row.get('transaction_id', f'r{i+j}')}"
                text = build_case_text(row)
                
                embedding = await get_embedding(text)
                
                metadata = {
                    "transaction_id": row.get('transaction_id', ''),
                    "amount": float(row.get('amount', 0)),
                    "transaction_type": row.get('transaction_type', ''),
                    "merchant_category": row.get('merchant_category', ''),
                    "location": row.get('location', ''),
                    "fraud_type": row.get('fraud_type', ''),
                    "is_fraud": True,
                    "outcome": "confirmed_fraud",
                    "velocity_score": float(row.get('velocity_score', 0) or 0),
                    "geo_anomaly_score": float(row.get('geo_anomaly_score', 0) or 0),
                    "spending_deviation": float(row.get('spending_deviation_score', 0) or 0),
                    "device_used": row.get('device_used', ''),
                    "payment_channel": row.get('payment_channel', ''),
                }
                
                await upsert_case(case_id, embedding, metadata)
                success += 1
                
            except Exception as e:
                print(f"    [WARN]  Failed {row.get('transaction_id', '')}: {e}")
                failed += 1
        
        # Rate limit: small sleep between batches
        if i + BATCH_SIZE < len(fraud_records):
            await asyncio.sleep(1.5)
    
    print(f"\n[OK] Pinecone seeding complete!")
    print(f"   Success: {success:,}")
    print(f"   Failed:  {failed:,}")


if __name__ == '__main__':
    asyncio.run(main())
