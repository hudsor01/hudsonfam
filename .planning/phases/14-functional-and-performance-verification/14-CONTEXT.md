---
phase: 14-functional-and-performance-verification
type: context
created: 2026-04-08
mode: auto
---

## Domain

Verification phase — confirm all jobs dashboard features work correctly in production and meet performance targets. No new features, only testing and measurement.

## Decisions

### Verification Approach
- **Decision:** Use browser automation (Chrome MCP tools) for functional checks, kubectl/curl for performance measurement
- **Rationale:** Production verification requires hitting the real deployment, not localhost

### Authentication for Testing
- **Decision:** Use Google OAuth login via browser automation to access /admin/jobs as the owner user
- **Rationale:** /admin routes require owner role; Google OAuth is the primary auth method

### Performance Measurement
- **Decision:** Measure server-side fetch time via browser Network tab or curl timing, not synthetic benchmarks
- **Rationale:** Requirements specify real-world latency (PERF-01: <2s fetch, PERF-03: <1s detail load)

### Kanban Drag-Drop Verification
- **Decision:** Automate a drag-drop operation, refresh the page, and confirm the status change persisted
- **Rationale:** FUNC-03 requires persistence after refresh — must verify server round-trip

### Filter Verification
- **Decision:** Apply each filter type (source, status, score range) individually and verify visible results match
- **Rationale:** FUNC-05 requires each filter type to work independently

### Dismiss/Restore Verification
- **Decision:** Dismiss a job, refresh, confirm hidden; restore it, refresh, confirm visible again
- **Rationale:** FUNC-06 requires bidirectional state persistence

## Specifics

- Production URL: https://thehudsonfam.com
- Admin jobs page: https://thehudsonfam.com/admin/jobs
- Current image tag: 20260408173607
- Owner auth: Google OAuth (redirects to /dashboard)
- Jobs data source: JOBS_DATABASE_URL pointing to n8n database on postgres-rw

## Canonical Refs

- `.planning/REQUIREMENTS.md` — FUNC-01 through FUNC-06, PERF-01 through PERF-03
- `src/app/(admin)/admin/jobs/page.tsx` — Jobs dashboard entry point
- `src/app/(admin)/admin/jobs/columns.tsx` — Table column definitions
- `src/app/(admin)/admin/jobs/kanban-board.tsx` — Kanban component
- `src/app/(admin)/admin/jobs/job-detail-sheet.tsx` — Detail sheet component
- `src/app/(admin)/admin/jobs/filters-sidebar.tsx` — Filters component
- `src/app/(admin)/admin/jobs/stats-bar.tsx` — Stats bar component
- `src/lib/jobs-db.ts` — Jobs database queries
- `src/lib/job-actions.ts` — Server actions for job operations

## Deferred Ideas

None — this is a verification phase with no new features.
