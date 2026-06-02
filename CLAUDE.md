# CLAUDE.md — thehudsonfam.com

## What This Is

Family website replacing Glance dashboard. Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, deployed on K3s via Flux GitOps.

**URL:** https://thehudsonfam.com
**Repo:** hudsor01/hudsonfam (app code) + hudsor01/homelab (K8s manifests)

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build (standalone output)
npm run test         # Vitest
npm run test:watch   # Vitest watch mode
npm run lint         # ESLint 9
npx prisma generate  # Regenerate client after schema changes
npx prisma migrate dev  # Run migrations (uses DIRECT_DATABASE_URL via prisma.config.ts)
```

## Tech Stack

- **Next.js 16.2** — App Router, Server Components, Server Actions
- **React 19** + TypeScript
- **Tailwind CSS v4.2** — `@theme` block in globals.css, OKLCH colors
- **shadcn/ui** — 41 components in `src/components/ui/`
- **Prisma v7** — `@prisma/adapter-pg` with `pg` Pool, generated to `./generated/prisma/`
- **Better Auth** — Google OAuth + email/password, Redis session cache
- **TanStack Form** — `@tanstack/react-form` + zod for all forms
- **TanStack Table** — `@tanstack/react-table` for data tables
- **sharp** — Image processing (WebP, thumbnails)
- **MDX** — Blog content via `next-mdx-remote`

## Project Structure

```
src/
├── app/
│   ├── (public)/        # Homepage, blog, photos, events, family, memorial
│   ├── (auth)/          # Login, signup, forgot, reset, verify
│   ├── (dashboard)/     # Family content management (all authenticated users)
│   │   └── dashboard/
│   │       ├── posts/photos/events/updates/  # CRUD pages
│   │       ├── members/memorial/             # Owner-only
│   │       └── services/                     # Family services portal
│   ├── (admin)/         # Owner-only admin panel (FUTURE-02: homelab monitoring parked)
│   └── api/             # API routes
├── components/
│   ├── ui/              # 41 shadcn primitives
│   ├── dashboard/       # Shared dashboard primitives (collapsible-card, metric-card, app-sidebar, etc.)
│   └── public/          # 13 public site components
├── lib/
│   ├── prisma.ts        # Prisma singleton with pool config
│   ├── auth.ts          # Better Auth + Google OAuth + email/password
│   ├── session.ts       # requireRole() / requireSession()
│   ├── images.ts        # Photo processing (2400px WebP q85) — writes to Cloudflare R2
│   └── dashboard-actions.ts  # Dashboard CRUD server actions
├── styles/
│   └── globals.css      # Single source of truth for ALL colors
└── __tests__/           # Vitest + Testing Library + MSW
```

## Architecture Rules

### Path alias
`@/*` → `./src/*`

### Route groups
- `(public)` — no auth required
- `(auth)` — login/signup flows
- `(dashboard)` — `requireRole(["owner", "admin", "member"])`
- `(admin)` — `requireRole(["owner"])`

### Server vs Client Components
- Page files (`page.tsx`) are Server Components by default
- Client components MUST have `"use client"` as first line
- Never pass `onClick` or event handlers from Server → Client component props
- Server Actions use `"use server"` directive

### Database
- **Main app:** Prisma v7 via `@prisma/adapter-pg` with connection pooling (max 10, 5s timeout)
- **Prisma output:** `./generated/prisma/` (not node_modules)
- **Migrations:** CLI uses `DIRECT_DATABASE_URL` (bypasses PgBouncer)

### Auth
- Better Auth with Google OAuth + email/password
- Postgres-backed sessions (Redis removed in Phase 30)
- `callbackURL: "/dashboard"` on all OAuth sign-in calls
- Roles: `owner`, `admin`, `member`

## Color System — globals.css Is The Single Source

**Every color in the codebase comes from `src/styles/globals.css` `@theme` block.** Zero hardcoded Tailwind color names in `.tsx` files.

### Core tokens (shadcn standard)
`primary`, `accent`, `destructive`, `muted-foreground`, `foreground`, `background`, `card`, `border`, `input`, `ring`

### Custom tokens
- `text-dim` — very dim text for timestamps/metadata
- `success` — service up, approve actions, saved states, healthy progress bars
- `warning` — service unknown, caution states, moderate progress bars

### Shared palette (referenced via `var()`)
`green`, `purple`, `emerald`, `blue`, `orange`, `teal`, `yellow`

### When adding colors
1. Add OKLCH value to shared palette in globals.css (or reuse existing)
2. Create semantic alias with `var(--color-<palette>)`
3. Use the semantic token in components: `text-success`, `bg-warning/10`, etc.
4. **Never** use raw Tailwind colors like `text-green-400`

## Component Patterns

### Forms
All forms use `@tanstack/react-form` + zod schemas from `src/lib/schemas.ts`. Never use `react-hook-form`.

### Data Tables
Use `@tanstack/react-table` with `src/components/dashboard/data-table.tsx`. Column definitions in colocated `columns.tsx` files.

### Error/Success Alerts
Use theme tokens: `bg-destructive/10 border border-destructive/25 text-destructive` (error) or `bg-success/10 border border-success/25 text-success` (success).

### shadcn Components
41 installed. **Never remove unused shadcn components** — integrate them instead. Import from `@/components/ui/<name>`.

## Deployment

```
Push to main (GitHub) → GitHub Actions builds Docker image → GHCR
  → Flux ImageRepository scans GHCR every 6h
  → Flux ImagePolicy promotes newest YYYYMMDDHHmmss tag
  → Flux ImageUpdateAutomation rewrites tag in homelab manifests repo (Forgejo)
  → Flux Kustomization reconciles → K3s rolls hudsonfam Deployment
```

- **Pipeline definition:** `.github/workflows/build-and-push.yml` — single-job workflow (`docker/build-push-action@v5` with `type=gha,mode=max` cache); triggers on `push.branches: [main]` + `workflow_dispatch`; builds in 2-6 min on warm cache.
- **Image registry:** `ghcr.io/hudsor01/hudsonfam` (public package); built-in `GITHUB_TOKEN` for push (no PAT needed for same-repo push).
- **Image tags:** `YYYYMMDDHHmmss` UTC timestamp + `latest` per build (Flux ImagePolicy filters on regex `^\d{14}$` and picks the highest numerical value).
- **Cluster pull credentials:** `ghcr-pull-credentials` Secret (`kubernetes.io/dockerconfigjson` type) materialized in BOTH `homepage` (kubelet pull) and `flux-system` (ImageRepository scan auth) namespaces via two ExternalSecrets sharing a single vault key. Vault key holds `username: hudsor01` + `pat: <classic PAT, scope read:packages, 1-year expiry>`. ExternalSecrets `spec.target.template` reconstructs dockerconfigjson from those two raw fields at sync time. PAT rotation = single vault-write event; both Secrets resync within `refreshInterval: 1h`.
- **Manifest source:** homelab manifests repo (`dev-projects/homelab` on Forgejo SSH at `192.168.4.236:30022`); Flux source-controller polls every 1 min. ImageUpdateAutomation commits tag bumps as user `Flux Image Automation` to `main` directly. Hudsonfam-specific manifests live at `apps/hudsonfam/` (Deployment + Service + HTTPRoute + 2 PVCs + ExternalSecret + GHCR pull-secret ExternalSecret).
- **Namespace:** `homepage`. **Volumes:** local-path PVC for Next.js cache (photos now in Cloudflare R2). **Secrets:** ExternalSecrets from `secrets` namespace via `kubernetes-secrets` ClusterSecretStore (raw K8s Secrets, not external vault).
- **Public URL:** <https://thehudsonfam.com> via Cloudflare Tunnel.

### Manual deploy + reconcile

```bash
# Force a fresh GHCR scan (e.g., after a manual workflow_dispatch)
flux reconcile source git flux-system
flux reconcile image repository hudsonfam -n flux-system

# Force ImageUpdateAutomation to re-evaluate setters
flux reconcile image update homelab-images -n flux-system

# Force kustomization apply (picks up image update commit)
flux reconcile kustomization hudsonfam

# If quota blocks rolling update (rare):
kubectl scale deployment hudsonfam -n homepage --replicas=0
kubectl scale deployment hudsonfam -n homepage --replicas=1
```

### Top failure modes + mitigations (from Phase 25/26/27 lessons)

1. **Stale `bun.lock` rejected by `bun install --frozen-lockfile`** — Dockerfile uses bun + frozen-lockfile; if recent `npm install --legacy-peer-deps` updates `package.json` without regenerating `bun.lock`, the build fails at the deps stage in ~45s. **Fix:** run `bun install` locally to regen the lockfile; commit + push. Symptom: GitHub Actions step "Build and push" fails with `process "/bin/sh -c bun install --frozen-lockfile" did not complete successfully: exit code: 1`. Established as a recurring failure mode after Phase 25 first-build gotcha.

2. **GHCR PAT expiry** — classic PAT expires 1 year from generation (~2027-04-24 for current PAT). Set calendar reminder 2 weeks pre-expiry. **Fix:** generate new classic PAT under owner account, scope `read:packages`, then `kubectl create secret generic ghcr-pull-credentials -n secrets --from-literal=username='hudsor01' --from-literal=pat='<NEW>' --dry-run=client -o yaml | kubectl apply -f -`. Both ExternalSecrets resync within `refreshInterval: 1h` (or force via `kubectl annotate externalsecret ghcr-pull-credentials -n <ns> force-sync=$(date +%s) --overwrite`).

3. **Cluster ESO/Flux CRD vs docs version mismatch** — Some fields documented in upstream library docs may not exist in the installed CRD schema. Examples seen: ESO 2.1.0 rejected `spec.target.type` (canonical type stays in `spec.target.template.type`); Flux ImagePolicy CRD uses `status.latestRef.{name,tag}` not docs-stated `status.latestImage`. **Fix:** validate any new manifest's field paths against `kubectl explain <resource>.<path>` before assuming docs are current. See `.planning/intel/crd-vs-docs-mismatch-pattern.md`.

## Environment Variables

```
DATABASE_URL          # Neon PostgreSQL (pooled, @prisma/adapter-pg)
DIRECT_DATABASE_URL   # Neon PostgreSQL direct (migrations only)
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OWNER_EMAIL           # Email auto-promoted to owner role on signup
N8N_WEBHOOK_SECRET    # HMAC-SHA256 shared secret for n8n webhook POSTs

# Cloudflare R2 — photo object storage (replaces NAS/PVC)
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT           # https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL         # optional — public bucket URL; omit to proxy through /api/images
```

> **FUTURE-02:** Homelab monitoring admin (Glance replacement) is parked. The
> `/admin` route 404s. SONARR_API_KEY / RADARR_API_KEY / JELLYFIN_API_KEY are
> no longer referenced — app boots without them.

## Photo Upload Pipeline

```
Upload → sharp resize (2400px max, WebP q85) → PutObject to R2: originals/{albumId}/{id}.webp
       → generate thumbnail (400px, WebP q80) → PutObject to R2: derived/{id}-thumbnail.webp
       → generate medium (1200px, WebP q85)  → PutObject to R2: derived/{id}-medium.webp
       → store R2 object keys in Photo.originalPath / thumbnailPath
       → /api/images/[id]?size=... → GetObject from R2 → stream to browser
       → NoSuchKey → 307 redirect to /api/images/placeholder/{id} (SVG fallback)
```

Originals are always `.webp` regardless of upload format. Photo reads are proxied
through `/api/images/[...path]/route.ts` (never a direct public bucket URL).

## Testing

- **Framework:** Vitest + happy-dom + Testing Library + MSW
- **Mocks:** Prisma mocked via `src/__tests__/mocks/prisma.ts`
- **Run:** `npm test`

## GSD Planning

Planning files in `.planning/`:
- `STATE.md` — current position, decisions, what's done
- `ROADMAP.md` — milestone/phase structure
- `PROJECT.md` — tech stack overview
- `phases/` — per-phase PLAN.md and SUMMARY.md files

Current: v1.3 complete, v2.0 (AI Integration) is next.
