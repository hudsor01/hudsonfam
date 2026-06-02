# Phase 34: Photo Pipeline Fix - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Make every photo that has an R2 object render as a real image everywhere it is surfaced (homepage Photos section, `/photos` album grid, `/photos/[album]`); cleanly handle photos whose R2 object genuinely does not exist (no broken images, no stray placeholders on the public site); and verify the upload→R2→display pipeline end-to-end. Covers PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04.

**Out of scope:** new photo content/features, the FUTURE-01 NAS→R2 migration of original seed photos (still blocked), and any nav/footer or homepage layout work (other phases).

</domain>

<decisions>
## Implementation Decisions

### Missing-object policy (PHOTO-02)
- **D-01: Delete the DB record for genuinely-missing photos.** Once the researcher/executor confirms which `Photo` rows reference an R2 object that does not exist (e.g. the NAS-only `d9c2e950…` seed whose original was never migrated), DELETE those rows so no broken image or placeholder shows publicly. The originals remain recoverable later via FUTURE-01 (re-seed when the NAS data returns). Do NOT delete photos that DO have an R2 object — those are bugs to fix, not orphans. Use the existing `deleteImageFiles`/delete path where appropriate (no orphaned R2 objects left behind for photos that do have partial objects).

### Debug vs rebuild depth (PHOTO-03) — Claude's Discretion
- **D-02: Decide based on root cause.** Default to debug-in-place: root-cause the actual failure (proxy streaming, key resolution, ContentType, auth gate, or upload) and fix the specific broken component. Rebuild the pipeline wholesale ONLY if the root cause is architectural and unfixable in place. The R2 + `/api/images` proxy architecture (CLOUD-03) is presumed sound — favor a targeted fix.

### Prove end-to-end (PHOTO-01)
- **D-03: Programmatic round-trip verification.** Prove upload→R2→display by running `processImage` on a sample image (e.g. one from `public/images/recipes/_inbox/`), PutObject to R2, then GetObject it back through the `/api/images/[id]?size=...` proxy and confirm it streams as a real image (correct content-type, non-zero bytes, no 307-to-placeholder). Clean up the test object + any test DB row afterward. No dashboard auth required (agents cannot authenticate); repeatable.

### Empty / placeholder UX (PHOTO-04) — Claude's Discretion
- **D-04: Lean text empty states; placeholder for true errors only.** Empty albums and the no-albums case show a 'No photos yet' text empty state (consistent with the Phases 32/33 pattern). Reserve the SVG placeholder for genuine transient load/object-missing errors. Since orphaned records are deleted (D-01), the placeholder should rarely appear on the public site. Final treatment is Claude's call during the fix.

### Live repro (hand to the researcher)
- **Observed 2026-06-02 via Claude-in-Chrome** on the homepage Photos section: thumbnails rendered as broken-image **ALT TEXT** ("me and jr"), **NOT** the SVG placeholder. So the failure is NOT a clean `NoSuchKey`→307→placeholder path — the image request returned a non-image / errored, OR the placeholder route itself failed. Root-cause candidates to reproduce with the real `Photo` records: (a) the `/api/images/placeholder/[id]` route erroring; (b) `GetObject` stream→`Response` handling under Next.js 16 (Readable conversion); (c) `resolveImageKey` producing a wrong key vs the stored `thumbnailPath`; (d) missing/oversized ContentType; (e) an album-less photo hitting the 401 auth gate when surfaced publicly.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase planning
- `.planning/ROADMAP.md` §"Phase 34: Photo Pipeline Fix" — goal + 4 success criteria
- `.planning/REQUIREMENTS.md` — PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04
- `.planning/PROJECT.md` — Photo Upload Pipeline section; FUTURE-01 (NAS→R2) context

### Project conventions + pipeline
- `CLAUDE.md` §"Photo Upload Pipeline" + §"Images" — the canonical key scheme + proxy contract
- `src/app/api/images/[...path]/route.ts` — the proxy GET (DB lookup → auth gate → `resolveImageKey` → `GetObject` → stream; `NoSuchKey`→307 placeholder)
- `src/app/api/images/placeholder/[id]/route.ts` — the SVG placeholder route
- `src/lib/images.ts` — `processImage` (PutObject 3 keys), `resolveImageKey`, `getS3Client`, `deleteImageFiles`

No external ADRs/specs — requirements + decisions above are the contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Pipeline (the fix surface)
- **Read proxy:** `src/app/api/images/[...path]/route.ts` — `GET` resolves `photoId` from path, DB-looks-up the `Photo`, auth-gates album-less photos (intentional single-trusted-family model — NOT an authz gap), `resolveImageKey` → `GetObjectCommand` → streams; `NoSuchKey`/404 → 307 → `/api/images/placeholder/{photoId}`.
- **Placeholder:** `src/app/api/images/placeholder/[id]/route.ts` — serves an SVG.
- **Lib:** `src/lib/images.ts` — `processImage` PutObjects keys `originals/{albumId}/{photoId}.webp`, `derived/{photoId}-thumbnail.webp`, `derived/{photoId}-medium.webp`; `resolveImageKey`; `deleteImageFiles` (now also called by `deletePhoto` after the Phase 32 CR-01 fix).

### Data
- `Photo` model: `originalPath` / `thumbnailPath` (stored R2 keys), `albumId`. `Album` model.
- DB is sparse (seed: ~1 album, 1–2 photos — likely the broken/orphan ones).

### Where photos surface (verify all after fix)
- Homepage: `src/app/(public)/page.tsx` → `PhotoGridPreview` → `/api/images/{id}?size=thumbnail`
- `src/app/(public)/photos/page.tsx` (album grid cover), `src/app/(public)/photos/[album]/page.tsx`
- `src/components/public/photo-grid-preview.tsx`, `src/components/public/lightbox.tsx`

### Round-trip test asset
- Sample images available at `public/images/recipes/_inbox/IMG_27xx.jpeg` for the D-03 programmatic verification.

</code_context>

<specifics>
## Specific Ideas

- The broken render shows browser ALT TEXT, not the SVG placeholder — debug from that exact symptom (the fallback path is not behaving as designed).
- Delete photo records with no R2 object (D-01); fix photos that DO have an object.
- Prove the pipeline with a programmatic processImage→GetObject round-trip (D-03), not a dashboard upload.

</specifics>

<deferred>
## Deferred Ideas

- FUTURE-01 (migrate original NAS-era seed photos into R2) remains deferred/blocked. Deleting an orphan record now (D-01) is reversible — the photo can be re-added when FUTURE-01 happens.

</deferred>

---

*Phase: 34-photo-pipeline-fix*
*Context gathered: 2026-06-02*
