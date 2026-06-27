# Milestones (Shipped)

## v6.0 v6.0 (Shipped: 2026-06-27)

**Phases completed:** 4 phases, 8 plans, 12 tasks

**Key accomplishments:**

- Album-exclusive `addPhotoToCollection` (one-album home via a single `$transaction`) plus a server-side max-9 cap on the `featured` surface collection — both enforced at the single action entry point.
- `getUncollectedPhotos()` Prisma helper with album-kind `none` filter; upload route refactored to `resolvePublished()` pure function making new uploads default-public (VIS-01)
- `src/app/(public)/photos/page.tsx` — replaced the second arm of the `Promise.all` from an inline `prisma.photo.findMany({ where: { published: true }, select: {...} })` with `getUncollectedPhotos()` imported from `@/lib/photo-queries`. The album-kind collection cards section above it (PHOTOS-01) was untouched. The `allPhotos` binding and `<AlbumPhotoGrid photos={allPhotos} />` render remain identical.
- Featured dashboard manager with live 3×3 homepage preview, drag-reorder, and capped add-from-library via a generalized PhotoLibraryPicker (label + disabled props).
- 1. [Rule 3 - Blocking] Fixed relative import path depth
- Removed publish toggle and checkbox from photo actions/upload form; dashboard Photos grid now shows collection/All-Photos status and links to the Featured manager; 5 Phase-39 regression assertions added.
- Complete (2026-06-27) — v6.0 shipped to production.

---

## v5.0 — Site Consolidation & Navigation Redesign

**Shipped:** 2026-06-03
**Phases:** 32-36 (5 phases, 11 plans)
**Tag:** `v5.0`
**Archive:** [v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md) · [v5.0-REQUIREMENTS.md](milestones/v5.0-REQUIREMENTS.md)

### Delivered

Consolidated thehudsonfam.com down to the surface it actually has content for. Removed the Blog and Family Updates subsystems entirely (public routes, MDX content, `BlogPost`/`FamilyUpdate` Prisma models + DROP-TABLE migration, dashboard CRUD, every cross-cutting reference; 308 redirects for the old URLs). Rebuilt the homepage to lead with Grandma Hudson's recipes and surface live Photos + Events. Root-caused and fixed the broken R2 photo pipeline. Rebuilt the navbar and footer to the surviving IA (Home · Recipes · Photos · Events · In Memory) with active-route indication, a11y, and a mobile drawer. Closed a clean quality gate, shipped to production, and verified live. 24/24 requirements satisfied.

### Key Accomplishments

- **Pruned two whole subsystems** — Blog + Family Updates gone end-to-end (routes, content, Prisma models + DROP-TABLE migration, dashboard CRUD, redirects); a permanent prune-guard regression test now fails if any dead identifier returns to production source.
- **Recipes-first homepage** — Hero with Browse Recipes CTA + cmdk search, 6 featured recipe cards, live Photos/Events with intentional empty states; Sidebar + WeatherWidget retired.
- **Fixed the broken photo pipeline (two root-cause bugs)** — album-less photos hit the intentional auth gate (fixed via D-01: delete orphan, assign the real photo to an album) and `R2_ENDPOINT` carried the bucket name as a path segment causing `/bucket/bucket/key` → NoSuchKey (fixed with runtime normalization in `getR2Client`). Verified live in prod: image proxy returns 200 / image/webp.
- **Navbar & footer rebuilt to real IA** — exactly Home · Recipes · Photos · Events · In Memory with active-route via a new `nav-link.tsx` client leaf (`usePathname` + `aria-current`, shared prefix-collision-safe `isNavActive` helper) and an accessible mobile drawer; footer matches.
- **Clean quality gate** — lint 0 warnings, 233 tests, build 1036 pages exit 0, dead-code grep clean, 8-page console sweep with zero errors; 375px responsiveness human-approved.
- **Shipped + verified live** — merged to main, Vercel deployed, photo pipeline confirmed working on thehudsonfam.com.

**Known deferred items at close:** 6 dormant seeds (homelab/AI backlog), Vercel `R2_ENDPOINT` cleanup (done by owner post-ship), and 2 tech-debt items (WR-04 EXIF timezone; pre-existing `tsc` errors in nav-footer.test.ts). See STATE.md → Deferred Items.

---

Append-only ledger of shipped milestones. Each entry: version, date, scope, accomplishments. Detailed roadmap + requirements snapshots in `.planning/milestones/`.

Newest at top. Earlier milestones (v1.0–v1.4, v2.0, v3.0) closed informally pre-tooling and were retroactively archived during v3.5 close.

---

## v4.0 — Cloud Re-platform & Recipes Experience

**Shipped:** 2026-06-02
**Phases:** 29-31 (3 phases, 8 plans)
**Tag:** `v4.0`
**Archive:** [v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md) · [v4.0-REQUIREMENTS.md](milestones/v4.0-REQUIREMENTS.md) · [v4.0-MILESTONE-AUDIT.md](milestones/v4.0-MILESTONE-AUDIT.md)

### Delivered

Got thehudsonfam.com back online on managed cloud after the K3s homelab went offline indefinitely (flood; equipment in storage, data safe but disconnected). The site now runs entirely on free-tier managed providers — Vercel (host) + Neon (Postgres) + Cloudflare R2 (images) + better-auth on Postgres (Redis dropped) + Cloudflare DNS → Vercel — with zero self-hosted dependency. The now-irrelevant job-search subsystem and the homelab-monitoring admin were deleted outright. Over the finished 1,000-recipe collection, shipped the full recipes UX layer: search, ingredient/step checkboxes, print/kitchen view, breadcrumbs + prev/next, and build-your-own-menu. Milestone audit verdict: **PASSED, 21/21 requirements, zero blocking gaps.**

### Key Accomplishments

1. **Phase 29 — Decommission Job Pipeline:** deleted all job-search admin UI, API routes, lib modules, ~13 tests, schema-drift tooling, env vars, and the `@hello-pangea/dnd` dep; build + Vitest suite green after removal
2. **Phase 30 — Cloud Re-platform:** Prisma→Neon via `@prisma/adapter-pg` (pooled + direct URLs); Redis fully removed (better-auth Postgres sessions); photo pipeline → Cloudflare R2 with `/api/images` proxy + graceful NoSuchKey placeholder; homelab admin deleted (`/admin` 404s); K8s/Flux/Docker artifacts removed; deps aged-pinned + Renovate security-only to satisfy the Aikido Safe Chain age gate; live on Vercel with Cloudflare DNS + valid Let's Encrypt TLS
3. **Phase 31 — Recipes Experience:** cmdk instant search (Cmd/Ctrl+K) + `Recipes › Chapter › Recipe` breadcrumbs + in-chapter prev/next; per-recipe localStorage ingredient/step checkboxes with ≥44px tap targets; clean one-page print view; build-your-own-menu (`/my-menu`) grouped by course with remove/clear/print, no login
4. **Post-100% polish:** global light/dark theme system (next-themes — Ivory & Terracotta light default / navy dark, adaptive nav+footer+toggle); menu print emits full cookable recipes (ingredients + instructions); homepage photo thumbnails fixed to use the `/api/images` proxy
5. **Operational recovery:** restored a minimal seed (1 user / 1 album / 1 photo / 5 events) into Neon from the 2026-04 backup; resolved DNS (Cloudflare 1033 dead tunnel → Vercel records), CAA (amazon-only → letsencrypt.org), better-auth `trustedOrigins`, and owner-role self-heal

### Stats

- **Phases:** 3 (29, 30, 31)
- **Plans:** 8 total (29-01/02, 30-01/02/03, 31-01/02/03)
- **REQs satisfied:** 21/21 (JOB-01..07, CLOUD-01..09, RECIPE-01..05)
- **Timeline:** 2026-06-01 → 2026-06-02 (~2 days)
- **Diff vs pre-milestone:** 177 files changed, +6,060 / −11,974 (net deletion — job pipeline + homelab removed, recipes UX + cloud config added)
- **Build:** ~1,048 pages, 245 tests green
- **PR review:** ended on two consecutive clean comprehensive reviews

### Known Deferred Items

| Item | Status |
|------|--------|
| FUTURE-01 | Restore homelab Postgres → migrate data into Neon when equipment returns |
| FUTURE-02 | Re-enable live homelab monitoring (un-park the CLOUD-04 dashboard) |
| FUTURE-03 | Remaining recipe back-matter (Menu Making, ~100-menu Menus section, Table Service) |
| FUTURE-04 | Recipe full-text search across ingredients/steps (RECIPE-01 is name-only) |
| photo `d9c2e950…` | Restored seed photo renders SVG placeholder — original file never migrated off the offline NAS to R2 (pairs with FUTURE-01) |
| SEED-001/002/003/004 | dormant — homelab-dependent AI/media ideas, blocked until cluster returns |
| SEED-006/007 | obsolete — tied to the deleted n8n/job pipeline |

See `.planning/STATE.md` §"Deferred Items" for full rationale.

---

## v3.5 — CI/CD Hardening

**Shipped:** 2026-04-25
**Phases:** 25-28 (4 phases, 5 plans)
**Tag:** `v3.5-complete` (commit `f02440c`)
**Archive:** [v3.5-ROADMAP.md](milestones/v3.5-ROADMAP.md) · [v3.5-REQUIREMENTS.md](milestones/v3.5-REQUIREMENTS.md) · [v3.5-MILESTONE-AUDIT.md](milestones/v3.5-MILESTONE-AUDIT.md) · [v3.5-MILESTONE-SUMMARY.md](milestones/v3.5-cicd-hardening/v3.5-MILESTONE-SUMMARY.md)

### Delivered

Migrated hudsonfam deploy pipeline from broken self-hosted Forgejo+Woodpecker (6 moving parts, 5 self-hosted) to the CLAUDE.md-intended GitHub Actions + GHCR pipeline (2 moving parts, both vendor-managed). End-to-end smoke proved the new pipeline travels in 11m13s vs 15-min budget. v3.0 prod-UAT debt accumulated since 2026-04-22 cleared via Phase 28 retroactive UAT. SEED-005 thesis fully executed.

### Key Accomplishments

1. **Phase 25:** `.github/workflows/build-and-push.yml` shipped + first GHCR build green; warm-cache 2-6 min vs 10-min budget
2. **Phase 26:** Flux ImageRepository + Deployment cutover to `ghcr.io/hudsor01/hudsonfam`; first templated ExternalSecret in homelab (PATTERNS.md Gap 1 closed); pod live on `:20260424023904`
3. **Phase 27:** 6 destructive ops across 4 systems retired the Forgejo+Woodpecker rollback safety net; pod stayed `ready=true restarts=0` throughout
4. **Phase 28:** Empty smoke commit `e1ec19a` traveled end-to-end in 11m13s; CLAUDE.md §Deployment rewrite (commit `dda3af3`); Plan 21-08 + Phase 22/23/24 retroactive UAT closed v3.0 prod-UAT debt
5. **Forward intel:** `crd-vs-docs-mismatch-pattern.md` + `flux-iua-push-branch-separation.md` capture two recurring patterns with documented permanent fixes

### Stats

- **Phases:** 4 (25, 26, 27, 28)
- **Plans:** 5 total (25-01, 26-01, 26-02, 27-01, 28-01)
- **REQs satisfied:** 13/13 (CICD-01..13)
- **Timeline:** 2026-04-23 → 2026-04-25 (~3 days)
- **Code commits:** ~45 across hudsonfam + homelab repos
- **Production runtime security:** 2 active vulns → 0 (next 16.2.3 + postcss 8.5.10 patched in audit fix-pass commit `41c0191`)

### Known Deferred Items

6 dormant seeds at close — all forward-facing parking-lot ideas with explicit `trigger_when` clauses:

| Seed | Status | Activation |
|------|--------|------------|
| SEED-001 | dormant | AI pipeline health dashboard (v3.1+ candidate) |
| SEED-002 | dormant | Qwen photo captions (v3.1+ candidate) |
| SEED-003 | dormant | Qdrant semantic search (v3.1+ candidate) |
| SEED-004 | dormant | Tdarr+Jellyfin family media (v3.1+ candidate) |
| SEED-005 | **closed 2026-04-25** | (this milestone IS the activation) |
| SEED-006 | dormant | n8n hardening followup — HMAC verify Code-node template ready at `.planning/notes/seed-006-hmac-verify-template.md` |
| SEED-007 | dormant | Cloudflare Rocket Loader synthetic — n8n workflow shipped to homelab `47ebaa3`, owner activates after NTFY_N8N_TOKEN check |

See `.planning/STATE.md` §"Deferred Items" for the full list with rationale.

### Owner-Action Truly Remaining

- Rotate WOODPECKER_PAT + FORGEJO_PAT (T-27-02 defense-in-depth; UI access required — agent-blocked)
- (optional) Activate SEED-006 (5 n8n workflows manually via UI) or open new v3.5.1 phase
- (optional) Activate SEED-007 (n8n workflow + ntfy token + workflow-active toggle)

---

## v3.0 — AI Integration

**Shipped:** 2026-04-23 code-complete (production-verified 2026-04-25 via v3.5-P4 retroactive UAT)
**Phases:** 20-24 (5 phases, ~14 plans)
**Tag:** none (closed pre-tooling; retroactively archived 2026-04-25)
**Archive:** [v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md) · [v3.0-REQUIREMENTS.md](milestones/v3.0-REQUIREMENTS.md)

### Delivered

Closed the rendering gap between the n8n Job Search pipeline's LLM output and the `/admin/jobs` dashboard. 24/24 v3.0 requirements satisfied across 4 categories (AI Artifact Rendering, Owner-Triggered Actions, Safety & Hardening, Data Layer). v3.0 was deploy-blocked at code-complete because the pipeline was broken; v3.5 cleared the block and Phase 28 retroactive UAT verified everything in production (5/5 PASS for Plan 21-08; 100% hudsonfam-side green for Phase 22/23/24; n8n-side gaps inherited from v3.0 ship state, captured to SEED-006).

### Pattern-Setting Decisions

- HMAC-SHA256 webhook signing pattern (`src/lib/webhooks.ts:67-76`)
- 4-bounded sentinel error union (no raw `e.message` across boundary)
- Silent-success polling state (4th variant; for n8n 200-without-advance)
- Streamdown for markdown rendering with provenance badges adjacent to dollar figures

---

## v2.0 — Code Quality Enhancement

**Shipped:** 2026-04-08
**Phases:** 16-19 (4 phases, 4 plans)
**Tag:** none (closed pre-tooling; retroactively archived 2026-04-25)
**Archive:** [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) · [v2.0-REQUIREMENTS.md](milestones/v2.0-REQUIREMENTS.md)

### Delivered

Systematically audited + fixed React/Next.js code smells across the entire codebase. 22/22 requirements satisfied. Eliminated unnecessary useEffects, fixed component-structure anti-patterns (no nested components, immutable state updates, optimal "use client" placement), hardened server/client boundaries (no non-serializable props crossing, server-component data fetching), zero hydration mismatches, full loading.tsx + error.tsx coverage. Production deploy with no console regressions; 268+ tests pass.

---

_Append future milestones above this line, newest at top._
