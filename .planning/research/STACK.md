# Stack Research — v3.0 AI Integration

**Domain:** Surfacing n8n Job Search LLM output inside an existing Next.js 16 / Tailwind v4 / shadcn admin UI
**Researched:** 2026-04-21
**Confidence:** HIGH (all recommendations verified against current npm releases and official docs; React 19 / Next 16 compatibility checked)

## Scope Guard

This milestone is **additive, not greenfield**. The existing stack (Next.js 16.2.1, React 19.2.4, Tailwind v4.2, shadcn/ui, TanStack Form/Table, Prisma v7, Better Auth, `pg.Pool` to `JOBS_DATABASE_URL`, `sonner`, `lucide-react`, `date-fns`, `remark-gfm`) is treated as fixed. The question is only: **what new packages (if any) cleanly render the four LLM outputs in `job-detail-sheet.tsx`?**

Inputs to render:
- `tailored_resumes.content` — markdown text, 6 rows exist, **not yet rendered**
- `cover_letters.content` — plain text today, markdown-likely (rendered as `whitespace-pre-wrap` currently); `pdf_data` base64 already downloadable via `/api/jobs/[id]/cover-letter-pdf`
- `company_research.*` — structured columns + `ai_summary` narrative; UI exists, workflow is the blocker
- `salary_intelligence.report_json` (jsonb) + `llm_analysis` (text) — **unmodeled app-side today**, zero rows

## Recommended Additions (exactly 2 packages)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `streamdown` | `^2.5.0` | Markdown renderer for `tailored_resume.content`, `cover_letter.content`, and `company_research.ai_summary`/`recent_news` | Vercel-maintained drop-in for `react-markdown` built specifically for shadcn/ui + Tailwind v4. Uses CSS custom properties (maps directly to our `--color-*` OKLCH tokens). GFM enabled by default. **Avoids** the open React 19 / JSX-namespace issues that still dog `react-markdown` 10.x (issues #877, #882, #920 remain). Actively published. |
| `recharts` | `^3.8.1` | Salary range horizontal bar for `salary_intelligence` and `company_research.salary_range_{min,max}` | Pulled in as a transitive of the shadcn `chart` component (which is the project-sanctioned chart pattern). v3 uses `var(--chart-1)` tokens, which is the same OKLCH-via-CSS-custom-property pattern already used throughout `globals.css`. Composable primitives (no wrapper lock-in), matches our "no heavy abstractions" bias. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn `chart` component | CLI `npx shadcn@latest add chart` | Wrapper components `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` around Recharts | Install exactly once, only if the salary range viz ships. Adds local code under `src/components/ui/chart.tsx` — no runtime dep beyond recharts. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| *(none new)* | — | Vitest / MSW / happy-dom setup already covers markdown-component snapshot-style tests. |

## What I Evaluated and Rejected

### Markdown — react-markdown (rejected)

`react-markdown@10.1.0` is the incumbent in the ecosystem but has documented React 19 friction:
- `global.JSX` namespace removal in `@types/react@19` breaks its typed surface (issue #828)
- Reports of Next.js 15 + React 19 build failure requiring manual `JSX` import (#882) persist
- React 19 support issues (#877, #920) are open without a published fix as of 2026-04

Streamdown sidesteps this because it was authored against React 19 / Tailwind v4 from day one and targets the exact shadcn design-token pattern we already use.

### PDF viewer — rejected entirely

`cover_letters.pdf_data` is already served via `/api/jobs/[id]/cover-letter-pdf` with `<a download>`. Adding `react-pdf` (≈1.5 MB of PDF.js workers) or `@pdf-viewer/react` buys nothing the owner has asked for — the file is an owner-only re-usable artifact for submitting to employers, and the `content` markdown render (via Streamdown) is the in-UI preview. If inline preview ever becomes a requirement, the minimum-cost path is an `<iframe src="data:application/pdf;base64,…">` or the existing API route — no library needed. **Decision: keep the download-only pattern; do not install a PDF viewer.**

### JSON tree viewer — rejected

`salary_intelligence.report_json` is a single jsonb row per search. The schema shape is known (we own the n8n workflow that writes it), so destructuring + typed React rendering is strictly better than a generic tree viewer:
- `react-json-view-lite` is the smallest credible option but bloats DOM with collapsible wrappers we don't want in a polished admin UI
- `@uiw/react-json-view@2.0.0-alpha.42` is alpha and not warranted
- A generic tree view would undermine the "structured, opinionated, branded" feel of `/admin/jobs`

**Decision: define a `SalaryReport` interface matching the jsonb shape in `jobs-db.ts`; render with the same shadcn primitives already used for company research.** If the jsonb shape is unstable during workflow development, a fallback `<pre className="text-xs">{JSON.stringify(report, null, 2)}</pre>` inside a `<Collapsible>` (already installed) is a one-liner that needs zero deps.

### Copy-to-clipboard — rejected

`navigator.clipboard.writeText(…)` + `toast.success(...)` from `sonner` (already installed) is all we need. No `react-copy-to-clipboard` dep; it's a 2-line utility.

### Skeleton loaders — already handled

The existing sheet uses a `Loader2` spinner. shadcn ships a `skeleton` component that may or may not be in the 41 installed — verify locally before adding; do not re-install if present.

## Installation

```bash
# Core additions — exactly two runtime deps
npm install streamdown@^2.5.0 recharts@^3.8.1

# shadcn chart wrapper (generates local code, not a runtime dep)
npx shadcn@latest add chart
```

Streamdown requires one Tailwind config step per its docs — an `@source` directive so Tailwind scans its class usage:

```css
/* src/styles/globals.css — add near the existing @theme block */
@source "../../node_modules/streamdown/dist/**/*.js";
```

Adjust the relative path if globals.css lives elsewhere; our `src/styles/globals.css` is two levels deep from `node_modules`.

## Integration Points — `job-detail-sheet.tsx`

Precise edits, minimizing churn:

1. **Tailored resume section (NEW).** Mirrors the existing "Cover Letter" block between company research and description. Swap `whitespace-pre-wrap` for `<Streamdown>` because the content is markdown, not plain text. Place it inside the existing `<Collapsible>` pattern already imported at line 17-20 (default open, collapsible because the resume is long). Download button via an `/api/jobs/[id]/tailored-resume` route (parallel to the cover-letter PDF route) that returns the markdown with `Content-Disposition: attachment`.

2. **Cover letter upgrade (MODIFY line 166-168).** Replace the current `<div className="...whitespace-pre-wrap...">{detail.cover_letter.content}</div>` with `<Streamdown>{detail.cover_letter.content}</Streamdown>` inside the same styled container. Zero visual regression for plain-text content (Streamdown renders paragraphs the same); instant upgrade if the workflow ever emits markdown (headers, bold, lists).

3. **Company research narrative (MODIFY line 224-228).** Wrap `ai_summary` and `recent_news` with `<Streamdown>`. These fields can contain bullet lists from the LLM. `tech_stack`, `glassdoor_rating`, `salary_range_*` stay as structured shadcn primitives — unchanged.

4. **Salary intelligence section (NEW).** New `JobDetail.salary_intelligence` field in `jobs-db.ts` sourced via a second pool query in `getJobDetail` (LEFT JOIN `salary_intelligence` ON `company_name = j.company` or whatever the workflow's join key is — confirm once workflow is fixed). Render:
   - Two-line headline from `report_json.headline` or equivalent (structured React, not markdown)
   - `llm_analysis` as markdown via `<Streamdown>`
   - Horizontal bar chart (shadcn `ChartContainer` + Recharts `<BarChart layout="vertical">`) showing p25 / p50 / p75 from `report_json` with the job's own `salary_min`-`salary_max` overlaid

5. **Copy-to-clipboard (OPTIONAL NEW).** For `tailored_resume.content` and `cover_letter.content`, add a `<Copy>` icon button next to the section heading that calls `navigator.clipboard.writeText(content)` + `toast.success("Copied")`. Zero new deps — `Copy` is already imported from lucide-react (line 33) and `sonner` is already installed.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `streamdown` | `react-markdown@10.1.0` + `remark-gfm` (already installed) | Only if Streamdown's shadcn/Tailwind-v4 assumptions collide with our globals.css. `remark-gfm@^4.0.1` is already a dep (from MDX blog), so react-markdown avoids *one* new install but keeps the React 19 type friction. Streamdown is the better trade. |
| `recharts@^3.8.1` via shadcn chart | Hand-rolled SVG (`<svg>` with positioned `<rect>`s) | If salary viz is **one** chart type used **once**, a 40-line SVG component is defensible and zero-dep. Choose this if Recharts' transitive `react-is` override for React 19 (documented in its docs) causes any build friction. |
| `recharts` | `visx` | Skip `visx` — composable but no shadcn preset, more boilerplate for equivalent output. |
| `recharts` | `@tanstack/react-charts` | Less mature than Recharts, and there is no shadcn integration. |
| structured React for jsonb | `react-json-view-lite@2.x` / `@uiw/react-json-view` alpha | Use only if the jsonb schema is genuinely unknown at render time — not our case. |
| download-only PDF | `react-pdf` (wojtekmaj) / `@pdf-viewer/react` | Only if owner explicitly requests in-UI PDF preview. Otherwise ~1.5 MB of worker bundles for zero user value. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `react-markdown@10.x` | Open React 19 compatibility bugs (#877, #882, #920) as of 2026-04; `global.JSX` namespace removed in `@types/react@19` breaks its typed surface in Next 16 Turbopack builds. | `streamdown@^2.5.0` |
| `react-json-view@1.21.3` | Last published 5 years ago; unmaintained; pulls React 16 era deps. | Structured React rendering of known jsonb shape. |
| `@uiw/react-json-view@2.0.0-alpha.*` | Alpha channel; unnecessary risk for one render location. | Same as above. |
| `react-copy-to-clipboard` | Trivial native alternative (`navigator.clipboard.writeText`). | `navigator.clipboard` + existing `sonner` toast. |
| `react-pdf` / `@pdf-viewer/react` | PDF.js worker bundle (~1-1.5 MB) for zero confirmed user requirement. Cover letter is already downloadable. | Existing `<a href download>` pattern. |
| `react-syntax-highlighter` | Not requested; resumes are prose, not code. Streamdown has an optional `@streamdown/code` plugin if it ever becomes relevant. | Defer until someone asks. |
| `chart.js` / `react-chartjs-2` | Canvas-based, no shadcn preset, doesn't reuse our CSS custom properties, heavier. | `recharts` via shadcn chart. |
| Adding `react-hook-form` for any new forms | Project is standardized on TanStack Form (CLAUDE.md, Key Decisions). | Existing `@tanstack/react-form` + zod. |

## Stack Patterns by Variant

**If the jsonb `report_json` shape is fluid during n8n workflow iteration:**
- Render `llm_analysis` (a text field — stable) with Streamdown as primary content
- Hide `report_json` behind a `<Collapsible>` that shows `<pre>{JSON.stringify(report, null, 2)}</pre>`
- Promote to structured rendering once the schema stabilizes (workflow fix is a prerequisite per Task #11 anyway)

**If owner later wants inline PDF preview for cover letter:**
- Do **not** install `react-pdf`. First try `<iframe src={`data:application/pdf;base64,${pdf_data}`} />` inside a shadcn `<Dialog>`. If the payload (currently omitted from detail view for a reason) proves too heavy, add a `/api/jobs/[id]/cover-letter-pdf?inline=1` route that streams with `Content-Disposition: inline` and load it in the iframe.

**If Recharts v3's React 19 transitive (`react-is` override) causes any pnpm/npm resolution error:**
- Drop Recharts entirely and hand-roll the salary range bar in SVG. The viz is simple (range + point overlay); Recharts is convenience, not a requirement.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `streamdown@^2.5.0` | `react@19.2.4`, `next@16.2.1`, `tailwindcss@^4.2` | Peer deps aligned by design (Vercel-authored for this exact stack). No `--legacy-peer-deps` needed. Requires `@source` directive in globals.css. |
| `recharts@^3.8.1` | `react@19.2.4` | Documented requirement: override `react-is` to match React version. Our `package.json` does not currently pin `react-is`; if npm resolves a conflicting version, add to `overrides` (npm) / `resolutions` (not needed — not using pnpm/yarn here). |
| `streamdown` default plugins | `remark-gfm@^4.0.1` (already installed) | Streamdown bundles its own remark-gfm internally; the existing top-level `remark-gfm` dep continues to serve the MDX blog path (`next-mdx-remote`) — no conflict, no dedup concern. |
| shadcn `chart` component | Recharts v3 conventions | Uses `var(--chart-1)` tokens. If our globals.css does not yet define `--color-chart-1..5`, add 5 OKLCH entries that reference existing palette tokens (green/blue/etc) — same pattern as the existing `source-*` and `score-*` aliases. |

## Sources

- [vercel/streamdown (GitHub)](https://github.com/vercel/streamdown) — drop-in react-markdown replacement, GFM default, shadcn-native, install command confirmed (HIGH)
- [Introducing Streamdown (Vercel changelog)](https://vercel.com/changelog/introducing-streamdown) — design intent, Tailwind v4 / shadcn/ui token integration (HIGH)
- [streamdown on npm](https://www.npmjs.com/package/streamdown) — 2.5.0 published ~1 month before 2026-04 (HIGH)
- [react-markdown React 19 support (issue #877)](https://github.com/remarkjs/react-markdown/issues/877) — confirms open compatibility problem (HIGH)
- [react-markdown Next.js 15 / React 19 build break (issue #882)](https://github.com/remarkjs/react-markdown/issues/882) — confirms JSX namespace workaround still required (HIGH)
- [recharts on npm](https://www.npmjs.com/package/recharts) — 3.8.1 current (HIGH)
- [Recharts 3.0 migration guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) — `var(--chart-*)` token pattern confirmed (HIGH)
- [shadcn/ui Chart docs](https://ui.shadcn.com/docs/components/chart) — installation via CLI, recharts dependency, composition pattern (HIGH)
- [react-json-view-lite on npm](https://www.npmjs.com/package/react-json-view-lite) — reviewed and rejected (HIGH)
- [react-pdf](https://github.com/wojtekmaj/react-pdf) — reviewed and rejected for this milestone (HIGH)
- Local: `/home/dev-server/hudsonfam/package.json` — verified existing deps (remark-gfm, sonner, lucide-react, Collapsible via radix-ui, date-fns all present) (HIGH)
- Local: `/home/dev-server/hudsonfam/src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — integration points mapped against actual file (HIGH)
- Local: `/home/dev-server/hudsonfam/src/lib/jobs-db.ts` — confirmed `getJobDetail` shape, tailored_resume already joined, pdf_data deliberately stripped from detail payload (HIGH)

---
*Stack research for: v3.0 AI Integration — surface n8n LLM output in /admin/jobs*
*Researched: 2026-04-21*
