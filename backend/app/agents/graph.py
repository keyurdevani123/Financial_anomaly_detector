"""
LangGraph State Machine — Investigation Graph

Flow:
  START
    → anomaly_detector
    → data_retriever
    → root_cause_analyzer
    → reflection_loop ──(confidence < 0.8 & retries < 2)──→ data_retriever
                      ──(confidence >= 0.8 or max retries)──→ report_generator
    → END
"""
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.agents.state import InvestigationState
from app.agents.nodes.anomaly_detector import anomaly_detector_node
from app.agents.nodes.data_retriever import data_retriever_node
from app.agents.nodes.root_cause_analyzer import root_cause_analyzer_node
from app.agents.nodes.reflection_loop import reflection_loop_node, should_retry
from app.agents.nodes.report_generator import report_generator_node


def build_investigation_graph():
    """Build and compile the LangGraph investigation state machine."""
    graph = StateGraph(InvestigationState)

    # ── Add Nodes ─────────────────────────────────────────────────
    graph.add_node("anomaly_detector", anomaly_detector_node)
    graph.add_node("data_retriever", data_retriever_node)
    graph.add_node("root_cause_analyzer", root_cause_analyzer_node)
    graph.add_node("reflection_loop", reflection_loop_node)
    graph.add_node("report_generator", report_generator_node)

    # ── Add Edges (normal sequential flow) ────────────────────────
    graph.add_edge(START, "anomaly_detector")
    graph.add_edge("anomaly_detector", "data_retriever")
    graph.add_edge("data_retriever", "root_cause_analyzer")
    graph.add_edge("root_cause_analyzer", "reflection_loop")

    # ── Conditional Edge: Reflection Loop ─────────────────────────
    graph.add_conditional_edges(
        "reflection_loop",
        should_retry,  # Returns "retry" or "finalize"
        {
            "retry": "data_retriever",       # Loop back with expanded query
            "finalize": "report_generator",  # Proceed to final report
        },
    )

    graph.add_edge("report_generator", END)

    # ── Compile with in-memory checkpointing ──────────────────────
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)


# Singleton graph — compiled once at startup
investigation_graph = build_investigation_graph()


async def run_investigation(transaction_data: dict, investigation_id: str) -> InvestigationState:
    """
    Execute the full investigation pipeline for a given transaction.
    Returns the final state after all nodes have run.
    """
    initial_state: InvestigationState = {
        "transaction_id": transaction_data["transaction_id"],
        "account_id": transaction_data["account_id"],
        "amount": transaction_data["amount"],
        "currency": transaction_data.get("currency", "USD"),
        "transaction_type": transaction_data.get("transaction_type", "payment"),
        "merchant": transaction_data.get("merchant", "Unknown"),
        "location": transaction_data.get("location", "Unknown"),
        "description": transaction_data.get("description", ""),
        "timestamp": transaction_data.get("timestamp", ""),
        # Dataset-specific enrichment
        "velocity_score": transaction_data.get("velocity_score"),
        "geo_anomaly_score": transaction_data.get("geo_anomaly_score"),
        "spending_deviation": transaction_data.get("spending_deviation"),
        "fraud_type": transaction_data.get("fraud_type"),
        "device_used": transaction_data.get("device_used"),
        "payment_channel": transaction_data.get("payment_channel"),
        # Pre-init all output state keys
        "anomaly_score": 0.0,
        "anomaly_flags": [],
        "is_anomaly": False,
        "historical_patterns": [],
        "similar_cases": [],
        "root_cause": "",
        "explanation": "",
        "confidence_score": 0.0,
        "rerun_count": 0,
        "query_expansion": "",
        "final_report": "",
        "recommended_actions": [],
        "risk_level": "low",
        "investigation_id": investigation_id,
        "error": None,
    }

    config = {"configurable": {"thread_id": investigation_id}}
    final_state = await investigation_graph.ainvoke(initial_state, config=config)
    return final_state
