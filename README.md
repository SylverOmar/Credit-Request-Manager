# Credit Request Manager

Bank-worker web intake platform for customer identity confirmation and credit request registration.

## Current Scope

- Search customer by Moroccan CIN/CNIE.
- Display existing customer details for read-only confirmation.
- Edit and save customer data only when values actually changed.
- Create new customer records with an internal bank UUID.
- Capture credit request parameters after customer confirmation.
- Store credit applications in Supabase.
- Run a deterministic backend credit pre-evaluation from `application_id`.
- Generate Groq-backed specialist analyses and a concise report through LangGraph.
- Keep private identifiers out of future AI workflow input; use `bank_customer_id` or `application_id`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Zod validation
- LangGraph
- Groq API
- Vitest
- GitHub Actions
- Docker
- Vercel

## Environment

Create `.env.local` from `.env.example` and fill your own values:

```bash
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

Secrets must stay local. Do not commit `.env.local`.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm test
npm run build
```

GitHub Actions runs lint, tests, build, and a Python LangGraph workflow smoke test on pushes and pull requests to `main`.

## Workflow Assets

- `src/lib/credit-graph.ts` - runtime LangGraph workflow used by the application.
- `workflows/credit_pre_evaluation.py` - Python LangGraph workflow variant.
- `workflows/test_credit_pre_evaluation.py` - smoke test for the Python workflow.

## Internal Pages

- `/` - bank-worker intake and credit request flow.
- `/technical-dashboard` - workflow, LLM, technical KPI, log, and kill-switch overview.
- `/dashboard` - alias for the technical dashboard.

## Database

The Supabase schema is in `database/schema.sql`.

Main tables:

- `customers`
- `credit_applications`

Important customer identifiers:

- `national_id`: Moroccan CIN/CNIE used by the bank worker for lookup.
- `bank_customer_id`: internal UUID used by the application and future AI workflow.

## API

### `POST /api/credit/check`

Runs a deterministic credit pre-evaluation from an existing credit application. This returns a recommendation for review, not a final bank decision.

Request body:

```json
{
  "application_id": "uuid"
}
```

The response includes a generated `correlation_id`, the `application_id`, the `bank_customer_id`, computed financial metrics, score, deterministic decision, Groq-backed report, LLM logs, and reasons. It does not return `national_id`, CIN, or CNIE.

Possible decisions:

- `PRE_APPROVED`
- `NEEDS_REVIEW`
- `NOT_ELIGIBLE`
- `REJECTED_INPUT`

## Validation Scope

Implemented deliverables:

- Multi-agent architecture with Supervisor or Router.
- LangGraph implementation.
- Monitoring/observability with correlation IDs.
- Automated tests with GitHub Actions.
- Docker containerization.
- Cloud deployment on Vercel.
- Agent Card.
- Incident runbook.
- Technical documentation delivered with the project submission package.
- Prompt versioning under `prompts/`.

The repository contains the runnable application, workflow assets, Agent Card, Runbook, prompts, CI, Docker, and deployment configuration.
