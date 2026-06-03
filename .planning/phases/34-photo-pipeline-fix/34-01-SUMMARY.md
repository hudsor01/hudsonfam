---
phase: 34-photo-pipeline-fix
plan: "01"
subsystem: photo-pipeline
tags: [r2, images, bug-fix, endpoint, homepage]
dependency_graph:
  requires: []
  provides: [endpoint-normalization, homepage-photo-filter, wave0-scripts]
  affects: [src/lib/images.ts, src/app/(public)/page.tsx, scripts/]
tech_stack:
  added: []
  patterns: [R2-endpoint-normalization, album-guard-filter]
key_files:
  created:
    - scripts/round-trip-verify.ts
    - scripts/verify-db-state.ts
  modified:
    - src/lib/images.ts
    - src/__tests__/lib/images.test.ts
    - src/app/(public)/page.tsx
decisions:
  - "Bug 2 fixed in code (getR2Client endpoint normalization) — deployable regardless of Vercel env var state"
  - "Album-less photos filtered from public homepage query — recurrence guard, not upload-form change (upload form change deferred per CONTEXT.md)"
  - "verify-db-state expected FAIL until Plan 02 data fix — documented as intentional gate"
metrics:
  duration: "18 minutes"
  completed: "2026-06-02"
  tasks_completed: 3
  tasks_total: 3
  files_changed: 5
---

# Phase 34 Plan 01: R2 Endpoint Fix + Homepage Guard + Wave 0 Scripts Summary

**One-liner:** R2 endpoint bucket-suffix normalization in `getR2Client` (Bug 2 deployable fix), homepage photo query filtered to `albumId: { not: null }` (recurrence guard), and Wave 0 scripts proving upload→R2→GetObject returns 37,160 bytes of image/webp.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Normalize R2 endpoint in getR2Client + unit test | 35d6850 | src/lib/images.ts, src/__tests__/lib/images.test.ts |
| 2 | Filter album-less photos from public homepage query | 4e44471 | src/app/(public)/page.tsx |
| 3 | Create Wave 0 scripts: round-trip-verify + verify-db-state | 623a8c4 | scripts/round-trip-verify.ts, scripts/verify-db-state.ts |

## What Was Built

### Task 1: getR2Client Endpoint Normalization (Bug 2 Fix)

`getR2Client()` in `src/lib/images.ts` now strips a trailing `/<bucket>` segment from `R2_ENDPOINT` before passing the value to the S3Client constructor:

```typescript
const endpoint = rawEndpoint.endsWith("/" + bucket)
  ? rawEndpoint.slice(0, -(bucket.length + 1))
  : rawEndpoint;
```

Without this fix, `R2_ENDPOINT = https://acct.r2.cloudflarestorage.com/hudsonfam-photos` caused the SDK to build `/<bucket>/<bucket>/<key>` request URLs — every GetObject/PutObject returned NoSuchKey. With the fix, the endpoint is normalized to the correct host-only form.

Three unit cases added to `src/__tests__/lib/images.test.ts` under "getR2Client endpoint normalization": bucket-suffix stripped, already-correct endpoint unchanged, mid-path bucket name not stripped. 16/16 tests green.

The auth gate in `src/app/api/images/[...path]/route.ts` is UNCHANGED — zero diff to that file.

### Task 2: Homepage Photo Filter (Recurrence Guard)

Added `where: { albumId: { not: null } }` to the `prisma.photo.findMany` call in `src/app/(public)/page.tsx`. Album-less photos (uploaded without selecting an album) no longer surface on the public homepage. Without this guard, future album-less uploads would again produce auth-gated images on the public route, showing alt text instead of images. Build exits 0; "No photos yet" empty state text unchanged.

### Task 3: Wave 0 Scripts

**`scripts/round-trip-verify.ts`** — Reads `public/images/recipes/_inbox/IMG_2716.jpeg`, calls `processImage(buffer, randomUUID, "test-roundtrip")` to PutObject 3 keys to R2, then GetObjects the thumbnail key via a normalized S3Client. Asserts `ContentType === "image/webp"` and `bytes.length > 0`. Cleans up all 3 keys via DeleteObjectsCommand. Live run result: 37,160 bytes, ContentType=image/webp, CLEANUP: R2 objects deleted. Exit 0.

**`scripts/verify-db-state.ts`** — Asserts `d9c2e950` absent from DB and `f77dbd54` has `albumId = cmn8hinqw0005p1ttk12g9wa8`. Runs without import/TypeScript error. Currently exits 1 (expected — data fix is Plan 02, this script is the runnable gate for Plan 03).

## Verification Results

| Check | Result |
|-------|--------|
| `grep -n "endsWith" src/lib/images.ts` | Line 18 — normalization in getR2Client |
| `npm test -- src/__tests__/lib/images.test.ts` | 16/16 passed |
| `grep -n "albumId: { not: null }" src/app/(public)/page.tsx` | Line 31 — inside findMany where |
| `npm run build` | Exit 0 — 1041+ pages built |
| `bun run scripts/round-trip-verify.ts` | PASS: 37160 bytes, ContentType=image/webp; CLEANUP done |
| `bun run scripts/verify-db-state.ts` | Runs without import error; FAIL (expected pre-Plan 02) |
| `git diff src/app/api/images/` | Empty — auth gate unchanged |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or stub components.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The endpoint normalization only affects the host portion of the R2 URL (strips a trailing `/<bucket>` path segment); it cannot redirect to an attacker host. T-34-02 mitigated as planned.

## Deferred Follow-ups

- Upload form album-selection enforcement (require album before submit) — deferred per CONTEXT.md phase boundary ("new photo features" out of scope). The homepage filter is the in-scope recurrence guard.
- Vercel `R2_ENDPOINT` env var cleanup (remove the `/hudsonfam-photos` suffix) — Plan 34-03 human checkpoint. The code normalization guard makes this non-blocking.

## Self-Check: PASSED

- src/lib/images.ts — FOUND, endsWith normalization on line 18
- src/__tests__/lib/images.test.ts — FOUND, 3 new normalization cases
- src/app/(public)/page.tsx — FOUND, albumId: { not: null } on line 31
- scripts/round-trip-verify.ts — FOUND, 108 lines
- scripts/verify-db-state.ts — FOUND, 63 lines
- Commits: 35d6850, 4e44471, 623a8c4 — all present in git log
- Auth gate src/app/api/images/[...path]/route.ts — unchanged (git diff empty)
