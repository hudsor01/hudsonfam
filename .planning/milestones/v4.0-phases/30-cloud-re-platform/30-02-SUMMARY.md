---
phase: 30-cloud-re-platform
plan: "02"
subsystem: images
tags: [cloudflare-r2, s3, image-pipeline, homelab-removal, cloud-migration]
dependency_graph:
  requires:
    - 30-01  # Neon connection, Redis removal, dep stabilization
  provides:
    - src/lib/images.ts — R2-backed processImage / resolveImageKey / deleteImageFiles; no fs paths
    - src/app/api/images/[...path]/route.ts — R2 GetObject stream with NoSuchKey placeholder fallback
    - package.json — @aws-sdk/client-s3@3.1057.0 aged-pinned direct dep
  affects:
    - Photo upload pipeline (R2 replaces NAS/PVC)
    - Photo read path (R2 GetObject replaces fs.readFile)
    - /admin route (404 — homelab dashboard removed entirely)
    - Dashboard nav (Admin link removed)
tech_stack:
  added:
    - "@aws-sdk/client-s3@3.1057.0 — S3-compatible client for Cloudflare R2"
  patterns:
    - R2 PutObjectCommand for upload (3 objects per photo)
    - R2 GetObjectCommand for proxied reads via /api/images/[...path]
    - NoSuchKey → 307 redirect to /api/images/placeholder/{id} (graceful degradation)
    - DeleteObjectsCommand with Quiet:true for soft-delete
key_files:
  created: []
  modified:
    - src/lib/images.ts
    - src/app/api/images/[...path]/route.ts
    - src/__tests__/lib/images.test.ts
    - package.json
    - bun.lock
    - CLAUDE.md
  deleted:
    - src/app/(admin)/admin/page.tsx
    - src/app/(admin)/admin/admin-client.tsx
    - src/app/api/dashboard/route.ts
    - src/lib/dashboard/{health,prometheus,server,ups,media,weather,types}.ts (7 files)
    - src/components/dashboard/{cluster-metrics,service-monitor,server-stats,ups-status,weather-widget,media-stats,bookmarks}.tsx (7 files)
    - src/__tests__/lib/dashboard/{health,media,prometheus,weather}.test.ts (4 files)
decisions:
  - R2 object keys stored in DB Photo.originalPath/thumbnailPath (not URLs) — URL scheme /api/images/{id}?size=... unchanged
  - NoSuchKey falls back to 307 redirect to placeholder SVG route (not inline 404) — preserves cache headers for future R2 objects
  - resolveImageKey returns medium key for NAS-era original paths (paths starting with /data/) — NAS paths are unusable without the volume
  - DeleteObjectsCommand with Quiet:true swallows per-key NoSuchKey internally (S3 semantics)
  - homelab-monitoring admin parked as FUTURE-02 — not replaced with placeholder, just 404 (CONTEXT decision)
metrics:
  duration: "~40 minutes"
  completed: "2026-06-01"
  tasks_completed: 3
  files_modified: 8
  files_deleted: 20
---

# Phase 30 Plan 02: R2 Image Pipeline + Homelab Admin Removal Summary

**One-liner:** Photo pipeline rewritten from NAS/PVC filesystem to Cloudflare R2 (S3 PutObject/GetObject with NoSuchKey placeholder fallback); homelab-monitoring admin deleted outright with no nav link remaining.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | R2 credentials checkpoint (pre-satisfied) | — | — |
| 2 RED | Failing R2 image tests | d29cb04 | src/__tests__/lib/images.test.ts |
| 2 GREEN | Rewrite images.ts + routes to R2 (CLOUD-03) | a872fe1 | images.ts, [...path]/route.ts, images.test.ts, package.json, bun.lock, .env.example, next.config.ts |
| 3 | Delete homelab-monitoring admin (CLOUD-04) | 1b7fad1 | 25 files deleted/modified |
| 4 | Human-verify checkpoint (deferred to owner) | — | — |

## Must-Have Confirmation

| Must-Have | Status |
|-----------|--------|
| Uploading a photo writes original + thumbnail + medium objects to R2 | DONE — processImage PutObjects 3 keys: originals/{albumId}/{id}.webp, derived/{id}-thumbnail.webp, derived/{id}-medium.webp |
| The public image read path streams bytes from R2 (no filesystem access) | DONE — /api/images/[...path] uses GetObjectCommand; no fs.readFile, no fs.access |
| A missing R2 object degrades gracefully to a placeholder, not an unhandled error | DONE — NoSuchKey/NotFound → NextResponse.redirect 307 to /api/images/placeholder/{photoId} |
| No /admin homelab-monitoring route resolves and no homelab nav link appears | DONE — page.tsx + admin-client.tsx deleted; Admin navLinks.push removed from layout.tsx |
| The app boots with SONARR/RADARR/JELLYFIN env vars unset | DONE — all 3 vars removed from src/; rg returns nothing; no imports remain |

## Verification Results

```
fs/promises in images.ts:     0 (CLEAN)
NAS paths in images.ts:       0 (CLEAN)
fs/promises in route:         0 (CLEAN)
NAS paths in route:           0 (CLEAN)
NoSuchKey handling in route:  PRESENT
Placeholder fallback:         PRESENT
admin page.tsx:               GONE
lib/dashboard/:               GONE
SONARR_API_KEY in src/:       CLEAN
/admin in layout.tsx:         0 (grep -c == 0)
npm test:                     238 passed | 1 skipped (10 test files)
next build:                   Exit 0 (1047 static pages)
npm run lint:                 0 errors, 1 pre-existing TanStack Table warning
```

## Deferred to Owner: Live R2 Upload Verification (Task 4)

The programmatic verification (mocked S3 client tests, build, lint) is fully done. The following live R2 check requires owner action:

**Owner steps:**
1. Ensure `.env.local` contains all 5-6 `R2_*` vars (confirmed pre-satisfied per execution context).
2. `npm run dev`
3. Sign in to the site, navigate to Dashboard → Photos → Upload.
4. Upload a photo.
5. **In the Cloudflare R2 dashboard**, confirm 3 objects appear in the bucket:
   - `originals/<albumId>/<photoId>.webp`
   - `derived/<photoId>-thumbnail.webp`
   - `derived/<photoId>-medium.webp`
6. Confirm the uploaded photo renders in the gallery (R2 read path works).
7. Confirm the **1 restored pre-R2 photo** (the one with an NAS path like `.../originals/unassigned/d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec.jpg`) renders as a placeholder SVG, NOT a broken image or 500.
8. Visit `/admin` — it must 404.
9. Confirm no "Admin" link appears in the sidebar nav for the owner role.

**Expected outcomes:** Step 4-6 confirms CLOUD-03 upload+read. Step 7 confirms NoSuchKey graceful degradation. Steps 8-9 confirm CLOUD-04 removal.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test mock S3Client was not a class constructor**
- **Found during:** Task 2 GREEN phase (first test run)
- **Issue:** `vi.mock('@aws-sdk/client-s3', () => ({ S3Client: vi.fn(() => ({send})) }))` — arrow function mock cannot be `new`-ed as a constructor.
- **Fix:** Rewrote all SDK mocks as ES6 classes (`class S3ClientMock { send = mockSend; }`).
- **Files modified:** src/__tests__/lib/images.test.ts
- **Commit:** a872fe1 (folded into GREEN)

**2. [Rule 2 - Lint] Unused GetObjectCommand import in images.ts**
- **Found during:** Task 3 lint run
- **Issue:** `GetObjectCommand` was imported but the route imports it directly; images.ts had an unused import warning.
- **Fix:** Removed `GetObjectCommand` from the images.ts import (it was never called there — only in the route file which imports from `@aws-sdk/client-s3` directly).
- **Files modified:** src/lib/images.ts
- **Commit:** 1b7fad1 (folded into Task 3 commit)

**3. [Rule 1 - Pre-satisfied] .env.example R2 vars already present at HEAD**
- **Found during:** Task 3 env.example update
- **Issue:** The tee write to `.env.example` produced no diff — the file was already updated (likely from a prior planning session commit at HEAD). No action needed; requirement was already satisfied.
- **Impact:** None — file was correct.

## Known Stubs

None. The R2 pipeline writes real objects and reads real bytes from Cloudflare R2. The placeholder fallback is intentional (not a stub) — it covers the 1 NAS-era photo whose object is not in R2.

## Threat Surface Scan

| Assessment | Details |
|------------|---------|
| T-30-04 (FAMILY-only auth gate) | PRESERVED — isFamilyOnly check in /api/images/[...path] route unchanged |
| T-30-05 (upload content validation) | PRESERVED — ALLOWED_TYPES + MAX_FILE_SIZE in photos/route.ts; sharp re-encodes before PutObject |
| T-30-06 (object key path traversal) | MITIGATED — keys are server-generated from photoId/albumId; no client-supplied path; fs traversal guards removed (no filesystem) |
| T-30-07 (R2 bucket exposure) | MITIGATED — bucket private; reads proxied through /api/images with auth gate; no public bucket URL in client code |
| T-30-12 (missing-object DoS) | MITIGATED — NoSuchKey caught and degrades to static placeholder; no unbounded retry |
| T-30-SC (aws-sdk install) | MITIGATED — @aws-sdk/client-s3@3.1057.0 verified on npmjs.com; aged-pinned (Safe-chain cleared); bun install with no skip flag |

No new threat surface introduced beyond what the plan's threat model anticipated.

## Self-Check: PASSED

- src/lib/images.ts — exists, exports processImage/resolveImageKey/deleteImageFiles/getS3Client, no fs paths
- src/app/api/images/[...path]/route.ts — exists, imports GetObjectCommand, catches NoSuchKey
- src/__tests__/lib/images.test.ts — exists, 13 tests pass
- package.json — contains @aws-sdk/client-s3@3.1057.0
- bun.lock — regenerated
- src/app/(admin)/admin/page.tsx — DELETED (confirmed)
- src/lib/dashboard/ — DELETED (confirmed)
- Commits: d29cb04 (RED), a872fe1 (GREEN/feat), 1b7fad1 (CLOUD-04) — all present in git log
