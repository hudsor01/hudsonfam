---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: — Photo Management Overhaul
status: Awaiting next milestone
last_updated: "2026-06-27T19:12:17.889Z"
last_activity: 2026-06-27 — Milestone v6.0 completed and archived
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 8
  completed_plans: 8
  percent: 100
---

# State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-03)

**Core value:** A single home for the Hudson family — content for everyone, and Grandma Hudson's recipes preserved and made readable for even the oldest relatives.
**Current focus:** Milestone complete

## Current Position

Phase: Milestone v6.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-06-27 — Milestone v6.0 completed and archived

## What's Done

- v5.0 shipped 2026-06-03 (tag `v5.0`) — 24/24 REQs, phases 32-36 complete
- v6.0 milestone scoped: requirements defined (FEAT-01..04, COLL-01..03, PHOTOS-01..03, VIS-01..02)
- v6.0 roadmap written: phases 37-40, 100% coverage

## What's Next

Plan Phase 37: Data Model & Actions Foundation

- Single-collection enforcement in server actions
- "All Photos" = no-collectionId query
- `featured` surface collection (kind=surface, mirrors memorial pattern)
- Bulk `published=true` migration for existing photos; upload default flip

## Deferred Items

| Category | Item | Status |
|----------|------|--------|
| future | FUTURE-01: Restore homelab Postgres → migrate data into Neon | when cluster returns |
| future | FUTURE-02: Re-enable live homelab monitoring (un-park CLOUD-04 dashboard) | when cluster returns |
| future | FUTURE-03: Remaining recipe back-matter (Menu Making, Menus section ~100, Table Service) | post-v5.0 |
| future | FUTURE-04: Recipe full-text search (ingredients/steps) | post-v4.0 |
| ops | Owner: clean up Vercel `R2_ENDPOINT` env var (drop `/hudsonfam-photos` suffix) | optional — code guard already active |
| tech-debt | WR-04: extractExifDate UTC-naive timezone issue | pre-existing, needs tz-semantics decision |
| tech-debt | 6 tsc errors in nav-footer.test.ts (TS2769 overload) | pre-existing; next build doesn't typecheck tests |

## Key Decisions (v6.0)

- `featured` collection modeled as kind=surface (same as memorial) — no new schema needed
- Single-collection membership enforced in server actions, not DB constraint — keeps `published` column as always-true plumbing (no `/api/images` auth gate changes in this milestone)
- "All Photos" = query for photos with no collectionId — no separate table or flag
- Publish toggle removed from dashboard UI; `published` column kept as always-true plumbing
- Filenames/titles hidden on all public surfaces; no rename/edit UI needed (owner confirmed)

## Blockers

(none)

## Operator Next Steps

- Start the next milestone with /gsd:new-milestone
