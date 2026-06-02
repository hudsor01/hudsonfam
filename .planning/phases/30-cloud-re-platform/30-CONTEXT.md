# Phase 30: Cloud Re-platform - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** discuss-phase 30 + live NAS/backup investigation

<domain>
## Phase Boundary

De-homelab thehudsonfam.com onto managed cloud (Vercel + Neon + Cloudflare R2), drop Redis, remove the homelab-monitoring admin and all K8s/Docker/Flux deploy artifacts, fix the dependency/lockfile situation permanently, deploy to Vercel, and cut Cloudflare DNS to Vercel. The K3s homelab is offline indefinitely (flood; data safe but disconnected).

**CLOUD-01 (Neon + Prisma) was already executed during this discussion** — see Decisions.
</domain>

<decisions>
## Implementation Decisions (locked)

### Launch posture
- **Launch now on cloud; do NOT wait for homelab.** Investigation of the NAS backup (`postgres-2026-04-04` pg_dumpall) revealed the production DB was **seed-stage** — the real content is the 1,000 recipes (file-based in git, already current).
- Restored the negligible real data: **1 user (owner), 1 album, 1 photo, 5 events** (Easter, Dallas, Game, Memorial, Summer). Empty tables (BlogPost, FamilyUpdate, Memory, MemorialContent, MemorialMedia, InviteToken) start fresh.

### CLOUD-01 — DONE EARLY (2026-06-01)
- Neon project connected. `DATABASE_URL` = pooled endpoint (`ep-ancient-brook-aq4gccff-pooler…neon.tech`, db `neondb`, `sslmode=require`); `DIRECT_DATABASE_URL` = unpooled (same host minus `-pooler`) — fixed in `.env.local` (was a placeholder `@host:5432`).
- `prisma migrate deploy` applied all 4 migrations → 14 tables live on Neon.
- Seed restored via `pg` (FK-safe, idempotent). Seed file: `.planning/phases/30-cloud-re-platform/restore-seed-2026-04-04.sql` (secret-free — no password hashes).
- **Remaining CLOUD-01 verification:** app runtime connects via `@prisma/adapter-pg` against pooled URL on Vercel.

### Redis (CLOUD-02)
- **Drop entirely.** Remove `ioredis` dep, `REDIS_URL`, the hardcoded `redis.homelab.svc.cluster.local` fallback, and the `secondaryStorage` block in `src/lib/auth.ts`. better-auth uses Postgres-backed sessions (already its fallback behavior). Also remove the Redis tile from `src/lib/dashboard/health.ts` (moot once admin is hidden).

### Images / R2 (CLOUD-03)
- R2 receives **new uploads going forward**; `src/lib/images.ts` + `/api/images` move off NAS filesystem paths (`/data/hudsonfam/originals`, `/data/thumbnails`) to R2.
- **The 1 restored photo** references `…/originals/unassigned/d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec.jpg` on the NAS. Low priority: fetch that single file from the NAS → R2 → regenerate thumbnail (sharp) so it renders; otherwise it's a broken ref for 1 photo. Full photo-library migration is not needed (library is empty).

### Homelab-monitoring admin (CLOUD-04)
- **Hide entirely** — remove the homelab dashboard route (`src/app/(admin)/admin/page.tsx` + `admin-client`) and its nav entry; the `src/lib/dashboard/*` modules (prometheus, health, server, ups, media, weather) can go with it. `SONARR_API_KEY`/`RADARR_API_KEY`/`JELLYFIN_API_KEY` no longer required to boot. Re-add when the cluster returns (FUTURE-02).

### Deploy artifacts (CLOUD-05)
- **Delete outright:** `Dockerfile`, `.dockerignore`, `.github/workflows/build-and-push.yml`, `.github/workflows/ghcr-retention.yml`, any Flux/K8s references. Remove `output: "standalone"` from `next.config.ts` (Vercel doesn't need it).

### Dependency strategy (CLOUD-09)
- **Aged-pin + Renovate security-only.** Pin deps to versions that clear the Aikido Safe Chain 48h minimum-package-age gate so `bun install` resolves with no skip flag. Add Renovate configured for **security-only** updates with `minimumReleaseAge` ≥ 48h (mirrors Safe Chain) and auto-merge after cooldown. Identify + stop whatever auto-bumps `package.json` to same-day-latest (currently uncommitted churn; no renovate/dependabot config in repo). Regenerate `bun.lock` to match.

### Vercel + DNS (CLOUD-06/07/08)
- Deploy to Vercel (git-push). Set env: `DATABASE_URL`, `DIRECT_DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `OWNER_EMAIL`, R2 creds. (`RESEND_API_KEY` already in `.env.local` — better-auth email via Resend.)
- Cloudflare DNS → Vercel; retire the Cloudflare Tunnel.
- Boot verification: Google OAuth + email/password sign-in, recipes render (1000), restored events/album show, new photo upload → R2.
</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` — CLOUD-01..09 acceptance criteria (authoritative)
- `.planning/ROADMAP.md` §v4.0 Phase 30 — plans + REQ mapping
- `.planning/phases/30-cloud-re-platform/restore-seed-2026-04-04.sql` — the restored seed data
- `src/lib/auth.ts` — Redis removal target (secondaryStorage block)
- `src/lib/images.ts`, `src/app/api/images/route.ts` — NAS→R2 migration targets
- `src/app/(admin)/admin/page.tsx` + `src/lib/dashboard/*` — homelab admin to remove
- `prisma.config.ts` — uses `DIRECT_DATABASE_URL`; loads `.env` via dotenv (vars live in `.env.local`, must be exported for CLI)
- Aikido Safe Chain config: `~/.safe-chain/config.json`, key `minimumPackageAgeHours` (default 48), `npm.minimumPackageAgeExclusions`
</canonical_refs>

<deferred>
## Deferred Ideas

- Full photo-library migration NAS→R2 — unnecessary (library is empty; only 1 photo). [FUTURE]
- Re-enable homelab monitoring admin when cluster returns. [FUTURE-02]
- Further DB restore — none needed; backup was seed-stage. [closed]
</deferred>

---

*Phase: 30-cloud-re-platform*
*Context gathered: 2026-06-01 via discuss-phase + NAS/backup investigation*
