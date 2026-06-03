---
phase: 34-photo-pipeline-fix
reviewed: 2026-06-02T19:57:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/lib/images.ts
  - src/app/(public)/page.tsx
  - src/__tests__/lib/images.test.ts
  - scripts/round-trip-verify.ts
  - scripts/verify-db-state.ts
  - scripts/fix-photo-data.ts
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-06-02T19:57:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 34 fixes two photo-pipeline bugs: (1) the `getR2Client` endpoint normalization in `src/lib/images.ts` that strips a trailing `/<bucket>` from `R2_ENDPOINT`, and (2) a live-data fix via `scripts/fix-photo-data.ts`. The homepage query now filters `albumId: { not: null }`, and two live verification scripts were added.

The endpoint-normalization fix is the core deliverable, and it has a real correctness gap: it only handles the exact `/<bucket>` suffix and silently fails on the most common copy-paste variant — `R2_ENDPOINT` ending in `/<bucket>/` (trailing slash). That reintroduces the exact `/bucket/bucket/key → NoSuchKey` failure the fix exists to prevent, and because `round-trip-verify.ts` duplicates the same buggy normalization, the verification harness cannot catch it. The data-mutation script is correctly idempotent. The remaining findings are robustness/quality issues in the scripts and tests.

I verified the endpoint edge cases by executing the normalization logic directly (see WR-01) and confirmed the 16-test suite passes. The intentional auth gate in `src/app/api/images/[...path]/route.ts` (`requiresAuth = !photo.albumId`) was not touched this phase and is not flagged.

## Critical Issues

### CR-01: Endpoint normalization misses trailing-slash and query-string variants — reintroduces the `/bucket/bucket/key` NoSuchKey bug

**File:** `src/lib/images.ts:18-20` (duplicated in `scripts/round-trip-verify.ts:49-51`)
**Issue:** The fix only strips an exact trailing `/<bucket>` via `rawEndpoint.endsWith("/" + bucket)`. The single most common mis-configuration — pasting the bucket URL from the Cloudflare R2 dashboard, which ends in a trailing slash — is NOT matched. I executed the live logic to confirm:

```
"https://acct.r2.cloudflarestorage.com/hudsonfam-photos"   -> "https://acct.r2.cloudflarestorage.com"          (fixed)
"https://acct.r2.cloudflarestorage.com/hudsonfam-photos/"  -> "https://acct.r2.cloudflarestorage.com/hudsonfam-photos/"  (NOT fixed — bug persists)
"https://acct.r2.cloudflarestorage.com/hudsonfam-photos?x" -> unchanged (NOT fixed)
```

When the bucket-with-trailing-slash form is configured, the SDK again builds `/<bucket>/<bucket>/<key>` URLs → `NoSuchKey` on every read → every photo 307-redirects to the placeholder. This is the exact production failure mode the phase set out to eliminate, just one keystroke (a trailing `/`) away. Because the fix is meant as a runtime guard against operator error, it must be robust to trivial variants of that error.

**Fix:** Parse the endpoint as a URL and strip a trailing `/<bucket>` path segment regardless of trailing slash or query string, then rebuild origin-only:

```ts
function normalizeR2Endpoint(rawEndpoint: string, bucket: string): string {
  try {
    const u = new URL(rawEndpoint);
    // Strip a single trailing /<bucket> path segment (with or without trailing slash)
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length && segments[segments.length - 1] === bucket) {
      segments.pop();
    }
    u.pathname = segments.length ? "/" + segments.join("/") : "/";
    u.search = "";
    // R2 virtual-host vs path-style only needs origin; drop trailing slash
    return u.pathname === "/" ? u.origin : u.origin + u.pathname.replace(/\/$/, "");
  } catch {
    return rawEndpoint;
  }
}
```

Add the trailing-slash and query-string cases to the test suite. Apply the same fix to `scripts/round-trip-verify.ts:49-51` (or, better, import and reuse a single exported `normalizeR2Endpoint` so the verify script and the runtime can never diverge — see WR-02).

## Warnings

### WR-01: Verification script duplicates the normalization logic instead of importing it — the harness can never catch a normalization bug

**File:** `scripts/round-trip-verify.ts:46-51`
**Issue:** The round-trip script hand-copies the exact endpoint-normalization expression from `images.ts` ("same logic as getR2Client" per the comment). This defeats the purpose of a round-trip verifier: it shares the bug surface with the code it is supposed to validate. The trailing-slash gap in CR-01 exists identically here, so the verifier would report PASS even when production reads fail. Duplicated security/correctness logic across files is a maintenance hazard — the two copies will drift.

**Fix:** Export `normalizeR2Endpoint` (or `getR2Client`) from `src/lib/images.ts` and import it in the script. The verifier must exercise the same code path the runtime uses.

### WR-02: Round-trip cleanup is skipped on assertion failure — leaks orphaned R2 test objects

**File:** `scripts/round-trip-verify.ts:75-100`
**Issue:** Step 1 PutObjects three real objects to the live R2 bucket. Steps 4's assertions call `process.exit(1)` on failure (`ContentType !== "image/webp"` or `bytes.length === 0`) BEFORE the Step 5 `DeleteObjectsCommand` cleanup. On any failing run, three test objects (`originals/test-roundtrip/<uuid>.webp` + two derived) are left in the production bucket with no cleanup. Repeated failing runs accumulate orphans. The script's own docstring promises "no orphaned objects."

**Fix:** Wrap PutObject-onward in `try/finally`, performing the `DeleteObjects` cleanup in the `finally` block so it runs whether assertions pass or fail:

```ts
try {
  // GetObject + assertions
} finally {
  await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: [
    { Key: meta.originalPath }, { Key: meta.thumbnailPath }, { Key: meta.mediumPath },
  ], Quiet: true } }));
}
```

### WR-03: `deleteImageFiles` swallows NoSuchKey at the wrong layer — DeleteObjects never throws NoSuchKey, so partial-failure errors may be masked

**File:** `src/lib/images.ts:210-230`
**Issue:** `DeleteObjectsCommand` (batch delete) does NOT throw `NoSuchKey` for missing keys — per S3/R2 semantics, missing keys are reported as successful deletes, and per-object failures come back in the response's `Errors[]` array (suppressed entirely here by `Quiet: true`). The try/catch that swallows `NoSuchKey`/`NotFound` therefore guards against an error this command does not raise, while genuine per-object failures (e.g., access-denied on one key) are silently discarded by `Quiet: true` and never inspected. The result: a delete that partially fails reports success. (Not new to this phase, but it is in the reviewed file and undermines the cleanup-correctness claims the phase relies on.)

**Fix:** Drop the NoSuchKey try/catch (it cannot fire for batch delete) or switch to inspecting the response. Set `Quiet: false` and check `result.Errors`; throw or log if any non-NoSuchKey errors are present:

```ts
const result = await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects, Quiet: false } }));
const realErrors = (result.Errors ?? []).filter(e => e.Code !== "NoSuchKey");
if (realErrors.length) throw new Error(`DeleteObjects failed: ${JSON.stringify(realErrors)}`);
```

### WR-04: `extractExifDate` parses EXIF datetime as local time, then stores it as a UTC-naive `Date` — timestamps shift by the server's offset

**File:** `src/lib/images.ts:66-68`
**Issue:** `new Date("YYYY-MM-DDTHH:MM:SS")` (no timezone designator) is parsed in the runtime's local timezone. On Vercel the runtime is UTC, so an EXIF `DateTimeOriginal` of `2024:07:04 18:30:00` (camera local wall-clock) is stored as `18:30 UTC`, then the homepage renders it back in `America/Chicago` (page.tsx line 103/109), shifting the displayed photo/event time. EXIF `DateTimeOriginal` is wall-clock with no zone; treating it as local-then-UTC is lossy and environment-dependent. The known-limitation comment (lines 57-59) covers regex robustness but not this timezone correctness issue.

**Fix:** Be explicit about the intended interpretation. If EXIF wall-clock should be treated as the family's timezone, append a fixed offset or use a tz-aware parse; minimally append `Z` only if you intend UTC. Document the chosen semantics so the homepage render and stored value agree. This is acceptable to defer if EXIF dates are not yet surfaced, but the silent server-offset dependency should be tracked.

## Info

### IN-01: Verification/fix scripts are not wired into `package.json` and rely on a hardcoded sample path

**File:** `scripts/round-trip-verify.ts:36`, `scripts/verify-db-state.ts`, `scripts/fix-photo-data.ts`
**Issue:** None of the three scripts have `package.json` entries (confirmed via grep), so they are discoverable only by reading the file header. `round-trip-verify.ts:36` hardcodes `SAMPLE_IMAGE = "public/images/recipes/_inbox/IMG_2716.jpeg"` and resolves it relative to the process CWD (`readFileSync` line 42), so the script breaks if run from any directory other than the repo root, and breaks entirely if that inbox image is removed (it is an untracked `??` file per git status).
**Fix:** Add `scripts.verify:roundtrip` / `verify:db` entries and resolve the sample path relative to the script (`new URL("../public/...", import.meta.url)`) or accept it as an argv parameter.

### IN-02: `fix-photo-data.ts` re-fetches after update but does not assert `originalPath` was unchanged

**File:** `scripts/fix-photo-data.ts:72-82`
**Issue:** The comment (lines 64-66) and re-fetch (lines 73-76) exist to prove `originalPath` is not mutated, but the code only logs `after?.originalPath` — it never compares it against the pre-update value (`existing.originalPath`) or asserts equality. A silent regression that touched `originalPath` would still print "UPDATED ... originalPath unchanged" because the label is hardcoded, not derived from a comparison. The script is otherwise correctly idempotent (deleteMany count check + albumId equality short-circuit).
**Fix:** Compare and exit non-zero on mismatch:
```ts
if (after?.originalPath !== existing.originalPath) {
  console.error(`ERROR: originalPath mutated! before=${existing.originalPath} after=${after?.originalPath}`);
  await prisma.$disconnect(); process.exit(1);
}
```

### IN-03: Scripts call `prisma.$disconnect()` only on the success path, not on early-exit/error paths

**File:** `scripts/verify-db-state.ts:50-58`, `scripts/fix-photo-data.ts:88-91`
**Issue:** In `verify-db-state.ts`, `$disconnect()` (line 50) runs before the FAIL `process.exit(1)`, which is fine, but the outer `.catch` (lines 60-63) exits without disconnecting. In `fix-photo-data.ts` the `.catch` (lines 88-91) also exits without `$disconnect()`. For short-lived CLI scripts this is harmless (process death closes the pool), but it is inconsistent with the explicit-disconnect intent shown elsewhere in the same files.
**Fix:** Move `$disconnect()` into a `finally` block around `main()` for symmetry, or accept as-is given the process-exits-anyway lifetime (low priority).

---

_Reviewed: 2026-06-02T19:57:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
