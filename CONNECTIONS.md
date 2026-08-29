# CONNECTIONS.md — What OpenCode Should Connect To

This lists every external platform/service the project needs, and exactly how to wire each one into OpenCode. OpenCode reads project config from `opencode.json` in the repo root, and reads free-form project instructions from `AGENTS.md` in the repo root — both are described below.

---

## 1. GitHub — source control (required, first)

**Why:** version control, PR-based review of what the agent changes, deploy trigger for Vercel.

**Setup:**
1. Create a new empty repo (e.g. `aptitude-platform`) on GitHub.
2. `git init`, `git remote add origin <repo-url>`, commit `MASTERPLAN.md`, `AGENTS.md`, and `opencode.json` first, before any app code — so the agent has full context from commit #1.
3. OpenCode has native GitHub integration (it can read PR context, issues, and diffs directly, and there's a documented GitHub setup in its docs) — authenticate it once via `opencode` GitHub login flow so it can open PRs for review rather than committing straight to `main`.

**Recommended workflow:** ask OpenCode to work on a feature branch and open a PR per phase (see Section 7 of `MASTERPLAN.md`), not push directly to `main`. This gives you a review point before merging, which matters given how much schema-level discipline this project needs (Section 2 of `MASTERPLAN.md`).

---

## 2. Supabase — database, auth, Row-Level Security (required)

**Why:** hosts the Postgres schema from `MASTERPLAN.md` Section 4, handles authentication, and enforces the user-isolation guarantee via RLS instead of hand-rolled permission checks.

**Setup:**
1. Create a free Supabase project.
2. Get the project URL and service-role/anon keys from Supabase's API settings.
3. Store them as environment variables — **never put them in `opencode.json` directly, and never let the agent commit them to git.** Use a `.env.local` file, and add `.env*` to `.gitignore` before the first commit.
4. If a Supabase MCP server is available in the OpenCode/MCP registry, add it so the agent can run schema migrations and inspect table state directly instead of you copy-pasting SQL manually:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp",
      "oauth": true
    }
  }
}
```
(Check the current Supabase MCP server URL/auth method in their docs at setup time — MCP endpoints change.)

---

## 3. Vercel — hosting (required)

**Why:** hosts the Next.js app, free tier, auto-deploys from GitHub pushes.

**Setup:**
1. Import the GitHub repo into Vercel.
2. Set the same environment variables (Supabase URL/keys) in Vercel's project settings — not in code.
3. Every PR merge to `main` auto-deploys; every open PR gets its own preview URL, which is useful for reviewing what OpenCode built for a given phase before merging.

---

## 4. MCP servers worth adding for this specific project

Add these to `opencode.json` in the `mcp` block as needed — don't enable all of them from day one, add each when the relevant phase starts:

| MCP server | Add during | Why |
|---|---|---|
| **Supabase** | Phase 2 (schema) onward | Direct schema/migration/table access instead of manual SQL |
| **Playwright** | Phase 12 (testing) | Drive a real browser to test the sequential-navigation lock, timer auto-submit, and cross-user RLS attempts end-to-end |
| **Context7** (or similar docs server) | Any phase | Pulls current library documentation (Next.js, Supabase client, etc.) so the agent isn't relying on stale training data for API syntax |
| **Sentry** (optional) | Post-MVP | Error tracking once the app is live |

Example `opencode.json` skeleton with Playwright added for Phase 12:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "-y", "@playwright/mcp"]
    }
  },
  "agents": {
    "build": {
      "model": "claude-sonnet-4-6"
    }
  }
}
```

---

## 5. AGENTS.md — project instructions OpenCode reads automatically

Separate from `MASTERPLAN.md` (the spec), `AGENTS.md` is the short, standing-instructions file OpenCode looks for automatically in the repo root. Put a condensed pointer in it, not a duplicate of the whole spec:

```md
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
```

---

## 6. Suggested repo root, before the first coding session

```text
/aptitude-platform
  MASTERPLAN.md
  AGENTS.md
  opencode.json
  .gitignore        (must include .env*, node_modules, .next)
  README.md         (short — link to MASTERPLAN.md as the real spec)
```

Commit this skeleton first, then start OpenCode against it — this is what makes the kickoff prompt in `KICKOFF-PROMPT.md` work correctly on the very first run.
