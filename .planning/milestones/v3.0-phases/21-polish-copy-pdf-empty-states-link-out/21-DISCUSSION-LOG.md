# Phase 21: Polish (Copy + PDF + Empty States + Link-out) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 21-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 21-polish-copy-pdf-empty-states-link-out
**Areas discussed:** Resume actions (copy + PDF), Empty-state messaging, Quality-score badge, Company link-out source

---

## Gray-area selection

| Option | Description | Selected |
|--------|-------------|----------|
| Resume actions (copy + PDF) | AI-ACTION-01 + AI-ACTION-02 — button layout, clipboard contents, PDF fallback | ✓ |
| Empty-state messaging | AI-RENDER-04 — three distinct states, which sections, tone, detection | ✓ |
| Quality-score badge | AI-RENDER-05 — scale, thresholds, color tokens, placement, null behavior | ✓ |
| Company link-out source | AI-RENDER-06 — which URL, placement, click behavior, validation | ✓ |

**User's choice:** All four areas.

---

## Resume actions (copy + PDF)

### Q1: Copy-button style

| Option | Description | Selected |
|--------|-------------|----------|
| Icon-only ghost button with tooltip | size-4 Copy icon; ghost Button; Radix Tooltip "Copy to clipboard"; icon morph + toast | ✓ |
| Icon + "Copy" label | More discoverable; heavier visually; matches existing "Download PDF" text-link cadence | |
| You decide | Claude picks during planning | |

**User's choice:** Icon-only ghost button with tooltip (recommended).

### Q2: Clipboard contents

| Option | Description | Selected |
|--------|-------------|----------|
| Raw markdown (verbatim) | `detail.tailored_resume.content` as-is; ATS + Gmail auto-render markdown | ✓ |
| Plain text (strip markdown) | Safer for ATS that don't render `**bold**`; adds transformer | |
| Both — one button per format | Explicit control; bloats meta row | |

**User's choice:** Raw markdown (recommended).

### Q3: PDF download behavior when `tailored_resumes.pdf_data` is null

| Option | Description | Selected |
|--------|-------------|----------|
| One "Download" button; server detects pdf_data and serves .pdf or .md transparently (recommended) | Matches roadmap SC #2; single button, Content-Type drives format | |
| Two explicit buttons — "Download PDF" (disabled when null) + "Download .md" (always enabled) | More transparent about pipeline state | |
| Silent .md only until pipeline emits pdf_data, then switch to PDF-only | Single button; label flips when column gets populated | |

**User's choice:** "rsumes should only be in pdf so maybe one download button but only download it as a pdf" (free text).
**Notes:** User overrode roadmap SC #2's `.md` fallback. Resumes are PDF-only in practice; `.md` fallback is noise. This required a follow-up decision (below) about where the pipeline-side work to produce PDFs actually lands.

### Q3-followup: Because `pdf_data` column doesn't exist on `tailored_resumes` today, how do we make PDF-only ship?

| Option | Description | Selected |
|--------|-------------|----------|
| Drop AI-ACTION-02; defer to a later phase (recommended) | Phase 21 ships 4 REQs; AI-ACTION-02 moves to a new phase | |
| Expand Phase 21 to include n8n + migration work | n8n workflow edit + schema migration + EXPECTED map update + API route; ~2 extra plans | ✓ |
| Ship disabled client UI; activate later | Wire button + route but disabled-with-tooltip until pipeline catches up | |

**User's choice:** Expand Phase 21 to include n8n + migration work.
**Notes:** Phase 21 now includes pipeline work traditionally scoped to the homelab repo. Planner must produce plan tasks that straddle both repos.

### Q4: Meta-row layout

| Option | Description | Selected |
|--------|-------------|----------|
| FreshnessBadge → Copy → Download (recommended) | Mirrors cover letter cadence; copy before download because more frequent | Claude's discretion locked to this |
| Copy → Download → FreshnessBadge | Actions first; badge is passive context | |
| You decide | Minor pixel-level detail | |

**User's choice:** "copy button and download button" (free text).
**Notes:** Ambiguous as to badge position. With the compact 4/21/26 date format (see Q5 below) the row is not crowded; Claude locked Layout A during discussion.

### Q5 (emergent): FreshnessBadge date format

| Option | Description | Selected |
|--------|-------------|----------|
| Apr 18, 2026 | Compact, no time | |
| April 18, 2026 | Full month, no time | |
| Apr 18, 2026 · 2:34 PM CDT | Date + time (overkill for freshness context) | |

**User's choice:** "dont need time that is overkill, just 4/21/26 would suffice" (free text).
**Notes:** User replaced the Phase 20 relative-time display ("3 days ago") with a formal M/D/YY date. America/Chicago per CLAUDE.md. Amber stale dot + threshold logic stays unchanged — Claude's discretion on staleness approach.

### Q6 (emergent): Where does the FreshnessBadge date-format rework land?

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Phase 21 (recommended) | Pragmatic; keeps all current work under one phase boundary | |
| Phase 20 revision commit before Phase 21 | Purist; isolates Phase 20 code from Phase 21 additive work | ✓ |
| You decide | Claude picks during planning | |

**User's choice:** Phase 20 revision commit before Phase 21.

---

## Empty-state messaging

### Q1: Which sections get empty-state blocks?

| Option | Description | Selected |
|--------|-------------|----------|
| All three (Cover Letter, Tailored Resume, Company Research) | Consistent sheet shape regardless of pipeline state (recommended) | ✓ |
| Only sections where empty is realistic | Cover letter rarely null; narrower scope | |
| Only Company Research | Narrowest — only table with 0 rows today | |

**User's choice:** All three (recommended).

### Q2: Copy tone

| Option | Description | Selected |
|--------|-------------|----------|
| Direct, state-only — no CTAs (recommended) | Factual; no mention of Phase 23 triggers that don't exist | ✓ |
| Direct + hint at Phase 23 trigger | Problem: button doesn't exist; copy needs rewrite when Phase 23 lands | |
| Technical — show underlying reason | Reads like a dev error | |

**User's choice:** Direct, state-only (recommended).

### Q3: Visual weight

| Option | Description | Selected |
|--------|-------------|----------|
| Same shell as filled section (recommended) | Heading + icon + muted body copy; layout identical regardless of artifact presence | ✓ |
| Compact one-liner | No heading; loses visual anchor | |
| Illustration + message | Breaks detail-sheet rhythm | |

**User's choice:** Same shell as filled section (recommended).

### Q4: Detection mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Row presence + content truthiness check in component (recommended) | Zero schema/fetch changes; pure presentational | ✓ |
| Add computed `status` field in attachFreshness | Discriminated union; adds a field | |
| You decide | Claude picks during planning | |

**User's choice:** Row presence + content truthiness check in component (recommended).

---

## Quality-score badge

### Q1: What scale is cover_letters.quality_score on?

| Option | Description | Selected |
|--------|-------------|----------|
| 0–1 (probability / normalized) (recommended) | FEATURES.md D10 suggested; requires verifying against live row | |
| 0–10 (integer) | Mirrors existing match_score thresholds | |
| 0–100 (percentage) | Most human-readable | |
| Check the n8n workflow + one DB row, then lock | Don't guess — verify first | |

**User's choice:** "you decide" (free text).
**Notes:** Claude locked option 4 (verify during planning). Don't guess a scale that could be wrong; plan Task 0 reads n8n cover-letter workflow grader + samples live `quality_score` values before locking thresholds.

### Q2: Color tokens

| Option | Description | Selected |
|--------|-------------|----------|
| destructive / warning / success (recommended) | Existing semantic tokens in globals.css | ✓ |
| score-high / score-mid / new score-low token | Keeps "score"-prefixed grouping; adds a new token | |
| You decide | Minor detail | |

**User's choice:** destructive / warning / success (recommended).

### Q3: Placement

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn Badge in cover-letter meta row, left of FreshnessBadge (recommended) | Uses existing `<Badge variant="outline">`; tooltip on hover | ✓ |
| Inline colored dot + number (no Badge wrapper) | Lighter visual weight | |
| Under the heading, left-aligned | Lower visual priority | |

**User's choice:** shadcn Badge in cover-letter meta row (recommended).

### Q4: Null behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Hide the badge entirely (recommended) | No badge, no placeholder; matches FreshnessBadge null-branch | ✓ |
| Render a muted "no score" badge | Explicit signal; adds noise | |
| You decide | Claude picks during planning | |

**User's choice:** Hide the badge entirely (recommended).

---

## Company link-out source

### Q1: Which URL drives the link?

| Option | Description | Selected |
|--------|-------------|----------|
| company_research.company_url first, fall back to jobs.company_url (recommended) | LLM-researched URL more likely canonical; fall back when research hasn't run | ✓ |
| jobs.company_url first, fall back to research URL | Trusts the feed (always populated) | |
| Only company_research.company_url — no fallback | Purist; no link-out for 456 jobs today | |
| Only jobs.company_url — no fallback | Simple, always populated; but often a tracking redirect | |

**User's choice:** company_research.company_url first, fall back to jobs.company_url (recommended).

### Q2: Placement

| Option | Description | Selected |
|--------|-------------|----------|
| On the company name in the sheet header (recommended) | Highest-traffic position; visible pre-scroll | ✓ |
| Inside Company Intel section only | More discoverable if already in Company Intel; hidden behind scrolling | |
| Both — header link-out AND Company Intel row | Belt and suspenders; slight duplication | |

**User's choice:** On the company name in the sheet header (recommended).

### Q3: Click behavior

| Option | Description | Selected |
|--------|-------------|----------|
| New tab, noopener noreferrer, no tracking (recommended) | Matches roadmap SC #5 literally; security posture matches Apply button | ✓ |
| New tab + mark status as "interested" | Implicit side effect; could surprise | |
| You decide | Claude picks during planning | |

**User's choice:** New tab, noopener noreferrer, no tracking (recommended).

### Q4: URL validation

| Option | Description | Selected |
|--------|-------------|----------|
| Prepend `https://` when missing; skip render if not plausible (recommended) | Best-effort client-side helper; no DB write | ✓ |
| Trust the DB — render whatever's there | Lowest effort; broken links broken | |
| Zod URL validation at jobs-schemas.ts boundary | Too aggressive — one bad URL nulls the whole row | |

**User's choice:** Prepend `https://` when missing; skip render if not plausible (recommended).

---

## Claude's Discretion

- Copy-button icon morph animation timing (~2s default)
- Exact empty-body heuristic for `company_research` (no single content field)
- Quality-score scale + thresholds (verified from live data during planning)
- Toast wording for `toast.success` call
- Tooltip wording for Copy button + Quality badge
- ExternalLink icon size in header link-out
- Whether URL normalization helper lives inline or in `src/lib/url-helpers.ts`
- Whether empty-state strings live inline or in a small constant map
- Staleness approach on revised FreshnessBadge (locked to "keep amber dot")
- Meta-row layout A (badge → copy → download) chosen over B given compact date format

## Deferred Ideas

- `.md` fallback for tailored-resume download (owner override)
- Zod URL validation at the schema boundary (would null-out rows)
- Empty-state CTAs referencing Phase 23 triggers (don't exist yet)
- Two explicit download buttons (obsolete after PDF-only decision)
- Mark-as-interested side effect on company link-out
- Quality-score badge on tailored resume + company research (no column exists)
- Manual regenerate on any artifact → Phase 23 + 24
- Inline edit / revert-to-original → v3.1
- Salary intelligence rendering → Phase 22
- Side-by-side JD ↔ cover letter → v3.2+
- Research-pack copy button → post-MVP
- Glassdoor/LinkedIn search links → v3.2+
- PDF preview, email from admin, bulk regenerate, streaming, in-app chat, pipeline-completion notifications → explicit anti-features
