"""
Pinecone Vector Store Service
Manages the fraud-cases-v2 index for RAG retrieval.
"""
import asyncio
from pinecone import Pinecone, ServerlessSpec
from app.core.config import settings

_pc: Pinecone | None = None
_index = None

# Gemini gemini-embedding-001 produces 768-dim vectors
EMBEDDING_DIMENSION = 768


def get_pinecone() -> Pinecone:
    global _pc
    if _pc is None:
        _pc = Pinecone(api_key=settings.pinecone_api_key)
    return _pc


def get_index():
    global _index
    if _index is None:
        pc = get_pinecone()
        index_name = settings.pinecone_index_name

        # Create index if it doesn't exist
        existing = [idx.name for idx in pc.list_indexes()]
        if index_name not in existing:
            pc.create_index(
                name=index_name,
                dimension=EMBEDDING_DIMENSION,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        _index = pc.Index(index_name)
    return _index


async def query_similar_cases(
    embedding: list[float],
    top_k: int = 5,
    filter_dict: dict | None = None,
) -> list[dict]:
    """
    Query Pinecone for similar historical anomaly cases.
    Returns a list of matches with metadata.
    """
    loop = asyncio.get_running_loop()
    index = get_index()

    def _query():
        kwargs = {
            "vector": embedding,
            "top_k": top_k,
            "include_metadata": True,
        }
        if filter_dict:
            kwargs["filter"] = filter_dict
        return index.query(**kwargs)

    result = await loop.run_in_executor(None, _query)

    matches = []
    for match in result.get("matches", []):
        matches.append({
            "id": match["id"],
            "score": match["score"],
            "metadata": match.get("metadata", {}),
        })
    return matches


async def upsert_case(
    case_id: str,
    embedding: list[float],
    metadata: dict,
) -> None:
    """
    Upsert a resolved anomaly case into Pinecone for future RAG retrieval.
    """
    loop = asyncio.get_running_loop()
    index = get_index()
    await loop.run_in_executor(
        None,
        lambda: index.upsert(vectors=[{"id": case_id, "values": embedding, "metadata": metadata}]),
    )


async def get_index_stats() -> dict:
    """Get Pinecone index statistics."""
    loop = asyncio.get_running_loop()
    index = get_index()
    stats = await loop.run_in_executor(None, lambda: index.describe_index_stats())
    return {
        "total_vector_count": stats.get("total_vector_count", 0),
        "dimension": stats.get("dimension", EMBEDDING_DIMENSION),
        "index_fullness": stats.get("index_fullness", 0),
    }


async def seed_demo_cases() -> None:
    """
    Seed Pinecone with synthetic demo cases so RAG retrieval works
    on a fresh install (no CSV-seeded data yet).
    These cover the 8 cities and 8 merchant categories from the dataset.
    """
    from app.services.gemini_embeddings import get_embedding

    demo_cases = [
        {
            "id": "demo-001",
            "text": "Confirmed fraud: card_not_present. Payment transaction of $4500.00 at online merchant in Dubai. Device: mobile, Channel: card. Velocity score: 9, Geo anomaly: 0.95, Spending deviation: 2.5.",
            "metadata": {"amount": 4500, "transaction_type": "payment", "merchant_category": "online",
                         "location": "Dubai", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 9, "geo_anomaly_score": 0.95},
        },
        {
            "id": "demo-002",
            "text": "Confirmed fraud: card_not_present. Withdrawal transaction of $200.00 at ATM merchant in New York. Device: atm, Channel: cash. Velocity score: 8, Geo anomaly: 0.3, Spending deviation: -0.5.",
            "metadata": {"amount": 200, "transaction_type": "withdrawal", "merchant_category": "other",
                         "location": "New York", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 8, "geo_anomaly_score": 0.3},
        },
        {
            "id": "demo-003",
            "text": "Confirmed fraud: card_not_present. Transfer transaction of $15000.00 at online merchant in London. Device: desktop, Channel: wire. Velocity score: 5, Geo anomaly: 0.88, Spending deviation: 3.1.",
            "metadata": {"amount": 15000, "transaction_type": "transfer", "merchant_category": "online",
                         "location": "London", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 5, "geo_anomaly_score": 0.88},
        },
        {
            "id": "demo-004",
            "text": "Confirmed fraud: card_not_present. Payment transaction of $999.00 at entertainment merchant in Tokyo. Device: mobile, Channel: card. Velocity score: 7, Geo anomaly: 0.75, Spending deviation: 1.8.",
            "metadata": {"amount": 999, "transaction_type": "payment", "merchant_category": "entertainment",
                         "location": "Tokyo", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 7, "geo_anomaly_score": 0.75},
        },
        {
            "id": "demo-005",
            "text": "Confirmed fraud: card_not_present. Payment transaction of $350.00 at retail merchant in Singapore. Device: mobile, Channel: card. Velocity score: 6, Geo anomaly: 0.82, Spending deviation: 0.9.",
            "metadata": {"amount": 350, "transaction_type": "payment", "merchant_category": "retail",
                         "location": "Singapore", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 6, "geo_anomaly_score": 0.82},
        },
        {
            "id": "demo-006",
            "text": "Confirmed fraud: card_not_present. Payment transaction of $8500.00 at travel merchant in Sydney. Device: desktop, Channel: card. Velocity score: 4, Geo anomaly: 0.91, Spending deviation: 2.2.",
            "metadata": {"amount": 8500, "transaction_type": "payment", "merchant_category": "travel",
                         "location": "Sydney", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 4, "geo_anomaly_score": 0.91},
        },
        {
            "id": "demo-007",
            "text": "Confirmed fraud: card_not_present. Payment transaction of $125.00 at restaurant merchant in Berlin. Device: mobile, Channel: card. Velocity score: 10, Geo anomaly: 0.6, Spending deviation: 0.4.",
            "metadata": {"amount": 125, "transaction_type": "payment", "merchant_category": "restaurant",
                         "location": "Berlin", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 10, "geo_anomaly_score": 0.6},
        },
        {
            "id": "demo-008",
            "text": "Confirmed fraud: card_not_present. Withdrawal transaction of $3200.00 at grocery merchant in Toronto. Device: atm, Channel: cash. Velocity score: 9, Geo anomaly: 0.45, Spending deviation: 1.6.",
            "metadata": {"amount": 3200, "transaction_type": "withdrawal", "merchant_category": "grocery",
                         "location": "Toronto", "fraud_type": "card_not_present", "outcome": "confirmed_fraud",
                         "is_fraud": True, "velocity_score": 9, "geo_anomaly_score": 0.45},
        },
    ]

    seeded = 0
    for case in demo_cases:
        try:
            embedding = await get_embedding(case["text"])
            await upsert_case(case["id"], embedding, case["metadata"])
            seeded += 1
            print(f"[Pinecone] Seeded demo case: {case['id']}")
        except Exception as e:
            print(f"[Pinecone] Failed to seed {case['id']}: {e}")
    
    print(f"[Pinecone] Demo seeding complete: {seeded}/{len(demo_cases)} cases")
