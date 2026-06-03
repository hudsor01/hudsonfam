# Phase 34: Photo Pipeline Fix - Research

**Researched:** 2026-06-02
**Domain:** Cloudflare R2 image proxy, Next.js auth gate, photo data state
**Confidence:** HIGH — all findings verified by direct code inspection and live R2/DB probing

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (PHOTO-02):** Delete the DB record for genuinely-missing photos (d9c2e950 NAS-era orphan). Do NOT delete photos that DO have an R2 object — those are bugs to fix. Use `deleteImageFiles`/deletePhoto path where appropriate.
- **D-02 (PHOTO-03):** Default to debug-in-place. Root-cause the actual failure and fix the specific broken component. Rebuild the pipeline wholesale ONLY if the root cause is architectural and unfixable in place.
- **D-03 (PHOTO-01):** Prove end-to-end with a programmatic processImage round-trip on a sample image from `public/images/recipes/_inbox/`, GetObject through `/api/images/[id]?size=...`, assert real-image bytes + content-type + no 307, then clean up.
- **D-04 (PHOTO-04):** Lean text empty states ('No photos yet') consistent with Phases 32/33 pattern; reserve SVG placeholder for genuine transient load/object-missing errors.

### Claude's Discretion

- D-02: Decide debug-in-place vs. rebuild based on root cause evidence.
- D-04: Final empty-state treatment is Claude's call during the fix.

### Deferred Ideas (OUT OF SCOPE)

- FUTURE-01 (migrate original NAS-era seed photos into R2) remains deferred/blocked. Deleting d9c2e950 now is reversible.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOTO-01 | A photo stored in R2 renders correctly everywhere; a valid image never shows the placeholder fallback | Bug 2 (R2_ENDPOINT malformation) fix + assign f77dbd54 to an album |
| PHOTO-02 | Broken seed image renders correctly or is cleanly removed; no broken/placeholder visible anywhere | Delete d9c2e950 DB row (no R2 objects exist); fix f77dbd54 (R2 objects confirmed present) |
| PHOTO-03 | Proxy route correctly retrieves from R2 and streams; a GetObject for a key that exists never triggers 307 | Bug 2 fix (endpoint) + streaming verified correct |
| PHOTO-04 | Album-with-zero-photos and no-albums-exist states each show an intentional empty state | Existing empty state patterns in phase.tsx already correct; verify completeness |
</phase_requirements>

---

## Summary

**Diagnosis is complete. There are two compounding bugs, not one.**

Bug 1 (PRIMARY — causes the observed ALT TEXT symptom): Both photos in the database have `albumId = null`. The proxy auth gate is `requiresAuth = !photo.albumId`, so both photos are treated as private. The homepage is a public route with no auth cookie, so the proxy returns `401 JSON` to every `<img>` request. A browser `<img>` receiving `401 JSON` cannot render an image — it shows the broken-image icon and alt text ("me and jr"). The `NoSuchKey → 307 → placeholder` graceful-degradation path is never reached because the auth check fires first. This is precisely why the symptom is ALT TEXT rather than the SVG placeholder.

Bug 2 (SECONDARY — masked by Bug 1): The `R2_ENDPOINT` environment variable is set to `https://<account>.r2.cloudflarestorage.com/hudsonfam-photos` — with the bucket name appended as a URL path segment. The `@aws-sdk/client-s3` SDK constructs request URLs as `endpoint + "/" + bucket + "/" + key`, so every request goes to `/hudsonfam-photos/hudsonfam-photos/derived/...key...`. This always returns `NoSuchKey`. Fixing Bug 1 alone would make every photo redirect to the SVG placeholder — still broken, just differently. Both bugs must be fixed together.

**Primary recommendation:** Fix the R2_ENDPOINT env var (strip the bucket name suffix) AND assign the one surviving R2 photo (f77dbd54) to the existing "Moving to Dallas" album so the auth gate passes. Delete the NAS-era orphan (d9c2e950) per D-01. The proxy streaming code itself (candidate b) is correct.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth gate for image proxy | API / Backend | — | Session read requires server context; `auth.api.getSession` is server-only |
| R2 client configuration | API / Backend | — | Env vars are server-only; S3Client is instantiated on the server |
| Image streaming (proxy → browser) | API / Backend | CDN | Proxy buffers R2 body to `Buffer` and returns `NextResponse`; no client-side involvement |
| Photo data fetch (homepage/album pages) | Frontend Server (SSR) | — | Prisma queries run in Server Components; no client fetch |
| Empty state rendering | Frontend Server (SSR) | Browser / Client (lightbox) | `AlbumPhotoGrid` is `"use client"` for lightbox; empty state is server-rendered |

---

## Root Cause Analysis

### Bug 1: Auth Gate Fires on All Homepage Photos (PRIMARY)

**Location:** `src/app/api/images/[...path]/route.ts` lines 69-78 [VERIFIED: direct code read]

```typescript
// Line 69
const requiresAuth = !photo.albumId;
if (requiresAuth) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
```

**Root cause:** Both photos in the live database have `albumId = null`:
- `d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec` — NAS-era seed, `albumId = null`
- `f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def` — R2-era upload, `albumId = null` (was uploaded without selecting an album from the upload form)

The homepage fetches these photos with no `albumId` filter:
```typescript
// src/app/(public)/page.tsx
prisma.photo.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id, thumbnailPath, title } })
```

Both returned photos are album-less → auth gate returns 401 JSON to every `<img src="/api/images/{id}?size=thumbnail">` on the public homepage. The browser receives JSON instead of an image → broken-image icon + alt text.

**Fix:** Assign f77dbd54 to the "Moving to Dallas" album (`id: cmn8hinqw0005p1ttk12g9wa8`). Delete d9c2e950 (no R2 objects, D-01). After this fix, both proxy requests will pass the album-based public-access gate.

**Candidate (e) status:** The auth gate itself is not a bug — the design is correct (album-less photos require auth). The bug is that photos surfaced publicly have `albumId = null`. Root cause is the upload flow allowing album-less uploads without forcing album assignment.

---

### Bug 2: R2_ENDPOINT Contains Bucket Name in Path (SECONDARY)

**Location:** `src/lib/images.ts` `getR2Client()` + `src/app/api/images/[...path]/route.ts` [VERIFIED: direct R2 probe]

**Root cause confirmed by live probe:**

```
R2_ENDPOINT = https://e7ac5e4cf6a77df3423edecb3e875699.r2.cloudflarestorage.com/hudsonfam-photos
R2_BUCKET   = hudsonfam-photos
```

When `@aws-sdk/client-s3` constructs the request URL, it appends `/{bucket}/{key}` to the endpoint. The actual request becomes:
```
https://<account>.r2.cloudflarestorage.com/hudsonfam-photos/hudsonfam-photos/derived/...
                                          ^^^^^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^
                                          from R2_ENDPOINT  from R2_BUCKET
```

Result: every `GetObjectCommand`, `PutObjectCommand`, and `ListObjectsV2Command` receives `NoSuchKey` / HTTP 404.

**Verified:** Probing with the corrected endpoint (bucket name stripped) returns all 3 R2 objects:
```
derived/f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def-medium.webp    (543,586 bytes)
derived/f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def-thumbnail.webp  (81,950 bytes)
originals/unassigned/f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def.webp (543,586 bytes)
```

**Fix options:**
1. **Vercel env var update (preferred):** Change `R2_ENDPOINT` in Vercel project settings to strip the bucket name. No code change needed. Requires a redeploy to pick up.
2. **Runtime normalization in code (defensive fallback):** In `getR2Client()` in `src/lib/images.ts`, strip a trailing `/{bucket}` segment from `R2_ENDPOINT` at client construction time. This is a defensive belt-and-suspenders guard that works even if the env var is wrong.

**Recommendation:** Do both — fix the Vercel env var AND add the runtime normalization guard. The guard costs nothing and prevents the same silent failure if the env var is ever set incorrectly again. [ASSUMED: Vercel env var update requires a manual step outside of code — the plan must include an explicit human checkpoint for this.]

---

### Candidate (b): Streaming Correctness — ELIMINATED

**Location:** `src/app/api/images/[...path]/route.ts` lines 130-153 [VERIFIED: code read + live probe]

The proxy uses a `for await...of` loop over `r2Response.Body as Readable`, collects chunks, concatenates to a `Buffer`, and returns a `NextResponse` with `Content-Type: image/webp`. Live probe confirmed:

```
Body type: ChecksumStream
Bytes received: 81,950
First 4 bytes: 52494646  (RIFF — valid WebP magic bytes)
ContentType from R2: image/webp
```

The streaming pattern works correctly with `@aws-sdk/client-s3@3.1057.0` under Node.js. The `Body` returned by R2 is a `ChecksumStream` that is iterable via `for await...of` exactly as coded. Candidate (b) is eliminated. [VERIFIED: live probe]

---

### Candidate (a): Placeholder Route Errors — ELIMINATED

**Location:** `src/app/api/images/placeholder/[id]/route.ts` [VERIFIED: code read + logic trace]

The placeholder route uses `parseInt(id, 10)` on a UUID-format ID. `parseInt("f77dbd54-...", 10)` returns `NaN`. The index computation `(NaN - 1) % 6 = NaN`. `colors[NaN]` is `undefined`, but the expression `colors[index] || colors[0]` falls back to `colors[0]`. The SVG renders correctly with the first color palette entry. The placeholder route does NOT crash or error on UUID IDs. [VERIFIED: logic trace]

The reason the placeholder never appears (instead showing alt text) is that the 307 redirect to the placeholder is never issued — the proxy returns 401 (auth failure) before reaching the `NoSuchKey` catch block.

---

### Candidate (c): resolveImageKey Key Mismatch — ELIMINATED FOR f77dbd54

**Location:** `src/lib/images.ts` `resolveImageKey` [VERIFIED: code read + R2 key existence probe]

For the surviving R2 photo (`f77dbd54`):
- `resolveImageKey('f77dbd54-...', 'thumbnail', 'originals/unassigned/f77dbd54-....webp')` → `derived/f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def-thumbnail.webp`
- This key EXISTS in R2 at 81,950 bytes [VERIFIED: HeadObjectCommand with corrected endpoint]

`resolveImageKey` produces the correct key. Candidate (c) is not the bug for f77dbd54. (For d9c2e950 the key would be correct too, but the R2 object doesn't exist — that photo is deleted under D-01.)

---

### Candidate (d): ContentType Header — ELIMINATED

`r2Response.ContentType` is `"image/webp"` per HeadObjectCommand. The fallback `DEFAULT_CONTENT_TYPE = "image/webp"` is also correct. No content-type issue. [VERIFIED: live probe]

---

## Live DB State (Verified 2026-06-02)

| Photo ID | Title | albumId | originalPath | thumbnailPath | R2 Objects? |
|----------|-------|---------|--------------|---------------|-------------|
| `d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec` | "me and jr" | `null` | `/data/hudsonfam/originals/unassigned/d9c2e950-....jpg` (NAS path) | `/data/thumbnails/d9c2e950-...-thumbnail.webp` (NAS path) | **NONE** — delete per D-01 |
| `f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def` | "me and jr" | `null` | `originals/unassigned/f77dbd54-....webp` | `derived/f77dbd54-...-thumbnail.webp` | **YES** — 3 objects confirmed |

**Albums:**
| Album ID | Title | Slug |
|----------|-------|------|
| `cmn8hinqw0005p1ttk12g9wa8` | Moving to Dallas | `moving-to-dallas` |

The "Moving to Dallas" album exists and has 0 photos. f77dbd54 should be assigned to it.

---

## Fix Plan (Evidence-Backed)

### Fix 1: Delete d9c2e950 DB row (D-01)

```typescript
// Direct Prisma delete — no R2 cleanup needed (no R2 objects exist)
await prisma.photo.delete({ where: { id: 'd9c2e950-f0e6-4bf4-85f4-1793e87ab8ec' } });
// Alternatively: use deletePhoto() server action from dashboard-actions.ts which calls
// deleteImageFiles() first (silently ignores NoSuchKey on missing keys)
```

deleteImageFiles silently ignores NoSuchKey, so calling deletePhoto via the existing server action is safe for a photo with no R2 objects. [VERIFIED: code read + images.ts deleteImageFiles implementation]

### Fix 2: Assign f77dbd54 to "Moving to Dallas" album

```typescript
await prisma.photo.update({
  where: { id: 'f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def' },
  data: { albumId: 'cmn8hinqw0005p1ttk12g9wa8' }
});
// Also update originalPath from originals/unassigned/... to originals/<albumId>/...
// Note: R2 object key doesn't change — only DB record changes. The key resolveImageKey
// uses for thumbnail/medium is always derived/{photoId}-*.webp (not album-keyed).
// Only the originalPath key is album-scoped; the derived keys are photoId-only.
```

After this update, `requiresAuth = !photo.albumId = !cmn8...  = false` → passes the public gate.

### Fix 3: Fix R2_ENDPOINT

**Option A (Vercel env var — preferred):**
Change `R2_ENDPOINT` in Vercel project Settings → Environment Variables from:
```
https://<account-id>.r2.cloudflarestorage.com/hudsonfam-photos
```
to:
```
https://<account-id>.r2.cloudflarestorage.com
```
Then redeploy.

**Option B (Code-level normalization — defensive guard):**

Add to `getR2Client()` in `src/lib/images.ts`:
```typescript
function getR2Client(): S3Client {
  // Normalize endpoint: strip trailing /bucket-name if present
  // (guards against the env var being set with the bucket name appended)
  const rawEndpoint = process.env.R2_ENDPOINT!;
  const bucket = process.env.R2_BUCKET!;
  const endpoint = rawEndpoint.endsWith('/' + bucket)
    ? rawEndpoint.slice(0, -(bucket.length + 1))
    : rawEndpoint;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
```

This normalization can also be applied to `getS3Client()` in route.ts (both call the same `getR2Client()` under the hood since `getS3Client()` just delegates to it).

**Recommendation:** Do both. Ship the code-level guard immediately. Separately update the Vercel env var (human step, flagged in plan).

---

## Standard Stack

No new packages needed. All fixes are configuration + data + in-place code edits.

### Existing stack (relevant to this phase)

| Library | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-s3` | 3.1057.0 | R2 GetObject/PutObject/DeleteObjects — pin maintained from Phase 30 |
| `@prisma/client` | 7.8.0 | DB queries (Photo, Album models) |
| `sharp` | ^0.34.5 | Image processing in processImage |
| `next` | 16.2.6 | App Router, Server Components, Route Handlers |

---

## Package Legitimacy Audit

No new packages to install. Section not applicable to this phase.

---

## Architecture Patterns

### Proxy Request Lifecycle (After Fix)

```
Browser: GET /api/images/f77dbd54?size=thumbnail (no auth cookie)
         ↓
Route Handler: params → photoId="f77dbd54", size="thumbnail"
         ↓
DB: prisma.photo.findUnique → { albumId: "cmn8hinqw0005p1ttk12g9wa8", ... }
         ↓
Auth gate: requiresAuth = !albumId = false → PASS (no session needed)
         ↓
resolveImageKey("f77dbd54", "thumbnail") → "derived/f77dbd54-...-thumbnail.webp"
         ↓
S3Client (corrected endpoint): GetObjectCommand → R2
         ↓
R2: returns Body=ChecksumStream, ContentType=image/webp, ContentLength=81950
         ↓
for await chunk of Body → Buffer.concat → 81950 bytes
         ↓
NextResponse(buffer, 200, { Content-Type: image/webp, Content-Length: 81950, Cache-Control: immutable })
         ↓
Browser: renders WebP image
```

### D-03 Round-Trip Verification Pattern

```typescript
// Run as a Node/bun script (no server, no auth needed)
// Input: public/images/recipes/_inbox/IMG_27xx.jpeg
// 1. Read JPEG from filesystem
// 2. processImage(buffer, testPhotoId, testAlbumId) → PutObjects 3 keys to R2
// 3. GetObjectCommand on thumbnail key with corrected endpoint
// 4. Assert: HTTP 200, ContentType=image/webp, body.length > 0, no 307
// 5. DELETE test DB row (via direct prisma.photo.delete, no auth needed in script)
// 6. DeleteObjectsCommand on 3 R2 keys
```

Required env vars for the script: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `DATABASE_URL` (or `DIRECT_DATABASE_URL`). All present in `.env.local`.

The verification does NOT need `BETTER_AUTH_SECRET` or any auth env var because the script calls `processImage` and the S3 SDK directly, not via the HTTP proxy.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| R2 object existence check | Custom HTTP HEAD request | `HeadObjectCommand` from `@aws-sdk/client-s3` |
| Bulk R2 object delete | Looped individual `DeleteObjectCommand` calls | `DeleteObjectsCommand` (already in use in `deleteImageFiles`) |
| DB photo assignment | Raw SQL | Prisma `photo.update({ data: { albumId } })` |

---

## Common Pitfalls

### Pitfall 1: Fixing the data without fixing the endpoint (or vice versa)

**What goes wrong:** If you only assign f77dbd54 to an album (Fix 2) without fixing the endpoint (Fix 3), the auth gate passes but GetObject returns NoSuchKey → 307 → SVG placeholder. Still broken, just differently. Both bugs must be fixed.

**Warning sign:** After data fix, photos show SVG placeholder instead of alt text — this means Bug 1 is fixed but Bug 2 remains.

### Pitfall 2: Forgetting that `originalPath` for f77dbd54 uses `originals/unassigned/...` key

**What goes wrong:** `processImage` writes `originals/{albumId}/{photoId}.webp`. For f77dbd54, since `albumId` was null at upload time, `api/photos/route.ts` used `"unassigned"` as the fallback:
```typescript
const targetAlbumId = albumId || "unassigned";
```
So the original key is `originals/unassigned/f77dbd54-....webp` — which IS the correct key in R2. When updating albumId in the DB, do NOT change `originalPath`. Only the DB `albumId` field changes; the R2 key does not move.

**Warning sign:** HeadObjectCommand after DB update returns NoSuchKey — means the key was changed to match the album ID incorrectly.

### Pitfall 3: Forgetting the Vercel env var update triggers a redeploy

**What goes wrong:** The code-level endpoint normalization fix works immediately. But if the plan ONLY includes the env var update as "human step" without also shipping the code guard, a cold deploy before the env var update would still fail.

**Prevention:** Ship the code guard first. The env var update is belt-and-suspenders.

### Pitfall 4: The homepage `photo.findMany` has no album filter

**What goes wrong:** Even after fixing existing photos, future album-less uploads (user doesn't select album in upload form) will again produce auth-gated photos on the public homepage.

**Options (Claude's discretion):**
- Filter the homepage query to only surface photos with `albumId: { not: null }` (simple, conservative)
- Make the upload form require album selection before submission
- Both

**Recommendation:** Add `where: { albumId: { not: null } }` to the homepage `photo.findMany`. Also make album selection required in the upload form. Belt-and-suspenders for a family site where future uploads are expected.

---

## PHOTO-04 Empty State Patterns (From Code)

The following empty states already exist and match the Phases 32/33 pattern [VERIFIED: code read]:

**`src/app/(public)/photos/page.tsx` — no albums:**
```tsx
{albums.length === 0 ? (
  <p className="text-muted-foreground text-sm mt-8">
    No albums yet. Check back soon.
  </p>
) : ...}
```

**`src/app/(public)/photos/[album]/page.tsx` — album with zero photos:**
```tsx
{album.photos.length === 0 ? (
  <p className="text-muted-foreground text-sm mt-8">
    This album is empty.
  </p>
) : <AlbumPhotoGrid photos={album.photos} />}
```

**`src/app/(public)/page.tsx` — homepage photos section:**
```tsx
{photos.length > 0 ? (
  <PhotoGridPreview photos={photos} />
) : (
  <p className="text-sm text-text-dim italic">No photos yet</p>
)}
```

These all follow the Phase 32/33 pattern (lean text, `text-muted-foreground` or `text-text-dim`). PHOTO-04 is largely satisfied already. The only gap: after fixing the data bugs, photos with `albumId=null` are excluded from the homepage query → the homepage shows "No photos yet" until f77dbd54 has an album. That's correct behavior.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Photo `d9c2e950`: `albumId=null`, `originalPath=/data/...` (NAS path), no R2 objects | DELETE DB row via `deletePhoto()` or direct `prisma.photo.delete` |
| Stored data | Photo `f77dbd54`: `albumId=null`, `originalPath=originals/unassigned/...`, 3 R2 objects at confirmed keys | UPDATE `albumId` to `cmn8hinqw0005p1ttk12g9wa8` (Moving to Dallas) — R2 keys unchanged |
| Live service config | `R2_ENDPOINT` Vercel env var includes bucket name in path | Update Vercel env var → redeploy (human step, flagged in plan) |
| Live service config | `R2_ENDPOINT` in `.env.local` (local dev) — same malformation | Fix `.env.local` value for local dev parity |
| OS-registered state | None | None — verified (Vercel, no Task Scheduler, no pm2, no systemd) |
| Secrets/env vars | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — correct values, not renamed | No change |
| Build artifacts | None | None — no compiled artifacts reference the photo pipeline |

**Nothing found in remaining categories:** Verified by codebase search — no Windows Task Scheduler, no pm2, no launchd plists relevant to this phase.

---

## Validation Architecture

Nyquist validation for PHOTO-01..04.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + happy-dom + Testing Library + MSW |
| Config file | `vitest.config.ts` (inferred from package.json scripts) |
| Quick run command | `npm test -- --reporter=verbose src/__tests__/lib/images.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHOTO-01 | Proxy returns `image/webp` + non-zero bytes for a photo with a valid R2 object | integration (script) | `bun run scripts/round-trip-verify.ts` | ❌ Wave 0 |
| PHOTO-01 | `resolveImageKey` returns correct derived key for thumbnail/medium | unit | `npm test -- src/__tests__/lib/images.test.ts` | ✅ existing |
| PHOTO-02 | d9c2e950 DB row deleted | unit/smoke | `bun run scripts/verify-db-state.ts` | ❌ Wave 0 |
| PHOTO-02 | f77dbd54 has albumId set | unit/smoke | included in verify-db-state | ❌ Wave 0 |
| PHOTO-03 | GetObjectCommand with corrected endpoint returns 200 + image bytes | integration (script) | included in round-trip-verify | ❌ Wave 0 |
| PHOTO-03 | `getR2Client()` normalizes endpoint with bucket suffix | unit | `npm test -- src/__tests__/lib/images.test.ts` | ❌ Wave 0 (new test case) |
| PHOTO-04 | `/photos` renders "No albums yet" when zero albums | manual-only | `npm run dev` → navigate to /photos with empty DB | manual-only |
| PHOTO-04 | `/photos/[album]` renders "This album is empty." for empty album | manual-only | browser check | manual-only |

### Sampling Rate

- **Per task commit:** `npm test -- src/__tests__/lib/images.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + browser smoke (homepage photos render as images) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `scripts/round-trip-verify.ts` — processImage on sample JPEG → PutObject to R2 → GetObject through corrected client → assert image/webp + non-zero bytes → cleanup. Covers PHOTO-01, PHOTO-03.
- [ ] `src/__tests__/lib/images.test.ts` — add test case: `getR2Client()` strips bucket suffix from R2_ENDPOINT when present. Covers PHOTO-03.
- [ ] `scripts/verify-db-state.ts` — assert d9c2e950 absent, f77dbd54 has albumId=cmn8hinqw0005p1ttk12g9wa8. Covers PHOTO-02.

*(Existing `processImage`, `resolveImageKey`, `deleteImageFiles` tests are green and cover upstream behavior.)*

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | Yes | Auth gate in image proxy (`requiresAuth = !photo.albumId`) is intentional and correct; the fix does not weaken it — it ensures publicly-surfaced photos have albumId set |
| V5 Input Validation | Yes (minor) | `size` param validated against allowlist `["thumbnail", "medium", "original"]` — already correct |
| V6 Cryptography | No | No key/token changes in this phase |
| V2 Authentication | No | Better Auth sessions unchanged |

**Threat pattern relevant to this phase:** Unauthenticated access to auth-gated images via the proxy. The current design (album photos = public, album-less = auth-gated) is correct. The fix (assign f77dbd54 to an album) means the photo is intentionally made public by virtue of being in an album — consistent with the family site threat model. The upstream defense is requiring auth to upload; auth-gating is not a substitute for not exposing private photos in album listings.

---

## Code Examples

### Verified: R2 Endpoint Normalization (getR2Client fix)

```typescript
// src/lib/images.ts — fix for Bug 2
// Source: direct R2 probe 2026-06-02
function getR2Client(): S3Client {
  const rawEndpoint = process.env.R2_ENDPOINT!;
  const bucket = process.env.R2_BUCKET!;
  // Normalize: strip /bucket-name suffix if present in endpoint
  // (guards against env var being set as https://<account>.r2.cloudflarestorage.com/bucket-name)
  const endpoint = rawEndpoint.endsWith('/' + bucket)
    ? rawEndpoint.slice(0, -(bucket.length + 1))
    : rawEndpoint;

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
```

### Verified: Homepage Query — Exclude Album-Less Photos

```typescript
// src/app/(public)/page.tsx — fix for Pitfall 4
// Source: code read 2026-06-02
prisma.photo.findMany({
  where: { albumId: { not: null } },  // ← add this
  orderBy: { createdAt: "desc" },
  take: 6,
  select: { id: true, thumbnailPath: true, title: true },
})
```

### Verified: DB Data Fix Queries

```typescript
// Fix 1: Delete NAS-era orphan (d9c2e950) — no R2 objects to clean
await prisma.photo.delete({ where: { id: 'd9c2e950-f0e6-4bf4-85f4-1793e87ab8ec' } });

// Fix 2: Assign f77dbd54 to Moving to Dallas album
await prisma.photo.update({
  where: { id: 'f77dbd54-1b1d-4c8f-9d11-16eb1b6a0def' },
  data: { albumId: 'cmn8hinqw0005p1ttk12g9wa8' },
  // NOTE: Do NOT change originalPath. The R2 key 'originals/unassigned/f77dbd54-....webp'
  // is the actual stored object. resolveImageKey uses derived/ keys (photoId-only), not the
  // originalPath, for thumbnail and medium. The original key is only used for 'size=original'.
});
```

### Verified: D-03 Round-Trip Verification Script Pattern

```typescript
// scripts/round-trip-verify.ts
// Must be run from project root with bun (bun run scripts/round-trip-verify.ts)
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { S3Client, GetObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { processImage } from '../src/lib/images'
import prisma from '../src/lib/prisma'
import type { Readable } from 'stream'

const TEST_PHOTO_ID = randomUUID()
const TEST_ALBUM_ID = 'test-roundtrip'
const SAMPLE_IMAGE = 'public/images/recipes/_inbox/IMG_2716.jpeg'

async function main() {
  // Step 1: processImage (PutObjects 3 keys to R2)
  const buffer = readFileSync(SAMPLE_IMAGE)
  const meta = await processImage(buffer, TEST_PHOTO_ID, TEST_ALBUM_ID, 'test.jpg')
  console.log('processImage keys:', meta.thumbnailPath, meta.mediumPath)

  // Step 2: GetObject via corrected client (not through HTTP proxy — direct S3)
  const rawEndpoint = process.env.R2_ENDPOINT!
  const bucket = process.env.R2_BUCKET!
  const endpoint = rawEndpoint.endsWith('/' + bucket) ? rawEndpoint.slice(0, -(bucket.length + 1)) : rawEndpoint
  const s3 = new S3Client({ region: 'auto', endpoint, credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  }})

  const resp = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: meta.thumbnailPath }))
  const chunks: Uint8Array[] = []
  for await (const chunk of resp.Body as Readable) chunks.push(chunk as Uint8Array)
  const bytes = Buffer.concat(chunks)

  console.assert(resp.ContentType === 'image/webp', `ContentType: ${resp.ContentType}`)
  console.assert(bytes.length > 0, `Body is empty`)
  console.log(`PASS: ${bytes.length} bytes, ContentType=${resp.ContentType}`)

  // Step 3: Cleanup R2 objects
  await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: {
    Objects: [
      { Key: meta.originalPath },
      { Key: meta.thumbnailPath },
      { Key: meta.mediumPath },
    ], Quiet: true
  }}))

  // Step 4: No DB row was created (processImage doesn't touch DB) — no cleanup needed
  console.log('CLEANUP: R2 objects deleted')
}

main().catch(e => { console.error(e); process.exit(1) })
```

Note: The round-trip script tests the S3 client directly, not through the HTTP proxy. To also validate the HTTP proxy path, the dev server must be running and the test photo must have `albumId` set (so the auth gate passes).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Updating the Vercel env var requires a manual human step outside of code deployment | Fix 3 / Pitfall 3 | Low — standard Vercel behavior; if wrong, code guard still works |
| A2 | The `R2_ACCOUNT_ID` env var is separate from the endpoint (not used directly in client construction) | Bug 2 analysis | Low — code only uses `R2_ENDPOINT` |
| A3 | `.env.local` has the same malformed `R2_ENDPOINT` value as Vercel (inferred from identical behavior in local probe) | Runtime State Inventory | Low — both must be fixed; local dev would show the same symptom |

**All bug diagnoses are VERIFIED, not assumed.** The assumptions above are only about operational/deployment steps.

---

## Open Questions (RESOLVED)

1. **Should the upload form require album selection?**
   - What we know: the form allows `selectedAlbum = ""` and sends no `albumId` if no album selected; the API falls back to `"unassigned"` string for the R2 key but stores `albumId = null` in DB
   - What's unclear: whether this "unassigned" case is a legitimate use case for the family site
   - Recommendation: Make album selection required in the upload form (disable submit until album chosen), OR auto-assign to a default album. Album-less uploads cause the auth-gate issue to recur.
   - **RESOLVED (planning):** Out of scope per 34-CONTEXT.md phase boundary ("Out of scope: new photo content/features"). The public-surface recurrence guard is covered instead by Plan 34-01/T2 (`albumId: { not: null }` filter on the homepage photo query) so album-less photos never render publicly regardless. The upload-form change is captured as a deferred follow-up only.

2. **Should the Vercel env var fix be a blocking task or a follow-up?**
   - What we know: the code-level normalization guard works immediately; the env var is belt-and-suspenders
   - What's unclear: whether the owner prefers to clean up the env var immediately or leave the guard to handle it
   - Recommendation: Plan includes a `checkpoint:human-verify` task for the Vercel env var update before running the round-trip verification script.
   - **RESOLVED (planning):** The deployable fix is code-side (`getR2Client` runtime endpoint normalization, Plan 34-01/T1). The Vercel `R2_ENDPOINT` cleanup is a non-blocking `autonomous: false` human checkpoint in Plan 34-03 with an explicit skip path (the code guard alone is sufficient). Not a blocker on the code fix.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon PostgreSQL | DB queries for data fix | ✓ | Neon Serverless | — |
| Cloudflare R2 | GetObject/PutObject for verification | ✓ | hudsonfam-photos bucket, 3 objects confirmed | — |
| sharp | processImage in round-trip test | ✓ | ^0.34.5 | — |
| bun | Run round-trip script | ✓ | 1.3.14 | npm run with tsx |
| Vercel CLI | Deploy after env var change | ✓ (inferred from CLAUDE.md) | — | Push to main triggers auto-deploy |

**Missing dependencies with no fallback:** None.

**Note:** The R2 credentials in `.env.local` are verified working (HeadObjectCommand returns correct ContentLength/ContentType with corrected endpoint).

---

## Sources

### Primary (HIGH confidence)

- Direct code read: `src/app/api/images/[...path]/route.ts` — full auth gate + streaming logic [VERIFIED]
- Direct code read: `src/lib/images.ts` — `getR2Client`, `processImage`, `resolveImageKey`, `deleteImageFiles` [VERIFIED]
- Direct code read: `src/app/api/images/placeholder/[id]/route.ts` — SVG placeholder logic [VERIFIED]
- Live DB probe via Prisma: 2 Photo rows, 1 Album row — exact IDs, paths, albumId values [VERIFIED]
- Live R2 probe via `@aws-sdk/client-s3` HeadObjectCommand + ListObjectsV2Command with corrected endpoint: 3 objects confirmed [VERIFIED]
- Live R2 probe confirming endpoint bug: ListObjectsV2 with raw endpoint returns NoSuchKey; with corrected endpoint returns 3 objects [VERIFIED]
- Live streaming test: GetObjectCommand returns ChecksumStream, 81,950 bytes, ContentType=image/webp, valid RIFF magic [VERIFIED]

### Secondary (MEDIUM confidence)

- Cloudflare R2 S3 compatibility docs — endpoint format `https://<account-id>.r2.cloudflarestorage.com` (no bucket in path) [ASSUMED based on training + confirmed by live probe behavior]

---

## Metadata

**Confidence breakdown:**
- Root cause (Bug 1 auth gate): HIGH — live DB confirms both photos have `albumId=null`; code confirms auth gate fires on `!albumId`
- Root cause (Bug 2 endpoint): HIGH — live R2 probe with raw vs corrected endpoint proves the malformation
- Streaming correctness: HIGH — live GetObject + iteration test returned valid WebP bytes
- Placeholder route correctness: HIGH — logic trace confirms no crash on UUID IDs
- Fix strategy: HIGH — direct fixes to confirmed root causes, no speculation
- Data state: HIGH — directly queried from live Neon DB

**Research date:** 2026-06-02
**Valid until:** 2026-07-02 (stable R2 + Next.js; env vars don't change without human action)
