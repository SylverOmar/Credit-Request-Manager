# Incident Runbook

## Supabase Unavailable

Symptoms:
- Customer lookup fails.
- Credit application save fails.
- `/api/credit/check` returns a server error with `correlation_id`.

Actions:
- Check Vercel environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Check Supabase project status.
- Use the returned `correlation_id` to match application logs.

## Invalid Credit Evaluation

Symptoms:
- Decision is `REJECTED_INPUT`.
- Metrics look impossible.

Actions:
- Confirm annual income, duration, amount, and monthly charges in the saved application.
- Verify duration unit is `months` or `years`.
- Re-run the pre-evaluation after correcting the application data.

## Groq Unavailable

Current status:
- Groq is not used in the deterministic MVP.

Future action:
- If LLM explanation is added later, fall back to deterministic reasons when Groq fails.

## High Latency

Actions:
- Check Vercel deployment logs.
- Check Supabase latency.
- Verify the API route is not repeatedly called from the UI.

