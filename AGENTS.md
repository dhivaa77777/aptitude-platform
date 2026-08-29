# AGENTS.md

Read MASTERPLAN.md in full before making any change. It is the source of truth for
schema, architecture, and the non-negotiable design rules in its Section 2.

- Never modify the schema in MASTERPLAN.md Section 4 without updating that file in the same PR.
- Work in phases, per MASTERPLAN.md Section 7 — do not jump ahead to a later phase's
  features unless explicitly asked.
- Every new feature must satisfy MASTERPLAN.md Section 10 (Definition of Done) before
  being marked complete.
- Open a feature branch and a PR per phase. Do not push directly to main.
- Never commit .env files or any credential. If a key is needed, ask for it as an
  environment variable, don't hardcode it.