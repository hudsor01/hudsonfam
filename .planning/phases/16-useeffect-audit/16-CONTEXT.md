---
phase: 16-useeffect-audit
type: context
created: 2026-04-08
mode: auto
---

## Domain

Audit every useEffect in the codebase against the 8 EFFECT requirements. Eliminate unnecessary ones, fix the rest. Reference: `docs/react-nextjs-code-smells.md` smells 1-9, 11-12.

## Codebase Scan Results

13 useEffect instances found in 10 files:

| File | Line | Purpose | Suspected Smell |
|------|------|---------|-----------------|
| `src/hooks/use-mobile.ts:8` | Media query listener | Legitimate — external system sync |
| `src/components/command-palette.tsx:62` | Keyboard shortcut (Cmd+K) | Legitimate — external event listener |
| `src/components/public/lightbox.tsx:43` | Keyboard navigation (Escape, arrows) | Legitimate — external event listener |
| `src/components/ui/sidebar.tsx:97` | Media query + keyboard shortcut (Cmd+B) | Legitimate — external system sync |
| `src/components/ui/calendar.tsx:191` | Unknown — needs inspection | Possible smell |
| `src/app/(admin)/admin/jobs/job-detail-sheet.tsx:52` | Fetch job detail on open | Possible smell 8 — client fetch, could be server action pattern |
| `src/app/(admin)/admin/admin-client.tsx:56` | Unknown — needs inspection | Possible smell |
| `src/app/(auth)/signup/page.tsx:19` | Validate invite token | Possible smell 8 — client fetch on mount |
| `src/app/(dashboard)/dashboard/services/services-grid.tsx:140` | Unknown — needs inspection | Possible smell |

## Decisions

### Audit Approach
- **Decision:** Read each useEffect, classify as legitimate (external system sync) or smell (derived state, prop sync, client fetch, etc.), then fix smells
- **Rationale:** Not all useEffects are bad — the React docs say useEffect is for synchronizing with external systems. The goal is to eliminate the misuses.

### Legitimate useEffect Patterns (keep as-is)
- **Decision:** Keep useEffects that subscribe to browser events (keyboard, media queries, resize) — these are the intended use case
- **Rationale:** react.dev explicitly says useEffect is for synchronizing with external systems like DOM events, timers, and subscriptions

### Client-side Data Fetching Pattern
- **Decision:** For useEffects that fetch data (job detail sheet, invite validation), evaluate whether the fetch can move to a server component or server action. If the fetch is triggered by user interaction (opening a sheet), it may be legitimate.
- **Rationale:** Smell 8 and 15 say to prefer server components for data fetching, but interactive triggers (click to open detail) legitimately need client-side fetching

### Fix Strategy
- **Decision:** Fix in place — no file moves or architectural changes. Replace bad patterns with the correct React pattern (useMemo, event handler, key prop, etc.)
- **Rationale:** Minimize blast radius. Each fix should be a targeted replacement, not a refactor.

## Canonical Refs

- `docs/react-nextjs-code-smells.md` — The 20 official code smells with bad/good patterns
- `.planning/REQUIREMENTS.md` — EFFECT-01 through EFFECT-08
- All files listed in codebase scan above

## Deferred Ideas

None — this is a focused audit phase.
