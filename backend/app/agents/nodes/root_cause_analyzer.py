"""
Node 3 — Root Cause Analyzer
Uses Groq LLM with retrieved context to produce a root cause explanation.
"""
import json
from app.agents.state import InvestigationState
from app.services.groq_client import groq_chat


SYSTEM_PROMPT = """You are a senior financial fraud analyst.
Given a suspicious transaction and similar historical cases, produce:
1. A detailed root cause analysis explaining WHY this transaction is anomalous.
2. Key risk patterns observed.
3. Return ONLY valid JSON:
{
  "root_cause": "...",
  "explanation": "...",
  "risk_patterns": ["...", "..."]
}
Be thorough but concise. No markdown, only raw JSON."""


async def root_cause_analyzer_node(state: InvestigationState) -> dict:
    # Summarize similar cases for context
    cases_summary = ""
    for i, case in enumerate(state.get("historical_patterns", [])[:3], 1):
        cases_summary += (
            f"\nCase {i}: Amount={case.get('amount')}, "
            f"Type={case.get('transaction_type')}, "
            f"Merchant={case.get('merchant')}, "
            f"Outcome={case.get('outcome')}, "
            f"Similarity={case.get('score')}"
        )

    user_msg = f"""
Current Transaction:
- ID: {state["transaction_id"]}
- Amount: {state["amount"]} {state["currency"]}
- Type: {state["transaction_type"]}
- Merchant: {state["merchant"]}
- Location: {state["location"]}
- Anomaly Score: {state.get("anomaly_score", 0)}
- Anomaly Flags: {state.get("anomaly_flags", [])}

Top Similar Historical Cases:
{cases_summary if cases_summary else "No similar cases found."}

Perform root cause analysis. Respond with JSON only.
"""
    try:
        raw = await groq_chat(
            system=SYSTEM_PROMPT,
            user=user_msg,
            temperature=0.2,
            max_tokens=1024,
        )
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        data = json.loads(raw)
        return {
            "root_cause": data.get("root_cause", "Unable to determine root cause."),
            "explanation": data.get("explanation", ""),
        }
    except Exception as e:
        return {
            "root_cause": f"Analysis failed: {e}",
            "explanation": "Automated analysis encountered an error.",
        }
