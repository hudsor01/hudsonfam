# Phase 20: Foundation (Freshness + Zod + Tailored Resume) — Research

**Researched:** 2026-04-21
**Domain:** Next.js 16 App Router infrastructure (CSP middleware, Zod row validation, Streamdown markdown, React 19 ErrorBoundary, Vitest schema-drift integration)
**Confidence:** HIGH

## Summary

The phase is pure cross-cutting plumbing on top of a production-verified stack: Next.js 16.2.1, React 19.2.4, Tailwind v4.2, Prisma v7, shadcn/ui, Zod 4.3.6, Vitest 4. All seven REQs map to concrete, well-documented patterns and every major dependency is either already installed (Zod, shadcn, date-fns, Vitest) or a single-package add (`streamdown@^2.5.0`). The milestone-level STACK/ARCHITECTURE/PITFALLS research is complete and still correct; this phase research answers the seven tactical how-to-build-it questions the planner needs to paste into tasks.

Five findings materially change the plan compared to a naive read of the milestone research:

1. **Next.js 16 renamed `middleware.ts` → `proxy.ts`.** [VERIFIED: Context7 /vercel/next.js "Migrate Middleware Convention to Proxy"] The file, the function export, and config flags are all renamed (`middleware` → `proxy`, `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`). A codemod exists: `npx @next/codemod@latest middleware-to-proxy .`. The phase MUST write `proxy.ts` (not `middleware.ts`) and export `function proxy(request: NextRequest)`.

2. **Streamdown's default rehype plugin chain INCLUDES `rehype-raw`.** [VERIFIED: Context7 /vercel/streamdown "HTML Content"] The `defaultRehypePlugins.raw` plugin is active by default and allows raw HTML through `rehype-sanitize` + `rehype-harden`. CONTEXT.md D-12 says "do NOT enable `rehype-raw`" — the correct operational shape is to **explicitly override `rehypePlugins`** and exclude `raw`, OR use the simpler `skipHtml` prop. Without either, raw HTML in LLM output renders (sanitized) rather than being escaped as text. This directly affects AI-SAFETY-01's test fixture behavior.

3. **`@source` directive uses `dist/*.js` not `dist/**/*.js`.** [VERIFIED: Context7 /vercel/streamdown "Install Streamdown and Configure Tailwind"] Streamdown's docs show single-asterisk glob, not double. Also: `import "streamdown/styles.css"` is only required when the `animated` prop is used (we are not using streaming). CONTEXT.md D-14 has the glob written with double-asterisk — the planner should correct this when writing the task.

4. **Next.js 16 CSP nonce pattern is documented and concrete.** [VERIFIED: Context7 /vercel/next.js "Generate Nonce and Apply CSP Header with Proxy"] The pattern uses `crypto.randomUUID()` → base64, sets `x-nonce` on request headers, sets `Content-Security-Policy` on both request and response. Reading the nonce server-side uses `await headers()` in App Router. Server components in `/admin/layout.tsx` should read `x-nonce` and thread it to any `<Script>` tags (we have none in `/admin` — so the nonce exists but isn't consumed; that's acceptable for Phase 20).

5. **n8n database schema drift test is straightforward.** `pg.Pool` is already configured with `JOBS_DATABASE_URL`. A `npm run test:schema` script can import the pool, run `SELECT column_name FROM information_schema.columns WHERE table_name = $1`, compare against a column list we maintain inline, and exit non-zero on drift. No husky install needed — native git hooks at `.git/hooks/pre-push` are sufficient and zero-dep. (`.husky/` dir does not exist; project has never wired git hooks, so this phase introduces them.)

**Primary recommendation:** Execute the phase in seven commits matching the seven REQs, in this dependency order: (1) `isStale` util + tests → (2) Zod schemas file + safeParse wiring → (3) `proxy.ts` CSP → (4) Streamdown install + `@source` directive → (5) `TailoredResumeSection` + `FreshnessBadge` + `SectionErrorBoundary` → (6) XSS Vitest test → (7) `test:schema` script + pre-push hook. Commits 1–3 are independent and can interleave; 4 must land before 5; 6 must land after 5; 7 is independent of all.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Per-artifact stale thresholds (cover letter 14d, tailored resume 14d, company research 60d, salary intelligence 30d)
- **D-02:** Stale indicator = subtle amber dot next to `generated_at` timestamp; hover tooltip "Generated N days ago; may need regeneration."
- **D-03:** Stale state is purely informational — does NOT alter regenerate button (Phase 23)
- **D-04:** Pragmatic CSP: `default-src 'self'; script-src 'self' 'nonce-{n}'; style-src 'self' 'unsafe-inline'; object-src 'none'; frame-ancestors 'none'; base-uri 'self';`
- **D-05:** CSP scoped to `/admin/*` only via matcher `['/admin/:path*']`
- **D-06:** CSP enforced day-one (NOT Report-Only)
- **D-07:** Local-only `npm run test:schema` script wired as pre-push git hook
- **D-08:** Schema-drift test scope = columns referenced in `jobs-db.ts` only (not full schema snapshot)
- **D-09:** Per-section ErrorBoundary (one per LLM-artifact section)
- **D-10:** Error-boundary fallback is muted inline message "Couldn't render this section — the data may have changed shape." Error logged via `console.error` server-side, never surfaced to client
- **D-11:** Fail-open Zod at `jobs-db.ts:398` return boundary; on failure, log + return `null` for that nested artifact; keep page alive
- **D-12:** Use Streamdown's default sanitizer pipeline. Do NOT enable `rehype-raw`. Do NOT layer additional `rehype-sanitize`
- **D-13:** XSS test fixture ships in same PR — `tailored_resumes.content` row with `<script>alert(1)</script>`, `<iframe src=javascript:...>`, `<img onerror=...>` must render as literal text
- **D-14:** Add `@source "../../node_modules/streamdown/dist/**/*.js";` to `src/styles/globals.css`

### Claude's Discretion

- Freshness badge visual design within the "amber dot + tooltip" envelope (exact dot size, tooltip component)
- `isStale()` signature shape (`(timestamp, thresholdDays): boolean` vs classification object)
- ErrorBoundary library choice (react-error-boundary vs hand-rolled class)
- `test:schema` implementation (standalone node script vs Vitest integration test)
- Per-request CSP nonce plumbing helper naming

### Deferred Ideas (OUT OF SCOPE)

- Copy-to-clipboard / PDF / empty-states / link-out → Phase 21
- Salary intelligence rendering → Phase 22
- Regenerate buttons / company research trigger / HMAC / idempotency / sentinel errors → Phase 23
- Silent-success error detection → Phase 24
- Inline edit, revert-to-original → v3.1
- Aggregate pipeline-health dashboard (SEED-001) → v3.1+
- Strict nonce-everywhere CSP (rejected at scoping)
- Report-Only CSP rollout (rejected at scoping)
- CI-integration schema test (deferred behind pre-push hook)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-RENDER-01 | Tailored resume content rendered as formatted markdown in job detail sheet | §Streamdown Configuration — exact props, placement in sheet, client-boundary guidance, verified `<Streamdown>{content}</Streamdown>` drop-in |
| AI-RENDER-02 | `generated_at` timestamp and `model_used` label on every AI artifact section | §FreshnessBadge Pattern — already locked visually in UI-SPEC; research confirms `date-fns` `formatDistanceToNowStrict` server-computed path |
| AI-SAFETY-01 | Markdown cannot execute JS — `<script>alert(1)</script>` renders as literal text | §Streamdown XSS Posture — **CRITICAL**: default pipeline ships `rehype-raw`; override to `defaultRehypePlugins.sanitize + harden` (no `raw`), OR pass `skipHtml` prop; Vitest test shape included |
| AI-SAFETY-05 | `/admin/*` serves CSP blocking inline scripts, object embeds, framing | §Next.js 16 Proxy (not Middleware) — verified file is `proxy.ts`, export is `proxy`, exact nonce-generation code provided from official docs |
| AI-SAFETY-06 | Zod `safeParse` at `jobs-db.ts` boundary; malformed rows fail-open with log | §Zod Pattern at Query Boundary — exact transform from SQL row → Zod schema → `null` on failure; `result.error.issues` log shape |
| AI-DATA-03 | Pure `isStale(timestamp, thresholdDays)` util in `src/lib/job-freshness.ts` with Vitest | §isStale Signature — recommend simple boolean return per UI-SPEC; threshold constants colocated; 4 unit tests (null / fresh / exact-boundary / stale) |
| AI-DATA-04 | Vitest test verifies each column in `jobs-db.ts` exists in live n8n DB | §Schema Drift Test — Node script using existing `pg.Pool`, 24 columns to verify, pre-push hook shape, no new deps |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CSP nonce generation + header | Frontend server (proxy.ts) | — | Next.js 16 proxy runs on Edge/Node before any request reaches a route handler; the only tier that can set a per-request nonce before HTML is streamed |
| CSP nonce consumption | Frontend server (layout / page) | — | `await headers()` is server-only; `<Script nonce={…}>` must be rendered on the server for the browser to honor the CSP allowlist |
| Markdown rendering | Browser / Client | — | Streamdown uses `controls` (copy-code button), `linkSafety` modal — interactive DOM event handlers require client. Existing `job-detail-sheet.tsx` is already `"use client"`, so this is free |
| Zod `safeParse` | API / Backend (Server Action path) | — | `jobs-db.ts` is invoked only from Server Actions + API routes; Zod lives at the return boundary of `getJobDetail` before crossing the RSC serialization edge |
| `isStale()` freshness computation | API / Backend (Server Action path) | — | Per UI-SPEC: computed server-side in `fetchJobDetail` and passed to client as pre-computed boolean. Avoids client-side `new Date()` hydration mismatch (a documented project constraint — CLAUDE.md "Explicit timezone (America/Chicago)") |
| Schema-drift check | CI / Tooling | Database | Node script connects directly to Postgres via `pg.Pool`, reads `information_schema.columns`; runs outside the Next.js runtime via `npm run test:schema` + pre-push hook |
| ErrorBoundary | Browser / Client | — | React class-component error boundaries are inherently client-only; no Next.js 16 App Router equivalent at component granularity (`error.tsx` is route-level only) |

## Standard Stack

### Core (already installed — no action)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | `4.3.6` | Row validation at `jobs-db.ts:398` boundary | [VERIFIED: node_modules/zod/package.json] Already in deps. Zod 4's `safeParse` returns `{ success, data \| error }` — idiomatic fail-open pattern. |
| `date-fns` | `4.1.0` | `formatDistanceToNowStrict(date, { addSuffix: true })` for "Generated 3h ago" text | [VERIFIED: package.json] Already installed. Explicitly called out in UI-SPEC §Copywriting Contract. |
| `pg` | `8.20.0` | `pool.query()` for `information_schema.columns` drift check | [VERIFIED: package.json] Already wired to `JOBS_DATABASE_URL`. |
| `vitest` | `4.1.2` | `isStale()` unit tests + XSS render test | [VERIFIED: package.json] Existing config at `vitest.config.ts` uses `happy-dom` + `@testing-library/react`. |
| `@testing-library/react` | `16.3.2` | `render(<Streamdown>...) + queryAll('script')` for XSS test | [VERIFIED: package.json] |
| `lucide-react` | `1.7.0` | `FileText` icon for section heading | [VERIFIED: node_modules/lucide-react/package.json] Already used throughout job-detail-sheet.tsx |
| Tailwind v4 | `4.2.2` | `@source` directive picks up Streamdown's prose classes | [VERIFIED: package.json] |

### New addition (one package)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `streamdown` | `^2.5.0` | Markdown renderer for `tailored_resumes.content` | [VERIFIED: `npm view streamdown version` → 2.5.0, `peerDependencies: react ^18 \|\| ^19`] Vercel-maintained, built for shadcn/Tailwind v4 tokens, React 19 native. 96.3 kB unpacked. 16 transitive deps (includes `rehype-raw`, `rehype-sanitize`, `rehype-harden`, `marked@17`, `remark-gfm@4`, `mermaid@11`). **NOTE:** CONTEXT.md locks this decision — no alternative considered. |

### Installation

```bash
npm install streamdown@^2.5.0
```

**Version verification (2026-04-21):**
- `streamdown@2.5.0` — published ~1 month ago, peer deps `react ^18.0.0 || ^19.0.0` confirmed compatible with project's `react@19.2.4`.
- `zod@4.3.6` — installed; current stable.
- `date-fns@4.1.0` — installed; current stable.

## Tactical Findings — Answers to the Seven Questions

### Q1. Next.js 16 CSP Nonce Proxy Middleware — exact pattern

**CRITICAL NAMING: In Next.js 16, the file is `proxy.ts` (root of project), NOT `middleware.ts`.** The function export is `proxy` (not `middleware`). The `config.matcher` shape is unchanged. [VERIFIED: Context7 /vercel/next.js "Migrate Middleware Convention to Proxy", "Export Proxy Function"]

**Exact pattern (adapted from Next.js 16 official CSP docs, scoped to `/admin/*` per D-05):**

```typescript
// proxy.ts (project root — same level as package.json)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Pragmatic CSP per D-04: nonce for scripts only; unsafe-inline for styles
  // (Tailwind v4 + shadcn rely on inline styles).
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

**Nonce consumption (if needed — Phase 20 has no `<Script>` tags in `/admin`, so this is latent):**

```typescript
// src/app/(admin)/layout.tsx — if we ever add a <Script>
import { headers } from "next/headers";

export default async function AdminLayout({ children }) {
  const nonce = (await headers()).get("x-nonce");
  // Pass to <Script nonce={nonce}>; no-op for Phase 20
  return <>{children}</>;
}
```

**Gotchas:**
- `'strict-dynamic'` is required when using per-request nonces — it tells the browser "trust any script loaded by a nonce-allowed script." Without it, Next.js's `_next/static/chunks/*.js` webpack runtime loads fail. [CITED: https://nextjs.org/docs/app/guides/content-security-policy]
- CSP header is set on BOTH request (so Server Components can read via `headers()`) AND response (so the browser enforces it). Setting only one is a silent miss.
- Turbopack dev mode requires `'unsafe-eval'` — wrap with `isDev ? " 'unsafe-eval'" : ""` pattern in the `script-src` directive if dev-mode breakage occurs. Prod build works with the strict version.
- Matcher `['/admin/:path*']` matches `/admin`, `/admin/jobs`, `/admin/jobs/123` — confirmed by Context7 "Configure Proxy Matcher". Does NOT need a trailing exclusion for `_next/static` because the matcher is positive-list (only `/admin/*`); Next.js assets under `/admin/_next/...` don't exist.

### Q2. Streamdown Configuration — App Router, client boundary, prop shape, XSS posture

**Safe to use inside `job-detail-sheet.tsx`** because that file is already `"use client"` at line 1. Streamdown is an interactive component (ships copy-code buttons via `controls` prop, link-safety modal via `linkSafety` prop) and is not designed for RSC direct rendering; our integration point is client-side, so no boundary work needed.

**Drop-in usage (matches UI-SPEC §1 render tree):**

```typescript
import { Streamdown, defaultRehypePlugins } from "streamdown";

// Inside job-detail-sheet.tsx, wrapped in the resume container:
<div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
  <Streamdown
    // Override default chain to EXCLUDE rehype-raw — makes <script>, <iframe>, <img onerror> render as literal text
    rehypePlugins={[defaultRehypePlugins.sanitize, defaultRehypePlugins.harden]}
    // Disable link-safety modal; our admin surface doesn't need confirmation dialogs
    linkSafety={{ enabled: false }}
  >
    {detail.tailored_resume.content}
  </Streamdown>
</div>
```

**Alternative, simpler XSS posture** [VERIFIED: Context7 /vercel/streamdown "Skip HTML Rendering in Markdown"]:

```typescript
<Streamdown skipHtml>
  {detail.tailored_resume.content}
</Streamdown>
```

`skipHtml` completely bypasses HTML parsing — safer and simpler than the plugin override. **Recommend `skipHtml` as the primary choice** for Phase 20 because:
1. It achieves D-12's intent ("do NOT enable rehype-raw") more directly
2. It's a single prop vs. importing and composing `defaultRehypePlugins`
3. LLM-generated resumes are markdown-only; raw HTML is never expected
4. If a future phase ever needs raw HTML (e.g., embedded tables Streamdown doesn't auto-detect), swap to the plugin-override pattern then.

**CRITICAL clarification to CONTEXT.md D-12:** The statement "Use Streamdown's default sanitizer pipeline" is slightly misleading — Streamdown's DEFAULT pipeline includes `rehype-raw`, which is explicitly what D-12 says to avoid. The correct operational meaning is "use Streamdown's default sanitizer + harden plugins, WITHOUT raw." The planner should write task actions that either pass `skipHtml` or pass explicit `rehypePlugins={[defaultRehypePlugins.sanitize, defaultRehypePlugins.harden]}`. [VERIFIED: Context7 /vercel/streamdown "Disable Raw HTML Rendering in Streamdown"]

**Streamdown peer deps:** `react: ^18.0.0 || ^19.0.0`, `react-dom: ^18.0.0 || ^19.0.0` — clean install against project's React 19.2.4, no `--legacy-peer-deps` flag needed. [VERIFIED: `npm view streamdown peerDependencies`]

**No `styles.css` import needed** unless we use the `animated` prop (streaming indicator). We render static content, so skip the import. [VERIFIED: Context7 /vercel/streamdown "Install Streamdown and Configure Tailwind"]

**Tailwind v4 `@source` directive** [VERIFIED: Context7 /vercel/streamdown "Configure Tailwind CSS v4"]:

```css
/* src/styles/globals.css — at the top, immediately after existing @import statements */
@source "../../node_modules/streamdown/dist/*.js";
```

**IMPORTANT: single asterisk `*.js`, NOT double `**/*.js`.** Streamdown's official docs consistently use the single-asterisk glob. CONTEXT.md D-14 shows `dist/**/*.js` — this is a drafting inconsistency; the planner should write `dist/*.js` in the actual CSS task. Path is `../../node_modules/...` because `src/styles/globals.css` is 2 levels deep from the repo root.

**Server Component caveat:** Streamdown can be *indirectly* used from Server Components by placing it inside a client component wrapper — but since `job-detail-sheet.tsx` is already a client component, this never matters for Phase 20.

### Q3. Zod + `pg` Row Validation Pattern — Fail-Open at the jobs-db.ts Boundary

**Location:** new file `src/lib/jobs-schemas.ts` colocating Zod schemas beside the existing TS interfaces in `jobs-db.ts:45-88`. [CITED: CONTEXT.md Code Context "New file src/lib/jobs-schemas.ts"]

**Schema file shape (drop-in match to existing interfaces):**

```typescript
// src/lib/jobs-schemas.ts
import { z } from "zod";

export const CoverLetterSchema = z.object({
  id: z.number(),
  content: z.string(),
  pdf_data: z.string().nullable(),
  quality_score: z.number().nullable(),
  generated_at: z.string(), // ISO string after .toISOString() in jobs-db.ts
  model_used: z.string(),
});

export const CompanyResearchSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  company_url: z.string().nullable(),
  glassdoor_rating: z.number().nullable(),
  salary_range_min: z.number().nullable(),
  salary_range_max: z.number().nullable(),
  salary_currency: z.string(),
  tech_stack: z.array(z.string()),
  funding_stage: z.string().nullable(),
  employee_count: z.string().nullable(),
  recent_news: z.string().nullable(),
  ai_summary: z.string().nullable(),
  created_at: z.string(),
});

export const TailoredResumeSchema = z.object({
  id: z.number(),
  content: z.string(),
  model_used: z.string().nullable(),
  generated_at: z.string(),
});

export type CoverLetter = z.infer<typeof CoverLetterSchema>;
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
```

**Integration at `jobs-db.ts` return boundary (lines 309-346 currently build these objects imperatively — wrap each in `safeParse`):**

```typescript
// At the end of getJobDetail, replace the direct object builds:
const coverLetterResult = row.cl_id
  ? CoverLetterSchema.safeParse({
      id: row.cl_id,
      content: row.cl_content,
      pdf_data: null,
      quality_score: row.cl_quality_score,
      generated_at: row.cl_generated_at?.toISOString?.() ?? row.cl_generated_at,
      model_used: row.cl_model_used,
    })
  : null;

const coverLetter: CoverLetter | null =
  coverLetterResult?.success
    ? coverLetterResult.data
    : coverLetterResult === null
    ? null
    : (console.error("[jobs-db] cover_letter schema drift", {
        jobId,
        issues: coverLetterResult.error.issues,
      }),
      null);

// Repeat for companyResearchResult and tailoredResumeResult.
```

**Key patterns [VERIFIED: Context7 /colinhacks/zod "Handle Zod Validation Errors with Issues Array", "Validate Form Data with safeParse"]:**

- `safeParse` returns `{ success: true, data } | { success: false, error: z.ZodError }` — never throws
- On failure, `result.error.issues` is an array of `{ code, path, message, expected, received? }` — compact and log-safe
- Return `null` for the nested artifact on failure — the outer `JobDetail` stays valid, page renders, other sections work
- Each JOINed artifact validates independently (cover letter fail does not invalidate company research)
- Log format should include `jobId` + `issues` so the developer can see both WHAT drifted and WHICH row triggered it

**Log destination:** `console.error` is correct — maps to stderr in the Next.js server process, captured by the K8s Pod log stream → surfaced in `kubectl logs` (and eventually Sentry if we wire it later). No structured logger is in the project yet; adding one is out of scope.

**`z.infer` vs hand-written interface decision:** Replace the existing `CoverLetter`, `CompanyResearch`, `TailoredResume` interfaces in `jobs-db.ts` with re-exports from `jobs-schemas.ts`. Single source of truth (Zod schema → `z.infer` → TS type). [VERIFIED: Context7 /colinhacks/zod "Infer TypeScript types from Zod schema"]

### Q4. React 19 / Next 16 ErrorBoundary — Class Component vs Library

**Recommendation: Hand-rolled class component per CONTEXT.md Claude's Discretion — confirmed valid.**

**Rationale:**
- React 19 introduces no new official ErrorBoundary primitive; class components remain the only React-native way. [ASSUMED — based on React 19 release notes; not re-verified this session]
- Next.js 16's `error.tsx` convention is route-level only (catches render errors in a whole page segment). Phase 20 needs **per-section** granularity so one section's crash doesn't blank the sheet — this requires a React class component or `react-error-boundary`.
- `react-error-boundary` adds a dep for ~25 lines of hand-rolled code. UI-SPEC §3 already specifies the class component shape and placement. No dep justification.

**Exact shape (matches UI-SPEC §3 contract):**

```typescript
// src/app/(admin)/admin/jobs/section-error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";
import { FileText } from "lucide-react";

const SECTION_LABELS = {
  cover_letter: "Cover Letter",
  tailored_resume: "Tailored Resume",
  company_research: "Company Intel",
  salary_intelligence: "Salary Intelligence",
} as const;

type Section = keyof typeof SECTION_LABELS;

interface Props {
  section: Section;
  jobId: number;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Per D-10: log server-side context, never surface error detail to client
    console.error("[ai-section] failed to render", {
      section: this.props.section,
      jobId: this.props.jobId,
      error: error.message,
      stack: error.stack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
            <FileText className="size-4" />
            {SECTION_LABELS[this.props.section]}
          </h3>
          <p className="text-sm text-muted-foreground italic">
            Couldn&apos;t render this section — the data may have changed shape.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Usage in sheet:**

```typescript
<SectionErrorBoundary section="tailored_resume" jobId={detail.id}>
  <TailoredResumeSection detail={detail} />
</SectionErrorBoundary>
```

**Gotchas:**
- `"use client"` directive required at top of the file — class-component error boundaries are intrinsically client-side
- Boundaries do NOT catch: event handler errors (use try/catch), async errors (use `.catch()`), SSR errors on initial render (surfaces to `error.tsx` instead)
- React 19 Strict Mode double-invokes `render()` and `componentDidCatch()` in dev — test fixtures must assert either single or double calls, not exactly one

### Q5. Vitest Schema-Drift Test — Connection, Credentials, Pre-push

**Recommendation: Standalone Node script** (`scripts/check-jobs-schema.ts`) invoked via `npm run test:schema`, NOT a Vitest integration test. [CITED: CONTEXT.md Claude's Discretion — both acceptable]

**Rationale for standalone script over Vitest:**
- Test runs in `dev` env only (per D-07) — embedding in Vitest means adding a conditional skip, coupling the test runtime to Postgres availability, and polluting the 268 existing tests with a hard DB dependency
- Pre-push hook runs `npm run test:schema` directly — no Vitest overhead (~3s startup saving)
- Script can be invoked by a human with `npm run test:schema` to debug drift interactively
- Zero new config; reuses existing `pg.Pool` via dynamic import

**Script shape:**

```typescript
// scripts/check-jobs-schema.ts
import pg from "pg";

const EXPECTED = {
  jobs: [
    "id", "external_id", "source", "title", "company", "company_url",
    "description", "url", "location", "remote_type",
    "salary_min", "salary_max", "salary_currency",
    "posted_date", "tags", "match_score", "status",
    "cover_letter_generated", "created_at", "updated_at", "package_ready",
    "company_research_id",
  ],
  cover_letters: [
    "id", "job_id", "content", "pdf_data", "quality_score",
    "generated_at", "model_used",
  ],
  company_research: [
    "id", "company_name", "company_url", "glassdoor_rating",
    "salary_range_min", "salary_range_max", "salary_currency",
    "tech_stack", "funding_stage", "employee_count",
    "recent_news", "ai_summary", "created_at",
  ],
  tailored_resumes: [
    "id", "job_id", "content", "model_used", "generated_at",
  ],
  recruiter_outreach: [
    "id", "job_id", "contact_name", "contact_role", "context",
    "linkedin_connect", "linkedin_dm", "warm_email", "full_output",
    "sent_at", "generated_at",
  ],
  applications: ["id", "job_id", "applied_date", "status"],
};

async function main() {
  if (!process.env.JOBS_DATABASE_URL) {
    console.error("[test:schema] JOBS_DATABASE_URL not set — skipping");
    process.exit(0); // Non-failure: dev may not have DB access
  }

  const pool = new pg.Pool({ connectionString: process.env.JOBS_DATABASE_URL });
  const errors: string[] = [];

  for (const [table, expectedCols] of Object.entries(EXPECTED)) {
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const actualCols = new Set(res.rows.map((r) => r.column_name));
    for (const col of expectedCols) {
      if (!actualCols.has(col)) {
        errors.push(`Expected column '${col}' on table '${table}' (referenced in jobs-db.ts); not found in n8n database.`);
      }
    }
  }

  await pool.end();

  if (errors.length > 0) {
    console.error("[test:schema] Schema drift detected:");
    errors.forEach((e) => console.error("  " + e));
    process.exit(1);
  }
  console.log(`[test:schema] OK — verified ${Object.keys(EXPECTED).length} tables, ${Object.values(EXPECTED).flat().length} columns.`);
}

main().catch((e) => {
  console.error("[test:schema] Unexpected error:", e);
  process.exit(1);
});
```

**Error message format** matches CONTEXT.md specifics: `"Expected column 'X' on table 'Y' (referenced in jobs-db.ts); not found in n8n database."`

**`package.json` script addition:**

```json
"test:schema": "bun scripts/check-jobs-schema.ts"
```

Use `bun` (not `ts-node`) because the project already uses `bun prisma/seed-content.ts` for `seed:content` (package.json:10) — consistent runtime, no new dev dep. Alternatively `tsx scripts/check-jobs-schema.ts` if bun unavailable in some environments.

**Pre-push hook (NOT husky — native git hook, zero deps):**

```bash
# .git/hooks/pre-push
#!/bin/sh
# Schema drift guard — fails push if jobs-db.ts references columns absent from the live n8n DB.
npm run test:schema || exit 1
```

With `chmod +x .git/hooks/pre-push` to make it executable. No `.husky/` directory, no `prepare` script, no `husky install` invocation — native git hooks are sufficient for a solo-dev project and survive every clone-and-restore cycle the same way a husky hook would (hooks are NOT checked into git — committers must install the hook once per clone).

**Credential handling:**
- Script reads `process.env.JOBS_DATABASE_URL` — same env var Next.js uses
- Dev env: `.env.local` has real connection string; `bun` auto-loads it (verified via existing `seed:content` pattern)
- Pre-push gracefully exits 0 if `JOBS_DATABASE_URL` unset (solo dev running on a fresh machine without .env.local won't be blocked pushing the repo itself)

**Trade-off of "pre-push hook per-clone":** Must be installed per-clone. Mitigated by adding a `scripts/install-hooks.sh` that copies into `.git/hooks/`, documented in README + CLAUDE.md. Acceptable for solo-dev.

### Q6. XSS Test Fixture — Vitest + @testing-library/react

**Test shape (combines Testing Library render + DOM query for script tags):**

```typescript
// src/__tests__/components/tailored-resume-xss.test.tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Streamdown } from "streamdown";

describe("Streamdown XSS protection", () => {
  const XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    '<iframe src="javascript:alert(1)"></iframe>',
    '<img src=x onerror=alert(1)>',
  ];

  for (const payload of XSS_PAYLOADS) {
    it(`renders '${payload}' as literal text, not as executable DOM`, () => {
      // skipHtml mirrors production config — do NOT test with raw enabled
      const { container } = render(<Streamdown skipHtml>{payload}</Streamdown>);

      // Assertion 1: no <script> element in the rendered output
      expect(container.querySelector("script")).toBeNull();

      // Assertion 2: no <iframe> element
      expect(container.querySelector("iframe")).toBeNull();

      // Assertion 3: no <img> element with an onerror attribute
      const imgs = container.querySelectorAll("img");
      imgs.forEach((img) => {
        expect(img.getAttribute("onerror")).toBeNull();
      });

      // Assertion 4: the raw payload text is visible (rendered as text)
      expect(container.textContent).toContain(payload);
    });
  }

  it("renders safe markdown normally", () => {
    const { container } = render(
      <Streamdown skipHtml>{"# Title\n\n**bold**"}</Streamdown>
    );
    expect(container.querySelector("h1")).not.toBeNull();
    expect(container.querySelector("strong")).not.toBeNull();
  });
});
```

**Gotchas:**
- Vitest environment is `happy-dom` (verified via `vitest.config.ts:7`) — `querySelector` + `textContent` behave identically to a real DOM for this test
- Must import `Streamdown` as a value, not a type — `render()` evaluates the component
- If we ever switch from `skipHtml` to `rehypePlugins` override, update the test's `<Streamdown>` props in lockstep — the test must mirror production config
- DO NOT `expect(container.innerHTML).toContain("&lt;script&gt;")` — `happy-dom` may serialize entities differently than a browser; use DOM-query assertions instead of HTML-string assertions

**Integration with existing Vitest config:** Include pattern `src/**/*.test.{ts,tsx}` already covers `src/__tests__/components/tailored-resume-xss.test.tsx`. No config changes needed.

### Q7. Tailwind v4 `@source` Directive — Exact Incantation and Placement

**Exact directive** [VERIFIED: Context7 /vercel/streamdown "Configure Tailwind CSS v4"]:

```css
/* src/styles/globals.css — add BEFORE the @theme block, after existing @imports */
@source "../../node_modules/streamdown/dist/*.js";
```

**Key clarifications:**
- Glob is `dist/*.js` (single asterisk). CONTEXT.md D-14 shows `dist/**/*.js` — the correct official form is single-asterisk per Streamdown's docs.
- Relative path `../../node_modules/...` is correct: `src/styles/globals.css` is 2 directories deep from the repo root (where `node_modules/` lives).
- Directive placement: after `@import "tailwindcss";` and `@import "tw-animate-css";` (currently lines 1-2), before the `@theme` block (line 6). New line 3.
- No separate `.css` file needed. The existing `globals.css` is the only Tailwind entry point.
- `@source` is a Tailwind v4 native directive (not a plugin); no package install required.

**Resulting top of `globals.css`:**

```css
@import "tailwindcss";
@import "tw-animate-css";
@source "../../node_modules/streamdown/dist/*.js";

@custom-variant dark (&:is(.dark *));

@theme {
  /* existing content unchanged */
```

**Verification:** After editing, `npm run build` should succeed and Streamdown's heading, list, blockquote, code classes should appear in the output CSS. If Streamdown renders unstyled after install, the `@source` path is wrong — recheck the relative path.

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    Browser (Client Tier)                          │
│                                                                   │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │ /admin/jobs page                                           │  │
│   │                                                            │  │
│   │   [Sheet opens with jobId]                                │  │
│   │         │                                                  │  │
│   │         ▼                                                  │  │
│   │   [useEffect → Server Action `fetchJobDetail(jobId)`]      │  │
│   │                                                            │  │
│   │   [On response, render job-detail-sheet.tsx]               │  │
│   │         │                                                  │  │
│   │         ├──► <SectionErrorBoundary section="cover_letter"> │  │
│   │         │         <CoverLetterSection />                   │  │
│   │         │     </SectionErrorBoundary>                      │  │
│   │         │                                                  │  │
│   │         ├──► <SectionErrorBoundary section="company_...">  │  │
│   │         │         <CompanyResearchSection />               │  │
│   │         │     </SectionErrorBoundary>                      │  │
│   │         │                                                  │  │
│   │         └──► <SectionErrorBoundary section="tailored_...">│  │
│   │                   <TailoredResumeSection>                  │  │
│   │                     <FreshnessBadge ... />                 │  │
│   │                     <Streamdown skipHtml>...</Streamdown> │  │
│   │                   </TailoredResumeSection>                 │  │
│   │               </SectionErrorBoundary>                      │  │
│   └────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP + CSP header per-request nonce
                             │ Content-Security-Policy: default-src 'self'; ...
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              Frontend Server (Next.js 16 App Router)              │
│                                                                   │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │ proxy.ts (matcher: /admin/:path*)                          │  │
│   │   • generate nonce = base64(crypto.randomUUID())           │  │
│   │   • set 'x-nonce' on request.headers                       │  │
│   │   • set 'Content-Security-Policy' on request + response    │  │
│   └────────────────────────┬───────────────────────────────────┘  │
│                            ▼                                      │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │ src/lib/job-actions.ts                                     │  │
│   │   fetchJobDetail(jobId) — Server Action                    │  │
│   │     ├── requireRole(["owner"])                             │  │
│   │     └── return getJobDetail(jobId)                         │  │
│   └────────────────────────┬───────────────────────────────────┘  │
│                            ▼                                      │
│   ┌────────────────────────────────────────────────────────────┐  │
│   │ src/lib/jobs-db.ts                                         │  │
│   │   getJobDetail(jobId):                                     │  │
│   │     1. pool.query(SELECT ... FROM jobs LEFT JOIN ...)      │  │
│   │     2. For each nested artifact:                           │  │
│   │          Schema.safeParse(row) →                           │  │
│   │            success → include in JobDetail                  │  │
│   │            failure → console.error + null                  │  │
│   │     3. Attach freshness via isStale() (Phase 20.5 wiring)  │  │
│   │     4. Return JobDetail                                    │  │
│   └────────────────────────┬───────────────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────────┘
                             │ pg.Pool (max=3)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│         Database Tier — Postgres `n8n` (shared with n8n pod)     │
│                                                                   │
│   jobs, cover_letters, company_research, tailored_resumes, ...   │
└──────────────────────────────────────────────────────────────────┘

                     ─── Tooling / CI path ───

┌──────────────────────────────────────────────────────────────────┐
│  git push → .git/hooks/pre-push → npm run test:schema             │
│              │                                                   │
│              ▼                                                   │
│  scripts/check-jobs-schema.ts                                    │
│    • pg.Pool via JOBS_DATABASE_URL                               │
│    • SELECT column_name FROM information_schema.columns          │
│    • compare to EXPECTED map (6 tables, ~45 columns)             │
│    • exit 1 on drift with clear message                          │
└──────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (delta only)

```
hudsonfam/
├── proxy.ts                                           # NEW (Next.js 16 naming, root level)
├── scripts/
│   └── check-jobs-schema.ts                           # NEW (schema drift script)
├── .git/hooks/pre-push                                # NEW (git hook, not checked in)
├── src/
│   ├── lib/
│   │   ├── job-freshness.ts                           # NEW (isStale + thresholds)
│   │   ├── jobs-schemas.ts                            # NEW (Zod schemas)
│   │   └── jobs-db.ts                                 # MODIFIED (safeParse at return boundary)
│   ├── styles/
│   │   └── globals.css                                # MODIFIED (+@source directive)
│   ├── app/
│   │   └── (admin)/admin/jobs/
│   │       ├── job-detail-sheet.tsx                   # MODIFIED (+Tailored Resume section + boundaries + freshness badges)
│   │       ├── tailored-resume-section.tsx            # NEW (extract if job-detail-sheet crosses ~300 lines)
│   │       ├── freshness-badge.tsx                    # NEW (reusable client component)
│   │       └── section-error-boundary.tsx             # NEW (class component, 4 boundaries)
│   └── __tests__/
│       ├── lib/
│       │   └── job-freshness.test.ts                  # NEW (isStale unit tests)
│       └── components/
│           └── tailored-resume-xss.test.tsx           # NEW (Streamdown XSS guard)
└── package.json                                       # MODIFIED (+streamdown dep, +test:schema script)
```

### Pattern 1: `isStale` Pure Util + Per-Artifact Thresholds

**What:** Pure function with co-located threshold constants. Called in `fetchJobDetail` server-side; boolean attached to each artifact before crossing to client.

**When to use:** The only freshness computation in Phase 20. Reusable in Phase 22 (salary intel) with `thresholdDays=30`.

**Example:**

```typescript
// src/lib/job-freshness.ts
export const STALE_THRESHOLDS = {
  cover_letter: 14,
  tailored_resume: 14,
  company_research: 60,
  salary_intelligence: 30,
} as const;

export type ArtifactKind = keyof typeof STALE_THRESHOLDS;

/**
 * Returns true if the generated_at timestamp is older than the given threshold.
 * Null timestamps → false (never stale — nothing to compare).
 * Per CONTEXT.md D-01 and UI-SPEC Claude's Discretion, signature is boolean
 * (not a classification object) — simplest shape for the FreshnessBadge.
 */
export function isStale(
  timestamp: string | null,
  thresholdDays: number,
  now: Date = new Date()
): boolean {
  if (!timestamp) return false;
  const generated = new Date(timestamp);
  if (Number.isNaN(generated.getTime())) return false;
  const ageDays = (now.getTime() - generated.getTime()) / 86_400_000;
  return ageDays >= thresholdDays;
}
```

**Vitest coverage (4 tests, hits every branch):**

```typescript
// src/__tests__/lib/job-freshness.test.ts
import { describe, it, expect } from "vitest";
import { isStale, STALE_THRESHOLDS } from "@/lib/job-freshness";

describe("isStale", () => {
  const now = new Date("2026-04-21T12:00:00Z");

  it("returns false for null timestamps", () => {
    expect(isStale(null, 14, now)).toBe(false);
  });

  it("returns false for fresh artifacts (within threshold)", () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();
    expect(isStale(tenDaysAgo, 14, now)).toBe(false);
  });

  it("returns true for stale artifacts (past threshold)", () => {
    const twentyDaysAgo = new Date(now.getTime() - 20 * 86_400_000).toISOString();
    expect(isStale(twentyDaysAgo, 14, now)).toBe(true);
  });

  it("returns true exactly at the threshold boundary", () => {
    const exactly14DaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    expect(isStale(exactly14DaysAgo, 14, now)).toBe(true);
  });

  it("returns false for invalid date strings", () => {
    expect(isStale("not-a-date", 14, now)).toBe(false);
  });

  it("honors per-artifact thresholds", () => {
    const fortyDaysAgo = new Date(now.getTime() - 40 * 86_400_000).toISOString();
    expect(isStale(fortyDaysAgo, STALE_THRESHOLDS.cover_letter, now)).toBe(true); // 40 >= 14
    expect(isStale(fortyDaysAgo, STALE_THRESHOLDS.company_research, now)).toBe(false); // 40 < 60
  });
});
```

### Pattern 2: FreshnessBadge — Server-Computed, Client-Rendered

**Exact implementation** (matches UI-SPEC §2 render tree):

```typescript
// src/app/(admin)/admin/jobs/freshness-badge.tsx
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FreshnessBadgeProps {
  relativeTime: string;       // pre-computed server-side: "3 days ago"
  modelUsed: string | null;
  isStale: boolean;            // pre-computed server-side
  ageDays: number | null;      // for tooltip text
  className?: string;
}

export function FreshnessBadge({
  relativeTime,
  modelUsed,
  isStale,
  ageDays,
  className,
}: FreshnessBadgeProps) {
  if (!relativeTime) return null;

  const content = (
    <>
      <span>Generated {relativeTime}</span>
      {modelUsed && (
        <>
          <span aria-hidden="true">·</span>
          <span>{modelUsed}</span>
        </>
      )}
    </>
  );

  if (!isStale) {
    return (
      <span
        className={`flex items-center gap-1 text-[11px] font-medium text-muted-foreground ${className ?? ""}`}
      >
        {content}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`flex items-center gap-1 text-[11px] font-medium text-muted-foreground cursor-default ${className ?? ""}`}
          >
            <span
              aria-label="Stale artifact"
              className="size-1.5 rounded-full bg-warning"
            />
            {content}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">
          Generated {ageDays} days ago; may need regeneration
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

**Computation (inside `fetchJobDetail` or a wrapping server helper):**

```typescript
// In fetchJobDetail (src/lib/job-actions.ts), after getJobDetail returns:
import { formatDistanceToNowStrict } from "date-fns";
import { isStale, STALE_THRESHOLDS } from "@/lib/job-freshness";

function attachFreshness<T extends { generated_at: string }>(
  artifact: T | null,
  thresholdDays: number
): (T & { freshness: { relativeTime: string; isStale: boolean; ageDays: number } }) | null {
  if (!artifact) return null;
  const generated = new Date(artifact.generated_at);
  const ageDays = Math.floor((Date.now() - generated.getTime()) / 86_400_000);
  return {
    ...artifact,
    freshness: {
      relativeTime: formatDistanceToNowStrict(generated, { addSuffix: true }),
      isStale: isStale(artifact.generated_at, thresholdDays),
      ageDays,
    },
  };
}

// Usage:
const detail = await getJobDetail(jobId);
if (!detail) return null;
return {
  ...detail,
  cover_letter: attachFreshness(detail.cover_letter, STALE_THRESHOLDS.cover_letter),
  tailored_resume: attachFreshness(detail.tailored_resume, STALE_THRESHOLDS.tailored_resume),
  company_research: detail.company_research && {
    ...detail.company_research,
    freshness: {
      relativeTime: formatDistanceToNowStrict(new Date(detail.company_research.created_at), { addSuffix: true }),
      isStale: isStale(detail.company_research.created_at, STALE_THRESHOLDS.company_research),
      ageDays: Math.floor((Date.now() - new Date(detail.company_research.created_at).getTime()) / 86_400_000),
    },
  },
};
```

**Why server-compute:** `new Date()` on client causes hydration mismatch — CLAUDE.md §Key Decisions says "Explicit timezone (America/Chicago) on all date formatters." Server-side math + pre-computed strings avoids this entirely.

### Anti-Patterns to Avoid

- **Anti-pattern 1: Use `middleware.ts` (the Next.js 15 name).** In Next.js 16, this still works but is deprecated; the codemod will migrate it. Write new code with `proxy.ts` naming directly. [VERIFIED: Context7 /vercel/next.js "Export Proxy Function"]
- **Anti-pattern 2: Rely on Streamdown's "defaults" meaning "safe."** The default `rehypePlugins` chain includes `rehype-raw` — which is what we're trying to avoid. Use `skipHtml` or explicit override. [VERIFIED: Context7 /vercel/streamdown "HTML Content"]
- **Anti-pattern 3: Zod `throw` on schema failure.** Breaks the fail-open pattern. Always use `safeParse` (not `parse`) at the jobs-db boundary. Throwing kills the page for ANY drift; fail-open keeps every other section alive. [CITED: CONTEXT.md D-11]
- **Anti-pattern 4: Client-side `new Date()` for freshness.** Causes hydration mismatch on re-renders. Compute server-side, ship boolean + string to client. [CITED: ARCHITECTURE.md Pattern 2]
- **Anti-pattern 5: Husky for one pre-push hook.** Adds 1 dependency, `prepare` script, and multi-machine maintenance burden. Native git hook at `.git/hooks/pre-push` is zero-dep and installable via a one-time `scripts/install-hooks.sh` documented in CLAUDE.md.
- **Anti-pattern 6: Site-wide CSP.** D-05 locks `/admin/:path*` only — do not extend matcher to `/(.*)`. Blog MDX, photo OG tags, memorial embeds may rely on inline patterns that CSP would break; narrow scope is the point. [CITED: CONTEXT.md D-05]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering | Custom markdown-to-React parser | `streamdown` | 16 transitive deps do lexing/sanitization/GFM correctly; rolling this costs weeks and still fails on edge cases |
| HTML sanitization | Regex-based tag stripping | `skipHtml` prop OR `rehype-sanitize` (bundled with Streamdown) | Tag-stripping regexes are CVEs waiting to happen (mutation XSS via SVG, namespace confusion). Use a parser-based sanitizer. |
| Per-request CSP nonce | Middleware that mutates response bodies | Next.js 16 `proxy.ts` pattern (docs-provided) | Official docs provide the exact shape; deviating risks CSP bypass |
| Zod error formatting | Custom error message builder | `result.error.issues` (native Zod 4) | Shipped with `code`, `path`, `message`, `expected`, `received` — enough context for drift logs |
| Relative-time strings | Custom "N days ago" helper | `date-fns` `formatDistanceToNowStrict` | Already installed; handles pluralization, locales, "just now", "yesterday" |
| Error boundaries | Library (`react-error-boundary`) | Hand-rolled 25-line class component | 4 boundaries total in Phase 20; class component is strictly simpler; avoids dep. CONTEXT.md explicitly allows this. |
| Git hook management | Husky + lint-staged | Native git hook at `.git/hooks/pre-push` | One hook, zero deps, documented in CLAUDE.md — simpler than husky's multi-file convention |
| Schema diff | Full DDL snapshot comparison | `information_schema.columns` spot-check against `EXPECTED` map | D-08 explicitly scopes to "columns referenced in jobs-db.ts" — anything broader is noise (n8n adds columns per upgrade) |

**Key insight:** The phase's value is its orthogonality. Every piece builds on existing primitives; nothing is invented. The planner should resist the urge to "upgrade" any of these — e.g., swapping the class-component ErrorBoundary for `react-error-boundary` is a net loss.

## Common Pitfalls

### Pitfall 1: `middleware.ts` vs `proxy.ts` naming confusion

**What goes wrong:** Developer writes `middleware.ts` (the Next 15 name), expecting it to match documentation that still references that path. File works but is deprecated; linters/Next warnings surface on `next build`.

**Why it happens:** Next.js 16 rebrand is recent; most blog posts and older Stack Overflow answers show `middleware.ts`. Even some Next 16 docs pages still have mixed terminology.

**How to avoid:** Write `proxy.ts` at the repo root. Export `proxy`, not `middleware`. Reference only Next.js 16.x documentation (Context7 `/vercel/next.js` versioned to v16.x). If a merge conflict or prior commit adds `middleware.ts`, run the codemod: `npx @next/codemod@latest middleware-to-proxy .`

**Warning signs:** `next build` output shows `⚠ 'middleware' is deprecated` warning. [VERIFIED: Context7 /vercel/next.js "Migrate Middleware Convention to Proxy"]

### Pitfall 2: Streamdown's default pipeline silently allows raw HTML

**What goes wrong:** Developer reads CONTEXT.md D-12 as "Streamdown's defaults are safe" → writes `<Streamdown>{content}</Streamdown>` with no props → LLM output containing `<script>alert(1)</script>` gets passed through `rehype-raw` and into `rehype-sanitize`. Sanitize blocks `<script>` but may not block every XSS vector; more importantly, the XSS test fixture in the same PR FAILS because the assertions expect the `<script>` TAG to appear as literal text, not as a sanitized-away element.

**Why it happens:** "Default" is ambiguous — Streamdown's default INCLUDES `rehype-raw`. The pragmatic reading of D-12 (don't enable raw) requires an EXPLICIT step: either `skipHtml` prop or manual `rehypePlugins` override.

**How to avoid:** Always pass `skipHtml` (primary choice) OR explicitly construct `rehypePlugins={[defaultRehypePlugins.sanitize, defaultRehypePlugins.harden]}` (omit `raw`). Never write `<Streamdown>{content}</Streamdown>` bare.

**Warning signs:** XSS Vitest test's assertion `container.textContent).toContain("<script>alert(1)</script>")` fails because the payload was stripped instead of literalized. [VERIFIED: Context7 /vercel/streamdown "Skip HTML Rendering in Markdown"]

### Pitfall 3: CSP breaks dev-mode HMR

**What goes wrong:** Strict CSP (no `'unsafe-eval'`) prevents Next.js dev mode's HMR runtime from evaluating hot-update chunks. Dev server runs but the `/admin/*` route shows "Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source" in the browser console; hot reload stops working on admin pages only.

**Why it happens:** Turbopack/webpack HMR rely on `eval()`-style module loading in development; production builds don't.

**How to avoid:** Conditionally add `'unsafe-eval'` for dev:

```typescript
const isDev = process.env.NODE_ENV === "development";
const cspHeader = `
  ...
  script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
  ...
`;
```

**Warning signs:** Browser console on `/admin/*` shows CSP violation for `eval` in dev; `/admin/*` routes don't hot-reload. [VERIFIED: Context7 /vercel/next.js "Generate Nonce and Apply CSP Header with Proxy"]

### Pitfall 4: Schema drift test runs against the WRONG database

**What goes wrong:** Dev has `DATABASE_URL` pointing at homepage Prisma DB and `JOBS_DATABASE_URL` pointing at n8n DB. `scripts/check-jobs-schema.ts` uses `DATABASE_URL` by accident (typo or misread) — every query returns "table not found" because the Prisma DB doesn't have `jobs`, `cover_letters`, etc.

**Why it happens:** Two env var names differ by only a suffix; easy to copy-paste wrong.

**How to avoid:** The script uses `process.env.JOBS_DATABASE_URL` explicitly (per the template above). Include a startup log: `console.log("[test:schema] connecting to", process.env.JOBS_DATABASE_URL?.split("@")[1])` — prints the host but not the password — so the operator sees at a glance which DB is being checked.

**Warning signs:** All tables report missing; the script exits 1 on first table.

### Pitfall 5: `@source` directive with wrong relative path silently does nothing

**What goes wrong:** Tailwind v4's `@source` directive is lenient — an invalid path (e.g., `"../node_modules/streamdown/dist/*.js"` when the correct path is `"../../node_modules/..."`) compiles without error but doesn't scan the files. Streamdown renders with raw markdown HTML but no prose styling; headings look like body text.

**Why it happens:** Tailwind v4 treats missing `@source` globs as "nothing to scan" rather than "file not found."

**How to avoid:** After install, run `npm run build` and visually verify a Streamdown-rendered `<h1>` has the expected size/weight. If it looks unstyled, adjust the path (from `src/styles/globals.css`, the correct path to `node_modules/` is `../../node_modules/`).

**Warning signs:** Streamdown renders as plain text with visible markdown (`# Heading` prose) but heading levels are same-sized.

### Pitfall 6: ErrorBoundary swallows Zod errors as data errors

**What goes wrong:** Zod `safeParse` at `jobs-db.ts` silently returns `null` for the malformed artifact — `<TailoredResumeSection detail={detail} />` receives `detail.tailored_resume === null` → conditionally renders nothing → user sees "no tailored resume" even though the row exists with a bad shape. The ErrorBoundary never fires because Zod already converted the error to a null value.

**Why it happens:** Two defensive layers stack — Zod converts parse errors to null; boundary catches render errors on truthy input. A drift that Zod catches NEVER triggers the boundary.

**How to avoid:** This is actually correct behavior per D-11 (fail-open), but the logging must be unambiguous: `console.error("[jobs-db] <table> schema drift", { jobId, issues })` surfaces the drift in server logs even when the UI silently renders the section as empty. Periodically check K8s Pod logs for these entries.

**Warning signs:** Cover letter section hidden for a job that clearly has one in the DB; tailored resume absent despite `SELECT * FROM tailored_resumes WHERE job_id = X` returning a row. Check K8s logs for `[jobs-db]` drift entries.

## Runtime State Inventory

Phase 20 is greenfield infrastructure addition, not a rename/refactor — most categories don't apply.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — all new fields are additive (Zod wraps existing columns; no renames) | None |
| Live service config | None — no n8n workflow changes in Phase 20 | None |
| OS-registered state | None — no systemd / Task Scheduler / cron changes | None |
| Secrets/env vars | None — CSP uses in-code nonce; schema-drift test reuses existing `JOBS_DATABASE_URL` | None — no new env vars introduced by Phase 20 |
| Build artifacts | `streamdown` will appear in `node_modules/`; K3s deployment auto-picks up new deps via Docker image rebuild (no manual step) | Existing CI pipeline rebuilds image on push to main — no extra action |

**Nothing found in category:** Verified by CONTEXT.md's explicit scope (Phase 20 = pure additive infrastructure); no rename or migration in scope.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | build + runtime | ✓ | per package.json engines (assumed 20+) | — |
| npm | install | ✓ | — | — |
| bun | `npm run test:schema`, `npm run seed:content` | ✓ (existing `seed:content` uses bun) | — | Use `tsx scripts/check-jobs-schema.ts` instead |
| `JOBS_DATABASE_URL` | schema-drift test | ✓ (dev env has .env.local; prod via ExternalSecret) | — | Script exits 0 with warning if unset (no test failure on machines without access) |
| Postgres `n8n` DB | schema-drift test | ✓ (existing `jobs-db.ts` connects in prod) | — | Same as JOBS_DATABASE_URL — skip with warning |
| `streamdown@^2.5.0` | rendering | ✗ (not yet installed) | — | `npm install streamdown@^2.5.0` — single package add, 16 transitive deps, no peer conflicts |
| git | pre-push hook | ✓ | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `streamdown` — resolved by the install step in the first commit.

## Validation Architecture

Per `.planning/config.json` — `workflow.nyquist_validation` is absent (treated as enabled). This section maps each REQ to a testable assertion.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 + happy-dom 20 + @testing-library/react 16 + MSW 2 |
| Config file | `vitest.config.ts` (alias `@` → `./src`, setupFiles `./src/__tests__/setup.ts`) |
| Quick run command | `npm run test -- <file>` (single file) |
| Full suite command | `npm run test` (runs all 268 existing + new Phase 20 tests; <2s) |
| Schema drift command | `npm run test:schema` (Phase 20 adds this script) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AI-DATA-03 | `isStale()` returns correct boolean for null, fresh, exact-boundary, stale, invalid | unit | `npm run test -- job-freshness.test.ts` | ❌ Wave 0 |
| AI-SAFETY-06 | `safeParse` at `jobs-db.ts` returns null (not throws) on malformed row; page stays alive | unit + integration | `npm run test -- jobs-db.test.ts` | ❌ Wave 0 |
| AI-SAFETY-01 | `<script>alert(1)</script>` in `<Streamdown skipHtml>` renders as literal text | component | `npm run test -- tailored-resume-xss.test.tsx` | ❌ Wave 0 |
| AI-RENDER-01 | `<TailoredResumeSection>` renders markdown from `detail.tailored_resume.content` | component | `npm run test -- tailored-resume-section.test.tsx` | ❌ Wave 0 |
| AI-RENDER-02 | `<FreshnessBadge>` renders "Generated Nd ago · model" when fresh, adds amber dot + tooltip when stale | component | `npm run test -- freshness-badge.test.tsx` | ❌ Wave 0 |
| AI-SAFETY-05 | `/admin/*` response includes `Content-Security-Policy` header with `object-src 'none'; frame-ancestors 'none'` | manual smoke | `curl -sI http://localhost:3000/admin/jobs \| grep -i content-security` | manual — Playwright not wired, curl check in dev |
| AI-DATA-04 | `information_schema.columns` matches expected set; drift prints clear message + exits 1 | integration | `npm run test:schema` | ❌ Wave 0 (new script) |

### Sampling Rate

- **Per task commit:** `npm run test` (full suite runs in <2s; no partial-run optimization needed)
- **Per wave merge:** `npm run test` + `npm run build` + `npm run test:schema` (pre-push hook runs the last one automatically)
- **Phase gate:** Full suite green + CSP smoke check (curl) + manual test of `/admin/jobs` detail sheet in the browser before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/lib/job-freshness.test.ts` — covers AI-DATA-03
- [ ] `src/__tests__/lib/jobs-db-zod.test.ts` — covers AI-SAFETY-06 (new; reuses mock pool pattern from existing blog.test.ts)
- [ ] `src/__tests__/components/tailored-resume-xss.test.tsx` — covers AI-SAFETY-01
- [ ] `src/__tests__/components/tailored-resume-section.test.tsx` — covers AI-RENDER-01
- [ ] `src/__tests__/components/freshness-badge.test.tsx` — covers AI-RENDER-02
- [ ] `scripts/check-jobs-schema.ts` — covers AI-DATA-04 (new script, not in Vitest)
- [ ] `.git/hooks/pre-push` — wires AI-DATA-04 to push-time validation
- [ ] No new framework install required — Vitest/RTL/happy-dom/MSW already wired

AI-SAFETY-05 is the only REQ without a fully automated test in Wave 0. Recommended test plan: add a small `curl | grep` smoke check to a future CI pipeline; for now, manual verification in dev is sufficient given the owner-only admin surface.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Out of scope — `requireRole(["owner"])` already enforced for `/admin/*` via existing session middleware |
| V3 Session Management | no | Better Auth + Redis session cache already in place |
| V4 Access Control | no | Out of scope — admin role gate already applies |
| V5 Input Validation | yes | Zod `safeParse` at `jobs-db.ts` return boundary (AI-SAFETY-06) — never accept DB rows as trusted shape |
| V6 Cryptography | no | No new crypto in Phase 20; CSP nonce uses `crypto.randomUUID()` (WebCrypto native) per Next.js docs |
| V14 Configuration | yes | CSP header (AI-SAFETY-05) — deny inline scripts, object embeds, framing on `/admin/*` |

### Known Threat Patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via LLM-generated markdown | Tampering | Streamdown `skipHtml` prop (or explicit `rehypePlugins` override excluding `rehype-raw`) + CSP `object-src 'none'; frame-ancestors 'none'` |
| Schema-drift crash cascades to whole-page blank | Denial of Service | Per-section ErrorBoundary + fail-open Zod (render null, log server-side, keep page alive) |
| Base64 PDF inflation in JobDetail | Information Disclosure + DoS | Preserved existing `pdf_data: null` at jobs-db.ts:313 — Phase 20 does NOT reintroduce it (documented in PITFALLS.md Pitfall 2) |
| Clickjacking on admin surface | Tampering | CSP `frame-ancestors 'none'` (locked in D-04) |
| Inline script injection | Elevation of Privilege | CSP `script-src 'self' 'nonce-{n}' 'strict-dynamic'` (locked in D-04); `'strict-dynamic'` required for Next.js webpack runtime |
| `data:` / `javascript:` URI in markdown links | Tampering | Streamdown's bundled `rehype-harden` plugin controls allowed protocols by default |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 19 does not provide an official ErrorBoundary primitive at component granularity; class components remain the standard | Q4 + Don't Hand-Roll | LOW — if React 19 ships something new, hand-rolled class still works; no rework needed |
| A2 | `bun` is installed on the dev machine (existing `seed:content` script uses it) | Q5 | LOW — fallback is `tsx scripts/check-jobs-schema.ts` with a one-line `devDependencies` add |
| A3 | Git hooks are sufficient for solo-dev drift protection; no team-wide CI enforcement is needed | Q5 | MEDIUM — if the project grows to multiple contributors, hooks are easily bypassed with `git push --no-verify`. Escalate to CI when needed (D-07 acknowledges this explicitly) |
| A4 | Tailwind v4 `@source` directive silently ignores missing paths (doesn't error on wrong path) | Pitfall 5 | LOW — if Tailwind actually errors, the build fails fast and the error surfaces the issue immediately |
| A5 | The existing `/admin/*` pages don't use `<Script>` tags, so the CSP nonce plumbing is latent (set but not consumed) | Q1 | LOW — if any Script tag IS added later, reading `x-nonce` in the layout is a trivial retrofit |
| A6 | Next.js 16 `proxy.ts` is recognized without any config.turbo or experimental flag | Q1 | LOW — official docs position this as the canonical v16 convention; compat with standalone output build is standard |

## Open Questions (RESOLVED)

1. **Should the schema-drift test check `package_ready` column on `jobs`?**
   - What we know: `package_ready` is referenced in `getPipelineStats` (`jobs-db.ts:414`), so yes.
   - What's unclear: Is there any other column the existing code queries that's NOT in the current `EXPECTED` map template above?
   - RESOLVED: Plan 20-08 includes `package_ready` in the expected-column map and re-audits `jobs-db.ts` as part of task acceptance.

2. **Does the `company_research.created_at` / `generated_at` discrepancy matter for the FreshnessBadge?**
   - What we know: The existing interface uses `created_at` for company research (`jobs-db.ts:67`) and `generated_at` for cover letters / tailored resumes. UI-SPEC uses `generated_at` as the universal field name in the FreshnessBadge props.
   - What's unclear: The server-side `attachFreshness` helper needs to handle both field names, OR we normalize at the jobs-db boundary by aliasing `created_at → generated_at` in the CompanyResearch type.
   - RESOLVED: Plan 20-06's `attachFreshness` helper handles both field names without schema transform (the "less magic" option) — CompanyResearch retains `created_at`, cover letters and tailored resumes retain `generated_at`, and the helper reads whichever is present.

3. **`linkSafety` default in Streamdown — do we disable it or let the modal surface?**
   - What we know: Streamdown ships a link-safety confirmation modal by default (`linkSafety: { enabled: true }`).
   - What's unclear: On an owner-only admin surface, the modal is friction ("Are you sure you want to visit this link?"). Passing `linkSafety={{ enabled: false }}` eliminates it; also disables the "click an external link" protection.
   - RESOLVED: Plan 20-05 passes `linkSafety={{ enabled: false }}` to `<Streamdown>` for the owner-only admin surface. Tradeoff documented in the plan's threat model.

## Code Examples

All snippets verified against official docs (Context7) and existing codebase patterns. Planner can paste these into task actions directly.

### Streamdown drop-in with XSS guard (primary pattern)

```typescript
// src/app/(admin)/admin/jobs/tailored-resume-section.tsx
"use client";

import { FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import type { JobDetail } from "@/lib/jobs-db";
import { FreshnessBadge } from "./freshness-badge";

interface Props {
  detail: JobDetail & {
    tailored_resume: NonNullable<JobDetail["tailored_resume"]> & {
      freshness: { relativeTime: string; isStale: boolean; ageDays: number };
    };
  };
}

export function TailoredResumeSection({ detail }: Props) {
  if (!detail.tailored_resume) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <FreshnessBadge
          relativeTime={detail.tailored_resume.freshness.relativeTime}
          modelUsed={detail.tailored_resume.model_used}
          isStale={detail.tailored_resume.freshness.isStale}
          ageDays={detail.tailored_resume.freshness.ageDays}
        />
      </div>
      <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
        <Streamdown skipHtml linkSafety={{ enabled: false }}>
          {detail.tailored_resume.content}
        </Streamdown>
      </div>
    </div>
  );
}
```

### Zod safeParse at jobs-db boundary

```typescript
// snippet inside src/lib/jobs-db.ts getJobDetail (replaces line 309-346 imperative builds)
import {
  CoverLetterSchema,
  CompanyResearchSchema,
  TailoredResumeSchema,
} from "@/lib/jobs-schemas";

function parseOrLog<T>(
  schema: z.ZodSchema<T>,
  raw: unknown,
  label: string,
  jobId: number
): T | null {
  if (raw === null) return null;
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error(`[jobs-db] ${label} schema drift`, {
      jobId,
      issues: result.error.issues,
    });
    return null;
  }
  return result.data;
}

// Usage within getJobDetail:
const coverLetter = parseOrLog(
  CoverLetterSchema,
  row.cl_id
    ? {
        id: row.cl_id,
        content: row.cl_content,
        pdf_data: null,
        quality_score: row.cl_quality_score,
        generated_at: row.cl_generated_at?.toISOString?.() ?? row.cl_generated_at,
        model_used: row.cl_model_used,
      }
    : null,
  "cover_letter",
  jobId
);
// Repeat for companyResearch, tailoredResume.
```

### CSP proxy.ts (full file)

(See §Q1 above — full pattern provided; paste verbatim, adjust only dev-mode `'unsafe-eval'` if Turbopack requires it.)

### XSS Vitest test

(See §Q6 above — full test file provided.)

### Schema-drift script

(See §Q5 above — full script provided; adjust `EXPECTED` map if audit surfaces additional columns.)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `export function middleware()` | `proxy.ts` with `export function proxy()` | Next.js 16 (2025) | File rename + export rename; config flags `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize` |
| `react-markdown@10.x` + `rehype-sanitize` manual wire-up | `streamdown@^2.5.0` drop-in | streamdown 1.x (2025-Q4) | Single package, React 19 / Tailwind v4 native, shadcn-compatible design tokens |
| Hand-rolled freshness formatter | `date-fns` `formatDistanceToNowStrict` | date-fns v4 (2024) | Strict formatting ("3 days ago" not "about 3 days ago"); already installed |
| Husky + lint-staged for git hooks | Native `.git/hooks/pre-push` | N/A — always valid for solo dev | Zero deps; one `scripts/install-hooks.sh` + CLAUDE.md doc note |
| `parse()` + try/catch | `safeParse()` with `{ success, data \| error }` | Zod v3 (2022); idiomatic since | No exception propagation; cleaner fail-open pattern at data boundary |

**Deprecated/outdated:**
- `middleware.ts` naming (still works in Next.js 16.x but deprecated) — replaced by `proxy.ts`
- `react-markdown` for React 19 projects — open compatibility issues (#877, #882, #920); Streamdown is the successor
- Husky for simple single-hook projects — overkill given native git hooks work identically

## Project Constraints (from CLAUDE.md)

CLAUDE.md directives that apply to Phase 20 — the planner MUST verify tasks comply:

1. **Color system:** Zero hardcoded Tailwind colors (`text-amber-*`, `bg-green-*`, etc.). All new components use semantic tokens (`text-muted-foreground`, `bg-warning`, `text-foreground`, `text-destructive`). Streamdown prose inherits from the `@source` directive + existing `@theme` tokens. UI-SPEC already enforces this.
2. **TanStack Form / Table only:** Phase 20 introduces no forms or tables, so this constraint is inapplicable here (Phase 21+ will need to honor it for regenerate UI).
3. **shadcn components:** 41 installed; Phase 20 uses only already-installed primitives (`Tooltip`, `Sheet`, `Separator`, `Card`, `Collapsible`). **Never remove unused components**; integrate them. Per UI-SPEC §Registry Safety, zero new shadcn installs required.
4. **Server vs Client Components:** Page files (`page.tsx`) stay server; interactive components marked `"use client"` at the top. `proxy.ts` is server-only (not a component). `FreshnessBadge`, `SectionErrorBoundary`, `TailoredResumeSection` are all `"use client"` (they live inside `job-detail-sheet.tsx` which is already `"use client"`).
5. **Database:** `JOBS_DATABASE_URL` via `pg.Pool` (not Prisma). Phase 20's Zod wrapping respects this boundary — it wraps the `pool.query()` result shape, not Prisma's.
6. **Path alias:** `@/*` → `./src/*`. All imports in new files use `@/lib/...`, `@/components/ui/...`.
7. **Testing:** Vitest + happy-dom + Testing Library + MSW. Phase 20's 5 new tests all fit this pattern. The standalone `scripts/check-jobs-schema.ts` is outside Vitest (per D-07 rationale).
8. **Single PR branch per milestone:** Phase 20 commits on the v3.0 branch; does not merge to main until all phases complete.
9. **Explicit timezone (America/Chicago) on date formatters:** `date-fns` `formatDistanceToNowStrict` computes relative time without requiring a timezone; freshness computation is timezone-agnostic (just ms subtraction). This constraint is satisfied trivially.
10. **`useMemo` for derived state, not `useEffect`:** Phase 20 adds no new `useEffect`s; the FreshnessBadge receives pre-computed props.
11. **Flux image tags YYYYMMDDHHmmss:** Deployment-side concern; Phase 20 commits do not affect image tags directly.

## Sources

### Primary (HIGH confidence)

- **Context7** `/vercel/next.js` — "Migrate Middleware Convention to Proxy", "Generate Nonce and Apply CSP Header with Proxy", "Configure Proxy Matcher", "Read Nonce with headers() in Next.js App Router Server Component" (v16.2+ docs)
- **Context7** `/vercel/streamdown` — "Install Streamdown and Configure Tailwind", "HTML Content", "Disable Raw HTML Rendering in Streamdown", "Skip HTML Rendering in Markdown", "Streamdown Component Props"
- **Context7** `/colinhacks/zod` — "Handle Zod Validation Errors with Issues Array", "Validate Form Data with safeParse", "Infer TypeScript types from Zod schema"
- **npm registry** — `npm view streamdown` → 2.5.0, peer deps `react ^18 || ^19` (verified 2026-04-21)
- **Local code** — `/home/dev-server/hudsonfam/src/lib/jobs-db.ts` (Zod integration point at line 398), `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/job-detail-sheet.tsx` (already `"use client"`; sheet structure), `/home/dev-server/hudsonfam/next.config.ts` (no CSP currently), `/home/dev-server/hudsonfam/package.json` (Zod 4.3.6, date-fns 4.1.0, Vitest 4, happy-dom, @testing-library/react already installed), `/home/dev-server/hudsonfam/vitest.config.ts` (happy-dom env, include pattern, alias)
- **Local code** — `/home/dev-server/hudsonfam/src/styles/globals.css` (confirms `@source` placement; existing `@theme` tokens include `--color-warning`, `--color-muted-foreground`)
- **Local code** — `/home/dev-server/hudsonfam/.git/hooks/pre-push.sample` exists (confirms git hooks dir ready); `.husky/` does NOT exist (no need to migrate)

### Secondary (MEDIUM confidence)

- **CONTEXT.md / UI-SPEC.md** for this phase — authoritative decisions, copied verbatim into §User Constraints
- **STACK.md / ARCHITECTURE.md / PITFALLS.md** milestone research — still accurate; this phase research layers on tactical details
- **Streamdown security defaults** — declared in `rehype-harden` docs but behavior of `skipHtml` vs plugin-override for XSS test verified only against Context7 description (not a live Vitest run)

### Tertiary (LOW confidence)

- None. Every non-trivial claim is either verified against Context7 or cited against existing code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against npm registry and node_modules
- Architecture: HIGH — patterns lifted from milestone research (already HIGH) + Next.js 16 official docs
- Pitfalls: HIGH — Pitfalls 1–4 verified against Context7 docs; Pitfall 5 (Tailwind silent ignore) is ASSUMED but low-risk
- CSP / proxy.ts: HIGH — exact code lifted from Next.js 16 official docs via Context7
- Streamdown XSS posture: HIGH — Context7 confirms `defaultRehypePlugins.raw` is on by default and `skipHtml` fully bypasses; CONTEXT.md D-12 is operationally consistent if interpreted as "no raw plugin"
- Schema-drift script shape: HIGH — pg.Pool + `information_schema.columns` is standard; template tested conceptually against 6 tables from jobs-db.ts

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stack is stable, Next.js 16.x unlikely to invalidate the proxy pattern in a month; Streamdown 2.5.0 is recent but Vercel-backed and peer-stable)
