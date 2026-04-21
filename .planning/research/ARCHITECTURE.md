# Architecture Research — v3.0 AI Integration

**Domain:** Integrating n8n-produced LLM artifacts into hudsonfam Next.js 16 App Router admin UI
**Researched:** 2026-04-21
**Confidence:** HIGH (existing code read end-to-end; all 6 questions answered against concrete evidence in repo)

---

## System Overview (current + v3.0 additions)

```
┌─────────────────────────────────────────────────────────────────┐
│                      n8n pod (cloud namespace)                  │
│   Workflows: collector, scorer, cover-letter, company-intel,    │
│              tailored-resume, salary-intel (BROKEN #11),        │
│              outreach                                           │
│     │  (writes rows)           ▲  (webhook POST)                │
│     ▼                          │                                │
├──────────────────────┬──────────┴─────────────────────────────┐ │
│   Postgres `n8n` DB  │       Next.js pod (homepage ns)        │ │
│   ┌────────────────┐ │  ┌──────────────────────────────────┐  │ │
│   │ jobs           │◀┼──┤ src/lib/jobs-db.ts  (pg.Pool=3) │  │ │
│   │ cover_letters  │ │  │   - getJobs / getJobStats       │  │ │
│   │ company_research│ │  │   - getJobDetail (LEFT JOINs)  │  │ │
│   │ tailored_resumes│ │  │   - [NEW] getSalaryIntel*      │  │ │
│   │ salary_intelligence│ │  └─────────┬────────────────────┘  │ │
│   │ recruiter_outreach│ │            │ (Server Components)   │ │
│   │ applications   │ │  ┌─────────▼─────────────────────┐  │ │
│   └────────────────┘ │  │ src/app/(admin)/admin/jobs/   │  │ │
│                      │  │   page.tsx (server fetch)     │  │ │
│                      │  │   jobs-dashboard.tsx (client) │  │ │
│                      │  │   job-detail-sheet.tsx (client)│ │ │
│                      │  │     - [NEW] Tailored Resume   │  │ │
│                      │  │     - [NEW] Salary Intel      │  │ │
│                      │  │     - [NEW] Regenerate btns   │  │ │
│                      │  └─────────┬─────────────────────┘  │ │
│                      │            │                         │ │
│                      │  ┌─────────▼─────────────────────┐  │ │
│                      │  │ src/lib/job-actions.ts        │  │ │
│                      │  │   - fetchJobDetail            │  │ │
│                      │  │   - triggerOutreach (model)   │  │ │
│                      │  │   - [NEW] regenerate*(jobId)  │──┼─┘
│                      │  └───────────────────────────────┘  │
│                      └──────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────┘
         ▲                                              │
         │ row writes on webhook completion             │ POST webhook
         └──────────────────────────────────────────────┘
```

**Existing boundary:** shared DB, no HTTP API from n8n → hudsonfam. hudsonfam → n8n is fire-and-forget webhooks (`fireWebhook()` in `job-actions.ts`) with one synchronous exception (`triggerOutreach` uses `AbortSignal.timeout(180000)` and awaits the response). Both patterns are already in production — v3.0 adds more of the synchronous pattern but does not invent new boundaries.

---

## Component Responsibilities

| Component | Responsibility | Changed in v3.0? |
|-----------|----------------|------------------|
| `src/lib/jobs-db.ts` | pg.Pool + SQL + TS types + reads | **MODIFIED**: add `SalaryIntelligence` type, extend `JobDetail`, add JOIN in `getJobDetail`, add `getSalaryIntelligenceByJob` |
| `src/lib/job-actions.ts` | Server Actions + webhook fires | **MODIFIED**: add `regenerateCoverLetter`, `regenerateTailoredResume`, `regenerateCompanyResearch`, `regenerateSalaryIntel` |
| `src/lib/job-constants.ts` | Client-safe enums | No change |
| `src/app/(admin)/admin/jobs/page.tsx` | Server entry; parallel fetch | No change (detail is lazy-loaded via Server Action) |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` | Client detail UI | **MODIFIED**: 2 new collapsible sections (Tailored Resume, Salary Intel), regenerate buttons, freshness badges |
| `src/app/(admin)/admin/jobs/regenerate-button.tsx` | NEW — reusable trigger + spinner | **NEW FILE** |
| `src/app/api/jobs/[id]/cover-letter-pdf/route.ts` | Binary pass-through | Pattern reused if tailored-resume PDF surfaces |

---

## Recommended Project Structure (delta only)

```
src/
├── lib/
│   ├── jobs-db.ts                    # + SalaryIntelligence type, + getSalaryIntelligenceByJob, + extend getJobDetail JOIN
│   ├── job-actions.ts                # + 4 regenerate* Server Actions
│   ├── job-freshness.ts              # NEW: isStale(generatedAt, jobPostedAt) pure function
│   └── job-constants.ts              # + STALE_THRESHOLD_DAYS = 14 (or 30)
├── app/
│   └── (admin)/admin/jobs/
│       ├── job-detail-sheet.tsx      # + Tailored Resume section, + Salary Intel section, + regenerate buttons, + freshness badges
│       ├── regenerate-button.tsx     # NEW: Client component, accepts Server Action + optimistic state
│       └── tailored-resume-section.tsx   # OPTIONAL extraction if sheet grows past ~300 lines
```

### Structure Rationale

- **Keep everything in `(admin)/admin/jobs/`** — the feature is owner-only and already gated by `requireRole(["owner"])` in route group + every Server Action. No new route segment needed; detail sheet is the right surface.
- **Salary intelligence lives in the detail sheet, NOT a new page.** See ADR below.
- **New `job-freshness.ts` is a pure util** — keeps formatter out of SQL and out of render, makes it testable with Vitest without a DB mock.
- **No shared package, no codegen.** See Q5 below.

---

## ADR-01: Where does `salary_intelligence` live?

**Decision:** Join to `jobs` in `getJobDetail`, surface as a collapsible section in `job-detail-sheet.tsx`. **Not** a separate page.

**Options considered:**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| (A) Separate `/admin/jobs/salary` page | Clean aggregation across all jobs | No user story demands an aggregate view; SEED-001 already owns that | ❌ Reject — premature; owner explicitly deferred aggregate |
| (B) Detail sheet section, joined by `job_id` (1:1) | Matches how `cover_letters` and `tailored_resumes` already work; zero new navigation | Assumes 1 salary intel per job | ✅ **Recommended** |
| (C) Detail sheet section, joined by normalized `company` (many jobs share one salary intel) | DRY if 20 jobs at Stripe share one intel row | Workflow currently produces 0 rows and schema unknown; over-engineering before data exists | ❌ Reject — wait for real data |

**Rationale:** The existing join pattern in `getJobDetail` (lines 271–398) uses `LEFT JOIN ... ON table.job_id = j.id` for `cover_letters` and `tailored_resumes`. Salary intel follows the same shape unless the upstream workflow proves otherwise. If the Task #11 fix writes `(company, salary_min, salary_max, role_level, source, ...)` keyed by company rather than job, we swap the JOIN to `ON si.company = j.company AND si.role_level = <derived>` — the **TS interface doesn't change**, only the SQL.

**Hedge for uncertainty:** since `salary_intelligence` has 0 rows, we write the JOIN defensively:
```sql
LEFT JOIN LATERAL (
  SELECT * FROM salary_intelligence si
  WHERE si.job_id = j.id OR si.company = j.company
  ORDER BY si.job_id = j.id DESC, si.generated_at DESC
  LIMIT 1
) si ON true
```
This tolerates both schemas. If perf becomes an issue once data exists, replace with a concrete join.

---

## Architectural Patterns

### Pattern 1: Server Action → n8n webhook (sync, await response)

**What:** Owner clicks "Regenerate cover letter". A `"use server"` action fires `fetch(...)` to the n8n webhook with `AbortSignal.timeout(60000)` and awaits. n8n's webhook node returns `{ ok: true }` after inserting the new row. Action calls `revalidatePath("/admin/jobs")`. Client shows spinner, then sheet re-fetches detail on next render.

**When to use:** User-initiated mutation where the user expects to see results in <60s.

**Trade-offs:**
- ✅ Reuses existing `triggerOutreach` shape — zero new conventions
- ✅ Single source of auth (`requireRole(["owner"])` in the action)
- ✅ No public Route Handler surface to lock down
- ❌ Ties a Next.js request to a long n8n run; if n8n takes 40s the HTTP connection stays open
- ❌ No streaming (acceptable per Q4 decision)

**Example:**
```typescript
// src/lib/job-actions.ts
export async function regenerateCoverLetter(
  jobId: number
): Promise<{ success: boolean; error?: string }> {
  await requireRole(["owner"]);
  try {
    const res = await fetch(`${N8N_WEBHOOK_BASE}/webhook/regenerate-cover-letter`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET ?? "",
      },
      body: JSON.stringify({ job_id: jobId }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { success: false, error: `n8n ${res.status}` };
    revalidatePath("/admin/jobs");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Unknown" };
  }
}
```

### Pattern 2: Pure freshness util + server-computed badge

**What:** `isStale(generatedAt, jobPostedAt, now)` returns `{ stale: boolean; ageDays: number; reason: string | null }`. Called in the Server Action `fetchJobDetail` on the returned row, attached as `freshness` field on the TS type. UI reads `detail.cover_letter.freshness.stale` and renders a warning badge.

**When to use:** Any time-derived display. Keeps SQL clean and keeps client free of `new Date()` hydration mismatches (already a documented project concern — see CLAUDE.md "Explicit timezone (America/Chicago) on all date formatters").

**Trade-offs:**
- ✅ Pure function — trivial Vitest coverage
- ✅ No SQL schema change
- ✅ No hydration mismatch risk
- ❌ Recomputed every fetch (negligible cost)

**Example:**
```typescript
// src/lib/job-freshness.ts
export const STALE_THRESHOLD_DAYS = 14;

export function isStale(
  artifactGeneratedAt: string | null,
  jobPostedAt: string | null,
  now: Date = new Date()
): { stale: boolean; ageDays: number; reason: string | null } {
  if (!artifactGeneratedAt) return { stale: false, ageDays: 0, reason: null };
  const generated = new Date(artifactGeneratedAt);
  const ageDays = Math.floor((now.getTime() - generated.getTime()) / 86_400_000);
  if (ageDays >= STALE_THRESHOLD_DAYS) {
    return { stale: true, ageDays, reason: `generated ${ageDays}d ago` };
  }
  if (jobPostedAt) {
    const posted = new Date(jobPostedAt);
    if (posted > generated) {
      return { stale: true, ageDays, reason: "job updated after artifact" };
    }
  }
  return { stale: false, ageDays, reason: null };
}
```

### Pattern 3: Optimistic spinner via `useTransition`

**What:** Regenerate button is a Client Component using `useTransition` to call the Server Action. While `isPending`, show spinner + "Regenerating..." text. Action ends → `revalidatePath` fires → `fetchJobDetail` is re-called by the sheet on next open OR we surface the new row via `router.refresh()` inside the sheet after success.

**When to use:** Every regenerate button. Keeps loading state colocated without Redux-style client state.

**Trade-offs:**
- ✅ Standard Next 16 pattern, no extra deps
- ✅ Natural loading affordance
- ❌ Sheet needs to re-fetch after success — wire with a callback prop that re-invokes `fetchJobDetail(jobId)` in the sheet's effect

### Pattern 4: Fire-and-forget side-effect (unchanged, reference only)

Kept as-is for non-user-facing triggers (`job-feedback-sync`, `job-company-intel`). Do not convert these to awaited calls — users don't wait for them.

---

## Data Flow

### Regenerate cover letter flow

```
[Owner clicks "Regenerate" in detail sheet]
    ↓
[RegenerateButton (client)] --useTransition--> [regenerateCoverLetter Server Action]
    ↓                                                      ↓
[spinner on]                                 [requireRole("owner")]
                                                           ↓
                                       [POST n8n /webhook/regenerate-cover-letter]
                                                           ↓
                            [n8n: delete old cover_letter row, run LLM, INSERT new row]
                                                           ↓
                                                    [returns {ok:true}]
                                                           ↓
                                                [revalidatePath("/admin/jobs")]
                                                           ↓
[spinner off] ← success resolves ← action returns
    ↓
[fetchJobDetail(jobId) re-invoked via callback, sheet re-renders with fresh row]
```

### Detail sheet fetch flow (extended)

```
[Sheet opens with jobId]
    ↓
[useEffect calls fetchJobDetail(jobId)]
    ↓
[Server Action: requireRole + getJobDetail(jobId)]
    ↓
[SQL: jobs LEFT JOIN cover_letters LEFT JOIN company_research
      LEFT JOIN tailored_resumes LEFT JOIN salary_intelligence]  ← NEW JOIN
    ↓
[attach freshness to each artifact via isStale()]  ← NEW
    ↓
[return JobDetail { ..., salary_intelligence, freshness }]
    ↓
[Sheet renders 5 collapsible sections: Cover Letter, Company Intel,
 Tailored Resume (NEW), Salary Intel (NEW), Description]
```

---

## Answers to the 6 Questions

### Q1. Salary intelligence data path

- **Location:** `src/lib/jobs-db.ts` — new `SalaryIntelligence` interface, extend `JobDetail`, add `LEFT JOIN LATERAL` in `getJobDetail` (defensive to tolerate both `job_id` and `company` keying).
- **Surface:** collapsible section in `job-detail-sheet.tsx` between "Company Intel" and "Description".
- **Not a separate page.** SEED-001 owns any aggregate view.

### Q2. Regenerate-artifact action

**Use Server Actions, not Route Handlers.**

- Reuses the working `triggerOutreach` pattern (already in prod, timeout + error return shape known to work).
- Auth: `requireRole(["owner"])` inside the action — identical to every other mutation in the file.
- Additional defence: add `X-Webhook-Secret: process.env.N8N_WEBHOOK_SECRET` header. n8n webhook nodes support header-based auth; document in `.env` + homelab manifests. **Do not** rely on IP allow-lists — the n8n pod is in-cluster at `n8n.cloud.svc.cluster.local:5678` (hardcoded in `job-actions.ts` line 14), so the call never leaves the cluster; the bigger risk is a pod-to-pod forgery from another workload, which the shared secret mitigates.
- No public Route Handler = no CSRF surface, no CORS config, no rate-limit worry.

**Why not a Route Handler:** no external caller needs this. The only trigger is "owner clicks button in admin UI." A Server Action is strictly simpler, already authenticated by the Next session, and avoids duplicating auth logic.

### Q3. Freshness / stale indicators

**Compute in the server fetch layer**, not SQL, not client.

- **Not SQL**: adds brittle triggers + keeps formatter logic in the database. Freshness thresholds change more often than schemas.
- **Not client**: `new Date()` in client render = hydration mismatch risk (already a documented project pain point).
- **Server fetch**: `getJobDetail` attaches `freshness: { stale, ageDays, reason }` to each artifact before returning. Threshold constant lives in `src/lib/job-freshness.ts` (or `job-constants.ts`). Pure function, Vitest-friendly.

### Q4. Streaming vs static

**Static spinner. Do not stream tokens.** Rationale (solo-dev pragmatism):

| Approach | Cost | Value |
|----------|------|-------|
| Streaming tokens (SSE/RSC stream, n8n HTTP Response node in "Stream" mode) | Meaningful: n8n workflow rewrite, new Next.js streaming handler, backpressure testing, connection-drop UX | Saves 20–40s of perceived wait, 1 user (owner), ~dozens of regenerations per month |
| `useTransition` spinner + `revalidatePath` + re-fetch | ~10 lines, reuses existing primitives | Clear "Regenerating…" state; correct final state guaranteed |

The owner is the only user. 30s of spinner on an infrequent action is fine. Revisit if regeneration becomes hourly.

**Timeout budget:** `AbortSignal.timeout(60000)` — gives 50% headroom over the observed 20–40s. If n8n is slow, the action returns `{ success: false, error: "AbortError" }`; row still gets written eventually but UI will pick it up next sheet-open via `revalidatePath`.

### Q5. Shared types

**Do not extract a shared package. Do not codegen.**

- n8n's "schema" is effectively the Postgres DDL. The TS types in `jobs-db.ts` describe the columns hudsonfam *reads*.
- n8n doesn't consume TS types — it writes SQL + produces JSON blobs that are inserted by workflow nodes.
- A shared package would require: new npm workspace, publish step, version pinning, and cross-repo coordination across `hudsor01/hudsonfam` and `hudsor01/homelab`. Zero payoff for a solo dev.
- Codegen (Prisma introspect / kysely-codegen / pg-typegen): acceptable but still requires plumbing a separate generator against the `n8n` DB, committing output, regenerating on schema change. Marginal value vs hand-maintaining 5 interfaces that change ~monthly.

**Simplest correct boundary:** the Postgres DDL is the contract. `jobs-db.ts` TS types are a view of that contract. When the workflow migrates salary_intel schema, update the types in `jobs-db.ts` — same file, same PR. Drift is caught by the SQL query failing (PG returns nulls for missing columns → TS `null` — visible bug).

**One guardrail worth adding:** a lightweight integration test that queries `information_schema.columns` for `salary_intelligence`, `cover_letters`, `tailored_resumes`, `company_research` and asserts the column list hudsonfam depends on exists. Cheap. Catches schema drift at CI time. Add to Vitest (gated by `JOBS_DATABASE_URL` being set) or to a one-off `scripts/check-jobs-schema.ts`.

### Q6. Build order (dependency-aware)

**Critical path (must be sequential):**

1. **`isStale` pure util + tests** — no dependencies; unblocks steps 4, 6.
2. **Extend `JobDetail` + `getJobDetail` to JOIN `tailored_resumes` rendering** — wait, data already JOINed (line 301). Step is: **render tailored resume in sheet**. No new SQL. Data exists (6 rows). Ship first — smallest PR, proves the sheet-extension shape.
3. **Add `SalaryIntelligence` type + JOIN + `getSalaryIntelligenceByJob`** — depends on Task #11 workflow fix producing actual rows. **Can be built against 0 rows** (sheet will just not render the section). Do not block on Task #11.
4. **Regenerate button component + first Server Action (`regenerateCoverLetter`)** — depends on 1 (for freshness indicator driving the UI decision). This is the pattern-setter; once it works, the other 3 regenerate actions are copy-paste.
5. **Wire remaining 3 regenerate actions** — `regenerateTailoredResume`, `regenerateCompanyResearch`, `regenerateSalaryIntel`. Depends on 4.
6. **Freshness badges in sheet** — depends on 1. Can ship in parallel with 4–5.

**Parallel with app work (owned elsewhere, tracked):**
- Task #11 (homelab backlog) — Fix salary-intel batch-INSERT parameter-limit bug.
- Company-research workflow diagnosis — why 0 rows produced.

**Merge order into single v3.0 PR branch (per CLAUDE.md "Single PR branch per milestone"):**
1. Commit: `job-freshness.ts` + tests.
2. Commit: Render tailored resume in detail sheet.
3. Commit: Salary intelligence type + query + render (empty-tolerant).
4. Commit: `regenerate-button.tsx` + `regenerateCoverLetter` action + wire one button.
5. Commit: Remaining 3 regenerate actions.
6. Commit: Freshness badges in all 4 artifact sections.
7. Commit: New n8n webhook endpoint additions (document required n8n workflow changes in PLAN.md; actual n8n work is out-of-repo).

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| n8n (cloud ns) | Server Action → POST `n8n.cloud.svc.cluster.local:5678/webhook/<path>` with `X-Webhook-Secret` header | Base URL already in `job-actions.ts:14`. Add secret to Kubernetes ExternalSecret + Next.js env. |
| Postgres `n8n` DB | `pg.Pool` via `JOBS_DATABASE_URL`, max=3 | Shared with n8n. Don't add writes without coordinating. v3.0 is read-only from hudsonfam except via the existing `applications` and `status` writes. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `page.tsx` → `jobs-dashboard.tsx` | RSC props | No change; passes server-fetched data + Server Action refs |
| `jobs-dashboard.tsx` → `job-detail-sheet.tsx` | Client props + `onStatusChange` callback | No change |
| `job-detail-sheet.tsx` → Server Actions | Direct call from client (Next 16 RSC pattern) | Used today for `fetchJobDetail` and `triggerOutreach` — extend the same way |
| `regenerate-button.tsx` → parent sheet | `onSuccess` callback to trigger `fetchJobDetail` re-call | Simplest path; avoids prop-drilling a refresh signal |

### Collision with existing patterns?

**One to flag:** `job-detail-sheet.tsx` is currently 253 lines. Adding 2 sections + 4 regenerate buttons + freshness badges pushes it toward ~450 lines. **This is still fine** — no need to split unless a section becomes complex enough to have its own state (e.g., if tailored-resume edits inline). Recommend: keep in one file; extract only if a section crosses ~100 lines of its own render logic. Premature extraction costs more than it saves.

**One to confirm:** the `useEffect` in `job-detail-sheet.tsx:64-79` has a `// eslint-disable-next-line react-hooks/set-state-in-effect`. CLAUDE.md flags this pattern as something v2.0 cleaned up — but this usage is correct (fetching on dependency change). No rework needed; just don't propagate the disable.

---

## Scaling Considerations

Single-user admin surface. Scaling is not a concern.

| Scale | Adjustments |
|-------|-------------|
| 1 user (today) | Current architecture fits. No action. |
| Hypothetical: shared with family members | Regenerate buttons would need per-user quota/queue; n8n would need concurrency controls on the regenerate workflow. Out of scope. |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Building a Route Handler just because "it's an API"

**What people do:** Create `/api/jobs/[id]/regenerate-cover-letter/route.ts` that POSTs to n8n.
**Why it's wrong:** Adds a public surface that has to duplicate auth, re-parse params, handle CORS. A Server Action does all three for free and is strictly simpler.
**Do this instead:** Server Action.

### Anti-Pattern 2: Streaming tokens through n8n → Next.js → browser

**What people do:** Wire n8n's HTTP Response node in stream mode, build an SSE endpoint in Next.js, stream incrementally to the sheet.
**Why it's wrong:** Four moving parts (LLM stream → n8n → Next → React), backpressure edge cases, reconnection logic, UI cursor management. Owner is one user waiting 30s on an infrequent action.
**Do this instead:** Spinner + revalidate. Revisit only if regenerate becomes an hourly workflow.

### Anti-Pattern 3: Adding a `freshness` boolean column to each artifact table

**What people do:** `ALTER TABLE cover_letters ADD COLUMN is_stale boolean;` with a trigger that flips it.
**Why it's wrong:** Couples the freshness policy to the database schema. Changing 14d → 30d requires a migration and trigger rewrite.
**Do this instead:** Compute in TS on read. Pure function, one-line config change.

### Anti-Pattern 4: Extracting types to a shared npm package

**What people do:** Create `@hudsor/jobs-types` with the 5 interfaces.
**Why it's wrong:** Workspace plumbing, version pinning, publish step — for 5 interfaces that live in one file in one repo consumed by one app.
**Do this instead:** Keep types in `jobs-db.ts`. Add a schema-check test as a drift guardrail.

### Anti-Pattern 5: Adding a new route segment for salary intelligence

**What people do:** `/admin/jobs/salary` page that aggregates across all jobs.
**Why it's wrong:** Owner explicitly deferred aggregate views (SEED-001). YAGNI.
**Do this instead:** Collapsible section in the existing detail sheet.

---

## Sources

- `/home/dev-server/hudsonfam/src/lib/jobs-db.ts` (existing pg.Pool, types, `getJobDetail` SQL)
- `/home/dev-server/hudsonfam/src/lib/job-actions.ts` (existing Server Action + webhook pattern, `triggerOutreach` is the template for regenerate actions)
- `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (existing sheet structure + sections)
- `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/page.tsx` (server-side entry, parallel fetch pattern)
- `/home/dev-server/hudsonfam/src/app/api/jobs/[id]/cover-letter-pdf/route.ts` (Route Handler reference for binary pass-through — not needed for v3.0 regenerate but confirms auth pattern)
- `/home/dev-server/hudsonfam/.planning/notes/ai-pipeline-integration-context.md` (ground-truth row counts + scope decisions)
- `/home/dev-server/hudsonfam/CLAUDE.md` (project conventions: TanStack, useMemo/useEffect guidance, hydration guards, single-PR-per-milestone)

---
*Architecture research for: v3.0 AI Integration milestone — hudsonfam*
*Researched: 2026-04-21*
