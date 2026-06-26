# Credit Request Manager

Bank-worker web intake platform for customer identity confirmation and credit request registration.

## Current Scope

- Search customer by Moroccan CIN/CNIE.
- Display existing customer details for read-only confirmation.
- Edit and save customer data only when values actually changed.
- Create new customer records with an internal bank UUID.
- Capture credit request parameters after customer confirmation.
- Store credit applications in Supabase.
- Keep private identifiers out of future AI workflow input; use `bank_customer_id` or `application_id`.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Zod validation

LangGraph, Groq, observability, Docker, GitHub Actions, and Vercel deployment are planned next. They are not part of the first stable intake slice yet.

## Environment

Create `.env.local` from `.env.example` and fill your own values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
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
npm run build
```

## Database

The Supabase schema is in `database/schema.sql`.

Main tables:

- `customers`
- `credit_applications`

Important customer identifiers:

- `national_id`: Moroccan CIN/CNIE used by the bank worker for lookup.
- `bank_customer_id`: internal UUID used by the application and future AI workflow.

## Exercise Requirements

The final project must include:

- Multi-agent architecture with Supervisor or Router.
- LangGraph implementation.
- Monitoring/observability with correlation IDs.
- Automated tests with GitHub Actions.
- Docker containerization.
- Cloud deployment, planned on Vercel.
- Agent Card.
- Incident runbook.
- Technical documentation and demo video.

See `PROJECT_PLAN.md` for the active roadmap.
