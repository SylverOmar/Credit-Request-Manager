# Codex + Gemini Workflow

Use Gemini CLI as the heavy labor worker to save Codex tokens. Codex acts as manager, architect, reviewer, and final fixer.

## Rule

1. Codex understands the task and local context first.
2. If the task is broad, repetitive, or token-heavy, Codex writes a self-contained Gemini CLI prompt.
3. The prompt must include the exact project path, files to read first, task scope, constraints, commands to run, and expected report format.
4. Omar runs Gemini CLI and reports back.
5. Codex reviews Gemini's diff/output locally.
6. Codex performs final fixes for security-sensitive or precise changes.

## Project-Specific Constraints

- Project path: `C:\Users\LENOVO\Documents\21. Multi Agent Projet PFS5\credit-intake-platform`.
- Do not touch unrelated projects, especially `GENCHICK`.
- Do not commit secrets.
- Keep `.env.local` private.
- Use `bank_customer_id` or `application_id` for future AI workflow input, not CIN/CNIE.
- Do not expose implementation details such as LangGraph in the bank-worker UI.
- Keep the project lean and aligned with the exercise requirements.
