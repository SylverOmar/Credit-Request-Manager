# Credit Intake Platform - Working Plan

This file tracks the practical remaining work for the project. Items already implemented and confirmed are not kept as active tasks.

## Confirmed Foundation

- Next.js web interface exists.
- Supabase project `credit-intake-platform` is connected.
- Tables exist: `customers`, `credit_applications`.
- `customers` uses `bank_customer_id` as the internal bank UUID.
- CIN/CNIE is stored separately as `national_id` and is not intended for AI workflow input.
- Five fictional Moroccan customers are seeded.
- Server API routes exist for customer lookup/save and credit application submission.
- Secrets are kept in `.env.local`, not in source.

## Active Scope

Build a lean LangGraph-based credit pre-evaluation system for a bank-worker workflow:

1. Collect and confirm customer information.
2. Collect credit request details.
3. Run deterministic financial calculations.
4. Apply fixed policy rules.
5. Use a small LangGraph supervisor flow for explanation and scoring support.
6. Return a clear pre-evaluation result, not a final banking decision.
7. Include basic observability, tests, Docker, GitHub Actions, and Vercel deployment.

## Next Steps

### 1. Stabilize Intake Flow

- Verify existing-customer lookup and read-only confirmation.
- Verify edit behavior only saves when data changed.
- Verify new-customer creation gives a `bank_customer_id`.
- Verify credit application submission creates a row in `credit_applications`.
- Add a few simple UI/API tests for this flow.

### 2. Backend Credit Evaluation API

- Add `POST /api/credit/check`.
- Input should use `application_id` or `bank_customer_id`, not CIN/CNIE.
- Add `correlation_id` generation.
- Add deterministic financial calculations:
  - monthly income
  - simple monthly payment excluding interest/insurance/fees
  - available income before credit
  - available income after credit
  - simplified debt ratio
- Add deterministic policy result:
  - `PRE_APPROVED`
  - `NEEDS_REVIEW`
  - `NOT_ELIGIBLE`
  - `REJECTED_INPUT`

### 3. Minimal LangGraph Workflow

- Add LangGraph only after the deterministic API works.
- Use a supervisor-style graph with a small number of nodes:
  - input normalization
  - financial calculator
  - policy engine
  - supervisor/explanation agent
  - final response formatter
- Keep specialist agents small. Do not implement every proposed agent until the MVP works.
- Use Groq from env only.

### 4. Governance And Monitoring Deliverables

- Create a concise Agent Card for the actual implemented graph.
- Add a runbook for common incidents:
  - Supabase unavailable
  - Groq unavailable
  - invalid output
  - high latency
- Add simple logs with `correlation_id`.
- Add a basic technical status endpoint or page only if time allows.

### 5. Engineering Deliverables

- Push this app to GitHub.
- Add GitHub Actions for lint/build/tests.
- Add Dockerfile.
- Deploy on Vercel.
- Add final README with setup steps and env variables.

## Deferred Ideas

These are useful but should not block the MVP:

- Full dashboard with KPIs.
- Kill switch UI.
- Dead-letter queue.
- Circuit breaker.
- Full prompt versioning suite.
- Hallucination judge.
- Large golden dataset.
- Advanced rate limiting.
- Token cost dashboard.

## Rule

Do not expose implementation details to the bank worker UI. The UI should explain banking actions only.
