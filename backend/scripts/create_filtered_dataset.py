"""
Create Filtered Dataset -- 500k-700k records from the 5M row CSV
Strategy:
  - Keep ALL fraud rows (179,553)
  - Sample stratified normal rows to reach ~650k total
  - Output: backend/data/filtered_dataset.csv
"""
import csv
import random
import os
import sys

# Force UTF-8 output on Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

INPUT_FILE = os.path.join(os.path.dirname(__file__), '..', '..', 'financial_fraud_detection_dataset.csv')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'filtered_dataset.csv')

TARGET_FRAUD = 179553      # Keep all fraud
TARGET_NORMAL = 470447     # Normal rows to sample → total ~650k
RANDOM_SEED = 42

random.seed(RANDOM_SEED)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("[INFO] Pass 1: Reading all fraud rows + counting normals...")
    fraud_rows = []
    normal_rows = []
    total = 0

    with open(INPUT_FILE, encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        for row in reader:
            total += 1
            if total % 500000 == 0:
                print(f"  Read {total:,} rows...")
            
            if row['is_fraud'] == 'True':
                fraud_rows.append(row)
            else:
                # Reservoir sampling for normal rows
                if len(normal_rows) < TARGET_NORMAL:
                    normal_rows.append(row)
                else:
                    # Randomly replace with decreasing probability
                    j = random.randint(0, total - len(fraud_rows) - 1)
                    if j < TARGET_NORMAL:
                        normal_rows[j] = row

    print(f"[OK] Done reading: {total:,} total rows")
    print(f"   Fraud rows: {len(fraud_rows):,}")
    print(f"   Normal rows sampled: {len(normal_rows):,}")
    
    # Write output
    print(f"\n[INFO] Writing filtered dataset to {OUTPUT_FILE}...")
    all_rows = fraud_rows + normal_rows
    random.shuffle(all_rows)
    
    # Keep only the columns we need
    keep_columns = [
        'transaction_id', 'timestamp', 'sender_account', 'receiver_account',
        'amount', 'transaction_type', 'merchant_category', 'location',
        'device_used', 'is_fraud', 'fraud_type', 'spending_deviation_score',
        'velocity_score', 'geo_anomaly_score', 'payment_channel'
    ]
    # Filter to only columns that exist
    keep_columns = [c for c in keep_columns if c in (fieldnames or [])]
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=keep_columns, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(all_rows)
    
    print(f"[OK] Filtered dataset written: {len(all_rows):,} rows")
    print(f"   File size: {os.path.getsize(OUTPUT_FILE) / 1024 / 1024:.1f} MB")
    print(f"   Fraud ratio: {len(fraud_rows)/len(all_rows)*100:.2f}%")

if __name__ == '__main__':
    main()
