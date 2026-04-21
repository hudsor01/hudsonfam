# Phase 20: Foundation (Freshness + Zod + Tailored Resume) — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents. Decisions are captured in `20-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 20 — Foundation (Freshness + Zod + Tailored Resume)
**Areas discussed:** Stale threshold, CSP strictness, Schema drift test, Error boundary granularity

---

## Stale threshold

### Q1: Single threshold or per-artifact?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-artifact | Cover letter 14d, tailored resume 14d, company research 60d, salary intel 30d. Matches how fast each artifact actually ages in a real job search. | ✓ |
| Single 14d for everything | Simpler util signature, one constant. Will produce more false-stale warnings on company research. | |
| Single 30d for everything | Middle ground, fewer false-stale alerts but might let cover letters rot for an old job posting. | |

**User's choice:** Per-artifact (Recommended)

### Q2: How should stale be shown in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle dot + tooltip | Small amber dot next to `generated_at` when stale; hover shows "Generated Nd ago; may need regeneration". | ✓ |
| Warning banner at top of section | Amber alert banner inside the collapsible section. More prominent but more chrome. | |
| Just the timestamp, no stale indicator | Render `generated_at` only; let owner judge. Minimal but risky. | |

**User's choice:** Subtle dot + tooltip (Recommended)

### Q3: Does stale trigger the regenerate button differently?

| Option | Description | Selected |
|--------|-------------|----------|
| No — regenerate button always visible same way | Stale is informational, not an action gate. Simpler code, no coupling. | ✓ |
| Yes — stale promotes the regenerate button | When stale, regenerate gets primary styling; when fresh, muted. Couples Phase 20 display to Phase 23 action UI. | |

**User's choice:** No (Recommended)

---

## CSP strictness

### Q1: Strict vs pragmatic CSP?

| Option | Description | Selected |
|--------|-------------|----------|
| Pragmatic | Nonce for scripts + `'unsafe-inline'` for styles. Blocks XSS vector; tolerates Tailwind runtime styles. ~10 LOC middleware. | ✓ |
| Strict nonce-everywhere | Scripts AND styles both nonce-based. Maximum protection; ~50 LOC of nonce plumbing for Tailwind v4. Real risk of breaking shadcn styling subtly. | |
| Report-Only first, tighten later | Ship `Content-Security-Policy-Report-Only` initially. Zero breakage; delays protection. | |

**User's choice:** Pragmatic (Recommended)

### Q2: Scope of the CSP header?

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/* only | LLM content lives only under /admin. Public site has no markdown path. Narrower scope = lower blast radius. | ✓ |
| Site-wide | Defense-in-depth for every route. Higher risk of breaking blog MDX, photo OG tags, memorial media. | |

**User's choice:** /admin/* only (Recommended)

---

## Schema drift test

### Q1: Where does the test run?

| Option | Description | Selected |
|--------|-------------|----------|
| Local-only `npm run test:schema` | Pre-push git hook. No CI DB creds. Drift might slip past if hook skipped. | ✓ (Claude's discretion) |
| CI integration test against live n8n DB | Catches drift before deploy. Requires JOBS_DATABASE_URL in CI secrets + network path from runner. | |
| Runtime check on app startup + alert | App on boot queries information_schema, alerts via ntfy. No CI changes; drift detected post-deploy. | |

**User's choice:** "you decide" → Claude picked **local-only `npm run test:schema` + pre-push hook** (simplest ship path for solo-dev; escalate to CI if drift slips past)

### Q2: What does it check?

| Option | Description | Selected |
|--------|-------------|----------|
| Columns referenced in jobs-db.ts only | Static list of the app's column reads. Drift in untouched columns is invisible (correct — we only care if OUR queries break). | ✓ |
| Full schema snapshot comparison | Diffs on every run. Catches additions/renames. Noisier because n8n adds columns on upgrades. | |

**User's choice:** Columns referenced in jobs-db.ts only (Recommended)

---

## Error boundary granularity

### Q1: When Zod validation or render fails, what keeps working?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-section | Each collapsible section has its own ErrorBoundary. 4 extra wrappers. Best UX when one LLM output goes bad. | ✓ (Claude's discretion) |
| Per-artifact-group | One boundary wraps all LLM artifacts; core job metadata unaffected. Simpler. Any LLM break → all LLM sections show fallback. | |
| Sheet-wide | Single top-level boundary. Cheapest; worst UX when failure is a single bad artifact. | |

**User's choice:** "you decide" → Claude picked **per-section** (trivial cost — 4 wrappers; real UX benefit; aligns with Pitfall 4 mitigation)

### Q2: What shows when a section's boundary trips?

| Option | Description | Selected |
|--------|-------------|----------|
| Muted inline message | "Couldn't render this section — the data may have changed shape." Server-side `console.error` log. Non-intrusive. | ✓ (Claude's discretion) |
| Empty-state look (no error visible) | Render as if data were missing (same UI as AI-RENDER-04). Hides failure entirely. | |
| Full error detail + stack | Debug-friendly but leaks internals — violates Pitfall 3. | |

**User's choice:** "you decide" → Claude picked **muted inline message** (keeps sheet usable; signals failure without leaking internals)

---

## Claude's Discretion

- Schema-drift test venue (Q1 above) — Claude picked local + pre-push
- Error boundary granularity (Q1 above) — Claude picked per-section
- Error boundary fallback UI (Q2 above) — Claude picked muted inline message
- Freshness badge visual design within the "amber dot + tooltip" envelope
- `isStale()` signature shape
- ErrorBoundary component — react-error-boundary lib vs hand-rolled class
- `test:schema` implementation — standalone script vs Vitest integration
- Per-request CSP nonce plumbing helper naming

## Deferred Ideas

- To Phase 21: Copy-to-clipboard, PDF download, empty-state messaging, company link-out
- To Phase 22: Salary intelligence rendering, salary provenance tags
- To Phase 23: Regenerate buttons, company-research manual trigger, HMAC + idempotency + sentinel errors
- To Phase 24: Silent-success error detection
- To v3.1: Inline edit, revert-to-original
- v3.1+ (SEED-001): Aggregate pipeline-health dashboard
