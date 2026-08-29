# KICKOFF-PROMPT.md — Paste This Into OpenCode to Start Phase 1

Use this as your first message to OpenCode once `MASTERPLAN.md`, `AGENTS.md`, `opencode.json`, and `.gitignore` are already committed to the repo (see `CONNECTIONS.md` Section 6). Run it from the project root so OpenCode has repo context automatically.

---

```
You are building the Aptitude Learning & Assessment Platform. Before doing anything
else, read MASTERPLAN.md in full — it is the single source of truth for this project's
architecture, database schema, feature scope, and non-negotiable design rules. Also
read AGENTS.md for standing instructions.

Do not write any code yet. First, respond with:
1. A one-paragraph confirmation that you've read and understood MASTERPLAN.md,
   specifically restating the 11 non-negotiable rules in Section 2 in your own words,
   so I can confirm you have them right before any code is written.
2. A short plan for Phase 1 only (Product & UX Design, per MASTERPLAN.md Section 7) —
   what screens, components, and design tokens you intend to set up, and in what order.
3. Any assumption you need to make to proceed, stated explicitly, rather than silently
   assumed.

Ground rules for how you work on this project, for every phase from here on:

- Work strictly in the phase order defined in MASTERPLAN.md Section 7. Do not implement
  a later phase's feature "while you're in there" — flag it to me instead and wait.
- Never modify the database schema in MASTERPLAN.md Section 4 without also updating
  that section in the same change, and telling me explicitly what changed and why.
- Every feature must satisfy the Definition of Done in MASTERPLAN.md Section 10 before
  you consider it finished — including the "wrong path" test (e.g., for the test engine,
  an automated check that a sequential-navigation skip is rejected server-side, not just
  hidden in the UI).
- Treat MASTERPLAN.md Section 6's MVP/deferred boundary as a hard line. If a request
  from me later seems to cross into a deferred feature (AI Coach, adaptive difficulty,
  gamification, etc.) before the MVP is done, point that out instead of just building it.
- Work on a feature branch per phase and open a pull request rather than committing
  directly to main, so I can review a working diff before it merges.
- Never commit credentials, API keys, or .env files. If you need a secret to proceed,
  ask me for it as an environment variable name, not a value to hardcode.
- When you're unsure whether something in my request conflicts with a rule in
  MASTERPLAN.md Section 2, stop and ask rather than guessing which one wins.
- Give me a short summary of what changed and why at the end of every session, not just
  a diff — plain language, not a commit-message dump.

Once I confirm your Phase 1 plan, proceed to implement it.
```

---

## Notes on using this prompt

- **Send it once, at the very start of the project**, after the repo skeleton in `CONNECTIONS.md` Section 6 is already committed — OpenCode needs `MASTERPLAN.md` to actually exist in the repo to read it.
- **The "don't write code yet, confirm first" step is deliberate.** It costs one extra round trip but catches a misread of the schema or the non-negotiable rules before any file exists that would need to be rewritten.
- **Reuse the same "ground rules" block** at the start of each subsequent phase (2 through 12) — just swap out which phase you're asking it to plan. You don't need to repeat the full non-negotiable-rules confirmation every time, only at kickoff and any time you've made a significant change to `MASTERPLAN.md` itself.
- If OpenCode's plan for a phase looks like it's drifting from `MASTERPLAN.md` (e.g., proposing flat tag columns instead of the `question_tags` join table), correct it by pointing at the specific section number rather than re-explaining the reasoning — it already has the file, it just needs redirecting.
