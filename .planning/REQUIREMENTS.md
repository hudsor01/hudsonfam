# Requirements: v4.0 — Cloud Re-platform & Recipes Experience

**Defined:** 2026-06-01
**Reference:** CLAUDE.md, `.planning/ui-enhancement-analysis.md`, prior recipes digitization (superpowers track)
**Core Value:** Get thehudsonfam.com back online on managed cloud (homelab is down indefinitely after a flood), strip the now-irrelevant job-search subsystem entirely, and make the 1,000-recipe collection genuinely usable for the family.

## Context

The K3s homelab is offline indefinitely (flood; equipment in storage). All data is **safe but disconnected** — recoverable later, not lost. The site must run entirely on managed providers with no self-hosted dependency.

**Locked stack (all free tier):**

| Concern | Provider | Notes |
|---------|----------|-------|
| Host | Vercel | git-push deploy, replaces Docker→GHCR→Flux→K3s |
| Postgres | Neon | new project created for hudsonfam |
| Images | Cloudflare R2 | 10 GB free, replaces NAS originals + PVC thumbnails |
| Sessions | (dropped) | better-auth on Postgres — Redis removed |
| DNS | Cloudflare → Vercel | replaces Cloudflare Tunnel |
| Auth | better-auth | Google OAuth + email/password, pointed at Neon |

## v4.0 Requirements (active)

Each requirement maps to a roadmap phase and is observationally verifiable after v4.0 ships.

### Phase 29 — Decommission Job Pipeline (JOB-XX)

- [ ] **JOB-01**: All job-search admin UI removed — `src/app/(admin)/admin/jobs/` deleted in full; the "Jobs" entry is gone from admin nav; no `/admin/jobs*` route resolves
- [ ] **JOB-02**: Job API routes removed — `src/app/api/jobs/` deleted (including the PDF cover-letter / tailored-resume routes)
- [ ] **JOB-03**: Job lib modules removed — `jobs-db.ts`, `job-actions.ts`, `job-constants.ts`, `job-freshness.ts`, `jobs-schemas.ts`, `webhooks.ts`, `regenerate-predicates.ts`, `attach-freshness.ts` deleted (each verified to have no non-job consumer before deletion)
- [ ] **JOB-04**: Job env vars purged — `JOBS_DATABASE_URL` and `N8N_WEBHOOK_SECRET` removed from `.env.example`, CLAUDE.md, and all docs
- [ ] **JOB-05**: All job-related tests removed; the remaining Vitest suite runs green (0 failures, no orphaned mocks/imports)
- [ ] **JOB-06**: Schema-drift tooling removed — `scripts/check-jobs-schema.ts`, the `test:schema` npm script, the pre-push hook, and `scripts/install-hooks.sh` (plus their CLAUDE.md mentions) deleted
- [ ] **JOB-07**: Job-only dependencies pruned from `package.json` (e.g. `@hello-pangea/dnd` kanban) where no non-job code imports them; `next build` stays green

### Phase 30 — Cloud Re-platform (CLOUD-XX)

- [ ] **CLOUD-01**: Prisma runs against Neon — `DATABASE_URL` (pooled) + `DIRECT_DATABASE_URL` (direct) point at the new Neon project; `prisma migrate deploy` applies the full schema cleanly; `@prisma/adapter-pg` connects without pool errors
- [ ] **CLOUD-02**: Redis fully removed — `ioredis` dependency gone, `REDIS_URL` env gone, `src/lib/auth.ts` uses better-auth's Postgres-backed session store with no Redis code path or fallback branch remaining
- [ ] **CLOUD-03**: Images served from Cloudflare R2 — uploads (`src/lib/images.ts`) write originals + derivatives to R2; the public read path serves from R2; all NAS/PVC filesystem paths removed; existing photos migrated or the gallery degrades gracefully
- [ ] **CLOUD-04**: Homelab-monitoring admin parked — the Glance-replacement dashboard (Prometheus, health checks, weather, UPS, media stats) is gated so it renders an "offline" state instead of crashing when the homelab is unreachable; `SONARR_API_KEY`/`RADARR_API_KEY`/`JELLYFIN_API_KEY` are optional, not required to boot
- [ ] **CLOUD-05**: Deploy de-homelab'd — `Dockerfile`, `.github/workflows/build-and-push.yml`, `ghcr-retention.yml`, and Flux/K8s references are removed or archived; `bun.lock` matches `package.json` so `bun install --frozen-lockfile` passes
- [ ] **CLOUD-06**: Vercel deploy is live — the project builds and deploys on Vercel with all required env vars set; Next.js output config is reconciled with Vercel (no standalone-only assumptions break)
- [ ] **CLOUD-07**: DNS cut to Vercel — `thehudsonfam.com` resolves to the Vercel deployment over valid HTTPS via Cloudflare DNS; the Cloudflare Tunnel path is retired
- [ ] **CLOUD-08**: App boots clean on the cloud stack — Google OAuth + email/password sign-in works, DB reads/writes work, all 1,000 recipes render, and photos load from R2, verified on the live Vercel URL

### Phase 31 — Recipes Experience (RECIPE-XX)

- [ ] **RECIPE-01**: Recipe search — an instant client-side filter/jump across all recipes by name (cmdk, already installed), reachable from the recipes listing and keyboard-accessible
- [ ] **RECIPE-02**: Ingredient + step checkboxes — tap to cross off ingredients and steps while cooking, with large tap targets for older readers; checked state persists per recipe in localStorage
- [ ] **RECIPE-03**: Print / kitchen view — a clean one-page printout per recipe (title, ingredients, steps only) via print CSS or a dedicated print route
- [ ] **RECIPE-04**: Breadcrumbs + prev/next — each recipe shows `Recipes › <Chapter> › <Recipe>` breadcrumbs and prev/next navigation within its chapter, in book order
- [ ] **RECIPE-05**: Build-your-own-menu — "Add to menu" on recipe cards and detail pages; a floating "My Menu (N)" indicator; a `/my-menu` page grouping picked recipes by course with remove / clear / print; persisted in localStorage, no login required

## Future Requirements

Deferred past v4.0 (not planned for current milestone).

- **FUTURE-01**: Restore homelab Postgres → migrate data into Neon once equipment is back online (data is safe but disconnected; menus/photos/members re-seed)
- **FUTURE-02**: Re-enable live homelab monitoring once the cluster returns (un-park the CLOUD-04 dashboard)
- **FUTURE-03**: Remaining recipe back-matter from the owner's physical book — Menu Making prose, the ~100-menu Menus section (pairs with RECIPE-05), and the Table Service section
- **FUTURE-04**: Recipe full-text search across ingredients/steps (RECIPE-01 covers name-search only)

## Out of Scope

- Re-platforming or restoring the homelab itself (separate concern; awaiting physical recovery)
- Migrating the n8n job-search pipeline anywhere (it is being deleted, not moved)
- Any new family-content features beyond the recipes experience (blog/events/memorial stay as-is)
- Paid provider tiers (the entire stack must stay on free tiers for this milestone)
