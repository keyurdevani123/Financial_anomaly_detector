"""
Node 5 — Report Generator
Produces the final structured investigation report and recommended actions.
"""
import json
from datetime import datetime
from app.agents.state import InvestigationState
from app.services.groq_client import groq_chat


SYSTEM_PROMPT = """You are a financial investigation report writer for a fraud detection system.
Produce a comprehensive, professional investigation report and action plan.
Return ONLY valid JSON:
{
  "final_report": "Full markdown investigation report...",
  "recommended_actions": [
    "Immediate action 1",
    "Immediate action 2",
    "Follow-up action 3"
  ],
  "risk_level": "low|medium|high|critical",
  "summary": "One-sentence executive summary"
}
The markdown report should include these sections:
## Executive Summary
## Transaction Analysis  
## Risk Signal Analysis (velocity, geo anomaly, spending deviation)
## Historical Pattern Analysis
## Root Cause Assessment
## Risk Level & Justification
## Recommended Actions

No markdown outside the JSON string. Only raw JSON."""


async def report_generator_node(state: InvestigationState) -> dict:
    cases_text = ""
    for i, case in enumerate(state.get("historical_patterns", [])[:5], 1):
        cases_text += (
            f"\n- Case {i}: {case.get('transaction_type')} "
            f"${case.get('amount')}, location: {case.get('location')}, "
            f"outcome: {case.get('outcome')} "
            f"(similarity: {case.get('score', 0):.2f})"
        )

    user_msg = f"""
Generate investigation report for:

Transaction ID: {state["transaction_id"]}
Account ID: {state["account_id"]}
Amount: {state["amount"]} {state["currency"]}
Type: {state["transaction_type"]}
Merchant: {state["merchant"]}
Location: {state["location"]}
Timestamp: {state["timestamp"]}

Risk Signals:
- Anomaly Score: {state.get("anomaly_score", 0):.2f}/1.0
- Anomaly Flags: {', '.join(state.get("anomaly_flags", [])) or "none"}
- Velocity Score: {state.get("velocity_score", "N/A")} /10
- Geo Anomaly Score: {state.get("geo_anomaly_score", "N/A")} /1.0
- Spending Deviation: {state.get("spending_deviation", "N/A")} (z-score)
- Agent Confidence: {state.get("confidence_score", 0):.2f}/1.0
- Analysis Iterations: {state.get("rerun_count", 0) + 1}

Root Cause: {state.get("root_cause", "Unknown")}
Explanation: {state.get("explanation", "Not available")}

Similar Historical Cases:{cases_text if cases_text else " None found"}

Generate a full investigation report. Return JSON only.
"""
    try:
        raw = await groq_chat(
            system=SYSTEM_PROMPT,
            user=user_msg,
            temperature=0.3,
            max_tokens=2048,
        )
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)
        risk_level = data.get("risk_level", "medium")
        # Validate risk level
        if risk_level not in ("low", "medium", "high", "critical"):
            score = state.get("anomaly_score", 0)
            risk_level = "critical" if score >= 0.85 else "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"

        return {
            "final_report": data.get("final_report", "Report generation failed."),
            "recommended_actions": data.get("recommended_actions", []),
            "risk_level": risk_level,
        }
    except Exception as e:
        # Fallback: derive risk from anomaly score
        score = state.get("anomaly_score", 0)
        risk_level = "critical" if score >= 0.85 else "high" if score >= 0.7 else "medium" if score >= 0.4 else "low"
        return {
            "final_report": (
                f"# Investigation Report\n\n"
                f"**Transaction ID:** {state.get('transaction_id')}\n\n"
                f"**Risk Level:** {risk_level.upper()}\n\n"
                f"**Anomaly Score:** {state.get('anomaly_score', 0):.2f}/1.0\n\n"
                f"**Anomaly Flags:** {', '.join(state.get('anomaly_flags', []))}\n\n"
                f"**Root Cause:** {state.get('root_cause', 'Unknown')}\n\n"
                f"**Explanation:** {state.get('explanation', 'Analysis unavailable')}\n\n"
                f"*Automated report generation encountered an error: {e}*"
            ),
            "recommended_actions": [
                "Manual review required due to automated report generation error.",
                f"Anomaly score {state.get('anomaly_score', 0):.2f} requires {'immediate' if score >= 0.7 else 'standard'} attention.",
            ],
            "risk_level": risk_level,
        }
