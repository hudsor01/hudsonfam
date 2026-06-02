---
phase: 32-prune-dashboard-cleanup
plan: "02"
subsystem: database/dashboard
tags: [prisma, migration, pruning, schema, dashboard]
dependency_graph:
  requires: [32-01]
  provides: [PRUNE-03, PRUNE-04]
  affects: [prisma/schema.prisma, dashboard/page.tsx, dashboard-actions.ts]
tech_stack:
  added: []
  patterns: [verify-then-drop, versioned-migration, surgical-test-removal]
key_files:
  created:
    - prisma/migrations/20260602212415_remove_blog_familyupdate/migration.sql
    - .planning/phases/32-prune-dashboard-cleanup/32-02-SUMMARY.md
  modified:
    - prisma/schema.prisma
    - src/lib/dashboard-actions.ts
    - src/app/(dashboard)/dashboard/quick-actions.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/__tests__/lib/dashboard-actions.test.ts
    - src/__tests__/mocks/prisma.ts
    - src/__tests__/production-bugs.test.ts
  deleted:
    - src/app/(dashboard)/dashboard/posts/ (7 files)
    - src/app/(dashboard)/dashboard/updates/ (3 files)
decisions:
  - "D-01 verify-then-drop honored: BlogPost=0 rows, FamilyUpdate=0 rows — no dump needed, migration ran directly"
  - "Prisma migrate dev (not db push) — versioned migration in prisma/migrations/"
  - "PostStatus enum dropped with tables; Visibility enum retained (shared with Event)"
  - "Rule 1 auto-fix: album.name → album.title in dashboard/page.tsx (Album model field name was wrong)"
metrics:
  duration: "~30m (continuation agent from checkpoint)"
  completed_date: "2026-06-02"
  task_count: 4
  file_count: 15
---

# Phase 32 Plan 02: DB Prune — Drop BlogPost + FamilyUpdate via Versioned Migration Summary

**One-liner:** Deleted 10 dashboard CRUD route files, removed 6 server actions + QuickUpdateDialog, ran `DROP TABLE "BlogPost"; DROP TABLE "FamilyUpdate"; DROP TYPE "PostStatus"` against Neon via versioned Prisma migration, regenerated client — build and 194 tests green.

## Tasks Completed

| # | Task | Commit | Result |
|---|------|--------|--------|
| 1 | Delete dashboard posts/ + updates/ CRUD routes | cf8939c | 10 files removed |
| 2 | Remove post/update server actions + QuickUpdateDialog | f23cbd7 | dashboard-actions.ts + quick-actions.tsx trimmed |
| 3 | Test surgery for removed DB/actions (D-06) | 51b2fbb | 194/194 tests green |
| 4 (prep) | De-blog dashboard/page.tsx data layer | 975c086 | Pre-migration sweep = 0 consumers |
| 4 (exec) | Schema edit + migrate dev + prisma generate | 7972112 | Migration applied; client regenerated |

## What Was Built

- **10 dashboard route files deleted:** `dashboard/posts/` (page.tsx, new/page.tsx, [id]/page.tsx, post-form.tsx, post-actions.tsx, posts-data-table.tsx, columns.tsx) and `dashboard/updates/` (page.tsx, new/page.tsx, new/update-form.tsx)
- **Server actions removed** from `dashboard-actions.ts`: `createPost`, `updatePost`, `deletePost`, `createUpdate`, `deleteUpdate`, `quickCreateUpdate`
- **QuickUpdateDialog** removed from `quick-actions.tsx` along with its unused imports
- **Migration `20260602212415_remove_blog_familyupdate`:** `DROP TABLE "BlogPost"; DROP TABLE "FamilyUpdate"; DROP TYPE "PostStatus";` applied against Neon production DB
- **Prisma client** regenerated to `./generated/prisma/`
- **dashboard/page.tsx** data layer de-blogged: 3-stat grid (Photos/Albums/Events) + Recent Photos card + QuickEventDialog only

## Verification

```
grep -rnE "prisma\.blogPost|prisma\.familyUpdate" src/   → 0 matches
grep "model BlogPost|model FamilyUpdate|enum PostStatus" prisma/schema.prisma → 0 matches
grep "enum Visibility" prisma/schema.prisma              → 1 match (intact)
npm run build                                            → exit 0 (1036 pages)
npm test -- --run                                        → 194/194 pass
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Album.name → Album.title in dashboard/page.tsx**
- **Found during:** Task 4 — first build after migration
- **Issue:** `album: { select: { name: true } }` and `photo.album?.name` referenced a non-existent field; Album model uses `title` throughout the schema
- **Fix:** Changed select key and alt attribute reference from `name` to `title` in `src/app/(dashboard)/dashboard/page.tsx` lines 25 and 115
- **Files modified:** `src/app/(dashboard)/dashboard/page.tsx`
- **Commit:** 7972112 (bundled with migration commit)

## D-01 Verify-Then-Drop Record

| Table | Row Count | Dump Created |
|-------|-----------|--------------|
| BlogPost | 0 | No (not needed) |
| FamilyUpdate | 0 | No (not needed) |

Both tables were empty; migration proceeded directly without a dump step. No data loss.

## Known Stubs

None — all data layer changes are wired to real schema; no placeholder values introduced.

## Threat Flags

None — migration was destructive but mitigated per T-32-03 (verify-then-drop, human authorization, empty-table confirmed before drop). No new network endpoints or trust boundaries introduced.

## Self-Check: PASSED

- [x] `prisma/migrations/20260602212415_remove_blog_familyupdate/migration.sql` exists
- [x] `prisma/schema.prisma` has no BlogPost/FamilyUpdate/PostStatus; Visibility intact
- [x] Commits cf8939c, f23cbd7, 51b2fbb, 975c086, 7972112 all present in git log
- [x] Build exits 0; 194 tests pass
