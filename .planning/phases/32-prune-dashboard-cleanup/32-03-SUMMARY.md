---
phase: 32-prune-dashboard-cleanup
plan: "03"
subsystem: dashboard
tags: [dashboard, navigation, sidebar, consolidation, DASH-01, DASH-02, DASH-03]
dependency_graph:
  requires: [32-02]
  provides: [DASH-01, DASH-02, DASH-03]
  affects: [src/app/(dashboard)/layout.tsx, src/components/dashboard/app-sidebar.tsx, src/app/(dashboard)/dashboard/page.tsx]
tech_stack:
  added: []
  patterns: [nav-pruning, iconMap-cleanup, spec-copy-upgrade]
key_files:
  created:
    - .planning/phases/32-prune-dashboard-cleanup/32-03-SUMMARY.md
  modified:
    - src/app/(dashboard)/layout.tsx
    - src/components/dashboard/app-sidebar.tsx
    - src/app/(dashboard)/dashboard/page.tsx
decisions:
  - "dashboard/page.tsx was already de-blogged in Plan 02; only the Upcoming Events empty state needed a copy upgrade"
  - "Album.title (not Album.name) confirmed via schema; already corrected in Plan 02 Rule 1 fix"
  - "Badge component not used — date text inline is sufficient and matches existing pattern; no scope expansion"
metrics:
  duration: "~10m"
  completed_date: "2026-06-02"
  task_count: 2
  file_count: 3
---

# Phase 32 Plan 03: Dashboard Consolidation — Nav Prune + Overview Polish Summary

**One-liner:** Removed Posts + Updates from dashboard navLinks and iconMap (FileText/Bell imports gone), upgraded Upcoming Events empty state to heading+body spec form — dashboard nav and overview now match the surviving-content-only contract (DASH-01/02/03).

## Tasks Completed

| # | Task | Commit | Result |
|---|------|--------|--------|
| 1 | Remove Posts/Updates from dashboard nav (DASH-01) | b6d5dd5 | layout.tsx + app-sidebar.tsx cleaned |
| 2 | Upgrade Upcoming Events empty state to spec form (DASH-02) | 60948c7 | heading+body per UI-SPEC copywriting contract |

## What Was Built

- **`(dashboard)/layout.tsx`:** Removed `{ href: "/dashboard/posts", label: "Posts" }` and `{ href: "/dashboard/updates", label: "Updates" }` from `navLinks`. Surviving base navLinks: Overview, Photos, Events. Owner push of Members + Memorial intact.
- **`app-sidebar.tsx`:** Removed `FileText` and `Bell` lucide imports; removed `Posts: FileText` and `Updates: Bell` from `iconMap`. Surviving iconMap keys: Overview, Photos, Events, Services, Members, Memorial. Active-state logic and user popover untouched.
- **`dashboard/page.tsx`:** Upgraded `<CollapsibleCard title="Upcoming Events">` empty state from simple `"No upcoming events."` text to heading+body form per UI-SPEC: heading `"No upcoming events"` / body `"Create an event to see it here."`. (The Recent Photos card was already wired correctly in Plan 02 with the heading+body form and `/api/images/${photo.id}?size=thumbnail` proxy.)

## Verification

```
grep -nE '"Posts"|"Updates"|dashboard/posts|dashboard/updates' src/app/(dashboard)/layout.tsx  → 0
grep -nE 'FileText|Bell|Posts:|Updates:' src/components/dashboard/app-sidebar.tsx             → 0
grep -nE 'blogPost|familyUpdate|QuickUpdateDialog|Recent Posts' dashboard/page.tsx             → 0
grep -q "Recent Photos" + grep -q "api/images/" dashboard/page.tsx                            → both present
npm run build                                                                                   → exit 0
npm test -- --run                                                                               → 194/194 pass
```

## Deviations from Plan

None — plan executed exactly as written. `dashboard/page.tsx` was already de-blogged in Plan 02 (3-stat grid, Recent Photos card, QuickEventDialog only, Image import, recentPhotos query), leaving only the Upcoming Events empty state copy upgrade for Task 2.

## Known Stubs

None — all data shown in the overview comes from live Prisma queries; no placeholder values.

## Threat Flags

None — changes are pure nav/copy edits with net reduction in surface (two dead nav links removed). No new endpoints or trust boundaries introduced.

## Self-Check: PASSED

- [x] `src/app/(dashboard)/layout.tsx` — Posts + Updates navLinks removed
- [x] `src/components/dashboard/app-sidebar.tsx` — FileText + Bell imports gone; Posts/Updates iconMap keys gone
- [x] `src/app/(dashboard)/dashboard/page.tsx` — Upcoming Events empty state upgraded to heading+body form
- [x] Commits b6d5dd5 and 60948c7 present in git log
- [x] Build exits 0; 194 tests pass
