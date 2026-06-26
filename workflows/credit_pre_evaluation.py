from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict

from langgraph.graph import END, START, StateGraph


class CreditWorkflowState(TypedDict, total=False):
    input: Dict[str, Any]
    correlation_id: str
    supervisor_plan: List[str]
    metrics: Dict[str, float]
    decision: str
    score: int
    human_review_required: bool
    reasons: List[str]
    agent_analyses: List[Dict[str, Any]]
    report: Dict[str, Any]
    graph_steps: List[str]


def supervisor_node(state: CreditWorkflowState) -> CreditWorkflowState:
    return {
        **state,
        "supervisor_plan": [
            "profile_agent_node",
            "income_agent_node",
            "charges_agent_node",
            "credit_request_agent_node",
            "risk_agent_node",
        ],
        "graph_steps": [*state.get("graph_steps", []), "supervisor_node"],
    }


def financial_calculator_node(state: CreditWorkflowState) -> CreditWorkflowState:
    data = state["input"]
    annual_income = float(data["annual_income"])
    requested_amount = float(data["requested_amount"])
    monthly_charges = float(data["monthly_charges"])
    duration_value = int(data["duration_value"])
    duration_unit = data["duration_unit"]

    duration_months = duration_value * 12 if duration_unit == "years" else duration_value
    monthly_income = annual_income / 12
    estimated_monthly_payment = requested_amount / max(duration_months, 1)
    debt_ratio = (monthly_charges + estimated_monthly_payment) / max(monthly_income, 1)
    loan_to_income_ratio = requested_amount / max(annual_income, 1)

    return {
        **state,
        "metrics": {
            "monthly_income": round(monthly_income, 2),
            "estimated_monthly_payment": round(estimated_monthly_payment, 2),
            "debt_ratio": round(debt_ratio, 4),
            "loan_to_income_ratio": round(loan_to_income_ratio, 4),
            "duration_months": float(duration_months),
        },
        "graph_steps": [*state.get("graph_steps", []), "financial_calculator_node"],
    }


def policy_engine_node(state: CreditWorkflowState) -> CreditWorkflowState:
    metrics = state["metrics"]
    reasons: List[str] = []
    score = 100

    if metrics["debt_ratio"] > 0.45:
        score -= 35
        reasons.append("Debt ratio above internal threshold.")
    if metrics["loan_to_income_ratio"] > 3.5:
        score -= 30
        reasons.append("Requested amount is high compared with annual income.")
    if metrics["estimated_monthly_payment"] <= 0:
        score -= 20
        reasons.append("Invalid estimated monthly payment.")

    if score >= 75:
        decision = "PRE_APPROVED"
    elif score >= 50:
        decision = "NEEDS_REVIEW"
    else:
        decision = "NOT_ELIGIBLE"

    return {
        **state,
        "score": max(score, 0),
        "decision": decision,
        "human_review_required": decision != "PRE_APPROVED",
        "reasons": reasons or ["Profile satisfies baseline financial checks."],
        "graph_steps": [*state.get("graph_steps", []), "policy_engine_node"],
    }


def parallel_agents_node(state: CreditWorkflowState) -> CreditWorkflowState:
    data = state["input"]
    metrics = state["metrics"]
    analyses = [
        {
            "agent_id": "profile_agent_node",
            "status": "completed",
            "observations": [
                f"Age: {data['age']}.",
                f"Marital status: {data['marital_status']}.",
                f"Children: {data['children_count']}.",
            ],
            "red_flags": [],
        },
        {
            "agent_id": "income_agent_node",
            "status": "completed",
            "observations": [f"Annual income: {data['annual_income']} MAD."],
            "red_flags": [],
        },
        {
            "agent_id": "charges_agent_node",
            "status": "completed",
            "observations": [f"Debt ratio: {metrics['debt_ratio']}."],
            "red_flags": ["High debt ratio."] if metrics["debt_ratio"] > 0.45 else [],
        },
        {
            "agent_id": "credit_request_agent_node",
            "status": "completed",
            "observations": [f"Loan-to-income ratio: {metrics['loan_to_income_ratio']}."],
            "red_flags": ["High requested amount."] if metrics["loan_to_income_ratio"] > 3.5 else [],
        },
        {
            "agent_id": "risk_agent_node",
            "status": "completed",
            "observations": [f"Indicative decision: {state['decision']}."],
            "red_flags": state["reasons"] if state["decision"] != "PRE_APPROVED" else [],
        },
    ]

    return {
        **state,
        "agent_analyses": analyses,
        "graph_steps": [*state.get("graph_steps", []), "parallel_agents_node"],
    }


def report_agent_node(state: CreditWorkflowState) -> CreditWorkflowState:
    return {
        **state,
        "report": {
            "executive_summary": f"Indicative decision: {state['decision']} with score {state['score']}.",
            "strengths": ["Structured request", "Financial metrics computed"],
            "watch_points": state["reasons"],
            "recommendation": "Use this result as a pre-evaluation before final banking review.",
            "limitations": "No definitive credit approval is produced by this workflow.",
        },
        "graph_steps": [*state.get("graph_steps", []), "report_agent_node"],
    }


def final_response_node(state: CreditWorkflowState) -> CreditWorkflowState:
    return {
        **state,
        "graph_steps": [*state.get("graph_steps", []), "final_response_node"],
    }


def build_credit_workflow():
    graph = StateGraph(CreditWorkflowState)
    graph.add_node("supervisor_node", supervisor_node)
    graph.add_node("financial_calculator_node", financial_calculator_node)
    graph.add_node("policy_engine_node", policy_engine_node)
    graph.add_node("parallel_agents_node", parallel_agents_node)
    graph.add_node("report_agent_node", report_agent_node)
    graph.add_node("final_response_node", final_response_node)

    graph.add_edge(START, "supervisor_node")
    graph.add_edge("supervisor_node", "financial_calculator_node")
    graph.add_edge("financial_calculator_node", "policy_engine_node")
    graph.add_edge("policy_engine_node", "parallel_agents_node")
    graph.add_edge("parallel_agents_node", "report_agent_node")
    graph.add_edge("report_agent_node", "final_response_node")
    graph.add_edge("final_response_node", END)

    return graph.compile()


credit_workflow = build_credit_workflow()


def run_credit_workflow(payload: Dict[str, Any], correlation_id: Optional[str] = None):
    return credit_workflow.invoke(
        {
            "input": payload,
            "correlation_id": correlation_id or "generated-at-runtime",
            "graph_steps": [],
        }
    )
