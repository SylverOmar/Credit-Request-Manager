from credit_pre_evaluation import run_credit_workflow


def test_credit_workflow_smoke():
    result = run_credit_workflow(
        {
            "age": 34,
            "marital_status": "married",
            "children_count": 2,
            "annual_income": 185000,
            "requested_amount": 120000,
            "duration_value": 48,
            "duration_unit": "months",
            "monthly_charges": 2500,
        },
        correlation_id="ci-smoke-test",
    )

    assert result["correlation_id"] == "ci-smoke-test"
    assert result["decision"] in {"PRE_APPROVED", "NEEDS_REVIEW", "NOT_ELIGIBLE"}
    assert isinstance(result["score"], int)
    assert result["metrics"]["duration_months"] == 48
    assert result["agent_analyses"]
    assert result["report"]["executive_summary"]
    assert result["graph_steps"][-1] == "final_response_node"


if __name__ == "__main__":
    test_credit_workflow_smoke()
