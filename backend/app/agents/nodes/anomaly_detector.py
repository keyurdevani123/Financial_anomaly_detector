"""
Node 1 — Anomaly Detector
Uses statistical heuristics + Groq LLM to score a transaction (0.0–1.0)
and produce a list of anomaly flags.

Dataset-specific pre-scoring uses:
  - velocity_score (0-10 scale from dataset)
  - geo_anomaly_score (0-1 scale from dataset)
  - spending_deviation_score (z-score from dataset)
"""
import json
from app.agents.state import InvestigationState
from app.services.groq_client import groq_chat


SYSTEM_PROMPT = """You are a financial anomaly detection expert analyzing transaction data from a fraud detection system.
Given a transaction with pre-computed risk scores, you must:
1. Assess anomaly indicators: large amount, unusual time, new merchant/location, velocity, geo anomaly, spending deviation.
2. Return a JSON object ONLY with keys:
   - anomaly_score: float 0.0-1.0 (0=normal, 1=definitely fraud)
   - anomaly_flags: list of string flags from: ["large_amount", "unusual_location", "high_velocity", "geo_anomaly", "spending_deviation", "unusual_time", "new_merchant", "high_amount_transfer", "rapid_withdrawals", "card_not_present"]
   - is_anomaly: boolean (true if score >= 0.6)
   - reasoning: brief string explanation
RESPOND ONLY WITH VALID JSON. No markdown, no extra text."""


def _precompute_score(state: InvestigationState) -> tuple[float, list[str]]:
    """Fast statistical pre-scoring based on dataset fields before calling LLM."""
    score = 0.0
    flags = []

    amount = state.get("amount", 0)
    velocity = state.get("velocity_score") or 0
    geo = state.get("geo_anomaly_score") or 0
    deviation = state.get("spending_deviation") or 0
    tx_type = state.get("transaction_type", "")

    # Amount-based rules
    if amount > 50000:
        score += 0.35
        flags.append("large_amount")
    elif amount > 10000:
        score += 0.2
        flags.append("large_amount")
    elif amount > 5000:
        score += 0.1

    # Velocity score (0-10 → 0-0.3)
    if velocity >= 9:
        score += 0.30
        flags.append("high_velocity")
    elif velocity >= 7:
        score += 0.20
        flags.append("high_velocity")
    elif velocity >= 5:
        score += 0.10

    # Geo anomaly score (0-1 → 0-0.25)
    if geo >= 0.85:
        score += 0.25
        flags.append("geo_anomaly")
    elif geo >= 0.7:
        score += 0.15
        flags.append("geo_anomaly")
    elif geo >= 0.5:
        score += 0.08

    # Spending deviation (z-score: > 2.0 is very unusual)
    if abs(deviation) > 3.0:
        score += 0.15
        flags.append("spending_deviation")
    elif abs(deviation) > 2.0:
        score += 0.08

    # Transaction type risk
    if tx_type in ("transfer", "withdrawal"):
        score += 0.05
        if amount > 10000:
            flags.append("high_amount_transfer")

    return min(score, 0.95), flags  # Cap pre-score at 0.95


async def anomaly_detector_node(state: InvestigationState) -> dict:
    # Pre-score with statistical heuristics
    pre_score, pre_flags = _precompute_score(state)

    user_msg = f"""
Transaction to analyze:
- ID: {state["transaction_id"]}
- Account: {state["account_id"]}
- Amount: {state["amount"]} {state["currency"]}
- Type: {state["transaction_type"]}
- Merchant/Category: {state["merchant"]}
- Location: {state["location"]}
- Description: {state["description"]}
- Timestamp: {state["timestamp"]}

Pre-computed Risk Signals:
- Statistical pre-score: {pre_score:.2f}/1.0
- Statistical flags: {pre_flags}
- Velocity Score: {state.get("velocity_score", "N/A")} (0-10 scale)
- Geo Anomaly Score: {state.get("geo_anomaly_score", "N/A")} (0-1 scale)
- Spending Deviation: {state.get("spending_deviation", "N/A")} (z-score)

Analyze this transaction for anomalies and respond with JSON only.
"""
    try:
        raw = await groq_chat(
            system=SYSTEM_PROMPT,
            user=user_msg,
            temperature=0.1,
            max_tokens=400,
        )
        # Clean possible markdown fences
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)
        llm_score = float(data.get("anomaly_score", pre_score))

        # Blend LLM score with statistical pre-score
        final_score = round((llm_score * 0.7) + (pre_score * 0.3), 4)
        combined_flags = list(set(pre_flags + data.get("anomaly_flags", [])))

        return {
            "anomaly_score": final_score,
            "anomaly_flags": combined_flags,
            "is_anomaly": final_score >= 0.6,
        }
    except Exception as e:
        # Fallback: use pre-computed score only
        return {
            "anomaly_score": round(pre_score, 4),
            "anomaly_flags": pre_flags,
            "is_anomaly": pre_score >= 0.6,
            "error": str(e),
        }
