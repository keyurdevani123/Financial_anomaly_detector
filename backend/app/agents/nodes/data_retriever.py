"""
Node 2 — Data Retriever
• Embeds the transaction description using Gemini and queries Pinecone
  for semantically similar past fraud cases (RAG retrieval)
• Uses dataset-specific fields to build a richer query
"""
from app.agents.state import InvestigationState
from app.services.gemini_embeddings import get_embedding
from app.services.pinecone_service import query_similar_cases


async def data_retriever_node(state: InvestigationState) -> dict:
    # Build a rich text representation for embedding
    query_expansion = state.get("query_expansion", "")
    velocity = state.get("velocity_score") or 0
    geo = state.get("geo_anomaly_score") or 0
    deviation = state.get("spending_deviation") or 0
    fraud_type = state.get("fraud_type") or ""

    query_text = (
        f"{state['transaction_type']} transaction of ${state['amount']:.2f} {state['currency']} "
        f"at {state['merchant']} in {state['location']}. "
        f"Flags: {', '.join(state.get('anomaly_flags', []))}. "
        f"Velocity: {velocity}, Geo anomaly: {geo}, Spending deviation: {deviation}. "
        + (f"Fraud type: {fraud_type}. " if fraud_type else "")
        + query_expansion
    ).strip()

    # Embed via Gemini
    try:
        embedding = await get_embedding(query_text)
        similar = await query_similar_cases(embedding, top_k=5)
    except Exception as e:
        similar = []
        print(f"[DataRetriever] Pinecone/Gemini error: {e}")

    # Synthesize historical patterns from similar cases
    historical_patterns = []
    for case in similar:
        meta = case.get("metadata", {})
        historical_patterns.append({
            "case_id": case.get("id"),
            "score": round(case.get("score", 0.0), 4),
            "amount": meta.get("amount"),
            "transaction_type": meta.get("transaction_type"),
            "merchant": meta.get("merchant_category") or meta.get("merchant"),
            "location": meta.get("location"),
            "fraud_type": meta.get("fraud_type"),
            "velocity_score": meta.get("velocity_score"),
            "geo_anomaly_score": meta.get("geo_anomaly_score"),
            "outcome": meta.get("outcome", "unknown"),
        })

    return {
        "historical_patterns": historical_patterns,
        "similar_cases": similar,
        "query_expansion": query_text,  # persist for next retry if needed
    }
