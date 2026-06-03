---
phase: 34
slug: photo-pipeline-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-02
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from 34-RESEARCH.md §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + happy-dom + Testing Library + MSW |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- src/__tests__/lib/images.test.ts` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~quick: <10s · full: ~30s |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- src/__tests__/lib/images.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite green + browser smoke (homepage Photos render as real images, not alt text)
- **Max feedback latency:** ~10 seconds (quick) / ~30 seconds (full)

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists |
|-------------|----------|-----------|-------------------|-------------|
| PHOTO-01 | Proxy returns `image/webp` + non-zero bytes for a photo with a valid R2 object | integration (script) | `scripts/round-trip-verify` | ❌ W0 |
| PHOTO-01 | `resolveImageKey` returns correct derived key for thumbnail/medium | unit | `npm test -- src/__tests__/lib/images.test.ts` | ✅ existing |
| PHOTO-02 | `d9c2e950` DB row deleted (0 R2 objects → orphan, D-01) | smoke | `scripts/verify-db-state` | ❌ W0 |
| PHOTO-02 | `f77dbd54` has `albumId` set (3 R2 objects → assign, not delete) | smoke | `scripts/verify-db-state` | ❌ W0 |
| PHOTO-03 | `getR2Client()` normalizes `R2_ENDPOINT` that contains the bucket suffix | unit | `npm test -- src/__tests__/lib/images.test.ts` | ❌ W0 (new case) |
| PHOTO-03 | GetObject with corrected endpoint returns 200 + WebP bytes (no `/bucket/bucket/key`) | integration (script) | `scripts/round-trip-verify` | ❌ W0 |
| PHOTO-04 | `/photos` renders "No albums yet" when zero albums | manual-only | browser check | manual-only |
| PHOTO-04 | `/photos/[album]` renders empty-album text state | manual-only | browser check | manual-only |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/round-trip-verify` — `processImage` on a sample `public/images/recipes/_inbox/IMG_27xx.jpeg` → PutObject to R2 → GetObject through the corrected client → assert `image/webp` + non-zero bytes + no 307 → cleanup test object + DB row. Covers PHOTO-01, PHOTO-03.
- [ ] `src/__tests__/lib/images.test.ts` — add case: `getR2Client()` strips bucket suffix from `R2_ENDPOINT` when present. Covers PHOTO-03.
- [ ] `scripts/verify-db-state` — assert `d9c2e950` absent, `f77dbd54` has `albumId=cmn8hinqw0005p1ttk12g9wa8`. Covers PHOTO-02.

*Existing `processImage`, `resolveImageKey`, `deleteImageFiles` tests are green and cover upstream behavior.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Homepage Photos thumbnails render as real images (not broken-image alt text) | PHOTO-01 | Requires live R2 + browser render; the original repro symptom | Load homepage in browser → Photos section shows images, not "me and jr" alt text |
| `/photos` "No albums yet" empty state | PHOTO-04 | Requires empty-DB render path | Browser check (existing code confirmed correct by research) |
| `/photos/[album]` empty-album text state | PHOTO-04 | Requires render path | Browser check (existing code confirmed correct by research) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (round-trip script, db-state script, endpoint-normalization test case)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
