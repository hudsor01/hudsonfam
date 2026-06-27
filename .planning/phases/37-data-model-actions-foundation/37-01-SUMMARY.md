---
phase: 37-data-model-actions-foundation
plan: 01
subsystem: api
tags: [prisma, server-actions, collections, photos, tdd, vitest]

# Dependency graph
requires:
  - phase: 36-prior-data-model
    provides: "Collection (kind album|surface) + CollectionPhoto @@unique([collectionId, photoId]) schema"
provides:
  - "Album-exclusive addPhotoToCollection (COLL-01): adding to an album-kind collection atomically removes the photo from every OTHER album-kind collection in a single $transaction"
  - "Surface-exempt exclusivity: adding to memorial/featured never removes a photo from its album"
  - "Server-side max-9 featured guard (FEAT-04): rejecting a 10th add to the featured surface collection before any row is created"
  - "Exported FEATURED_SLUG and FEATURED_MAX constants for Phase 39 reuse"
affects: [38-public-ui, 39-dashboard-ui, 40-live-db-backfill]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single-entry-point enforcement: both exclusivity (COLL-01) and the featured cap (FEAT-04) live inside addPhotoToCollection so every caller inherits them"
    - "Callback-form $transaction mock (prismaMock.$transaction.mockImplementation(fn => fn(prismaMock))) keeps in-transaction assertions on prismaMock valid"

key-files:
  created: []
  modified:
    - src/lib/collection-actions.ts
    - src/__tests__/lib/collection-actions.test.ts

key-decisions:
  - "Exclusivity removal uses a relational where (collection: { is: { kind: 'album' } }) so surface memberships are structurally exempt — no slug allow-list needed"
  - "Featured cap enforced against the count already computed for sortOrder (no extra query); guard keyed on kind 'surface' AND slug 'featured'"
  - "Added a 'Collection not found' guard (Rule 2) so a null findUnique throws a readable error instead of an opaque TypeError on target.kind"

patterns-established:
  - "Album exclusivity: deleteMany {photoId, collectionId: {not}, collection: {is: {kind: 'album'}}} + create, both inside one $transaction"
  - "Surface caps live in named constants (FEATURED_SLUG, FEATURED_MAX) exported from collection-actions.ts"

requirements-completed: [COLL-01, FEAT-04]

# Metrics
duration: 9min
completed: 2026-06-26
---

# Phase 37 Plan 01: Data Model & Actions Foundation Summary

**Album-exclusive `addPhotoToCollection` (one-album home via a single `$transaction`) plus a server-side max-9 cap on the `featured` surface collection — both enforced at the single action entry point.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-06-26T18:50:00Z
- **Completed:** 2026-06-26T18:52:30Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 2

## Accomplishments
- **COLL-01 album exclusivity:** Adding a photo to an album-kind collection now removes its membership in every OTHER album-kind collection inside one `prisma.$transaction`. Surface collections (`memorial`/`featured`) are references — they are never removed by exclusivity, and adding to a surface collection performs no removal at all.
- **FEAT-04 max-9 featured guard:** Adding a 10th photo to the `featured` surface collection now throws a readable "limited to 9 photos" error before any `CollectionPhoto` row is created or any revalidate runs. Album collections remain uncapped; non-featured surfaces (memorial) remain uncapped. Duplicates stay prevented by the existing `@@unique([collectionId, photoId])` index — no new constraint.
- **Reusable contract:** `FEATURED_SLUG` and `FEATURED_MAX` exported so Phase 39's featured manager surfaces the same limit.
- **Single entry point preserved:** No new action names, signature unchanged — every caller (dashboard grid, Phase 39 pickers/featured manager) inherits both rules for free.

## Task Commits

Commits are handled by the orchestrator (this executor was instructed not to commit). Tasks were implemented atomically in TDD order:

1. **Task 1: Album-exclusive addPhotoToCollection (COLL-01)** — test (RED) → feat (GREEN)
2. **Task 2: Max-9 featured guard (FEAT-04)** — test (RED) → feat (GREEN)

_Working-tree changes pending orchestrator commit: `src/lib/collection-actions.ts`, `src/__tests__/lib/collection-actions.test.ts`._

## Files Created/Modified
- `src/lib/collection-actions.ts` — `addPhotoToCollection` now fetches the target collection's `kind`/`slug`, applies the FEAT-04 featured cap, and branches: album targets run a `$transaction` (deleteMany other album memberships + create), surface targets create only. Added exported `FEATURED_SLUG`/`FEATURED_MAX` constants.
- `src/__tests__/lib/collection-actions.test.ts` — Existing `addPhotoToCollection` tests updated to the callback-form `$transaction` mock and a default album-kind `collection.findUnique` (keeping the four original assertions green). Added exclusivity cases (transaction-once, album-only deleteMany `where`, surface-no-removal) and a new FEAT-04 describe block (reject-at-9, allow-at-8, album-uncapped, non-featured-surface-uncapped).

## Decisions Made
- **Relational `where` for exclusivity** (`collection: { is: { kind: "album" } }`) rather than a slug allow-list — surface memberships are structurally exempt, which matches the locked COLL-01 design and needs no per-surface bookkeeping.
- **Reused the existing `sortOrder` count for the featured guard** instead of a second `count` query — the cap compares the same value that becomes the new row's `sortOrder`.
- **Guard ordering:** `requireRole` → fetch target → not-found guard → FEAT-04 cap → branch. The cap throws before any write so no partial state is created.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a "Collection not found" guard**
- **Found during:** Task 1 (reading the target collection)
- **Issue:** `prisma.collection.findUnique` can return `null`; the plan's branch dereferences `target.kind`, which would throw an opaque `TypeError` on a missing/invalid collection id.
- **Fix:** Threw a readable `Error("Collection not found")` immediately after the lookup, mirroring the existing `deleteCollection` pattern in the same file.
- **Files modified:** `src/lib/collection-actions.ts`
- **Verification:** `npx tsc --noEmit` clean for the file; all 41 tests pass; matches an established in-file convention.
- **Committed in:** pending orchestrator (part of Task 1 changes)

---

**Total deviations:** 1 auto-fixed (1 missing-critical defensive guard)
**Impact on plan:** Correctness-only; consistent with the file's existing `deleteCollection` error. No scope creep, no new action, no signature change.

## Issues Encountered
- The critical-note risk (existing tests assert on `prismaMock.collectionPhoto.*` directly, which would break once the album path wraps in `$transaction`) was resolved exactly as flagged: the `addPhotoToCollection` `beforeEach` now installs the callback-form `$transaction` mock (`fn => fn(prismaMock)`), so in-transaction `deleteMany`/`create` calls route back through `prismaMock` and the four original assertions (sortOrder=count, published:true, revalidateSurfaces, requireRole) stay green.

## Out-of-Scope Working-Tree Files (NOT mine)
Pre-existing changes from sibling plan **37-02** were already in the working tree and were left untouched: `src/app/api/photos/route.ts`, `src/lib/photo-queries.ts`, `src/__tests__/api/photos-published-default.test.ts`, `src/__tests__/lib/photo-queries.test.ts`, `.planning/phases/37-data-model-actions-foundation/37-02-SUMMARY.md`. This plan modified only `collection-actions.ts` + its test.

## Verification Results
- `npm test -- src/__tests__/lib/collection-actions.test.ts` → **41 passed (41)**, exit 0.
- `npx tsc --noEmit` → no errors in `collection-actions.ts` (no errors reported overall).
- `prisma/schema.prisma` → byte-for-byte unchanged (no diff).
- No file under `src/app/` was modified by this plan.
- Source assertions: `grep "kind"` shows kind read + branched; `grep "\$transaction"` shows album-exclusive removal+create in one transaction; `grep -E "featured|FEATURED"` shows the slug/limit handled.

## Next Phase Readiness
- **Phase 38 (public UI):** can build the homepage 3×3 grid against the `featured` surface collection knowing the cap is enforced server-side.
- **Phase 39 (dashboard UI):** the featured manager calls `addPhotoToCollection` with the featured collection id and surfaces the thrown 9-photo error; per-collection pickers inherit album exclusivity automatically. `FEATURED_MAX`/`FEATURED_SLUG` are importable.
- **Phase 40 (live-DB, gated):** still owns seeding the `featured` row + the `published` backfill — unchanged by this plan.

## TDD Gate Compliance
Both tasks followed RED → GREEN: failing tests were added and confirmed red (2 exclusivity failures for Task 1, 1 guard failure for Task 2) before each implementation made them green. No refactor commit was needed.

## Self-Check: PASSED
- `src/lib/collection-actions.ts` — FOUND (modified, exclusivity + guard + constants present).
- `src/__tests__/lib/collection-actions.test.ts` — FOUND (modified, exclusivity + FEAT-04 cases present).
- Test suite — 41/41 passing, exit 0.
- `prisma/schema.prisma` — unchanged (no diff), as required.

---
*Phase: 37-data-model-actions-foundation*
*Completed: 2026-06-26*
