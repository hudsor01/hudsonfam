# Phase 24: Regenerate Expansion (Resume + Salary + Silent-Success State) — Research

**Researched:** 2026-04-23
**Domain:** Next.js Server Actions + React client polling + existing Phase 23 pattern extension
**Confidence:** HIGH (pattern-copy of shipped Phase 23 primitives; one genuinely novel UX primitive — silent-success state — with all building blocks already in place)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Rename `regenerate-cover-letter-button.tsx` → `regenerate-button.tsx` (generalized). Props shape locked:
  ```ts
  interface RegenerateButtonProps {
    jobId: number;
    artifact: "cover_letter" | "tailored_resume" | "salary_intelligence";
    label: string;
    action: (jobId: number) => Promise<RegenerateResult>;
    isDone: (detail: FreshJobDetail | null, serverBaseline: string | null) => boolean;
    baselineGeneratedAt: string | null;
  }
  // where RegenerateResult = { ok: true, baseline: string | null } | { ok: false, sentinel: ErrorSentinel }
  ```
- **D-02:** Existing Cover Letter mount in `job-detail-sheet.tsx` rewires to the new shared component with `artifact="cover_letter"` + `isDone={coverLetterIsDone}` + existing `baselineGeneratedAt`. Per-artifact `isDone` predicates — inline in `regenerate-button.tsx` OR extracted to `src/lib/regenerate-predicates.ts` (Claude's discretion).
- **D-03:** `regenerateTailoredResume(jobId)` — clone of `regenerateCoverLetter`. Webhook path `"regenerate-tailored-resume"`. Baseline read from `tailored_resumes.generated_at` via `getJobDetail(jobId).then(d => d?.tailored_resume?.generated_at ?? null)`. First line `await requireRole(["owner"])`. DB-read failure returns `{ ok: false, sentinel: "unavailable" }` without firing webhook (T-23-02-05 pattern).
- **D-04:** `regenerateSalaryIntelligence(jobId)` — webhook path `"regenerate-salary-intelligence"`. Baseline read from `salary_intelligence.search_date` (date granularity — same-day regenerate = silent-success, known rough edge documented in SUMMARY). Predicate: `new Date(current + "T00:00:00Z") > new Date(baseline + "T00:00:00Z")`.
- **D-05:** Silent-success UX — inline paragraph under button; `text-warning text-xs mt-1 italic`. Copy verbatim from SC #3: `"Regeneration reported success but no new content was written — check n8n logs."` No trailing exclamation (anti-CTA inherited from Plan 21-06).
- **D-06:** State machine 4th variant — `{ kind: "silent-success" }` — mutually exclusive with `error`. Failed webhook never produces silent-success.
- **D-07:** Rename test file `regenerate-cover-letter-button.test.tsx` → `regenerate-button.test.tsx`. Port 17 Phase 23 cases with `artifact="cover_letter"` fixture + add tailored-resume + salary-intelligence + silent-success + date-granular-salary-edge cases.
- **D-08:** New `src/__tests__/lib/job-actions.regenerate.test.ts` — clone of `job-actions.trigger.test.ts` contract pattern for the 2 new Server Actions.
- **D-09:** 2 new mount sites in `job-detail-sheet.tsx` + update existing Cover Letter mount. Tailored Resume section meta row (between FreshnessBadge + Copy/Download controls, only when `detail.tailored_resume !== null`). Salary Intelligence section meta row populated branch only (rightmost flex-wrap sibling, only when `detail.salary_intelligence !== null`).
- **D-10:** Grep gates — G-1..G-5 carry forward verbatim. G-6 extended to shared component (zero `Date.now()` in `regenerate-button.tsx`). G-8 NEW — silent-success copy verbatim.

### Claude's Discretion

- Exact location of per-artifact `isDone` predicates (inline vs extracted `src/lib/regenerate-predicates.ts`)
- Whether same-day salary silent-success warrants inline note to owner or just documented in SUMMARY
- Whether to preserve `regenerate-cover-letter-button.tsx` as thin re-export (default: clean delete per Plan 22 D-01 precedent)
- Whether to revert `silent-success` state to `idle` after N seconds or stay-until-clicked (recommended: stay-until-clicked — matches sentinel-error UX)

### Deferred Ideas (OUT OF SCOPE)

- Retry-with-backoff on silent-success
- `salary_intelligence.generated_at` column (v3.2+)
- Configurable poll cadence per artifact
- Observability dashboard for silent-success rate
- Generic "regenerate anything" command palette entry
- Preserving pre-rename shim (clean delete is default)
- 4th regenerate artifact
- n8n-side HMAC verification + prod UAT (blocked on homelab-repo PR v3.5-P4)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-ACTION-05 | Owner can regenerate the tailored resume for a specific job with the same pattern as AI-ACTION-04 | `regenerateTailoredResume` Server Action (§3) + shared `RegenerateButton` with artifact="tailored_resume" (§2) + mount in `TailoredResumeSection` meta row (§6) |
| AI-ACTION-06 | Owner can regenerate salary intelligence for a specific job with the same pattern as AI-ACTION-04 | `regenerateSalaryIntelligence` Server Action (§3) + shared `RegenerateButton` with artifact="salary_intelligence" + date-granular predicate (§3) + mount in `SalaryIntelligenceSection` populated branch (§6) |
| AI-ACTION-07 | Owner sees "workflow returned success but no data changed" warning when regenerate completes without updating timestamp | 4th state variant `{ kind: "silent-success" }` (§4) + `text-warning italic` inline `<p>` with verbatim SC #3 copy + new grep gate G-8 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Path alias:** `@/*` → `./src/*`
- **Server Components by default** — client components MUST have `"use client"` first line; event handlers never cross SC→CC prop boundaries
- **Forms:** `@tanstack/react-form` + zod — no react-hook-form (N/A this phase)
- **Color rule:** ALL colors via `@theme` tokens in `src/styles/globals.css`; ZERO hardcoded Tailwind color names in `.tsx` files. Phase 24 uses `text-warning` (pre-existing at globals.css:32, OKLCH `0.85 0.17 85`) + `text-destructive` + `text-muted-foreground`.
- **Error/Success alerts pattern:** `bg-destructive/10 border border-destructive/25 text-destructive` — but Phase 23 chose inline `text-destructive text-xs mt-1` (no bg/border) for sentinel helper; Phase 24 silent-success follows the same inline convention with `text-warning italic`.
- **Never remove unused shadcn components** — only consume (N/A — no removal this phase)
- **Prisma v7 generated to `./generated/prisma/`** — N/A; jobs DB is separate `pg.Pool` via `JOBS_DATABASE_URL`
- **Testing:** Vitest + happy-dom + Testing Library + MSW; 509 tests green post-Phase-23 (this phase adds ~30 net-new cases)
- **GSD planning discipline:** Phase 24 planning docs belong in `.planning/phases/24-.../` with kebab-case numbered plans

---

## Summary

Phase 24 is a disciplined pattern-extension, not a greenfield effort. Four Phase 23 primitives are reused unchanged: `sendSignedWebhook`, `ErrorSentinel` discriminated union, `requireRole(["owner"])` invariant, and the fake-timer `setInterval(3000)`/60-cap polling scaffold. The one genuinely novel surface is the `silent-success` terminal state — a fourth branch in the button's state machine that fires when the webhook returns `{ ok: true }` but the polling predicate fails to advance within 60 iterations (today this path maps to `{ kind: "error", sentinel: "unavailable" }` in Plan 23-06; Phase 24 splits it).

**Primary recommendation:** Implement in four waves: (Wave 1) generalize `regenerate-button.tsx` + extend state machine to 4 variants + port 17 Phase 23 test cases under `artifact="cover_letter"` fixture; (Wave 2) add 2 new Server Actions + 9-case clone of `job-actions.trigger.test.ts`; (Wave 3) mount 2 new buttons + update existing Cover Letter mount in `job-detail-sheet.tsx` with G-4 source-text guards + update existing G-6 coverage to target the shared file; (Wave 4) meta-doc finalization + ROADMAP SC #2 stale `generated_at` → `search_date` correction.

**Novel surface confidence:** Silent-success UX (AI-ACTION-07) — HIGH. Terminal state pattern is identical in shape to `error` terminal state; new state variant adds one discriminant + one render branch. Copy is SC-locked verbatim. No new tokens, no new shadcn components. [VERIFIED: `src/styles/globals.css:32` `--color-warning: oklch(0.85 0.17 85);` already defined]

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Generalized button component (state machine + polling + 4-branch render) | Browser / Client | — | `"use client"` required for `useEffect` + `setInterval` + `useTransition`. Zero server-side logic in this file. [VERIFIED: `regenerate-cover-letter-button.tsx:1` `"use client"`] |
| Per-artifact `isDone` predicates | Browser / Client | — | Pure functions called inside polling callback. No server access needed. Discretion: inline in `regenerate-button.tsx` OR extract to `src/lib/regenerate-predicates.ts`. |
| 2 new Server Actions (pre-webhook baseline read + `sendSignedWebhook` + sentinel translation) | API / Backend | Database (baseline read) | `"use server"` at top of `job-actions.ts`. First line `await requireRole(["owner"])` per D-12 CI grep gate. Baseline read via `getJobDetail` wrapped in try/catch. |
| Silent-success detection | Browser / Client | — | State machine transition — server returns `{ ok: true }` but 60-poll exhaustion triggers NEW state variant instead of existing `error` branch. Pure client-side decision based on server response + poll count. |
| Mount site updates (3 mounts in `job-detail-sheet.tsx`) | Frontend (RSC parent) | — | `job-detail-sheet.tsx` is `"use client"` (it's the Sheet component); mount sites are plain JSX rendering the new client-component buttons. |
| n8n webhook endpoints (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) | External service | — | Shipped in homelab-repo PR — OUT OF SCOPE for this app repo. Client-side signing is symmetrical; new paths just route to new workflows. |

---

## Standard Stack

### Core (all verified in use today — no net-new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react` | 19.x | `useEffect` + `useState` + `useRef` + `useTransition` | Already in use; the component structure is copy-forward from `regenerate-cover-letter-button.tsx`. [VERIFIED: `package.json` via Phase 23 RESEARCH.md] |
| `next` | 16.2.x | Server Actions (`"use server"`) + `revalidatePath` | Already in use. `revalidatePath("/admin/jobs")` pattern identical to Phase 23. [VERIFIED: `CLAUDE.md` + `job-actions.ts:4,102`] |
| `lucide-react` | ^1.7.0 | `Loader2` spinner + `FileText` / `TrendingUp` / `RefreshCw` icons | Already installed; `RefreshCw` used by Phase 23 regenerate button — reusable. [VERIFIED: `regenerate-cover-letter-button.tsx:4`] |
| `@/components/ui/button` | shadcn-managed | `variant="outline" size="sm"` + built-in `disabled:opacity-50` + `focus-visible:ring-[3px]` | Direct reuse from Phase 23. Zero changes to the primitive. [VERIFIED: `button.tsx` referenced by all 2 existing Phase 23 button components] |
| `node:crypto` `randomUUID` | Node builtin | Fresh idempotency key per call (D-03) | Already imported in `job-actions.ts:3`. Zero changes. |

### Supporting (inherited from Phase 23 — zero new code to ship)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/webhooks.ts` `sendSignedWebhook` | Plan 23-01 | HMAC-SHA256 + X-Idempotency-Key + 4-value bounded sentinel | Both new Server Actions call this unchanged with new path strings. [VERIFIED: `src/lib/webhooks.ts:46`] |
| `@/lib/webhooks.ts` `ErrorSentinel` type | Plan 23-01 | Discriminated union — `"timeout" \| "auth" \| "rate limit" \| "unavailable"` | Generalized button's state machine imports this unchanged. |
| `@/lib/jobs-db.ts` `getJobDetail` | Plan 20-06 + 22-02 | Baseline read source for all 3 artifacts | Already returns `tailored_resume.generated_at` + `salary_intelligence.search_date` via the existing LEFT JOIN + LEFT JOIN LATERAL structure. [VERIFIED: `jobs-db.ts:296-454`] |
| `@/lib/session.ts` `requireRole(["owner"])` | Plan 20 | Role gate — first line of every Server Action | D-12 grep gate auto-verifies 2 new exports on next test run. Zero modifications to session.ts. |
| `@/lib/attach-freshness.ts` | Plan 22-02 | Tri-field dispatch for `generated_at` / `search_date` / `created_at` | Already wired for all 3 artifacts. Phase 24's regenerate buttons read `detail.cover_letter.generated_at` / `detail.tailored_resume.generated_at` / `detail.salary_intelligence.search_date` which flow through this helper. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Generalized component with artifact-discriminated props | 3 separate sibling files cloned N=3 | Phase 23's SUMMARY §5 explicitly deferred the factory refactor to Phase 24 at N=3; ROADMAP SC #4 locks "all three regenerate actions share the same `regenerate-button.tsx` component." Sibling-clone posture is REJECTED by scope. |
| `useState` discriminated union state | Three boolean flags | Discriminated union is the established Phase 23 pattern (`regenerate-cover-letter-button.tsx:29-32`); type-narrows cleanly on `state.kind`. Booleans would require 4 mutually-exclusive flags for the 4 states + invariant-enforcing logic. |
| Revert `silent-success` to `idle` after N seconds | Stay until user clicks again | Sentinel-error stays until user clicks; consistency wins. Auto-revert risks the warning disappearing before the owner reads it. CONTEXT.md §Claude's Discretion recommends stay-until-click. |

**Installation:** None. Zero new npm deps. Zero new shadcn components.

**Version verification:** Skipped — no new packages to verify. All existing deps are unchanged from Phase 23's verified baseline.

---

## Architecture Patterns

### System Architecture Diagram

```
Owner clicks Regenerate [X] button
       │
       ▼
┌──────────────────────────────┐
│ RegenerateButton (client)    │
│  state: { kind: "idle" }     │
└──────┬───────────────────────┘
       │ onClick
       ▼
┌──────────────────────────────┐
│ regenerate[X] Server Action  │  ← D-03 / D-04 clone of regenerateCoverLetter
│  1. requireRole(["owner"])   │    CI grep gate enforces first-line adjacency
│  2. try { getJobDetail } →   │
│     baseline = d?.X?.(ga|sd) │  ← ga = generated_at; sd = search_date
│  3. catch → { ok: false,     │
│     sentinel: "unavailable" }│    DB error: webhook NOT fired (T-23-02-05)
│  4. sendSignedWebhook(path)  │  ← NEW paths: regenerate-tailored-resume
│     with randomUUID()        │              regenerate-salary-intelligence
│  5. if (!ok) return sentinel │
│  6. revalidatePath + return  │
│     { ok: true, baseline }   │
└──────┬───────────────────────┘
       │ discriminated-union result
       ▼
┌──────────────────────────────┐
│ RegenerateButton (client)    │
│  branches on res.ok:         │
│    false → { kind: "error",  │──┐
│              sentinel }      │  │
│    true  → { kind:           │  │
│     "in-progress",           │  │
│     serverBaseline }         │  │
└──────┬───────────────────────┘  │
       │ start setInterval(3s)    │
       ▼                          │
┌──────────────────────────────┐  │
│ Poll loop (60 cap)           │  │
│  tick → fetchJobDetail(id)   │  │
│       → isDone(detail,       │  │
│                baseline)?    │  │
│  done → { kind: "idle" }     │  │
│  cap  → fork on ok/sentinel: │  │
│    prev ok=true →            │  │ ← NEW Phase 24 branch
│      { kind: "silent-        │  │    (AI-ACTION-07)
│        success" }            │  │
│    (prev ok=false can't      │  │
│     reach here)              │  │
└──────┬───────────────────────┘  │
       │                          │
       ▼                          ▼
┌──────────────────────────────────────┐
│ Render branches:                     │
│   idle           → Button + icon     │
│   in-progress    → Button + Loader2  │
│                    + aria-busy       │
│   error          → Button +          │
│                    <p text-destructive│
│                       text-xs mt-1>  │
│                    Error: {sentinel} │
│   silent-success → Button +          │
│                    <p text-warning   │ ← NEW (D-05)
│                       text-xs mt-1   │
│                       italic>        │
│                    "Regeneration     │
│                     reported success │
│                     but no new       │
│                     content was      │
│                     written — check  │
│                     n8n logs."       │
└──────────────────────────────────────┘
```

### Recommended Project Structure

```
src/
├── app/(admin)/admin/jobs/
│   ├── regenerate-button.tsx              # RENAMED from regenerate-cover-letter-button.tsx
│   │                                       # Generalized — 3 artifacts, 4-state machine
│   ├── job-detail-sheet.tsx                # EDIT: 3 mount changes (CL update + 2 new mounts)
│   ├── tailored-resume-section.tsx         # EDIT: meta row gains Regenerate button slot
│   └── salary-intelligence-section.tsx     # EDIT: populated meta row gains Regenerate button slot
├── lib/
│   ├── job-actions.ts                      # EDIT: +2 exports (regenerateTailoredResume,
│   │                                       #                   regenerateSalaryIntelligence)
│   ├── regenerate-predicates.ts            # NEW (OPTIONAL per D-02) — 3 pure isDone functions
│   └── webhooks.ts                         # UNCHANGED (Plan 23-01)
└── __tests__/
    ├── components/
    │   └── regenerate-button.test.tsx      # RENAMED + EXTENDED; 17 base + ~12 net-new cases
    └── lib/
        └── job-actions.regenerate.test.ts  # NEW — 9 contract tests × 2 actions
```

### Pattern 1: Generalized `isDone` Predicate Dispatch (Claude's Discretion per D-02)

**What:** Per-artifact predicate dispatched either (a) inline in `regenerate-button.tsx` via a `switch(artifact)` or (b) extracted to `src/lib/regenerate-predicates.ts` as 3 exported pure functions keyed by artifact.

**Recommendation:** Extract to `src/lib/regenerate-predicates.ts`. Rationale:
- 3 predicates × ~5 lines each = ~15 lines of logic worth isolating from the component for independent Vitest coverage (no component render required)
- Matches `@/lib/score-color.ts` (Plan 21-05) + `@/lib/empty-state-copy.ts` (Plan 21-06) + `@/lib/format-salary.ts` (Plan 22-06) precedents — the project has a consistent "extract pure helpers next to schemas" posture
- Lets the component's polling callback stay a one-liner `isDone(detail, baseline)` call

**Example (recommended extraction):**

```typescript
// src/lib/regenerate-predicates.ts
// [CITED: clone of isDone pattern in src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx:42-51]
import type { FreshJobDetail } from "@/lib/jobs-db";

export function coverLetterIsDone(
  detail: FreshJobDetail | null,
  serverBaseline: string | null,
): boolean {
  const current = detail?.cover_letter?.generated_at;
  if (!current) return false;
  if (serverBaseline === null) return true;  // INSERT-wait fallback
  return new Date(current).getTime() > new Date(serverBaseline).getTime();
}

export function tailoredResumeIsDone(
  detail: FreshJobDetail | null,
  serverBaseline: string | null,
): boolean {
  const current = detail?.tailored_resume?.generated_at;
  if (!current) return false;
  if (serverBaseline === null) return true;
  return new Date(current).getTime() > new Date(serverBaseline).getTime();
}

export function salaryIntelligenceIsDone(
  detail: FreshJobDetail | null,
  serverBaseline: string | null,
): boolean {
  // D-04: search_date is Postgres `date` — YYYY-MM-DD, not timestamp.
  // Compare date-granular by parsing as UTC midnight to avoid TZ drift.
  const current = detail?.salary_intelligence?.search_date;
  if (!current) return false;
  if (serverBaseline === null) return true;
  return (
    new Date(current + "T00:00:00Z").getTime() >
    new Date(serverBaseline + "T00:00:00Z").getTime()
  );
}
```

### Pattern 2: 4-State Button State Machine (Phase 23 + D-06)

```typescript
// src/app/(admin)/admin/jobs/regenerate-button.tsx (shape only — not full source)
type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string | null }  // nullable for INSERT-wait
  | { kind: "error"; sentinel: ErrorSentinel }
  | { kind: "silent-success" };  // NEW — webhook ok + 60-poll exhaustion

// State transitions (all server-returned — zero client-clock reads per G-6):
//   idle → in-progress    on click + res.ok=true
//   idle → error          on click + res.ok=false
//   in-progress → idle    on isDone() === true
//   in-progress → error   on 60-poll cap WHEN prev res was ok=false (unreachable in practice)
//   in-progress → silent-success  on 60-poll cap WHEN prev res was ok=true (NEW — AI-ACTION-07)
//   error → in-progress   on re-click
//   silent-success → in-progress  on re-click (owner retries)
```

**Key invariant:** `silent-success` and `error` are mutually exclusive terminal states. A webhook that failed with a sentinel can never transition into `silent-success`; the client already knows the webhook failed and never enters the polling phase. `silent-success` is ONLY reachable from `in-progress` which is ONLY reachable from a `res.ok === true` Server Action response.

### Pattern 3: Server Action Contract — Cross-Artifact Symmetry (D-03 + D-04)

Both new actions share EXACTLY the same shape as `regenerateCoverLetter` at `job-actions.ts:171-198`. The only diffs are the 2 interpolation points:

| Artifact | Webhook path | Baseline field | Predicate flavor |
|----------|--------------|----------------|------------------|
| `cover_letter` | `"regenerate-cover-letter"` | `tailored_resume.cover_letter.generated_at` — ISO timestamp | `>` on ms-precision timestamps |
| `tailored_resume` | `"regenerate-tailored-resume"` | `detail?.tailored_resume?.generated_at` — ISO timestamp | `>` on ms-precision timestamps |
| `salary_intelligence` | `"regenerate-salary-intelligence"` | `detail?.salary_intelligence?.search_date` — ISO DATE string (`YYYY-MM-DD`) | `>` on UTC-midnight Dates (date-granular) |

Every other line is identical — `await requireRole(["owner"])` first-line, try/catch around `getJobDetail`, `randomUUID()` idempotency key, `sendSignedWebhook` call, sentinel-propagation on `!res.ok`, `revalidatePath("/admin/jobs")` + `{ ok: true, baseline }` return.

### Anti-Patterns to Avoid

- **Don't capture `Date.now()` at click time** — G-6 grep gate on the generalized file enforces zero `Date.now()` occurrences. Client clock skew can defeat the predicate (RESEARCH §Pitfall 4 of Phase 23). All baselines come from the server.
- **Don't merge `silent-success` into `error` with a new sentinel value** — `ErrorSentinel` is a bounded 4-value union locked by Plan 23-01; adding a 5th value would break the server-side contract AND muddy the warning-vs-error visual distinction. Keep silent-success as a DISTINCT state variant.
- **Don't toggle regenerate button visibility on `silent-success`** — button must stay visible so owner can retry. (Sentinel-error UX already behaves this way; silent-success mirrors it.)
- **Don't auto-revert `silent-success` to `idle` after N seconds** — owner may look away; the warning must persist. Stays until re-click.
- **Don't forget the `regenerate-cover-letter-button.tsx` rename cleanup** — stale file would compile but drift from tests. D-01 locks clean delete.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC webhook signing | Custom crypto helper | Existing `sendSignedWebhook` from Plan 23-01 | Battle-tested in 3 retrofits + 2 new actions (Phase 23); D-02 canonical format validated against Stripe/GitHub/Slack convention |
| Polling state machine | `useEffect` chains + ad-hoc flags | Copy `regenerate-cover-letter-button.tsx` structure verbatim | 17 test cases green; `useRef<intervalRef>` + unmount cleanup already solves Pitfall 6 (sheet-close-mid-poll) |
| Idempotency key generation | UUID libraries (`uuid`, `nanoid`) | Node builtin `crypto.randomUUID()` | Already imported in `job-actions.ts:3`; zero new deps; UUID v4 per click |
| `fetchJobDetail` polling fetch | API routes | Server Action reused from Phase 23 | `fetchJobDetail` already exists at `job-actions.ts:37`; auth-gated + freshness-wrapped |
| Warning token color | New OKLCH calc | `text-warning` at `globals.css:32` | Token pre-existing + already used by Phase 22 `ProvenanceTag` for LLM estimates (semantically equivalent — medium trust); ZERO token drift |
| Component render order / structure | Fresh JSX layout | Clone Phase 23 button's `<div><Button/>{state === error && <p/>}</div>` | Proven, a11y-compliant (G-1), spacing-compliant (mt-1), 4-sentinel it.each pattern already validates rendering |

**Key insight:** 85% of Phase 24's code is clone + rename. The novel surface — silent-success state — is a single state-variant addition + a single render branch + a single copy-lock. Keep the shared component surgically small; resist the urge to refactor adjacent primitives.

---

## Common Pitfalls

### Pitfall 1: Salary `search_date` Is Date-Granular — Same-Day Regenerate Looks Like Silent-Success

**What goes wrong:** Owner clicks Regenerate Salary Intelligence at 10am. Webhook fires, n8n runs, writes a new row with `search_date = '2026-04-23'`. At 3pm the owner clicks Regenerate again. Webhook returns `{ ok: true }` but the new row's `search_date` is ALSO `'2026-04-23'` — the predicate `new Date(current + "T00:00:00Z") > new Date(baseline + "T00:00:00Z")` returns false for all 60 polls because both sides parse to the same UTC midnight. State transitions to `silent-success`. Owner sees warning text even though regeneration did run successfully.

**Why it happens:** `salary_intelligence.search_date` is Postgres `date` (verified in `scripts/check-jobs-schema.ts:40-43` + `jobs-db.ts:325 si.search_date AS si_search_date` + `SalaryIntelligenceSchema` typed `z.string()` — date col coerced to ISO `YYYY-MM-DD` after `.toISOString()` at `jobs-db.ts:414`). Date-only granularity means multiple regenerates in a calendar day produce the same value.

**How to avoid:** Accept the rough edge and document it. The silent-success warning copy — "Regeneration reported success but no new content was written — check n8n logs" — is semantically CORRECT for this case: no new content WAS written (the row has the same search_date). The owner inspecting n8n logs will see the workflow ran + confirm the second call was essentially a no-op market sample. Long-term fix (deferred): add a `salary_intelligence.generated_at` timestamp column in v3.2+ (captured in CONTEXT.md §Deferred Ideas).

**Warning signs:** Test case explicitly documents this behavior (D-07): `fixture: baseline = "2026-04-23", current = "2026-04-23" after webhook → no advance → silent-success`. If this test fails (i.e., same-day regenerate transitions to `idle` instead), the predicate is TOO lenient and other regenerate artifacts may silently "succeed" when they actually didn't advance.

### Pitfall 2: State Machine Drift — `in-progress` → Wrong Terminal

**What goes wrong:** Refactoring the 60-poll cap exit to reuse a shared code path, developer accidentally routes all cap-hit cases to `error: "unavailable"` (Phase 23's behavior) instead of splitting on the prior webhook result.

**Why it happens:** The split is subtle — both terminal states fire from the same 60-poll exhaustion condition; the discriminator is whether `res.ok` was `true` or `false` when the polling started. If the component doesn't retain the click-time `res.ok` value (or equivalent), the split collapses.

**How to avoid:** In `in-progress` state, the fact that we're IN `in-progress` already implies `res.ok === true` (because `res.ok === false` transitions directly to `error` without polling). So the cap-exit from `in-progress` ALWAYS transitions to `silent-success`. The `error` terminal is reachable ONLY via the click-time `res.ok === false` path. This invariant is naturally encoded in the state machine — the cap-exit code inside the polling callback simply does `setState({ kind: "silent-success" })` unconditionally. Test case asserts this: a mocked `regenerate[X]` returning `{ ok: true }` + 60 ticks of non-advancing `fetchJobDetail` → `silent-success` (NOT `error: unavailable`).

**Warning signs:** Any test that mocks webhook `{ ok: true }` + exhausts polling AND expects `Error: unavailable` rendered text should FAIL post-Phase-24. If it still passes, the state split never took effect.

### Pitfall 3: `regenerate-cover-letter-button.tsx` Re-Export Shim Lingering

**What goes wrong:** Planner keeps the old file as a re-export wrapper "for one release cycle." Future developers import `RegenerateCoverLetterButton` from the old path + miss the generalized API; imports drift; test file lookups break.

**How to avoid:** CONTEXT.md §Claude's Discretion recommends clean delete per Plan 22 D-01 precedent. Plan 24-01 Task: `rm regenerate-cover-letter-button.tsx` + rename test file + update import in `job-detail-sheet.tsx:42` (`import { RegenerateCoverLetterButton } from "./regenerate-cover-letter-button";` → `import { RegenerateButton } from "./regenerate-button";`). No shim. Single atomic commit.

**Warning signs:** After rename, `grep -r "regenerate-cover-letter-button" src/` should return zero matches.

### Pitfall 4: Section Component Signature Mismatch for Tailored Resume Mount

**What goes wrong:** D-09 says "Tailored Resume section meta row: between FreshnessBadge and any existing Copy/Download controls." But the Tailored Resume section component (`tailored-resume-section.tsx`) OWNS its meta row JSX internally — it's not a bare slot the parent can inject into. Unlike Phase 23's Cover Letter mount (which is inline in `job-detail-sheet.tsx` lines 210-244 because no CoverLetterSection component exists), the regenerate button for tailored resume must either live INSIDE `tailored-resume-section.tsx` OR that component must accept a `regenerateSlot` render prop.

**Why it happens:** Phase 23 mounted the Cover Letter regenerate button in `job-detail-sheet.tsx` because the Cover Letter JSX is still inline there. Phase 24 extends to Tailored Resume + Salary Intelligence — both of which have dedicated section components. The mount pattern is NOT symmetric with Phase 23.

**How to avoid:** Two acceptable options — planner picks:
1. **Mount inside section components.** `tailored-resume-section.tsx` (+ `salary-intelligence-section.tsx`) each add an optional `<RegenerateButton>` in the populated-branch meta row. Section props grow a `jobId` for salary (already has it for tailored — verified at `tailored-resume-section.tsx:38`; `salary-intelligence-section.tsx` has NO `jobId` prop today — would need to add one + thread it from `job-detail-sheet.tsx:277`) + a `baselineGeneratedAt` / `baselineSearchDate` for each.
2. **Add render-prop slot.** Both section components accept `metaRowSlot?: ReactNode` + the parent passes `<RegenerateButton {...} />` through. More decoupled but adds an abstraction.

**Recommendation:** Option 1 — mount inside section components. Matches the "section owns its meta row" pattern already established for the FreshnessBadge + Copy/Download children of `tailored-resume-section.tsx` (line 128-164) and Salary Intelligence's FreshnessBadge (line 81-88). Keeps the owner-triggered button near its semantic home; G-4 boundary assertions update to inspect section component source rather than `job-detail-sheet.tsx` source for those two buttons.

**Salary Intelligence Section signature impact:** Must add `jobId: number` prop + `baselineSearchDate: string | null` prop. `job-detail-sheet.tsx:277` mount call gets 2 additional props. [VERIFIED: current salary-intelligence-section.tsx has only `salary` prop — grep confirms no `jobId` anywhere in that file]

**Warning signs:** G-4 regex in `job-detail-sheet.test.tsx` looking for `<RegenerateButton artifact="tailored_resume"` directly in the sheet source will FAIL if mount moved into section component. G-4 for those 2 buttons must target the SECTION component's source file via a separate `readFileSync` in the test. [VERIFIED: current G-4 uses `readFileSync(SHEET_PATH)` — pattern needs per-file variant]

### Pitfall 5: 17 Phase 23 Test Cases Don't Port Cleanly

**What goes wrong:** D-07 says "port all 17 Phase 23 cases to instantiate the generalized component with `artifact='cover_letter'` fixture — zero behavior drift expected." But the existing tests import `RegenerateCoverLetterButton` + pass only `jobId` + `baselineGeneratedAt`. The generalized component requires 5 props (including `artifact`, `label`, `action`, `isDone`). A fixture helper will be needed OR every test gets a mouthful of boilerplate.

**How to avoid:** Create a test helper:
```typescript
// In regenerate-button.test.tsx top-level
function renderCoverLetter(props: Partial<RegenerateButtonProps> = {}) {
  return render(
    <RegenerateButton
      jobId={1}
      artifact="cover_letter"
      label="Regenerate cover letter"
      action={mockRegenerateCoverLetter}
      isDone={coverLetterIsDone}
      baselineGeneratedAt={DEFAULT_BASELINE}
      {...props}
    />,
  );
}
```
Then all 17 ported tests call `renderCoverLetter({ jobId: 42 })` etc. — same concise shape. Add parallel `renderTailoredResume()` and `renderSalaryIntelligence()` helpers for the new cases.

**Warning signs:** Test file grows > 500 lines OR boilerplate exceeds assertion logic — smell that fixture helpers were skipped.

---

## Code Examples

### Example 1: `regenerateTailoredResume` Server Action (D-03 clone)

```typescript
// src/lib/job-actions.ts — clone of regenerateCoverLetter at line 171-198
// [CITED: src/lib/job-actions.ts:171-198 — template shape locked by Phase 23 Plan 23-02]
export async function regenerateTailoredResume(
  jobId: number,
): Promise<
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel }
> {
  await requireRole(["owner"]);  // D-12 grep-gate (CI: within 10 lines of signature)

  let baseline: string | null = null;
  try {
    const detail = await getJobDetail(jobId);
    baseline = detail?.tailored_resume?.generated_at ?? null;
  } catch {
    // T-23-02-05: DB error — webhook NOT fired, raw error NOT leaked
    return { ok: false, sentinel: "unavailable" };
  }

  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "regenerate-tailored-resume",  // D-03 webhook path
    { job_id: jobId },
    idempotencyKey,
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true, baseline };
}
```

### Example 2: `regenerateSalaryIntelligence` Server Action (D-04 clone)

```typescript
// src/lib/job-actions.ts — parallel clone
// [CITED: src/lib/job-actions.ts:171-198 — template; swap path + baseline field]
export async function regenerateSalaryIntelligence(
  jobId: number,
): Promise<
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel }
> {
  await requireRole(["owner"]);

  let baseline: string | null = null;
  try {
    const detail = await getJobDetail(jobId);
    baseline = detail?.salary_intelligence?.search_date ?? null;  // D-04: date, not timestamp
  } catch {
    return { ok: false, sentinel: "unavailable" };
  }

  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "regenerate-salary-intelligence",  // D-04 webhook path
    { job_id: jobId },
    idempotencyKey,
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true, baseline };
}
```

### Example 3: Silent-Success State Transition in `regenerate-button.tsx`

```typescript
// src/app/(admin)/admin/jobs/regenerate-button.tsx — polling cap-exit diff from Phase 23
// [CITED: regenerate-cover-letter-button.tsx:146-152 — original cap-exit sets error:"unavailable"]

// BEFORE (Phase 23 shape):
//   if (currentCount >= 60) {
//     clearInterval(intervalRef.current); intervalRef.current = null;
//     setState({ kind: "error", sentinel: "unavailable" });
//   }

// AFTER (Phase 24 — reachable only from in-progress, which implies prev res.ok === true):
if (currentCount >= 60) {
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }
  // D-06: Server reported success (in-progress state only reachable after res.ok=true)
  // but predicate never advanced within 60 polls → silent-success warning (AI-ACTION-07).
  // Distinct from sentinel "unavailable" which signals a failed Server Action.
  setState({ kind: "silent-success" });
}
```

### Example 4: Render Branch for Silent-Success (D-05)

```tsx
// src/app/(admin)/admin/jobs/regenerate-button.tsx — render tree extension
return (
  <div>
    <Button {...buttonProps}>
      {isPolling ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {label}
    </Button>
    {state.kind === "error" && (
      <p className="text-destructive text-xs mt-1">
        Error: {state.sentinel}
      </p>
    )}
    {state.kind === "silent-success" && (
      // D-05: text-warning italic — distinct from text-destructive sentinel
      // G-8: literal copy locked verbatim from SC #3
      <p className="text-warning text-xs mt-1 italic">
        Regeneration reported success but no new content was written — check n8n logs.
      </p>
    )}
  </div>
);
```

### Example 5: New Test Case Shape — Silent-Success (D-07)

```typescript
// src/__tests__/components/regenerate-button.test.tsx
// Clone of the "times out after 60 polls" test (regenerate-cover-letter-button.test.tsx:230-255)
// but ASSERTS silent-success state + verbatim copy (G-8) instead of Error: unavailable.
it("shows silent-success warning when webhook ok=true but 60 polls exhaust without advance (AI-ACTION-07)", async () => {
  mockRegenerateCoverLetter.mockResolvedValue({
    ok: true,
    baseline: DEFAULT_BASELINE,
  });
  mockFetchJobDetail.mockResolvedValue({
    cover_letter: { generated_at: DEFAULT_BASELINE },  // never advances
  });
  const { getByRole, getByText, queryByText } = renderCoverLetter({ jobId: 1 });
  await act(async () => { fireEvent.click(getByRole("button")); });
  for (let i = 0; i < 60; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  }
  // Silent-success copy is present VERBATIM (G-8):
  expect(
    getByText("Regeneration reported success but no new content was written — check n8n logs."),
  ).toBeInTheDocument();
  // The error sentinel copy is NOT present (mutual exclusion — D-06):
  expect(queryByText("Error: unavailable")).not.toBeInTheDocument();
  expect(getByRole("button")).not.toBeDisabled();  // button re-enables for retry
});

// Salary date-granularity rough-edge test (D-07):
it("salary_intelligence same-day regenerate triggers silent-success (known rough edge)", async () => {
  const today = "2026-04-23";
  mockRegenerateSalaryIntelligence.mockResolvedValue({ ok: true, baseline: today });
  mockFetchJobDetail.mockResolvedValue({
    salary_intelligence: { search_date: today },  // same day — predicate returns false
  });
  const { getByRole, getByText } = renderSalaryIntelligence({ jobId: 1 });
  await act(async () => { fireEvent.click(getByRole("button")); });
  for (let i = 0; i < 60; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  }
  expect(
    getByText("Regeneration reported success but no new content was written — check n8n logs."),
  ).toBeInTheDocument();
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N separate button files per regenerate artifact | Generalized `regenerate-button.tsx` with artifact-discriminated props | Phase 24 (this phase) — at N=3 per Phase 23 SUMMARY follow-up note | One source of truth; adding a 4th artifact = +1 Server Action + new `isDone` predicate + new artifact enum value (no new component) |
| `{ kind: "error", sentinel: "unavailable" }` for all polling-cap exhaustion | Splits on prior webhook result — `silent-success` when `res.ok === true` + cap; `error` only when `res.ok === false` at click time | Phase 24 (this phase) | Owner can distinguish "workflow succeeded but produced no visible change" from "workflow failed" — previously conflated (AI-ACTION-07) |
| Client-captured `Date.now()` click-time baseline | Server-returned baseline (D-06 amended) | Phase 23 | Eliminates browser-clock-skew false positives (RESEARCH.md §Pitfall 4 of Phase 23). G-6 grep gate enforces at source-file level. |

**Deprecated/outdated:**
- `regenerate-cover-letter-button.tsx` — RENAMED to `regenerate-button.tsx` (D-01 clean delete; no shim per Plan 22 D-01 precedent)
- ROADMAP SC #2 "polls `salary_intelligence.generated_at`" wording — STALE; no such column exists. Plan 24-08 meta-doc correction changes to `search_date` per Phase 22 D-03.
- `REQUIREMENTS.md` AI-ACTION-05/06 checkboxes `[x]` — STALE (prematurely marked); traceability rows still say "Pending." Plan 24-08 aligns both.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extracting `isDone` predicates to `src/lib/regenerate-predicates.ts` matches project convention better than inlining | Pattern 1 | LOW — either location satisfies D-02; inlining is a 15-line deletion, not a refactor |
| A2 | `silent-success` state should stay until owner re-clicks (vs auto-revert to idle) | Don't Hand-Roll + CONTEXT §Discretion | LOW — CONTEXT.md §Claude's Discretion recommends stay-until-click; auto-revert is a UX tweak, not architectural |
| A3 | Mount pattern for Tailored Resume + Salary Intelligence regenerate buttons should live INSIDE the respective section components (Option 1 in Pitfall 4) | Pitfall 4 | MEDIUM — owner may prefer buttons in `job-detail-sheet.tsx` inline for consistency with Phase 23 Cover Letter mount. If so, the section components need `<RegenerateButton>` call pulled out + each section stripped of its own meta row (more invasive refactor) |
| A4 | `SalaryIntelligenceSection` can accept new `jobId` + `baselineSearchDate` props without breaking existing tests | Pitfall 4 | LOW — existing component props are additive; Plan 22-06 tests mock the component at higher granularity than prop-count assertions |

**If a decision changes here:** A3 is the load-bearing one. Any alternative (pulling regenerate buttons into `job-detail-sheet.tsx` inline like the Cover Letter mount) requires reshaping the section components first. Recommend owner-confirmation during `/gsd-discuss-phase` if they have a preference; otherwise Option 1 (mount-in-section) is the recommended default.

---

## Open Questions

1. **Where do `isDone` predicates live?** (D-02 explicit discretion)
   - What we know: 3 predicates × ~5 lines each. Project has `@/lib/score-color.ts`, `@/lib/empty-state-copy.ts`, `@/lib/format-salary.ts` precedents for pure-helper extraction next to schemas.
   - What's unclear: Whether the planner prefers extraction for testability + reuse OR inlining for colocation.
   - Recommendation: Extract to `src/lib/regenerate-predicates.ts` + add dedicated `src/__tests__/lib/regenerate-predicates.test.ts` with 4 cases per predicate (null detail, null baseline, baseline > current, current > baseline).

2. **Section-component mount vs inline mount in sheet** (A3 — Pitfall 4)
   - What we know: Cover Letter mount is inline in `job-detail-sheet.tsx:240-243` because no CoverLetterSection component exists. Tailored Resume + Salary Intelligence have dedicated section components that own their meta rows.
   - What's unclear: Whether to mount new buttons inside section components (asymmetric with Cover Letter) or inline in the sheet (requires breaking Salary/Tailored section encapsulation).
   - Recommendation: Mount-in-section for Tailored Resume + Salary Intelligence; keep Cover Letter mount inline. G-4 tests split — one `readFileSync` on `job-detail-sheet.tsx` for Cover Letter; one on each section component for the other two.

3. **Silent-success inline-note-to-owner for salary date-granularity edge case** (Claude's discretion in CONTEXT.md)
   - What we know: Same-day salary regenerate will trigger silent-success because `search_date` is date-granular.
   - What's unclear: Whether the salary regenerate button should show a supplementary note ("Note: salary updates are captured daily; same-day re-runs won't show changes") OR whether the generic silent-success copy "check n8n logs" is sufficient.
   - Recommendation: Just the generic copy. The SC #3 string naturally covers the case — n8n logs WILL show the workflow ran. Adding a salary-specific hint bloats the shared component. Owner learns the rough edge from SUMMARY documentation + one occurrence of silent-success.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All Server Actions + Vitest | ✓ | v24+ per CLAUDE.md | — |
| `pg` (node-postgres) | `getJobDetail` baseline reads | ✓ | existing | — |
| `node:crypto` `randomUUID` | Idempotency keys | ✓ | builtin | — |
| n8n workflows (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) | End-to-end integration | ✗ | — | Homelab-repo PR — OUT OF SCOPE this phase (Phase 22 / 23 precedent) |
| `N8N_WEBHOOK_SECRET` env var | HMAC signing | ✓ | documented in `.env.example` + `CLAUDE.md` | — |
| `JOBS_DATABASE_URL` env var | `getJobDetail` baseline read | ✓ | existing | — |

**Missing dependencies with no fallback:** None for this app-repo phase.

**Missing dependencies with fallback:** n8n workflow endpoints for the 2 new webhook paths — deferred to v3.5-P4 per Phase 22/23 precedent. Client-side signing ships complete; workflow endpoints return 404 until the homelab PR lands; that produces sentinel `"unavailable"` on first click, which is the expected degraded behavior.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.x + happy-dom + Testing Library 16.x + MSW 2.x |
| Config file | `vitest.config.ts` (existing; no changes) |
| Quick run command | `npm test -- --run src/__tests__/components/regenerate-button.test.tsx src/__tests__/lib/job-actions.regenerate.test.ts src/__tests__/lib/regenerate-predicates.test.ts` |
| Full suite command | `npm test -- --run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-ACTION-05 | `regenerateTailoredResume` returns `{ok:true, baseline}` on success + sentinel on failure + `"unavailable"` on DB error without firing webhook | Unit (Server Action contract) | `npx vitest run src/__tests__/lib/job-actions.regenerate.test.ts` | ❌ Wave 2 |
| AI-ACTION-05 | Button renders "Regenerate tailored resume" label; click fires `regenerateTailoredResume(jobId)`; polls `tailored_resume.generated_at` until advance | Unit (component) | `npx vitest run src/__tests__/components/regenerate-button.test.tsx` | ❌ Wave 1 (renamed from existing) |
| AI-ACTION-05 | Mount in `tailored-resume-section.tsx` populated branch; visible only when resume !== null | Unit (source-text guard) | `npx vitest run src/__tests__/components/tailored-resume-section.test.tsx` | ❌ Wave 3 (G-4 extension) |
| AI-ACTION-06 | `regenerateSalaryIntelligence` returns `{ok:true, baseline}` with `search_date` value (date string) on success | Unit (Server Action contract) | `npx vitest run src/__tests__/lib/job-actions.regenerate.test.ts` | ❌ Wave 2 |
| AI-ACTION-06 | Button's `isDone` predicate uses UTC-midnight Date comparison for date-granular `search_date` | Unit (predicate) | `npx vitest run src/__tests__/lib/regenerate-predicates.test.ts` | ❌ Wave 1 (optional extraction) |
| AI-ACTION-06 | Mount in `salary-intelligence-section.tsx` populated branch (adds `jobId` + `baselineSearchDate` props) | Unit (source-text guard) | `npx vitest run src/__tests__/components/salary-intelligence-section.test.tsx` | ❌ Wave 3 (G-4 extension) |
| AI-ACTION-07 | Webhook ok=true + 60-poll exhaustion → `silent-success` state → `<p text-warning text-xs mt-1 italic>` with verbatim SC #3 copy | Unit (component) | `npx vitest run src/__tests__/components/regenerate-button.test.tsx -t silent-success` | ❌ Wave 1 (new cases added) |
| AI-ACTION-07 (G-8) | Literal string "Regeneration reported success but no new content was written — check n8n logs." appears exactly once in `regenerate-button.tsx` source | Unit (readFileSync grep) | `npx vitest run src/__tests__/components/regenerate-button.test.tsx -t "G-8"` | ❌ Wave 1 |
| G-6 extension | `Date.now()` count = 0 in `regenerate-button.tsx` (shared file) | Unit (readFileSync grep) | `npx vitest run src/__tests__/components/regenerate-button.test.tsx -t "G-6"` | ❌ Wave 1 (file rename updates target) |
| D-12 (CI grep gate) | 2 new `export async function` entries in `job-actions.ts` (regenerateTailoredResume, regenerateSalaryIntelligence) have `requireRole(["owner"])` within 10 lines | Unit (readFileSync regex) | `npx vitest run src/__tests__/lib/job-actions.requireRole.test.ts` | ✓ existing (auto-validates on next run) |

### Sampling Rate
- **Per task commit:** `npm test -- --run src/__tests__/components/regenerate-button.test.tsx src/__tests__/lib/job-actions.regenerate.test.ts`
- **Per wave merge:** `npm test -- --run` (full suite; 509 baseline + ~30 net-new cases expected)
- **Phase gate:** Full suite green + ROADMAP SC #2 corrected + REQUIREMENTS traceability all `[x]` before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/components/regenerate-button.test.tsx` — renamed from `regenerate-cover-letter-button.test.tsx` + extended with artifact variants + silent-success + G-8 + updated G-6 target file
- [ ] `src/__tests__/lib/job-actions.regenerate.test.ts` — new file, clones 9 cases from `job-actions.trigger.test.ts` × 2 actions (18 cases total — or consolidated describe blocks)
- [ ] `src/__tests__/lib/regenerate-predicates.test.ts` — NEW (if planner chooses extraction per D-02); ~12 cases (4 per predicate)
- [ ] Extensions in `src/__tests__/components/tailored-resume-section.test.tsx` — 1 assertion that `<RegenerateButton artifact="tailored_resume">` renders in populated branch
- [ ] Extensions in `src/__tests__/components/salary-intelligence-section.test.tsx` — 1 assertion that `<RegenerateButton artifact="salary_intelligence">` renders in populated branch
- [ ] Extensions in `src/__tests__/components/job-detail-sheet.test.tsx` — Cover Letter mount's G-4 assertion updated to match `<RegenerateButton artifact="cover_letter">` (from `<RegenerateCoverLetterButton`)

Framework install: none needed — Vitest + Testing Library already in `devDependencies`.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Every new Server Action: `await requireRole(["owner"])` first line (D-12 CI grep gate auto-validates) |
| V3 Session Management | no | Better Auth + Redis session cache already in place (unchanged) |
| V4 Access Control | yes | `requireRole(["owner"])` rejects non-owner on every call path; owner-role promotion via `OWNER_EMAIL` env var (CLAUDE.md) |
| V5 Input Validation | partial | Server Actions accept `jobId: number` — TypeScript narrowing + Zod at DB boundary (`parseOrLog` in `jobs-db.ts:352,369,392,408`); no user-provided strings pass through to the webhook payload |
| V6 Cryptography | yes | HMAC-SHA256 via `sendSignedWebhook` (Plan 23-01) — never hand-roll; 5-min timestamp tolerance + 24h idempotency dedup |
| V9 Communication | yes | HTTPS to n8n via cluster-internal URL + HMAC-signed canonical payload prevents MITM tampering |

### Known Threat Patterns for Next.js 16 + pg + HMAC Webhooks

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized regenerate (non-owner triggers LLM cost) | Elevation of Privilege | `await requireRole(["owner"])` first line + D-12 CI grep gate |
| Webhook replay attack | Tampering + Repudiation | X-Idempotency-Key with fresh `randomUUID()` per click (D-03) + n8n 24h dedup + 5-min timestamp tolerance |
| Webhook forgery | Spoofing | HMAC-SHA256 canonical `${ts}.${path}.${body}` (D-02); n8n rejects unsigned (homelab PR) |
| DB outage spawns n8n runs | DoS amplification | T-23-02-05 — DB read failure returns `{ ok: false, sentinel: "unavailable" }` WITHOUT firing webhook |
| Raw `e.message` / stack leaks internal cluster IPs | Information Disclosure | D-08 — 4-sentinel bounded union is the ONLY client-facing error; `console.error` logs full detail server-side |
| Double-click triggers 2 LLM runs | Resource exhaustion | Button `disabled:pointer-events-none` during in-progress (shadcn) + `disabled={isPending || isPolling}` logic (Phase 23) |

**Key insight:** Phase 24 adds ZERO net-new security surface. Both new Server Actions consume pre-hardened primitives (sendSignedWebhook + requireRole + randomUUID + parseOrLog); D-12 CI grep gate auto-validates the new exports without modification. The silent-success state is a UI-only change; it does not expose new data or loosen any existing guard.

---

## Runtime State Inventory

**Skipped** — Phase 24 is a code/component addition with NO rename, NO refactor affecting runtime state, NO migrations. Existing artifacts referenced (`cover_letters.generated_at`, `tailored_resumes.generated_at`, `salary_intelligence.search_date`) are read-only. No OS-registered state, no secret key renames, no data migrations. (For verification: the `regenerate-cover-letter-button.tsx` → `regenerate-button.tsx` rename is a file-system rename only — no runtime state caches this path; `git log` + `npm test` are the only consumers + both re-read fresh each time.)

---

## Ordered Task Hints for Planner

### Wave Structure

| Wave | Goal | Tasks | Depends on |
|------|------|-------|------------|
| **Wave 1** | Generalize button component + port tests | (a) Rename + generalize `regenerate-button.tsx`; (b) add silent-success state branch + copy; (c) OPTIONAL extract `regenerate-predicates.ts` + test; (d) rename + extend `regenerate-button.test.tsx` (17 ported + ~12 net-new) | Nothing — existing Phase 23 surfaces unchanged |
| **Wave 2** | Add 2 new Server Actions + contract tests | (a) `regenerateTailoredResume` + `regenerateSalaryIntelligence` in `job-actions.ts`; (b) new `src/__tests__/lib/job-actions.regenerate.test.ts` | Wave 1 (button component signature finalized) OR parallel — Server Actions don't touch button files |
| **Wave 3** | Mount 2 new buttons + update existing CL mount | (a) Edit `tailored-resume-section.tsx` — add `<RegenerateButton artifact="tailored_resume">` in populated branch meta row; (b) edit `salary-intelligence-section.tsx` — add `jobId` + `baselineSearchDate` props + mount button in populated branch; (c) edit `job-detail-sheet.tsx` — update CL mount from `<RegenerateCoverLetterButton>` to `<RegenerateButton artifact="cover_letter">` + add `jobId` + `baselineSearchDate` props to SalaryIntelligenceSection call site; (d) update 3 test files with G-4 assertions | Waves 1 + 2 (both button + Server Actions must exist before mount) |
| **Wave 4** | Meta-doc finalization | (a) Correct ROADMAP SC #2 (`generated_at` → `search_date`); (b) update REQUIREMENTS traceability (AI-ACTION-05/06/07 Phase 24 Code complete); (c) STATE.md advance + Performance Metrics; (d) 24-SUMMARY.md with grep-gate inventory (G-1..G-5 carry + G-6 extended + G-8 new) + known rough edges + n8n homelab-repo PR linkage | Waves 1-3 complete + all tests green |

### File-Modification List

| File | Status | Rationale |
|------|--------|-----------|
| `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` | **DELETE** | Renamed to `regenerate-button.tsx` per D-01; clean delete per Plan 22 D-01 precedent (Claude's discretion §) |
| `src/app/(admin)/admin/jobs/regenerate-button.tsx` | **NEW (from rename)** | Generalized — accepts `artifact` + `label` + `action` + `isDone` + `baselineGeneratedAt` props; 4-state machine with silent-success branch (D-01 + D-06) |
| `src/lib/regenerate-predicates.ts` | **NEW (OPTIONAL)** | 3 pure `isDone` functions per D-02 discretion — recommended extraction |
| `src/lib/job-actions.ts` | **EDIT** | +2 exports: `regenerateTailoredResume` + `regenerateSalaryIntelligence` (D-03 + D-04) |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | **EDIT** | (a) Import rename `RegenerateCoverLetterButton` → `RegenerateButton`; (b) CL mount rewires to new prop shape with `artifact="cover_letter"` + `action={regenerateCoverLetter}` + `isDone={coverLetterIsDone}`; (c) `<SalaryIntelligenceSection>` call gains `jobId={detail.id}` + `baselineSearchDate={detail.salary_intelligence?.search_date ?? null}` props |
| `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` | **EDIT** | Mount `<RegenerateButton artifact="tailored_resume">` in populated-branch meta row; section already has `jobId` prop |
| `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` | **EDIT** | (a) Add `jobId: number` + `baselineSearchDate: string \| null` props; (b) mount `<RegenerateButton artifact="salary_intelligence">` in populated-branch meta row |
| `src/__tests__/components/regenerate-cover-letter-button.test.tsx` | **DELETE** | Renamed per D-07 |
| `src/__tests__/components/regenerate-button.test.tsx` | **NEW (from rename + extended)** | 17 ported cases with artifact="cover_letter" fixture + artifact variants for tailored_resume + salary_intelligence + silent-success (AI-ACTION-07) + salary date-granularity rough-edge + G-6 updated target file + G-8 NEW |
| `src/__tests__/lib/job-actions.regenerate.test.ts` | **NEW** | 2 × 5-case clone from Plan 23-02 contract test pattern (requireRole denial + ok + sentinel + DB-error + UUID-v4 idempotency) |
| `src/__tests__/lib/regenerate-predicates.test.ts` | **NEW (OPTIONAL)** | ~12 cases if predicates extracted per D-02 |
| `src/__tests__/components/tailored-resume-section.test.tsx` | **EDIT** | Add assertion that `<RegenerateButton artifact="tailored_resume">` appears in populated branch render |
| `src/__tests__/components/salary-intelligence-section.test.tsx` | **EDIT** | Add assertion that `<RegenerateButton artifact="salary_intelligence">` appears in populated branch render (with new `jobId` prop threaded) |
| `src/__tests__/components/job-detail-sheet.test.tsx` | **EDIT** | Cover Letter G-4 assertion updates from `<RegenerateCoverLetterButton` to `<RegenerateButton artifact="cover_letter"` — also includes new `SalaryIntelligenceSection jobId={` prop threading guard |
| `src/__tests__/lib/job-actions.requireRole.test.ts` | **UNCHANGED** | Auto-validates 2 new exports on next test run (D-12 grep gate) |
| `.planning/ROADMAP.md` | **EDIT (Wave 4)** | SC #2 `generated_at` → `search_date`; Phase 24 progress row 0→8 (or whatever plan count lands); `[⏳]` → `[x]` |
| `.planning/REQUIREMENTS.md` | **EDIT (Wave 4)** | AI-ACTION-05/06/07 checkboxes + traceability rows → Code complete |
| `.planning/STATE.md` | **EDIT (Wave 4)** | Advance position + Performance Metrics |
| `.planning/phases/24-.../24-SUMMARY.md` | **NEW (Wave 4)** | Phase rollup per Phase 23 SUMMARY template |
| `src/lib/webhooks.ts` | **UNCHANGED** | Reused; handles 2 new paths identically |
| `src/lib/session.ts` | **UNCHANGED** | `requireRole` unchanged |
| `src/lib/jobs-db.ts` | **UNCHANGED** | `getJobDetail` already returns all 3 artifacts' freshness fields |
| `src/styles/globals.css` | **UNCHANGED** | `--color-warning` already defined at line 32 |

### Task Dependencies (Wave DAG)

```
Wave 1 ────────────┐
 │                 │
 ▼                 ▼
Wave 2    (parallel with Wave 1 OK — disjoint file sets)
 │
 └────┬────┐
      ▼    ▼
      Wave 3
       │
       ▼
      Wave 4
```

**Parallelizability:**
- Wave 1 (button) + Wave 2 (Server Actions) can run in parallel — zero shared files.
- Wave 3 depends on both (mount sites need `<RegenerateButton>` props + Server Action exports).
- Wave 4 depends on all 3 (meta docs reflect shipped state).

---

## Sources

### Primary (HIGH confidence)

- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-SUMMARY.md` — Phase 23 rollup + "Follow-Up Notes for Phase 24 Planner" section explicitly templates every Phase 24 concern
- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-CONTEXT.md` — D-01..D-12 all locked decisions Phase 24 inherits
- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-UI-SPEC.md` — Dimension-level UI contract + 7 grep gates G-1..G-7 carried forward
- `.planning/phases/22-salary-intelligence-defensive-render/22-CONTEXT.md` — D-03 salary_intelligence schema truth (search_date, not generated_at)
- `src/lib/job-actions.ts:171-198` — `regenerateCoverLetter` template for D-03 + D-04 clones
- `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` — template for `regenerate-button.tsx` generalization
- `src/__tests__/components/regenerate-cover-letter-button.test.tsx` — 17 test cases to port per D-07
- `src/__tests__/lib/job-actions.trigger.test.ts` — template for `job-actions.regenerate.test.ts` clone
- `src/lib/jobs-db.ts:324-330` — SELECT clause confirming `si.search_date AS si_search_date` read shape
- `src/lib/jobs-db.ts:414` — `.toISOString()` coercion confirming search_date returns as ISO date string
- `src/lib/jobs-schemas.ts:66-74` — SalaryIntelligenceSchema with `search_date: z.string()` confirmation
- `src/styles/globals.css:32` — `--color-warning: oklch(0.85 0.17 85);` token existence verified
- `scripts/check-jobs-schema.ts:40-43` — expected columns on `salary_intelligence` table confirming no `generated_at` column exists (ROADMAP SC #2 drift)

### Secondary (MEDIUM confidence)

- `CLAUDE.md` — project conventions + color system + testing framework
- `src/app/(admin)/admin/jobs/tailored-resume-section.tsx:38` — confirms `jobId` prop already in signature
- `src/app/(admin)/admin/jobs/salary-intelligence-section.tsx` (grepped for `jobId` — no matches) — confirms prop must be ADDED

### Tertiary (LOW confidence)

- None — all claims in this research are verified by direct file reads or by CITED references to existing commits/documents.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new deps; every library/primitive already in use
- Architecture: HIGH — pattern-copy of shipped Phase 23 code with explicit CONTEXT.md decisions locking each net-new concern
- Pitfalls: HIGH — 5 specific pitfalls with remediation each grounded in existing code or explicit test assertions
- Novel surface (silent-success): HIGH — state machine extension is a 1-branch render diff; copy is SC-locked verbatim; color token pre-existing
- Mount pattern asymmetry (Pitfall 4): MEDIUM — recommended option is mount-in-section but owner may prefer inline-in-sheet; flagged as Open Question #2

**Research date:** 2026-04-23
**Valid until:** 2026-05-23 (30 days — stable patterns, no upstream churn expected; n8n-side work is homelab-repo concern deferred to v3.5-P4)
