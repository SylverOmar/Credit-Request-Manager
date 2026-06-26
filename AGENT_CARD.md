# Agent Card - Credit Pre-Evaluation

## Identity

- Name: Credit Pre-Evaluation Supervisor
- Sector: Finance / banking credit intake
- Runtime: Next.js API route with LangGraph orchestration and Groq-backed specialist/report agents
- Entry point: `POST /api/credit/check`

## Purpose

The agent supports a bank worker after a credit application is saved. It performs a deterministic pre-evaluation and returns a recommendation for review. It is not a final banking decision.

## Inputs

- `application_id`

The graph loads the related application and customer internally. It uses `bank_customer_id` for internal customer linkage and does not expose CIN/CNIE in the response.

## Outputs

- `correlation_id`
- `application_id`
- `bank_customer_id`
- score and financial metrics
- decision: `PRE_APPROVED`, `NEEDS_REVIEW`, `NOT_ELIGIBLE`, or `REJECTED_INPUT`
- reasons
- report, specialist agent analyses, LLM logs, graph steps for observability

## LangGraph Nodes

- Supervisor: receives and routes the request.
- Financial Calculator / Policy Engine: computes metrics and applies deterministic rules.
- Specialist Agents: profile, income, charges, requested credit, and global risk analysis through Groq with fallback.
- Report Agent: generates a concise pre-evaluation report through Groq with fallback.

## Safety And Governance

- No final approval is issued automatically.
- CIN/CNIE is not returned by the evaluation API.
- Every execution returns a `correlation_id`.
- Groq is used for explanation/reporting only; deterministic code still controls metrics, score, and policy constraints.

