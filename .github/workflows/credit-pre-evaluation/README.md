# Credit workflow

This folder exposes the credit pre-evaluation workflow in a direct, reviewable form.

Runtime implementation:

- `src/lib/credit-graph.ts` - LangGraph workflow used by the Next.js API.
- `src/app/api/credit/check/route.ts` - API endpoint that loads the application and invokes the graph.

Python workflow variant:

- `credit_pre_evaluation.py` mirrors the same node sequence with Python LangGraph syntax.

Workflow sequence:

1. `supervisor_node`
2. `financial_calculator_node`
3. `policy_engine_node`
4. `parallel_agents_node`
5. `report_agent_node`
6. `final_response_node`

The workflow uses `application_id` and `bank_customer_id` internally. CIN/CNIE is not passed to the evaluation agents.
