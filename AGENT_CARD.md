# Agent Card - Credit Pre-Evaluation

## Identity

- Name: Credit Pre-Evaluation Supervisor
- Sector: Finance / banking credit intake
- Runtime: Next.js API route with LangGraph orchestration
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
- financial metrics
- decision: `PRE_APPROVED`, `NEEDS_REVIEW`, `NOT_ELIGIBLE`, or `REJECTED_INPUT`
- reasons
- graph steps for observability

## LangGraph Nodes

- Supervisor: receives and tracks the request.
- Calculator Policy: computes financial metrics and applies deterministic policy rules.

## Safety And Governance

- No final approval is issued automatically.
- CIN/CNIE is not returned by the evaluation API.
- Every execution returns a `correlation_id`.
- Groq/LLM use is deferred; current decisions are deterministic.

