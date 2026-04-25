---
phase: 23
subsystem: lib/webhooks + job-actions + admin/jobs
tags: [owner-triggered, hmac, idempotency-key, sentinel-cascade, fake-timer-polling, pattern-setter, phase-rollup]
status: CODE COMPLETE
completed: 2026-04-23
prod_uat: Deferred to v3.5-P4 (n8n-side HMAC verification is a homelab-repo PR concern per Phase 22 pattern)
plans_complete: 8
plans_total: 8
tests_green: 509
requirements_closed:
  - AI-ACTION-03
  - AI-ACTION-04
  - AI-SAFETY-02
  - AI-SAFETY-03
  - AI-SAFETY-04
grep_gates_enforced:
  - G-1
  - G-2
  - G-3
  - G-4
  - G-5
  - G-6
  - G-7
key-files:
  created:
    - src/lib/webhooks.ts
    - src/__tests__/lib/webhooks.test.ts
    - src/app/(admin)/admin/jobs/trigger-company-research-button.tsx
    - src/__tests__/components/trigger-company-research-button.test.tsx
    - src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx
    - src/__tests__/components/regenerate-cover-letter-button.test.tsx
    - src/__tests__/lib/job-actions.requireRole.test.ts
    - src/__tests__/lib/job-actions.trigger.test.ts
  modified:
    - src/lib/job-actions.ts
    - src/app/(admin)/admin/jobs/job-detail-sheet.tsx
    - src/__tests__/components/job-detail-sheet.test.tsx
    - .env.example
    - CLAUDE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md
---

# Phase 23: Owner-Triggered Workflows (Pattern Setter) — SUMMARY

**Status:** CODE COMPLETE — 2026-04-23
**Prod UAT:** Deferred to v3.5-P4 (n8n-side HMAC verification is a homelab-repo PR — see §Awaiting Upstream)

## Outcome

Phase 23 shipped the HMAC-signed + idempotency-keyed + sentinel-error-scrubbing webhook pattern that every owner-triggered action in this app will inherit. The fire-and-forget `fireWebhook` helper is deleted; every existing webhook call site was retrofitted to the new signed primitive in the same PR. Two new owner-triggered buttons now live in the job detail sheet:

- **"Research this company"** — fires the company-research workflow for jobs with no `company_research` row; polls `fetchJobDetail` every 3s for up to 60 ticks until `detail.company_research !== null` (INSERT-wait predicate D-06)
- **"Regenerate cover letter"** — fires the regenerate-cover-letter workflow; polls `cover_letters.generated_at` until it advances past a **server-returned baseline** (D-06 amended — the Server Action reads the pre-webhook timestamp and returns it so the client never touches `Date.now()`)

A CI grep rule locks the `requireRole(["owner"])` invariant within 10 lines of every export in `src/lib/job-actions.ts` and asserts `fireWebhook` is fully deleted from the file (Pitfall 9 + G-7). All 7 UI-SPEC grep gates (G-1 through G-7) are locked by Vitest assertions running on every `npm test`.

## Deliverables

| Artifact | Plan | REQs | Commit |
|----------|------|------|--------|
| `src/lib/webhooks.ts` — sendSignedWebhook + ErrorSentinel + WebhookResult (HMAC-SHA256 canonical sign over `${timestamp}.${path}.${rawBody}` + X-Idempotency-Key header + 4-value bounded sentinel union + D-08 no-raw-leak) | 23-01 | AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04 | e002dbf |
| `src/lib/job-actions.ts` — triggerCompanyResearch + regenerateCoverLetter Server Actions (requireRole first-line, randomUUID idempotency, D-06 amended server-read baseline on regenerate) | 23-02 | AI-ACTION-03, AI-ACTION-04 | 667e15c (RED) + 30cfd6f (GREEN) |
| `src/lib/job-actions.ts` — fireWebhook deleted; 3 call sites retrofitted (`updateJobStatus` reject + `undismissJob` + `updateJobStatus` interested auto-trigger) | 23-03 | AI-SAFETY-02, AI-SAFETY-03 | 6dff261 |
| `src/__tests__/lib/job-actions.requireRole.test.ts` — CI grep gate: requireRole adjacency on every export + fireWebhook absence (Pitfall 9 + G-7 sentinel) | 23-04 | (enforcement gate) | 7728d8b |
| `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` — first fake-timer polling scaffold in the project; ButtonState discriminated union + setInterval(3000) + 60-poll cap + unmount cleanup | 23-05 | AI-ACTION-03 | a90a5e4 |
| `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` — clone of 23-05 with UPDATE-wait predicate using server-returned baseline (zero `Date.now()` in the file; G-6 grep = 0) | 23-06 | AI-ACTION-04 | d7eab3c |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — both buttons mounted inside existing SectionErrorBoundary wraps; G-4 source-text adjacency tests; `.env.example` + `CLAUDE.md` document `N8N_WEBHOOK_SECRET` | 23-07 | AI-ACTION-03, AI-ACTION-04 | 64f6416 |
| Meta-doc finalization — ROADMAP progress 8/8 + REQUIREMENTS traceability + STATE close-out + this SUMMARY | 23-08 | (rollup) | (this commit) |

## Grep Gates Enforced (G-1..G-7)

All 7 UI-SPEC grep gates are locked by Vitest assertions running on every `npm test`:

| Gate | What It Asserts | Test File |
|------|-----------------|-----------|
| G-1 | `aria-busy="true"` present on both polling buttons while polling | `trigger-company-research-button.test.tsx`, `regenerate-cover-letter-button.test.tsx` |
| G-2 | No raw Tailwind color class names (`text-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-\d`) in either button component | `trigger-company-research-button.test.tsx`, `regenerate-cover-letter-button.test.tsx` |
| G-3 | Every `ErrorSentinel` value (`timeout` / `auth` / `rate limit` / `unavailable`) renders verbatim as `"Error: {sentinel}"` | both button test files (it.each over the 4-value union) |
| G-4 | Both buttons mounted inside their respective `SectionErrorBoundary` wrap (source-text regex with measured-distance window: 400+600 chars for company_research, 0+4000 chars for cover_letter — 3 ternary branches deep) + local-anchor adjacency scans (branch condition for trigger, Download PDF anchor for regenerate) | `job-detail-sheet.test.tsx` |
| G-5 | Button labels match ROADMAP SC verbatim: "Research this company" and "Regenerate cover letter" | both button test files |
| G-6 | `Date.now()` absent from `regenerate-cover-letter-button.tsx` (all temporal compares use server-returned baseline + parsed-Date `.getTime()` inside predicate body — zero wall-clock reads) | `regenerate-cover-letter-button.test.tsx` |
| G-7 | `fireWebhook` fully deleted from `src/lib/job-actions.ts` (sentinel for Plan 23-03 retrofit completion + deletion invariant) | `job-actions.requireRole.test.ts` |

## Deferred to v3.5-P4

- **HMAC verification in n8n** — hudsonfam ships the signing side completely; n8n workflows must validate the `X-Hudsonfam-Signature` header and reject timestamps older than 5 minutes + duplicate `X-Idempotency-Key` values within 24 hours. This is a homelab-repo PR (manifests namespace — separate from the hudsonfam app repo); linked below under §Awaiting Upstream.
- **Prod UAT smoke tests** — end-to-end click flow in production (real n8n webhook call, real LLM run, real polling completion, real timestamp advance) is deferred to v3.5-P4, same as Phase 21 and Phase 22 precedents. The code-complete side ships fully test-covered today (509/509 tests green including 9 Server Action contract tests + 14 TriggerButton fake-timer tests + 17 RegenerateButton fake-timer tests + 4 G-4 mount-site guard tests + 1 G-7 CI grep sentinel).

## Production UAT executed 2026-04-25

**Phase 28 CICD-13 retroactive smoke** — executed against live https://thehudsonfam.com/admin/jobs on commit `dda3af3` (UAT start) → `91a1705` (UAT close) running `ghcr.io/hudsor01/hudsonfam:20260425072351`.

| Check | Feature | REQ | Result | Notes |
|-------|---------|-----|--------|-------|
| 23.A | "Research this company" trigger → polling → row populated | AI-ACTION-03 | n8n-PENDING | JWX (jobId 2593, `company_research === null`). Click via React-friendly DOM-API .click() on the Research button fired the Server Action successfully (POST `/admin/jobs` → 200 verified in DevTools Network panel). Server Action returned the documented sentinel cascade — UI surfaced `Error: unavailable` rendered verbatim per Plan 23-05 G-3 contract directly below the "Research this company" button with no crash + no SectionErrorBoundary fallback. The hudsonfam-side state machine works end-to-end: Server Action → sendSignedWebhook → ErrorSentinel return → UI render. The `unavailable` sentinel is the canonical signal that the n8n endpoint either does not exist or did not respond as expected. |
| 23.B | "Regenerate cover letter" → polling → timestamp advance + re-render | AI-ACTION-04 | n8n-PENDING | JWX cover letter (`Generated 4/8/26`). Click fired the Server Action; `Error: unavailable` sentinel surfaced inline below the button. D-06 amended server-read baseline pattern observable in source (`regenerate-cover-letter-button.tsx`); cannot exercise the timestamp-advance path because n8n returned the unavailable sentinel before any timestamp could be re-read. |
| 23.C | HMAC + timestamp + idempotency headers on POST | AI-SAFETY-02/03 | client-PASS, n8n-side: PENDING | **The HMAC POST is server-side, not browser-visible** — `sendSignedWebhook` runs inside the Next.js Server Action on the K8s pod, then POSTs to `n8n.cloud.svc.cluster.local` (cluster-internal hostname). The browser only sees the RSC-style POST to `/admin/jobs` (verified in DevTools Network panel). The CICD-13 prompt's expectation of "find the POST request to n8n in DevTools" is architecturally infeasible — fixed by source verification: `src/lib/webhooks.ts:67` constructs HMAC-SHA256 via `createHmac("sha256", secret).update(canonical).digest("hex")` over `${timestamp}.${path}.${rawBody}` (D-02 canonical format); lines 74-76 set all 3 required headers verbatim: `X-Hudsonfam-Signature: sha256=${sig}`, `X-Hudsonfam-Timestamp: ${timestamp}`, `X-Idempotency-Key: ${idempotencyKey}`. Client-side contract complete + green (Plan 23-01 + 23-02 + 23-04 G-7 sentinel). n8n-side verification status: PENDING — the `unavailable` sentinels surfaced in 23.A and 23.B confirm n8n is either not receiving these requests or not responding 2xx; the homelab-repo PR (HMAC verify Code node template documented in §Awaiting Upstream above) was not made. |

**Awaiting Upstream status:** the n8n-side gap is explicitly inherited v3.0 ship state (no new regression introduced by Phase 28). Documented as v3.5.1 followup candidate via SEED-006 (see `.planning/seeds/SEED-006-n8n-hardening-followup.md`). Phase 23 hudsonfam-side (sign + send + sentinel handling + UI render) verified end-to-end in production; the safety chain is HALF-VERIFIED until the homelab-repo PR lands.

## Awaiting Upstream (homelab-repo PR)

A homelab-repo PR must add HMAC-SHA256 verification + X-Idempotency-Key deduplication to 3 n8n workflows:

- `job-feedback-sync` — invoked twice from `updateJobStatus` (reject path) and `undismissJob`
- `job-company-intel` — invoked from `updateJobStatus` (interested-status auto-trigger) AND from the new `triggerCompanyResearch` Server Action
- `regenerate-cover-letter` — new workflow entry point invoked only from the new `regenerateCoverLetter` Server Action

Canonical HMAC reconstruction template for every n8n Code node (D-02 canonical format — literal Stripe/GitHub/Slack convention):

```javascript
// n8n Code node — verify incoming HMAC + idempotency key
// Canonical format: `${timestamp}.${webhookPath}.${rawBody}` (D-02)
const crypto = require("crypto");
const secret = process.env.N8N_WEBHOOK_SECRET;
const sig = $input.first().headers["x-hudsonfam-signature"];
const ts = $input.first().headers["x-hudsonfam-timestamp"];
const idk = $input.first().headers["x-idempotency-key"];
const rawBody = JSON.stringify($input.first().body);
const canonical = `${ts}.${$webhookNode.webhookPath}.${rawBody}`;
const expected = "sha256=" + crypto.createHmac("sha256", secret).update(canonical).digest("hex");
if (sig !== expected) throw new Error("HMAC verification failed");
if (Date.now() - parseInt(ts) > 300_000) throw new Error("Timestamp expired (>5 min)");
// Optional 24h idempotency dedup via n8n workflow-data or Redis
// if (await seenKey(idk)) return { skipped: true, reason: "duplicate idempotency key" };
```

K8s ExternalSecret wiring for `N8N_WEBHOOK_SECRET` already documented in `.env.example` + `CLAUDE.md` — the actual secret value lives in the `secrets` namespace ClusterSecretStore and is injected at container startup.

## Follow-Up Notes for Phase 24 Planner

Phase 24 (Regenerate Expansion) inherits the Phase 23 pattern verbatim:

1. **`regenerateTailoredResume(jobId)` Server Action** — clone `regenerateCoverLetter` shape exactly. `await requireRole(["owner"])` first line; read `tailored_resumes.generated_at` as baseline via `getJobDetail` wrapped in try/catch (DB-error path returns `{ ok: false, sentinel: "unavailable" }` WITHOUT firing webhook — T-23-02-05 pattern); fire `sendSignedWebhook("regenerate-tailored-resume", { job_id }, randomUUID())`; return `{ ok: true, baseline: string | null }` or `{ ok: false, sentinel: ErrorSentinel }`. Add 9 contract tests cloning `job-actions.trigger.test.ts`.

2. **`regenerateSalaryIntelligence(jobId)` Server Action** — same shape. **Baseline field is `salary_intelligence.search_date`** (NOT `generated_at` — Phase 22 D-03 uses `search_date` for this table; see 22-CONTEXT.md §Phase Boundary). Fire `sendSignedWebhook("regenerate-salary-intelligence", { job_id }, randomUUID())`.

3. **Phase 24 button components** — clone `RegenerateCoverLetterButton` verbatim. Change only:
   - `regenerateCoverLetter` → `regenerateTailoredResume` / `regenerateSalaryIntelligence`
   - `cover_letters.generated_at` → `tailored_resumes.generated_at` / `salary_intelligence.search_date`
   - Label → `"Regenerate tailored resume"` / `"Regenerate salary intelligence"` (G-5 pins these verbatim to the ROADMAP SC strings)
   - Icon → `FileText` / `TrendingUp` (or planner's choice; keep `Loader2` for the spinning variant)
   - Component file name + test file name

4. **G-4 regex window sizing for Phase 24 mount tests** — inherit the sizing method from Plan 23-07. `tailored_resume` section is three-branch (null/empty/populated) and likely needs a `~3000+`-char window; `salary_intelligence` section is two-branch-only and likely needs `~800` chars. Method: use `grep -n` to locate `SectionErrorBoundary` open + mount line; measure actual char distance; pick window ≥ 1.2× actual; document rationale in test-file comment (see `job-detail-sheet.test.tsx` G-4 block for the canonical pattern).

5. **Optional factory refactor at N=3** — Phase 23 deliberately ships 2 separate files (N=2) per 23-CONTEXT.md D-04. Once Phase 24 lands and there are 4 polling surfaces total (cover-letter + tailored-resume + salary-intelligence + one `TriggerCompanyResearchButton` INSERT-wait sibling), Phase 24 MAY extract a generic `RegenerateButton` factory accepting `{ action, predicate, label, icon }` props. This is an optional refactor — the 3-file clone pattern is still acceptable if the factory abstraction feels premature at N=3.

6. **AI-ACTION-07 — silent-success warning** — new REQ: when a regenerate webhook returns `{ ok: true }` but the artifact's `generated_at` / `search_date` does not advance inside the 60-poll window, display a distinct `text-warning` banner reading `"Regeneration reported success but no new content was written — check n8n logs"`. Implement inside each regenerate button's 60-poll-cap exit path (currently maps to `{ kind: "error", sentinel: "unavailable" }` in Plan 23-06; Phase 24 splits this into two error kinds — `sentinel-unavailable` vs `silent-success-no-advance`).

## Known Non-Issues

- **Wave 3 plans 23-05 and 23-06 were parallel despite both feeding into `job-detail-sheet.tsx`** — the two plans touch zero shared files. Each creates one new component file + one new test file. `job-detail-sheet.tsx` is modified only in Wave 4 Plan 23-07 which depends on both. No file conflict at any point in the wave graph.

- **`N8N_WEBHOOK_BASE` const removed from `job-actions.ts`** — Plan 23-03 deleted it when the helper was deleted. `webhooks.ts` reads `process.env.N8N_WEBHOOK_URL` directly at call time (so Vitest can mutate per-test without re-importing). Zero duplication.

- **Retrofitted call sites are fire-and-forget via `void` prefix; new owner-triggered actions are awaited + sentinel-checked** — this split is intentional per D-11. The status-sync webhooks (`job-feedback-sync` reject/dismiss + `job-company-intel` interested auto-trigger) are side effects of a user action that's already complete by the time the webhook fires; making them awaited + sentinel-checked is a Phase 24/25 decision once observability is wired (Prometheus counters on `sendSignedWebhook` failure paths). The two NEW owner-triggered actions (`triggerCompanyResearch`, `regenerateCoverLetter`) ARE awaited + sentinel-checked because the UI state machine routes on `{ ok: true }` vs `{ ok: false, sentinel }`.

- **G-7 grep gate was transiently RED during Wave 1 and Wave 2** — Plan 23-04 (CI grep gate) and Plan 23-02 (Server Actions) both landed before Plan 23-03 (fireWebhook deletion + retrofit). Documented as expected-red at `job-actions.requireRole.test.ts:67-71` with inline comment; flipped green immediately when 23-03 landed. This is a wave-ordering artifact, not a defect.

- **D-06 "amended" baseline pattern** — the original CONTEXT.md D-06 directive was client-side `Date.now()` captured at click and compared against post-refetch `generated_at`. Amended during Plan 23-02 planning to "server-returned baseline" — `regenerateCoverLetter` reads `cover_letters.generated_at` pre-webhook and returns it in the response; the client compares against that string (not a browser clock). This eliminates the browser-clock-skew class of false positives (local clock 90s fast → predicate triggers immediately on stale row). Phase 24 MUST follow the amended pattern — G-6 grep gate (`Date.now` absence) locks it at the source-file level for the cover-letter button today and will extend to tailored-resume + salary-intelligence buttons in Phase 24.

## TDD Gate Compliance

Plan 23-02 was the only TDD plan in Phase 23 (tdd="true" on both tasks). Gate sequence verified in git log:

- **RED gate:** `667e15c test(23-02): failing contract tests for triggerCompanyResearch + regenerateCoverLetter` — 9 failing tests for functions that don't exist yet
- **GREEN gate:** `30cfd6f feat(23-02): triggerCompanyResearch + regenerateCoverLetter Server Actions (AI-ACTION-03/-04)` — 9/9 tests pass; TypeScript compiles; G-D12 adjacency grep passes

No REFACTOR gate commit was needed — the GREEN implementation was already minimal. All other Phase 23 plans shipped as single atomic `feat(...)` commits per their plan specs (no `tdd="true"`).

## Self-Check

- [x] All 5 Phase 23 REQs marked [x] in REQUIREMENTS.md (AI-ACTION-03, AI-ACTION-04, AI-SAFETY-02, AI-SAFETY-03, AI-SAFETY-04)
- [x] ROADMAP SC #5 stale `job-outreach` mention corrected (verified — line 208 references only the 3 actual retrofit call sites: `job-feedback-sync` × 2 + `job-company-intel` once)
- [x] All 8 plan checkboxes [x] in ROADMAP.md with 2026-04-23 dates
- [x] ROADMAP Phase 23 progress row flipped to 8/8 Code complete 2026-04-23
- [x] ROADMAP Phase 23 top-level bullet flipped [ ] EXECUTING → [x] CODE COMPLETE
- [x] STATE.md Current Position advanced to "Phase 23 CODE COMPLETE"
- [x] STATE.md Immediate next step retargeted to `/gsd-discuss-phase 24`
- [x] STATE.md frontmatter `completed_phases` incremented 3 → 4
- [x] STATE.md Performance Metrics gained 23-07 + 23-08 rows
- [x] 7 grep gates (G-1..G-7) all documented with test file citations
- [x] Deferred items (n8n verification, prod UAT) documented with rationale + homelab-repo PR template
- [x] Phase 24 planner has verbatim copy instructions for both regenerate actions + their button components
- [x] TDD gate compliance verified for Plan 23-02 (RED-667e15c + GREEN-30cfd6f)
- [x] 509/509 tests green (verified before this SUMMARY was written — `npm test -- --run`)
- [x] All per-plan commit hashes cited in Deliverables table (e002dbf, 667e15c, 30cfd6f, 6dff261, 7728d8b, a90a5e4, d7eab3c, 64f6416)

## Self-Check: PASSED
