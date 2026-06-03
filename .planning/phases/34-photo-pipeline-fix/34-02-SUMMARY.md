---
phase: 34-photo-pipeline-fix
plan: "02"
subsystem: data
tags: [data-fix, prisma, photo, d01, idempotent]
dependency_graph:
  requires: [34-01]
  provides: [34-03]
  affects: [src/app/api/images, src/app/(public)/page.tsx]
tech_stack:
  added: []
  patterns: [prisma-deleteMany-idempotent, prisma-update-single-field]
key_files:
  created: [scripts/fix-photo-data.ts]
  modified: []
decisions:
  - "Used prisma.photo.deleteMany (not delete) for idempotent orphan removal — returns count:0 instead of throwing on missing row"
  - "Used pre-update findUnique to distinguish already-correct from missing, giving clear error path"
  - "Changed ONLY albumId on f77dbd54; originalPath left as originals/unassigned/... per Pitfall 2 (R2 key does not move)"
metrics:
  duration: "5m"
  completed: "2026-06-02"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 0
---

# Phase 34 Plan 02: D-01 Data Fix Summary

**One-liner:** Idempotent Prisma script deletes NAS-era orphan d9c2e950 (0 R2 objects) and assigns R2-backed photo f77dbd54 to Moving to Dallas album, unblocking the public auth gate.

## What Was Built

`scripts/fix-photo-data.ts` — a bun-runnable idempotent data-fix script that applies the two D-01 mutations against the live Neon DB:

1. **Delete d9c2e950** (NAS-era orphan, 0 R2 objects): `prisma.photo.deleteMany` returns `{ count: 0 }` on the second run instead of throwing, making the operation safe to re-run.

2. **Assign f77dbd54 to Moving to Dallas album** (`albumId = cmn8hinqw0005p1ttk12g9wa8`): `prisma.photo.update` changes only `albumId`; `originalPath` (`originals/unassigned/f77dbd54-....webp`) is explicitly left untouched per Pitfall 2. A post-update `findUnique` confirms the path is unchanged and prints the result.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Delete d9c2e950 NAS-era orphan (D-01) | 20cddc3 | scripts/fix-photo-data.ts |
| 2 | Assign f77dbd54 to Moving to Dallas album | 20cddc3 | scripts/fix-photo-data.ts |

Both tasks landed in a single commit because they are in the same file and were written together.

## Verification Results

```
# First run (mutations applied):
DELETED: d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec (NAS-era orphan, 0 R2 objects, reversible via FUTURE-01)
UPDATED: f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def albumId=cmn8hinqw0005p1ttk12g9wa8 (originalPath unchanged: originals/unassigned/f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def.webp)
fix-photo-data: DONE

# Second run (idempotency confirmed):
SKIP (already absent): d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec
SKIP (already correct): f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def albumId=cmn8hinqw0005p1ttk12g9wa8
fix-photo-data: DONE

# verify-db-state.ts gate:
PASS: d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec (NAS-era orphan) is deleted
PASS: f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def has albumId=cmn8hinqw0005p1ttk12g9wa8 (Moving to Dallas)
verify-db-state: ALL PASS
```

## DB State After Fix

| Photo ID | Before | After |
|----------|--------|-------|
| d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec | albumId=null, NAS paths | DELETED |
| f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def | albumId=null | albumId=cmn8hinqw0005p1ttk12g9wa8 |

`originalPath` for f77dbd54: `originals/unassigned/f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def.webp` — unchanged (R2 key does not move).

## Deviations from Plan

None — plan executed exactly as written. Single commit covers both tasks per plan structure.

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. Mutations are targeted by exact UUID and audited in script output per T-34-06.

## Self-Check: PASSED

- [x] `scripts/fix-photo-data.ts` exists and is committed at 20cddc3
- [x] d9c2e950 deleted from live Neon (verified via verify-db-state.ts PASS)
- [x] f77dbd54 albumId=cmn8hinqw0005p1ttk12g9wa8, originalPath unchanged (verified via script output + verify-db-state.ts PASS)
- [x] Idempotency confirmed (second run exits 0 with SKIP messages)
- [x] verify-db-state.ts: ALL PASS
