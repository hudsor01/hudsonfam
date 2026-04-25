# Phase 23: Owner-Triggered Workflows (Pattern Setter) — Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 12 (3 NEW src + 3 EDIT src + 4 NEW tests + 1 EDIT test + 2 docs)
**Analogs found:** 11 / 12 (only the fake-timer polling test component has NO direct analog — MUST use Context7-verified Vitest pattern from RESEARCH.md §Validation Architecture)

---

## Overview / Role Map

| Tier | New Files | Role |
|------|-----------|------|
| **Server primitive** | `src/lib/webhooks.ts` | HMAC + idempotency + sentinel-cascade helper (pure server-side, no DB) |
| **Server Actions (edit + new exports)** | `src/lib/job-actions.ts` | Delete `fireWebhook`; retrofit 3 call sites; add `triggerCompanyResearch` + `regenerateCoverLetter` |
| **Client components** | `trigger-company-research-button.tsx`, `regenerate-cover-letter-button.tsx` | Pessimistic-poll buttons; internal `ButtonState` discriminated union; `useEffect` + `setInterval` + `useRef` counter |
| **Client mount site (edit)** | `job-detail-sheet.tsx` | Mount `TriggerCompanyResearchButton` in Company Intel missing branch; mount `RegenerateCoverLetterButton` in Cover Letter populated meta row |
| **Unit tests — libraries** | `webhooks.test.ts`, `job-actions.trigger.test.ts`, `job-actions.requireRole.test.ts` | HMAC correctness + sentinel cascade; Server Action shape + requireRole denial; source-text CI grep gate |
| **Unit tests — components** | `trigger-company-research-button.test.tsx`, `regenerate-cover-letter-button.test.tsx` | Fake-timer polling with MSW-mocked Server Actions; G-1/G-3/G-5/G-6 grep-gate verification |
| **Integration test (edit)** | `job-detail-sheet.test.tsx` | Extend with button mount + visibility gate assertions (G-4) |
| **Docs (edit)** | `.env.example`, `CLAUDE.md` | Add `N8N_WEBHOOK_SECRET` placeholder |

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/webhooks.ts` | utility/primitive | request-response (fire-to-external) | `src/lib/attach-freshness.ts` | role-match (pure-function module; discriminated-union return) |
| `src/lib/job-actions.ts` (EDIT) | server-actions | CRUD + event-trigger | (self — existing pattern is the analog) | exact (5/5 existing exports already comply with `requireRole` first-line invariant) |
| `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` | client-component | event-driven + polling | `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` | role-match (client component, internal state, lucide icons, shadcn Button; NO polling precedent — new pattern) |
| `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` | client-component | event-driven + polling | `tailored-resume-section.tsx` | role-match (same as above; additional server-baseline prop pattern is NEW) |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (EDIT) | client-component | composition | (self — edit within existing structure) | exact |
| `src/__tests__/lib/webhooks.test.ts` | test (unit) | pure function | `src/__tests__/lib/provenance.test.ts` | role-match (discriminated sentinel mapping / truth-table); HMAC correctness section has no analog — use RESEARCH.md §Code Examples template |
| `src/__tests__/lib/job-actions.trigger.test.ts` | test (unit) | mocked I/O | `src/__tests__/lib/jobs-db-zod.test.ts` | role-match (exercises discriminated-union + `vi.spyOn(console, "error")`; `requireRole` denial via `vi.mock("@/lib/session")`) |
| `src/__tests__/lib/job-actions.requireRole.test.ts` | test (CI grep) | source-text regex | `src/__tests__/components/job-detail-sheet.test.tsx` (Phase 22 Plan 22-07) | **EXACT** — direct readFileSync + regex adjacency pattern |
| `src/__tests__/components/trigger-company-research-button.test.tsx` | test (component) | fake-timer polling + mocked fetch | `src/__tests__/components/tailored-resume-section.test.tsx` (for `vi.hoisted` + `vi.mock` + `act` shape); fake-timer polling has NO analog (see Cross-cutting §5) | partial — mount/assert shape matches; polling setup is NEW |
| `src/__tests__/components/regenerate-cover-letter-button.test.tsx` | test (component) | same as above + baseline-predicate | same as above | partial |
| `.env.example` (EDIT) | config | static | (self — existing env-var list) | exact |
| `CLAUDE.md` (EDIT) | docs | static | (self — existing Environment Variables table) | exact |

---

## Pattern Assignments

### 1. `src/lib/webhooks.ts` (NEW — utility/primitive, request-response)

**Analog:** `src/lib/attach-freshness.ts`

**Why this analog:** Both are pure server-side library modules with a discriminated return type. `attach-freshness` returns `(T & { freshness }) | null`; `webhooks.ts` returns `{ ok: true } | { ok: false; sentinel: ErrorSentinel }`. Both live outside `"use server"` files (re-exported or directly imported by Server Actions). Both silently fail-open on bad input (`attachFreshness` returns zeroed freshness on unparseable date; `sendSignedWebhook` returns `"unavailable"` sentinel on bad response) and both server-log-but-never-throw.

**Imports pattern to mirror (`attach-freshness.ts` lines 1-2):**
```typescript
import type { ArtifactFreshness } from "@/lib/jobs-db";
import { isStale } from "@/lib/job-freshness";
```

**Translate to `webhooks.ts`:**
```typescript
import { createHmac, randomUUID } from "node:crypto";
```

**Discriminated-union return pattern** (analog: `attach-freshness.ts` lines 29-35):
```typescript
// attach-freshness.ts — return T-with-freshness | null
): (T & { freshness: ArtifactFreshness }) | null {
```

**Translate to `webhooks.ts`:**
```typescript
export type ErrorSentinel = "timeout" | "auth" | "rate limit" | "unavailable";
export type WebhookResult =
  | { ok: true }
  | { ok: false; sentinel: ErrorSentinel };

export async function sendSignedWebhook(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string
): Promise<WebhookResult> { /* ... */ }
```

**Silent-fail-with-logging pattern** (analog: `attach-freshness.ts` lines 45-51):
```typescript
// attach-freshness.ts — unparseable ISO → zeroed freshness, no throw
const generated = new Date(iso);
if (Number.isNaN(generated.getTime())) {
  return {
    ...artifact,
    freshness: { generatedDate: "", isStale: false, ageDays: 0 },
  } as T & { freshness: ArtifactFreshness };
}
```

**Translate to `webhooks.ts`** (internal sentinel helper — pattern from RESEARCH.md §Architecture Patterns):
```typescript
function sentinel(
  kind: ErrorSentinel,
  err: unknown,
  path: string,
  status?: number
): WebhookResult {
  console.error(`[webhook:${path}] ${kind}`, { err, status });
  return { ok: false, sentinel: kind };
}
```

**Cascade pattern** (no codebase analog — use RESEARCH.md §Architecture Patterns literal, verified Node 25 stdlib 2026-04-22):
```typescript
// D-07 cascade order (RESEARCH.md Section 5):
try {
  const r = await fetch(`${N8N_WEBHOOK_BASE}/webhook/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hudsonfam-Signature": `sha256=${sig}`,
      "X-Hudsonfam-Timestamp": timestamp,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: rawBody,                    // SAME string that was signed (D-02)
    signal: AbortSignal.timeout(5000),
  });
  if (r.status === 401 || r.status === 403) return sentinel("auth", null, path, r.status);
  if (r.status === 429) return sentinel("rate limit", null, path, r.status);
  if (!r.ok) return sentinel("unavailable", null, path, r.status);
  return { ok: true };
} catch (e) {
  const name = (e as { name?: string }).name;
  if (name === "AbortError" || name === "TimeoutError") return sentinel("timeout", e, path);
  return sentinel("unavailable", e, path);
}
```

**CRITICAL raw-body identity** (RESEARCH.md §Pitfall 1):
```typescript
// Compute JSON.stringify(body) ONCE; pass to both update() and fetch body.
const rawBody = JSON.stringify(body);
const canonical = `${timestamp}.${path}.${rawBody}`;
const sig = createHmac("sha256", secret).update(canonical).digest("hex");
// ... later: body: rawBody  (NOT JSON.stringify(body) a second time)
```

**Signatures/types/exports to preserve:**
- Export: `sendSignedWebhook(path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<WebhookResult>`
- Export: `type ErrorSentinel = "timeout" | "auth" | "rate limit" | "unavailable"`
- Export: `type WebhookResult = { ok: true } | { ok: false; sentinel: ErrorSentinel }`
- `N8N_WEBHOOK_BASE` env constant (mirror line 22-23 of `job-actions.ts`): `process.env.N8N_WEBHOOK_URL || "http://n8n.cloud.svc.cluster.local:5678"`
- `N8N_WEBHOOK_SECRET` env constant — NEW env var; log an error and return `"unavailable"` if missing at call time rather than throwing at module load (lets Vitest import without env wiring).

**Delta vs analog:** `attach-freshness` is synchronous date math; `webhooks.ts` is async fetch with HMAC + error cascade. Only the return-shape discipline and silent-server-log behavior transfer.

---

### 2. `src/lib/job-actions.ts` (EDIT — server-actions, CRUD + event-trigger)

**Analog:** The existing file itself (self-reference — 5/5 existing exports already comply with all invariants).

**Existing structure to preserve** (`job-actions.ts` lines 1-3, 22-23, 52-79, 85-112, 115-120):

**Imports pattern** (lines 1-20):
```typescript
"use server";

import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  updateJobStatus as dbUpdateStatus,
  createApplication,
  getJob as dbGetJob,
  getJobDetail,
} from "@/lib/jobs-db";
import type {
  CoverLetter,
  /* ... other types ... */
  FreshJobDetail,
} from "@/lib/jobs-db";
import { STALE_THRESHOLDS } from "@/lib/job-freshness";
import { attachFreshness } from "@/lib/attach-freshness";
```

**Translate — add to imports:**
```typescript
import { randomUUID } from "node:crypto";
import { sendSignedWebhook, type ErrorSentinel } from "@/lib/webhooks";
```

**requireRole first-line invariant** (analog: lines 56, 89, 116, 127 — 5/5 existing exports comply):
```typescript
export async function fetchJobDetail(jobId: number): Promise<FreshJobDetail | null> {
  await requireRole(["owner"]);               // <-- FIRST LINE (within 10 lines of function opening per D-12)
  const detail = await getJobDetail(jobId);
  // ...
}
```

**Translate to new exports** (D-12 grep gate enforces):
```typescript
export async function triggerCompanyResearch(
  jobId: number
): Promise<{ ok: true } | { ok: false; sentinel: ErrorSentinel }> {
  await requireRole(["owner"]);
  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "job-company-intel",
    { job_id: jobId },
    idempotencyKey
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true };
}

export async function regenerateCoverLetter(
  jobId: number
): Promise<
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel }
> {
  await requireRole(["owner"]);
  // D-06 amended: read pre-webhook baseline server-side (no client clock).
  const current = await getJobDetail(jobId);
  const baseline = current?.cover_letter?.generated_at ?? null;
  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "regenerate-cover-letter",
    { job_id: jobId },
    idempotencyKey
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true, baseline };
}
```

**Retrofit pattern** (3 call sites — analog: lines 98, 103-107, 118):

Current (to be DELETED at lines 25-38):
```typescript
async function fireWebhook(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${N8N_WEBHOOK_BASE}/webhook/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch { /* Fire-and-forget */ }
}
```

Replace (at 3 call sites — D-11 preserves fire-and-forget posture):
```typescript
// Line 98 equivalent:
void sendSignedWebhook("job-feedback-sync", { job_id: jobId, action: "reject" }, randomUUID());

// Line 103 equivalent:
void sendSignedWebhook(
  "job-company-intel",
  { job_id: jobId, company_name: job.company, company_url: job.company_url },
  randomUUID()
);

// Line 118 equivalent:
void sendSignedWebhook("job-feedback-sync", { job_id: jobId, action: "dismiss" }, randomUUID());
```

**Signatures/types/imports to preserve:**
- Keep `"use server"` directive on line 1
- Keep the existing 5 exports (`fetchJobDetail`, `updateJobStatus`, `dismissJob`, `undismissJob`) — only ADD the 2 new ones
- DELETE lines 25-38 (`fireWebhook` helper) in entirety — no shim, no deprecation comment (G-7)
- Preserve `const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_URL || "http://n8n.cloud.svc.cluster.local:5678"` — it now lives inside `webhooks.ts` too; either re-export or duplicate (planner picks; duplicate is simpler for Phase 23)

**Delta vs existing exports:** The 2 new exports are the FIRST owner-triggered actions that return a discriminated union (existing exports return `void` or `FreshJobDetail | null`). This sets the precedent for Phase 24's 2 more regenerate actions.

---

### 3. `src/app/(admin)/admin/jobs/trigger-company-research-button.tsx` (NEW — client-component, event-driven + polling)

**Analog:** `src/app/(admin)/admin/jobs/tailored-resume-section.tsx` (adjacent client component with internal state + lucide icons + shadcn Button). NO polling analog exists anywhere in repo — that portion uses RESEARCH.md §Pattern 3 literal.

**Imports pattern** (`tailored-resume-section.tsx` lines 1-14):
```typescript
"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FreshnessBadge } from "./freshness-badge";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
```

**Translate to `trigger-company-research-button.tsx`:**
```typescript
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  triggerCompanyResearch,
  fetchJobDetail,
} from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";
```

**Interface/props pattern** (analog: `tailored-resume-section.tsx` lines 16-38):
```typescript
// tailored-resume-section.tsx — interfaces declared before component
export interface ResumeFreshness { /* ... */ }
export interface TailoredResumeView { /* ... */ }
interface Props {
  resume: TailoredResumeView | null;
  jobId: number;
}
```

**Translate (Phase 23 UI-SPEC §Component Contracts 1):**
```typescript
interface TriggerCompanyResearchButtonProps {
  /** Job ID to pass to the triggerCompanyResearch Server Action. */
  jobId: number;
}

type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress" }
  | { kind: "error"; sentinel: ErrorSentinel };
```

**useState + render shape pattern** (analog: `tailored-resume-section.tsx` lines 75-90):
```typescript
// tailored-resume-section.tsx — hooks-hoisted-above-early-returns (Plan 21-06)
export function TailoredResumeSection({ resume, jobId }: Props) {
  const [copied, setCopied] = useState(false);

  if (resume === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        {/* ... */}
      </div>
    );
  }
  // ...
}
```

**Translate** (Phase 23 UI-SPEC §Component Contracts — render tree from UI-SPEC lines 234-291):
```typescript
export function TriggerCompanyResearchButton({
  jobId,
}: TriggerCompanyResearchButtonProps) {
  const [state, setState] = useState<ButtonState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unmount cleanup (MANDATORY — RESEARCH.md §Pitfall 6)
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const isPolling = state.kind === "in-progress";
  const isDisabled = isPolling || isPending;
  // ... handleClick + startPolling per RESEARCH.md §Pattern 3 ...

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        className={isPolling ? "text-muted-foreground" : ""}
        aria-busy={isPolling}
      >
        {isPolling ? <Loader2 className="animate-spin" /> : <Sparkles />}
        Research this company
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
    </div>
  );
}
```

**Polling primitive** (NO codebase analog — use RESEARCH.md §Pattern 3 literal verbatim, already Context7-verified):
```typescript
const startPolling = () => {
  pollCountRef.current = 0;
  intervalRef.current = setInterval(async () => {
    pollCountRef.current += 1;
    try {
      const detail = await fetchJobDetail(jobId);
      if (detail?.company_research) {              // INSERT-wait predicate (D-06)
        clearInterval(intervalRef.current!);
        setState({ kind: "idle" });
        return;
      }
      if (pollCountRef.current >= 60) {            // D-05 cap = 180s
        clearInterval(intervalRef.current!);
        setState({ kind: "error", sentinel: "unavailable" });
      }
    } catch {
      if (pollCountRef.current >= 60) {
        clearInterval(intervalRef.current!);
        setState({ kind: "error", sentinel: "unavailable" });
      }
    }
  }, 3000);                                         // D-05 cadence
};
```

**Signatures/types/imports to preserve:**
- `"use client"` as first line
- Props interface name `TriggerCompanyResearchButtonProps`
- Exported `function TriggerCompanyResearchButton({ jobId })` — NOT default export (matches `TailoredResumeSection` named-export convention)
- Button label literal string `"Research this company"` (UI-SPEC G-5)
- `aria-busy={isPolling}` attribute (UI-SPEC G-1)
- `text-destructive text-xs mt-1` on sentinel `<p>` (UI-SPEC §Copywriting)
- NO `Date.now()` anywhere (this button doesn't need it, but enforce via G-6 equivalent for consistency)

**Delta vs analog:** `tailored-resume-section` has NO polling, NO `useTransition`, NO `useRef` counter. The state machine, interval management, and AbortController unmount cleanup are all NEW for the project. This component sets the template for Phase 24's `regenerate-tailored-resume-button` and `regenerate-salary-intelligence-button`.

---

### 4. `src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx` (NEW — client-component, event-driven + polling)

**Analog:** `trigger-company-research-button.tsx` (sibling — shares 90% of structure) and `tailored-resume-section.tsx` (for overall render shape).

**Delta from sibling:**
1. Second prop `baselineGeneratedAt: string` (UI-SPEC §Component Contracts 2).
2. Icon: `RefreshCw` instead of `Sparkles`.
3. Label: `"Regenerate cover letter"` (UI-SPEC G-5).
4. Predicate is UPDATE-wait, not INSERT-wait:

```typescript
type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string }   // carries the server-returned baseline
  | { kind: "error"; sentinel: ErrorSentinel };

// Inside the polling loop:
const isDone = (detail: FreshJobDetail | null, serverBaseline: string) => {
  if (!detail?.cover_letter?.generated_at) return false;
  // `new Date()` INSIDE the polling callback (runtime), NEVER at render time (G-6 lock)
  return new Date(detail.cover_letter.generated_at) > new Date(serverBaseline);
};
```

5. `onClick` captures server-returned baseline (NOT `Date.now()`) — UI-SPEC §Researcher Notes #3 + G-6:

```typescript
const handleClick = () => {
  startTransition(async () => {
    const res = await regenerateCoverLetter(jobId);
    if (!res.ok) {
      setState({ kind: "error", sentinel: res.sentinel });
      return;
    }
    // res.baseline is the server-read cover_letters.generated_at pre-webhook
    // Fall back to the prop if the row somehow vanished between sheet-load and click
    const serverBaseline = res.baseline ?? baselineGeneratedAt;
    setState({ kind: "in-progress", serverBaseline });
    startPolling(serverBaseline);
  });
};
```

6. Success transition returns to `idle` (repeatable) instead of unmounting:
```typescript
// When predicate satisfies:
clearInterval(intervalRef.current!);
setState({ kind: "idle" });   // button stays visible for re-click
```

**Signatures/types/imports to preserve:**
- Props interface: `{ jobId: number; baselineGeneratedAt: string }`
- Button label literal `"Regenerate cover letter"` (G-5)
- `new Date()` usage ONLY inside polling callback body — never in render, never in `onClick` top level (G-6)
- Zero `Date.now()` anywhere (G-6)

---

### 5. `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (EDIT — client-component, composition)

**Analog:** The existing file itself — this is a 2-mount-point edit inside a 294+ line structure.

**Existing structure to preserve:**
- Imports at lines 14-40 — ADD 2 new imports:
```typescript
import { TriggerCompanyResearchButton } from "./trigger-company-research-button";
import { RegenerateCoverLetterButton } from "./regenerate-cover-letter-button";
```

**Mount A — Cover Letter populated-branch meta row** (existing code at lines 208-238):

Current:
```tsx
<div className="flex items-center gap-3 flex-wrap">
  {detail.cover_letter.quality_score !== null && (
    <Tooltip>{/* Quality badge */}</Tooltip>
  )}
  <FreshnessBadge
    generatedDate={detail.cover_letter.freshness.generatedDate}
    modelUsed={detail.cover_letter.model_used}
    isStale={detail.cover_letter.freshness.isStale}
    ageDays={detail.cover_letter.freshness.ageDays}
  />
  <a
    href={`/api/jobs/${detail.id}/cover-letter-pdf`}
    download
    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
  >
    <Download className="size-3" />
    Download PDF
  </a>
</div>
```

Translate (add as LAST sibling — UI-SPEC §Component Contracts 2 "Placement in meta row — rightmost"):
```tsx
<div className="flex items-center gap-3 flex-wrap">
  {/* ... existing Quality + Freshness + Download ... unchanged ... */}
  <RegenerateCoverLetterButton
    jobId={detail.id}
    baselineGeneratedAt={detail.cover_letter.generated_at}
  />
</div>
```

**Mount B — Company Intel missing branch** (existing code at line 289):

The missing branch currently looks like this pattern (inferred from Plan 21-06 + `tailored-resume-section.tsx` lines 78-90):
```tsx
{detail.company_research === null ? (
  <div className="space-y-3">
    <h3 className="text-sm font-semibold flex items-center gap-1.5">
      <Building2 className="size-4" />
      Company Intel
    </h3>
    <p className="text-sm text-muted-foreground italic">
      {EMPTY_STATE_COPY.company_research.missing}
    </p>
  </div>
) : isCompanyResearchEmpty(detail.company_research) ? (/* ... */) : (/* ... */)}
```

Translate — add as 3rd sibling inside the `space-y-3` column (UI-SPEC §Component Contracts 1):
```tsx
<div className="space-y-3">
  {/* ... existing h3 + empty-state <p> ... unchanged ... */}
  <TriggerCompanyResearchButton jobId={detail.id} />  {/* NEW — 3rd child */}
</div>
```

**Both mounts MUST remain INSIDE existing `SectionErrorBoundary` wraps** (G-4):
- Cover Letter wrap at line 180: `<SectionErrorBoundary section="cover_letter" jobId={detail.id}>`
- Company Research wrap at line 285-288: `<SectionErrorBoundary section="company_research" jobId={detail.id}>`

**Delta vs existing:** Two button mounts, no structural changes, no new boundaries, no section reordering. Purely additive — `git diff` should be <15 lines total across this file.

---

### 6. `src/__tests__/lib/webhooks.test.ts` (NEW — test, unit)

**Analog:** `src/__tests__/lib/provenance.test.ts` (for truth-table sentinel testing) + `src/__tests__/lib/attach-freshness.test.ts` (for discriminated-union tri-branch assertions + `vi.useFakeTimers`).

**Test structure pattern** (analog: `provenance.test.ts` lines 1-14):
```typescript
// provenance.test.ts — one describe block per function, it.each for variants
import { describe, it, expect } from "vitest";
import { provenanceColor, provenanceLabel, type ProvenanceSource } from "@/lib/provenance";

describe("provenanceColor — 3-source semantic token mapping", () => {
  it('returns text-muted-foreground for "scraped" (lowest-trust tier)', () => {
    expect(provenanceColor("scraped")).toBe("text-muted-foreground");
  });
  // ...
});
```

**Translate to `webhooks.test.ts` — sentinel cascade** (4 branches × D-07 table):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import { sendSignedWebhook } from "@/lib/webhooks";

const SECRET = "test-secret";
beforeEach(() => {
  process.env.N8N_WEBHOOK_SECRET = SECRET;
  process.env.N8N_WEBHOOK_URL = "http://n8n.test";
});

describe("sendSignedWebhook — error-to-sentinel cascade (D-07)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => errorSpy.mockRestore());

  it.each([
    [401, "auth"],
    [403, "auth"],
    [429, "rate limit"],
    [500, "unavailable"],
    [502, "unavailable"],
  ])("HTTP %d → sentinel %s", async (status, expected) => {
    global.fetch = vi.fn().mockResolvedValue(new Response("", { status })) as never;
    const res = await sendSignedWebhook("job-company-intel", { job_id: 1 }, "k");
    expect(res).toEqual({ ok: false, sentinel: expected });
  });

  it("AbortError → timeout", async () => {
    const abortErr = new Error("aborted");
    abortErr.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(abortErr) as never;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "timeout" });
  });

  it("raw error never leaks to return value (only sentinel string)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("SECRET: internal-host-10.0.5.2 refused")) as never;
    const res = await sendSignedWebhook("x", {}, "k");
    expect(res).toEqual({ ok: false, sentinel: "unavailable" });
    expect(JSON.stringify(res)).not.toMatch(/internal-host/);
  });
});
```

**Raw-body identity test** (NO codebase analog — direct port of RESEARCH.md §Code Examples "Raw-body identity test"):
```typescript
it("signs the EXACT string that gets POSTed (raw-body identity — Pitfall 1)", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 200 }));
  global.fetch = fetchMock as never;

  await sendSignedWebhook(
    "job-company-intel",
    { job_id: 42, extra: "payload" },
    "deadbeef-cafe-babe-face-feeddeadbeef"
  );

  const [, init] = fetchMock.mock.calls[0];
  const sentBody = (init as RequestInit).body as string;
  const headers = (init as RequestInit).headers as Record<string, string>;

  // Reconstruct expected signature from the ACTUAL bytes that went over the wire
  const canonical = `${headers["X-Hudsonfam-Timestamp"]}.job-company-intel.${sentBody}`;
  const expected = `sha256=${createHmac("sha256", SECRET).update(canonical).digest("hex")}`;

  expect(headers["X-Hudsonfam-Signature"]).toBe(expected);
  expect(headers["X-Idempotency-Key"]).toBe("deadbeef-cafe-babe-face-feeddeadbeef");
});
```

**Signatures/types/imports to preserve:**
- Global `fetch` mock pattern: `global.fetch = vi.fn().mockResolvedValue(...) as never;`
- `vi.spyOn(console, "error").mockImplementation(() => {})` to silence + assert logging (analog: `jobs-db-zod.test.ts` lines 13-20)
- `it.each([[...]])` for HTTP status cascade table

---

### 7. `src/__tests__/lib/job-actions.trigger.test.ts` (NEW — test, unit with mocked I/O)

**Analog:** `src/__tests__/lib/jobs-db-zod.test.ts` (exercises discriminated-union return + `vi.spyOn(console, "error")` for fail-path logging assertions).

**Imports pattern** (analog: `jobs-db-zod.test.ts` lines 1-10):
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CoverLetterSchema,
  /* ... */
  parseOrLog,
} from "@/lib/jobs-schemas";
```

**Translate** (mock `requireRole` + `sendSignedWebhook`; call Server Action directly):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks — matches tailored-resume-section.test.tsx:42-47 pattern
const { mockRequireRole, mockSendSignedWebhook, mockGetJobDetail } = vi.hoisted(() => ({
  mockRequireRole: vi.fn().mockResolvedValue({ user: { role: "owner" } }),
  mockSendSignedWebhook: vi.fn(),
  mockGetJobDetail: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/webhooks", () => ({ sendSignedWebhook: mockSendSignedWebhook }));
vi.mock("@/lib/jobs-db", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getJobDetail: mockGetJobDetail,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  mockRequireRole.mockClear().mockResolvedValue({ user: { role: "owner" } });
  mockSendSignedWebhook.mockClear();
  mockGetJobDetail.mockClear();
});
```

**Test pattern — discriminated-union on success + failure** (analog: `jobs-db-zod.test.ts` lines 31-69):
```typescript
describe("triggerCompanyResearch — Server Action contract", () => {
  it("returns { ok: true } on successful webhook", async () => {
    mockSendSignedWebhook.mockResolvedValue({ ok: true });
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    const result = await triggerCompanyResearch(42);
    expect(result).toEqual({ ok: true });
  });

  it("returns { ok: false, sentinel } and does NOT throw when webhook fails", async () => {
    mockSendSignedWebhook.mockResolvedValue({ ok: false, sentinel: "rate limit" });
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    const result = await triggerCompanyResearch(42);
    expect(result).toEqual({ ok: false, sentinel: "rate limit" });
  });

  it("passes a fresh UUID idempotency key on every call (D-03)", async () => {
    mockSendSignedWebhook.mockResolvedValue({ ok: true });
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    await triggerCompanyResearch(1);
    await triggerCompanyResearch(1);
    const [, , firstKey] = mockSendSignedWebhook.mock.calls[0];
    const [, , secondKey] = mockSendSignedWebhook.mock.calls[1];
    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("regenerateCoverLetter — server-side baseline (D-06 amended)", () => {
  it("returns server-read baseline in ok:true response", async () => {
    const serverBaseline = "2026-04-20T12:34:56.000Z";
    mockGetJobDetail.mockResolvedValue({
      /* ... minimal detail with cover_letter.generated_at ... */
      cover_letter: { generated_at: serverBaseline },
    });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });
    const { regenerateCoverLetter } = await import("@/lib/job-actions");
    const result = await regenerateCoverLetter(42);
    expect(result).toEqual({ ok: true, baseline: serverBaseline });
  });
});
```

**requireRole denial pattern** (analog: none in current tests for Server Actions specifically — use `mockRequireRole.mockRejectedValue` to simulate redirect):
```typescript
it("rejects non-owner via requireRole (redirects would throw in test env)", async () => {
  mockRequireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
  const { triggerCompanyResearch } = await import("@/lib/job-actions");
  await expect(triggerCompanyResearch(1)).rejects.toThrow("NEXT_REDIRECT");
  expect(mockSendSignedWebhook).not.toHaveBeenCalled();  // webhook never fires if role check fails
});
```

---

### 8. `src/__tests__/lib/job-actions.requireRole.test.ts` (NEW — test, CI grep)

**Analog:** `src/__tests__/components/job-detail-sheet.test.tsx` — **EXACT MATCH**. Phase 22 Plan 22-07 grep gate G-1 (`formatSalary` within 5 lines of `<ProvenanceTag`) is the direct precedent. D-12 explicitly cites this file.

**Imports pattern** (analog: `job-detail-sheet.test.tsx` lines 1-3, 40-45):
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SHEET_PATH = path.join(
  process.cwd(),
  "src/app/(admin)/admin/jobs/job-detail-sheet.tsx"
);
const sheetSource = readFileSync(SHEET_PATH, "utf-8");
const sheetLines = sheetSource.split("\n");
```

**Translate to requireRole grep gate:**
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ACTIONS_PATH = path.join(process.cwd(), "src/lib/job-actions.ts");
const source = readFileSync(ACTIONS_PATH, "utf-8");
const lines = source.split("\n");
```

**Adjacency scan pattern** (analog: `job-detail-sheet.test.tsx` lines 47-69 — `formatSalary` within 5 lines of `<ProvenanceTag`):
```typescript
describe("job-detail-sheet.tsx — provenance-tag adjacency (grep gate G-1)", () => {
  it("every formatSalary( call site (excluding the function declaration) is within 5 lines of <ProvenanceTag or <Badge variant=\"outline\"", () => {
    const unmatched: number[] = [];
    for (let i = 0; i < sheetLines.length; i++) {
      const line = sheetLines[i];
      if (/function\s+formatSalary\s*\(/.test(line)) continue;
      if (!/formatSalary\s*\(/.test(line)) continue;
      const window = sheetLines
        .slice(i, Math.min(i + 6, sheetLines.length))
        .join("\n");
      const hasTag =
        /<ProvenanceTag\b/.test(window) ||
        /<Badge\s+variant="outline"/.test(window);
      if (!hasTag) unmatched.push(i + 1);
    }
    expect(
      unmatched,
      `Lines with formatSalary( lacking adjacent provenance: ${unmatched.join(", ")}`
    ).toEqual([]);
  });
});
```

**Translate verbatim to `requireRole` adjacency** (RESEARCH.md §Code Examples "CI grep test"):
```typescript
describe("job-actions.ts — every export has requireRole(['owner']) within 10 lines (Pitfall 9 / D-12)", () => {
  it("every `export async function` has `await requireRole([\"owner\"])` within 10 lines of signature", () => {
    const violations: { line: number; fn: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^export\s+async\s+function\s+(\w+)/);
      if (!match) continue;
      const fnName = match[1];
      const window = lines
        .slice(i, Math.min(i + 11, lines.length))
        .join("\n");
      if (!/await\s+requireRole\s*\(\s*\[\s*["']owner["']\s*\]\s*\)/.test(window)) {
        violations.push({ line: i + 1, fn: fnName });
      }
    }
    expect(
      violations,
      `Functions missing requireRole(["owner"]): ${violations.map((v) => `${v.fn}@L${v.line}`).join(", ")}`
    ).toEqual([]);
  });

  it("fireWebhook is fully deleted — no residual references (G-7 / D-11)", () => {
    expect(source).not.toMatch(/\bfireWebhook\b/);
  });
});
```

**Delta vs analog:** Zero — literally a copy with `formatSalary`→`export async function`, `<ProvenanceTag>`→`requireRole(["owner"])`, 5-line window→10-line window. The `readFileSync` + `lines.slice(i, i+N)` loop structure is identical.

---

### 9. `src/__tests__/components/trigger-company-research-button.test.tsx` (NEW — test, component + fake timer)

**Analog (structural):** `src/__tests__/components/tailored-resume-section.test.tsx` for the `vi.hoisted` + `vi.mock("sonner")` + `render(ui)` wrapper + `act` import pattern, plus `vi.useFakeTimers`/`useRealTimers` in `beforeEach`/`afterEach` (lines 1-68).

**Analog (polling-specific):** NO codebase analog — the project has zero fake-timer polling tests. Use RESEARCH.md §Code Examples "Vitest fake-timer polling test" literal, which is Context7-verified from `/vitest-dev/vitest` as of 2026-04-22.

**Setup pattern** (analog: `tailored-resume-section.test.tsx` lines 1-68):
```typescript
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render as rtlRender, fireEvent, waitFor, act } from "@testing-library/react";

// Hoisted mocks — vi.mock factories hoist above plain consts (lines 42-47 analog)
const { mockTriggerCompanyResearch, mockFetchJobDetail } = vi.hoisted(() => ({
  mockTriggerCompanyResearch: vi.fn(),
  mockFetchJobDetail: vi.fn(),
}));
vi.mock("@/lib/job-actions", () => ({
  triggerCompanyResearch: mockTriggerCompanyResearch,
  fetchJobDetail: mockFetchJobDetail,
}));

beforeEach(() => {
  vi.useFakeTimers();
  mockTriggerCompanyResearch.mockClear();
  mockFetchJobDetail.mockClear();
});

afterEach(() => {
  vi.useRealTimers();   // analog: tailored-resume-section.test.tsx:64-68
});

function render(ui: ReactElement) { return rtlRender(ui); }
```

**Polling test pattern** (RESEARCH.md §Code Examples literal):
```typescript
it("polls every 3 seconds and caps at 60 polls = 180s → 'unavailable'", async () => {
  mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
  mockFetchJobDetail.mockResolvedValue({ company_research: null });

  const { getByRole, getByText } = render(<TriggerCompanyResearchButton jobId={1} />);

  await act(async () => {
    fireEvent.click(getByRole("button"));
  });

  // 60 ticks × 3s = 180s
  for (let i = 0; i < 60; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
  }

  expect(mockFetchJobDetail).toHaveBeenCalledTimes(60);
  expect(getByText(/Error: unavailable/)).toBeInTheDocument();
});
```

**Sentinel-display test** (analog: `tailored-resume-section.test.tsx` lines 174-187 — fireEvent.click + await act + assertion):
```typescript
it.each([
  ["timeout"],
  ["auth"],
  ["rate limit"],
  ["unavailable"],
] as const)("displays 'Error: %s' verbatim when Server Action returns that sentinel (G-3)", async ([sentinel]) => {
  mockTriggerCompanyResearch.mockResolvedValue({ ok: false, sentinel });
  const { getByRole, getByText } = render(<TriggerCompanyResearchButton jobId={1} />);
  await act(async () => {
    fireEvent.click(getByRole("button"));
  });
  expect(getByText(`Error: ${sentinel}`)).toBeInTheDocument();
  // button re-enables
  expect(getByRole("button")).not.toBeDisabled();
});
```

**Unmount cleanup test** (NEW — enforces RESEARCH.md §Pitfall 6):
```typescript
it("clears interval on unmount mid-poll (no setState-after-unmount warnings)", async () => {
  mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
  mockFetchJobDetail.mockResolvedValue({ company_research: null });

  const { getByRole, unmount } = render(<TriggerCompanyResearchButton jobId={1} />);
  await act(async () => {
    fireEvent.click(getByRole("button"));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);
  });
  expect(mockFetchJobDetail).toHaveBeenCalledTimes(1);

  unmount();

  // After unmount, advancing timers should NOT trigger more fetches
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(mockFetchJobDetail).toHaveBeenCalledTimes(1);
});
```

**UI-SPEC grep-gate verification** (inline source-text assertions — analog: `job-detail-sheet.test.tsx` lines 93-109):
```typescript
import { readFileSync } from "node:fs";
import path from "node:path";

const BTN_PATH = path.join(
  process.cwd(),
  "src/app/(admin)/admin/jobs/trigger-company-research-button.tsx"
);
const btnSource = readFileSync(BTN_PATH, "utf-8");

describe("trigger-company-research-button.tsx — UI-SPEC grep gates", () => {
  it("G-1: aria-busy attribute is present", () => {
    expect(btnSource).toMatch(/aria-busy=\{?/);
  });

  it("G-2: no raw Tailwind color names", () => {
    expect(btnSource).not.toMatch(/(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-\d/);
  });

  it("G-5: label matches ROADMAP SC #1 verbatim", () => {
    expect(btnSource).toMatch(/Research this company/);
  });
});
```

---

### 10. `src/__tests__/components/regenerate-cover-letter-button.test.tsx` (NEW — test, component + fake timer + baseline predicate)

**Analog:** `trigger-company-research-button.test.tsx` (sibling — shares 90%) + one additional test class for server-baseline predicate.

**Baseline-predicate success test** (NEW pattern):
```typescript
it("polls until cover_letter.generated_at > serverBaseline (D-06 UPDATE-wait)", async () => {
  const baseline = "2026-04-20T00:00:00.000Z";
  mockRegenerateCoverLetter.mockResolvedValue({ ok: true, baseline });
  mockFetchJobDetail
    .mockResolvedValueOnce({ cover_letter: { generated_at: baseline } })       // tick 1: still baseline
    .mockResolvedValueOnce({ cover_letter: { generated_at: baseline } })       // tick 2: still
    .mockResolvedValue({ cover_letter: { generated_at: "2026-04-22T14:00:00.000Z" } }); // tick 3+: newer

  const { getByRole } = render(
    <RegenerateCoverLetterButton jobId={1} baselineGeneratedAt={baseline} />
  );

  await act(async () => { fireEvent.click(getByRole("button")); });
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
  await act(async () => { await vi.advanceTimersByTimeAsync(3000); });

  expect(getByRole("button")).not.toBeDisabled();  // returned to idle
  expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
});
```

**G-6 source-text assertion** (NEW — UI-SPEC grep gate):
```typescript
it("G-6: no Date.now() or top-level new Date() at render time", () => {
  const source = readFileSync(
    path.join(process.cwd(), "src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx"),
    "utf-8"
  );
  expect(source).not.toMatch(/Date\.now\(\)/);
  // new Date(serverBaseline) is permitted INSIDE polling callback; NOT permitted at render top-level
  // Simplified check: ensure no `new Date(` appears outside a function body. Stricter per G-6 is
  // vi.spyOn(global, 'Date') at render time (RESEARCH.md §Code Examples, lines 740).
});
```

---

### 11. `src/__tests__/components/job-detail-sheet.test.tsx` (EDIT — extend with button mount assertions)

**Analog:** Self (already the Phase 22 G-1 grep-gate test; Phase 23 extends with G-4 grep plus optional mount smoke).

**Pattern already in place** (lines 84-90 — the existing G-4 SectionErrorBoundary adjacency assertion):
```typescript
it("wraps SalaryIntelligenceSection in SectionErrorBoundary section=\"salary_intelligence\" (grep gate G-4)", () => {
  const match = sheetSource.match(
    /SectionErrorBoundary[\s\S]{0,200}section="salary_intelligence"[\s\S]{0,200}<SalaryIntelligenceSection/
  );
  expect(match).not.toBeNull();
});
```

**Translate — add 2 new grep assertions to the existing G-4 block:**
```typescript
it("wraps TriggerCompanyResearchButton in SectionErrorBoundary section=\"company_research\" (G-4)", () => {
  const match = sheetSource.match(
    /SectionErrorBoundary[\s\S]{0,200}section="company_research"[\s\S]{0,500}<TriggerCompanyResearchButton/
  );
  expect(match).not.toBeNull();
});

it("wraps RegenerateCoverLetterButton in SectionErrorBoundary section=\"cover_letter\" (G-4)", () => {
  const match = sheetSource.match(
    /SectionErrorBoundary[\s\S]{0,200}section="cover_letter"[\s\S]{0,800}<RegenerateCoverLetterButton/
  );
  expect(match).not.toBeNull();
});

it("TriggerCompanyResearchButton only mounts inside missing branch (source-text guard)", () => {
  // Assert the button appears within 10 lines after `company_research === null`
  const lines = sheetSource.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/detail\.company_research\s*===\s*null/.test(lines[i])) continue;
    const window = lines.slice(i, Math.min(i + 15, lines.length)).join("\n");
    expect(window).toMatch(/<TriggerCompanyResearchButton/);
    return;
  }
  throw new Error("No `detail.company_research === null` branch found");
});
```

**Delta vs existing tests:** Pure addition — no rewrites. Existing 7 test cases preserved verbatim. New assertions slot in after the existing G-4 `SalaryIntelligenceSection` check.

---

### 12. `.env.example` (EDIT — docs/config, static)

**Analog:** The file itself. Existing structure is a flat `KEY="value"` list grouped by comment headers.

**Existing pattern** (lines 16-17):
```
# Job search (separate database)
JOBS_DATABASE_URL="postgresql://user:password@host:5432/jobs"
```

**Add after line 17 (or in a new "n8n webhook signing" section):**
```
# n8n webhook signing (Phase 23 — AI-SAFETY-02)
N8N_WEBHOOK_SECRET=""
```

**Delta:** 2 lines added. No reordering of existing entries.

---

### 13. `CLAUDE.md` (EDIT — docs, Environment Variables table)

**Analog:** The file itself. The Environment Variables section already lists `JOBS_DATABASE_URL` and `OWNER_EMAIL` as the job-search-specific vars.

**Existing pattern** (lines 138-152 approx — verified during `Read` earlier):
```
JOBS_DATABASE_URL     # Separate jobs database
OWNER_EMAIL           # Email auto-promoted to owner role on signup
```

**Add after `JOBS_DATABASE_URL`:**
```
N8N_WEBHOOK_SECRET    # HMAC-SHA256 shared secret for signing n8n webhook POSTs (Phase 23 AI-SAFETY-02)
```

**Delta:** 1 line added. No reordering.

---

## Shared Patterns

### Authentication (requireRole first-line invariant)

**Source:** `src/lib/session.ts` lines 20-29
**Apply to:** Every `export async function` in `src/lib/job-actions.ts` — 5 existing exports already comply (5/5); 2 new exports MUST comply.

```typescript
// session.ts — the canonical helper
export async function requireRole(allowedRoles: string[]): Promise<Session> {
  const session = await requireSession();
  const userRole = (session.user as { role?: string }).role || "member";
  if (!allowedRoles.includes(userRole)) {
    redirect("/");
  }
  return session;
}
```

**Usage invariant** (CONTEXT.md D-12 / RESEARCH.md §Pitfall 6):
```typescript
export async function triggerCompanyResearch(jobId: number): Promise<...> {
  await requireRole(["owner"]);   // MUST be within 10 source lines of function signature
  // ... rest of action body
}
```

**Enforcement:** `src/__tests__/lib/job-actions.requireRole.test.ts` grep gate (file 8 above).

---

### Error handling (discriminated-union return; no `throw` from Server Actions)

**Source:** This phase establishes the pattern; closest existing analog is `src/lib/jobs-schemas.ts` `parseOrLog` (Plan 20-03) which returns `T | null` on schema drift (fail-open).

**Apply to:** Both new Server Actions in `job-actions.ts`; the `sendSignedWebhook` primitive itself.

```typescript
// Pattern (CONTEXT.md D-07, D-08):
export type ActionResult =
  | { ok: true }
  | { ok: false; sentinel: ErrorSentinel };

// Never: throw new Error(e.message)  ← Next.js returns raw message to browser
// Always: catch → map → return { ok: false, sentinel }

const res = await sendSignedWebhook(...);
if (!res.ok) return { ok: false, sentinel: res.sentinel };  // discriminated narrowing
return { ok: true };
```

**Enforcement:** Raw-error leak test in `webhooks.test.ts`: `expect(JSON.stringify(res)).not.toMatch(/internal-host/)`.

---

### Validation (CI grep gates via Vitest readFileSync)

**Source:** `src/__tests__/components/job-detail-sheet.test.tsx` lines 40-109 — Phase 22 Plan 22-07 precedent. THIS is the direct analog for D-12's CI grep rule.

**Apply to:**
- `src/__tests__/lib/job-actions.requireRole.test.ts` (`requireRole` adjacency, `fireWebhook` absence)
- `src/__tests__/components/trigger-company-research-button.test.tsx` (G-1, G-2, G-5 grep assertions)
- `src/__tests__/components/regenerate-cover-letter-button.test.tsx` (G-1, G-2, G-5, G-6 grep assertions)
- `src/__tests__/components/job-detail-sheet.test.tsx` (G-4 extended to 2 new button mounts)

```typescript
// The pattern:
import { readFileSync } from "node:fs";
import path from "node:path";

const SRC_PATH = path.join(process.cwd(), "src/path/to/file.ts");
const source = readFileSync(SRC_PATH, "utf-8");

// Option A — adjacency scan (lines 47-69 precedent):
const lines = source.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (!/<TARGET>/.test(lines[i])) continue;
  const window = lines.slice(i, Math.min(i + N, lines.length)).join("\n");
  if (!/<ADJACENT_PATTERN>/.test(window)) violations.push(i + 1);
}
expect(violations).toEqual([]);

// Option B — multi-line regex (lines 96-107 precedent):
const match = source.match(/<OUTER_PATTERN>[\s\S]{0,200}<INNER_PATTERN>/);
expect(match).not.toBeNull();
```

---

### Fake-timer polling test (NEW pattern for this project)

**Source:** NO codebase analog (project has zero timer-based tests today). Use RESEARCH.md §Code Examples "Vitest fake-timer polling test" (Context7-verified from `/vitest-dev/vitest` as of 2026-04-22).

**Apply to:** Both new component test files.

**Setup boilerplate** (document in detail — this is NEW for the project):
```typescript
// STEP 1: Hoist mocks (matches tailored-resume-section.test.tsx:42-47 three-part pattern)
const { mockAction, mockFetchDetail } = vi.hoisted(() => ({
  mockAction: vi.fn(),
  mockFetchDetail: vi.fn(),
}));
vi.mock("@/lib/job-actions", () => ({
  triggerCompanyResearch: mockAction,
  fetchJobDetail: mockFetchDetail,
}));

// STEP 2: Fake timers in beforeEach/afterEach
beforeEach(() => {
  vi.useFakeTimers();
  mockAction.mockClear();
  mockFetchDetail.mockClear();
});
afterEach(() => {
  vi.useRealTimers();  // idempotent; matches tailored-resume-section.test.tsx:64-68
});

// STEP 3: Advance timers with act() to flush React state updates
for (let i = 0; i < N; i++) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000);  // `Async` variant flushes microtasks
  });
}

// STEP 4: Assert side-effect counts + final UI state
expect(mockFetchDetail).toHaveBeenCalledTimes(N);
expect(screen.getByText(/Error: unavailable/)).toBeInTheDocument();
```

**Critical gotchas (Context7-verified):**
1. `vi.advanceTimersByTimeAsync` (NOT `advanceTimersByTime`) — flushes both timer callbacks AND the microtasks they schedule (so `await fetchJobDetail()` inside the interval callback resolves before the assertion runs)
2. `act(async () => ...)` around every advance — otherwise React warns "not wrapped in act(...)" and state updates queue post-assertion
3. `afterEach(() => vi.useRealTimers())` — MANDATORY to prevent test-to-test timer bleed

---

### MSW fetch mocking (for webhook error cases)

**Source:** `src/__tests__/mocks/server.ts` + `src/__tests__/mocks/handlers.ts` — MSW already wired into the project (7 files use it today; Prometheus + Sonarr + Radarr + health-checks).

**Apply to:** `webhooks.test.ts` MAY use MSW for the raw-body identity + sentinel cascade tests, OR may use direct `global.fetch = vi.fn()` (simpler, no server-wide handler changes). **Recommend: direct `global.fetch = vi.fn()` in `webhooks.test.ts`** — the existing MSW setup is for K8s-internal service mocks (dashboard tests); per-test `vi.fn()` is lighter and keeps the MSW handlers file uncluttered.

```typescript
// RECOMMENDED pattern for webhooks.test.ts:
beforeEach(() => {
  global.fetch = vi.fn();
});

it("...", async () => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("", { status: 401 }));
  const res = await sendSignedWebhook("x", {}, "k");
  expect(res).toEqual({ ok: false, sentinel: "auth" });
});

// IF MSW preferred (for matching real request/response shape):
// Add to handlers.ts:
//   http.post('http://n8n.test/webhook/job-company-intel', () => HttpResponse.json({}, { status: 401 })),
// Then let the test import server from @/__tests__/mocks/server and call server.use() per-test.
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Polling primitive (inside `trigger-company-research-button.tsx` and `regenerate-cover-letter-button.tsx`) | client, polling | event-driven | **Project has zero polling client components today.** All data freshness propagates via `revalidatePath` + Server Components. Phase 23 introduces the first `useEffect` + `setInterval` + `useRef` counter pattern. Use RESEARCH.md §Pattern 3 literal (which is Context7-verified from Next.js + Vitest docs 2026-04-22). Phase 24 will extract a factory component once N=4 polling surfaces exist. |
| Fake-timer polling test setup (inside both component test files) | test infra | mocked I/O + timers | **Project has zero timer-based tests today.** `attach-freshness.test.ts` uses `vi.useFakeTimers` for `vi.setSystemTime` (system clock only), not for `advanceTimersByTime` (interval flushing). Use RESEARCH.md §Code Examples "Vitest fake-timer polling test" literal — the `act` + `advanceTimersByTimeAsync` + `vi.mock` pattern is Context7-verified. Document the gotchas in the Shared Patterns §Fake-timer polling test block above. |
| HMAC signing helper (inside `webhooks.ts`) | server primitive | crypto | **Project has zero HMAC usage today.** Use Node 25 `node:crypto` stdlib `createHmac("sha256", secret).update(canonical).digest("hex")` — verified via local `node -e` probe 2026-04-22. Canonical message format (`timestamp.path.rawBody`) is GitHub/Stripe/Slack convention (CONTEXT.md D-02). |

---

## Metadata

**Analog search scope:**
- `src/lib/` — for server-side primitives (attach-freshness, session, jobs-schemas)
- `src/app/(admin)/admin/jobs/` — for client component + integration mount patterns (tailored-resume-section, job-detail-sheet)
- `src/__tests__/lib/` — for unit test conventions (provenance, attach-freshness, jobs-db-zod)
- `src/__tests__/components/` — for component test conventions (tailored-resume-section, job-detail-sheet)
- `src/__tests__/mocks/` — for MSW server + handlers

**Files scanned:** ~15 (5 analogs read in full; 7 analogs grep-probed; 3 files skimmed for mount-site context)

**Pattern extraction date:** 2026-04-22

**Verification status:**
- 11/12 files have a concrete codebase analog with extracted excerpts + line numbers
- 1/12 (polling primitive + fake-timer test) has NO analog; use RESEARCH.md §Code Examples literal (Context7-verified)
- 3 cross-cutting patterns documented: requireRole invariant, discriminated-union error handling, readFileSync grep gate
- 2 NEW-for-project patterns documented with setup gotchas: fake-timer polling test, HMAC signing

**Cross-cutting invariants the planner MUST propagate to every plan:**
1. `requireRole(["owner"])` as first line in every new Server Action (CONTEXT.md D-12 / Pitfall 9)
2. Discriminated-union return from every new Server Action (CONTEXT.md D-07 / D-08)
3. `readFileSync` + regex grep gate is the project's 8th CI quality check (RESEARCH.md §Verification Model)
4. `fireWebhook` FULLY DELETED — no alias, no shim (CONTEXT.md D-11 / G-7)
5. `new Date()` / `Date.now()` prohibited at render time in client components (UI-SPEC G-6)
6. No raw Tailwind color names anywhere in Phase 23 diff (UI-SPEC G-2 / CLAUDE.md)
