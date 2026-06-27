---
phase: 37-data-model-actions-foundation
plan: 02
subsystem: database
tags: [prisma, photo-queries, published-default, vitest, VIS-01, VIS-02, COLL-01]

requires:
  - phase: 37-01
    provides: collection-actions foundation (addPhotoToCollection, CollectionPhoto model)

provides:
  - "getUncollectedPhotos() — shared All-Photos query used by Phases 38 and 39"
  - "resolvePublished() — pure helper encoding v6.0 default-public upload behavior"
  - "New uploads default to published:true (VIS-01 code layer)"

affects:
  - phase-38  # /photos public page imports getUncollectedPhotos
  - phase-39  # dashboard All Photos view imports getUncollectedPhotos
  - phase-40  # backfill existing rows to published:true (excluded from this plan)

tech-stack:
  added: []
  patterns:
    - "Relational `none` filter on nested relation kind (albums-only exclusion)"
    - "Exported pure helper for route resolution logic (easier unit testing)"

key-files:
  created:
    - src/lib/photo-queries.ts
    - src/__tests__/lib/photo-queries.test.ts
    - src/__tests__/api/photos-published-default.test.ts
  modified:
    - src/app/api/photos/route.ts

key-decisions:
  - "Exported resolvePublished() as a pure function from route.ts to enable unit testing without mocking the full Next.js handler"
  - "resolvePublished: only string 'false' overrides the default-public rule; null/'on'/'true' all yield true"
  - "getUncollectedPhotos carries no 'use server' directive — it is a query helper, callers gate their own pages"
  - "COLLECTION_KIND constant exported from photo-queries.ts for downstream consumers"

patterns-established:
  - "All-Photos = none filter on album-kind CollectionPhoto; surface memberships (memorial/featured) do not exclude"
  - "v6.0 default-public: missing published field → true; explicit 'false' → false; collectionId → always true"

requirements-completed: [VIS-01, VIS-02]

duration: 15min
completed: 2026-06-26
---

# Phase 37 Plan 02: Data Model & Actions Foundation — All-Photos Query + Default-Public Upload

**`getUncollectedPhotos()` Prisma helper with album-kind `none` filter; upload route refactored to `resolvePublished()` pure function making new uploads default-public (VIS-01)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-26T18:50:00Z
- **Completed:** 2026-06-26T18:52:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 created lib, 1 modified route, 2 created tests)

## Accomplishments

- Added `src/lib/photo-queries.ts` exporting `getUncollectedPhotos()` — returns all photos with zero album-kind CollectionPhoto memberships, ordered `createdAt desc`; importable by Phases 38/39 without duplication
- Added `COLLECTION_KIND` constant (`"album"` / `"surface"`) to that module for downstream callers
- Refactored `src/app/api/photos/route.ts` to extract `resolvePublished(publishedRaw, collectionId)` as an exported pure function; route handler now delegates to it, eliminating inline conditional logic
- 12 unit tests across 2 test files; all pass; TypeScript clean; `/api/images` auth gate unmodified; upload-form toggle UI untouched

## Task Commits

No commits in this execution — orchestrator handles commits per plan instructions.

## Files Created/Modified

- `src/lib/photo-queries.ts` — `getUncollectedPhotos()` + `COLLECTION_KIND` constant; no "use server"
- `src/__tests__/lib/photo-queries.test.ts` — 5 tests: where shape, orderBy, pass-through, surface-only photos returned, empty array
- `src/app/api/photos/route.ts` — Added `resolvePublished()` pure exported helper; route handler delegates to it; JSDoc documents VIS-01/VIS-02 canonical rules
- `src/__tests__/api/photos-published-default.test.ts` — 7 tests: null→true, "on"→true, "true"→true, "false"→false, collectionId+null→true, collectionId+"false"→true, collectionId+"true"→true

## Decisions Made

- **Extracted `resolvePublished` as a pure exported function** rather than testing the full POST handler. Avoids needing to mock auth/processImage/next-headers in what is purely a logic test, while keeping the public route behavior identical.
- **`resolvePublished` rule**: only the literal string `"false"` produces `false`; all other values (null, "on", "true", any other string) produce `true`. This preserves backward compat with checkbox form values ("on") while making the default explicit.
- **No "use server" in `photo-queries.ts`**: it is a query helper usable from both public Server Components and dashboard pages; callers are responsible for auth gating.

## Deviations from Plan

None — plan executed exactly as written. The plan explicitly suggested factoring out a "tiny pure helper" for testing; that is what was done.

## Issues Encountered

None.

## Known Stubs

None — no UI rendering; pure data/logic layer.

## Threat Flags

None — no new network endpoints, auth paths, or trust boundaries introduced. `/api/images` gate left intact.

## Self-Check

- `src/lib/photo-queries.ts` exists: FOUND
- `src/__tests__/lib/photo-queries.test.ts` exists: FOUND
- `src/__tests__/api/photos-published-default.test.ts` exists: FOUND
- `resolvePublished` in `src/app/api/photos/route.ts`: FOUND
- `npm test` (12 tests, 2 files): PASSED
- `npx tsc --noEmit`: PASSED (no output)
- `git diff --quiet src/app/api/images/[...path]/route.ts`: GATE UNCHANGED

## Self-Check: PASSED

## Next Phase Readiness

- Phase 38 (`/photos` public page) can `import { getUncollectedPhotos } from "@/lib/photo-queries"` directly
- Phase 39 (dashboard All Photos view) same import; no duplication
- Phase 40 (backfill existing rows) is independent of this plan and requires live-DB access (deferred per plan scope)
- Toggle UI removal is Phase 39 — upload-form.tsx is untouched here

---
*Phase: 37-data-model-actions-foundation*
*Completed: 2026-06-26*
