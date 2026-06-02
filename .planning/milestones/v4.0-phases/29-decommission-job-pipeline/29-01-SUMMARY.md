---
phase: 29-decommission-job-pipeline
plan: "01"
subsystem: job-pipeline-decommission
tags: [deletion, nav, admin, api, build-verified]
dependency_graph:
  requires: []
  provides: [job-ui-deleted, job-api-deleted, nav-jobs-removed]
  affects: [admin-layout, dashboard-layout]
tech_stack:
  added: []
  patterns: [pure-deletion]
key_files:
  created: []
  modified:
    - src/app/(admin)/layout.tsx
    - src/app/(dashboard)/layout.tsx
  deleted:
    - src/app/(admin)/admin/jobs/ (14 files)
    - src/app/api/jobs/[id]/cover-letter-pdf/route.ts
    - src/app/api/jobs/[id]/tailored-resume-pdf/route.ts
decisions:
  - Wave ordering (UI/API before libs) keeps every intermediate build state green
metrics:
  duration: "~15 minutes"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 16
---

# Phase 29 Plan 01: Delete Job Admin UI, API Routes, and Nav Entries Summary

Deleted job-search admin UI directory (14 files), job API PDF routes (2 files), and removed the Jobs nav entry from both owner-facing layouts (admin nav + owner dashboard sidebar). Build verified green with no dangling imports.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Delete job admin UI dir + remove Jobs nav from both layouts | 9530118 | 14 deletions + 2 layout edits |
| 2 | Delete job API routes + verify next build | 9df610c | 2 deletions; build green |

## What Was Done

**Task 1 — Job admin UI + nav cleanup:**
- Deleted `src/app/(admin)/admin/jobs/` (14 files: page.tsx, jobs-dashboard.tsx, kanban-board.tsx, columns.tsx, filters-sidebar.tsx, stats-bar.tsx, job-detail-sheet.tsx, salary-intelligence-section.tsx, tailored-resume-section.tsx, regenerate-button.tsx, trigger-company-research-button.tsx, provenance-tag.tsx, freshness-badge.tsx, section-error-boundary.tsx)
- Removed `<Link href="/admin/jobs">Jobs</Link>` from `src/app/(admin)/layout.tsx` (Overview/Site/Dashboard remain)
- Removed `navLinks.push({ href: "/admin/jobs", label: "Jobs" })` from `src/app/(dashboard)/layout.tsx` (Members/Memorial/Admin pushes remain)

**Task 2 — Job API routes + build gate:**
- Deleted `src/app/api/jobs/[id]/cover-letter-pdf/route.ts`
- Deleted `src/app/api/jobs/[id]/tailored-resume-pdf/route.ts`
- `next build` exits 0 — no dangling imports

## Verification Results

| Check | Result |
|-------|--------|
| `test ! -d src/app/(admin)/admin/jobs` | PASS |
| `test ! -d src/app/api/jobs` | PASS |
| `grep "admin/jobs" layouts` → nothing | PASS |
| `grep -c "Jobs" admin/layout.tsx` = 0 | PASS |
| `grep -c "admin/jobs" dashboard/layout.tsx` = 0 | PASS |
| `grep -q "Overview" admin/layout.tsx` | PASS |
| `grep -q "Admin" dashboard/layout.tsx` | PASS |
| `next build` exit code | 0 — PASS |

## Remaining api/jobs References

`grep -rn "api/jobs" src/` returns 8 hits — all in `src/__tests__/` (tailored-resume-section.test.tsx and tailored-resume-pdf-route.test.ts). These are explicitly scoped to Plan 29-02 per the plan's interfaces note. No production code references the deleted routes.

## Deviations from Plan

None — plan executed exactly as written. Staging discipline maintained (only 16 plan-scoped files committed across 2 atomic commits; pre-existing working tree modifications untouched).

## Known Stubs

None. This is a pure-deletion plan; no new code was written.

## Threat Flags

None. Attack surface only shrinks.

## Self-Check: PASSED

- `src/app/(admin)/admin/jobs/` — MISSING (deleted, as intended)
- `src/app/api/jobs/` — MISSING (deleted, as intended)
- `src/app/(admin)/layout.tsx` — FOUND, Overview present, Jobs absent
- `src/app/(dashboard)/layout.tsx` — FOUND, Admin push present, Jobs push absent
- Commit 9530118 — FOUND
- Commit 9df610c — FOUND
- `next build` — exit 0 confirmed
