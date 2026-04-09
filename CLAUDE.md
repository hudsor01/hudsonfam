# CLAUDE.md — thehudsonfam.com

## What This Is

Family website replacing Glance dashboard. Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, deployed on K3s via Flux GitOps.

**URL:** https://thehudsonfam.com
**Repo:** hudsor01/hudsonfam (app code) + hudsor01/homelab (K8s manifests)

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build (standalone output)
npm run test         # Vitest (268 tests)
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
│   ├── (admin)/         # Owner-only admin panel
│   │   └── admin/
│   │       ├── page.tsx           # Homelab dashboard (Glance replacement)
│   │       └── jobs/              # Job search pipeline dashboard
│   └── api/             # 11 API routes
├── components/
│   ├── ui/              # 41 shadcn primitives
│   ├── dashboard/       # 14 dashboard widgets
│   └── public/          # 13 public site components
├── lib/
│   ├── prisma.ts        # Prisma singleton with pool config
│   ├── auth.ts          # Better Auth + Redis with graceful fallback
│   ├── session.ts       # requireRole() / requireSession()
│   ├── images.ts        # Photo processing (2400px WebP q85 cap)
│   ├── jobs-db.ts       # Separate pg Pool for external jobs database
│   ├── job-actions.ts   # Job server actions + N8N webhooks
│   ├── dashboard-actions.ts  # Dashboard CRUD server actions
│   └── dashboard/       # Prometheus, health checks, weather, UPS, media stats
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
- **Jobs:** Separate `pg.Pool` using `JOBS_DATABASE_URL` — not in Prisma schema
- **Prisma output:** `./generated/prisma/` (not node_modules)
- **Migrations:** CLI uses `DIRECT_DATABASE_URL` (bypasses PgBouncer)

### Auth
- Better Auth with Google OAuth + email/password
- Redis session cache with graceful fallback (if Redis down, falls back to DB)
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

### Job pipeline aliases (all reference shared palette)
- Status: `status-applied`, `status-interview`, `status-offer` (new=primary, interested=accent, rejected=destructive)
- Sources: `source-jobicy`, `source-remoteok`, `source-himalayas`, `source-arbeitnow`, `source-workingnomads`, `source-serpapi`, `source-remotive`
- Scores: `score-high`, `score-mid`

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
Push to main → GitHub Actions builds Docker image → GHCR
  → Flux image automation (timestamp tags: YYYYMMDDHHmmss)
  → Flux kustomization updates K3s deployment
```

- **Image tags:** `YYYYMMDDHHmmss` format (not commit SHAs)
- **Namespace:** `homepage`
- **Volumes:** NFS mount for photo originals (writable), PVC for thumbnails/cache
- **Secrets:** ExternalSecrets from `secrets` namespace via ClusterSecretStore

### Manual deploy
```bash
flux reconcile image repository hudsonfam -n flux-system
flux reconcile image update homelab-images -n flux-system
flux reconcile source git flux-system
flux reconcile kustomization hudsonfam
# If quota blocks rolling update:
kubectl scale deployment hudsonfam -n homepage --replicas=0
kubectl scale deployment hudsonfam -n homepage --replicas=1
```

## Environment Variables

```
DATABASE_URL          # Direct PostgreSQL (CloudNativePG postgres-rw)
DIRECT_DATABASE_URL   # Direct PostgreSQL (migrations only)
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
REDIS_URL             # redis://:password@host:6379
SONARR_API_KEY
RADARR_API_KEY
JELLYFIN_API_KEY
JOBS_DATABASE_URL     # Separate jobs database
OWNER_EMAIL           # Email auto-promoted to owner role on signup
```

## Photo Upload Pipeline

```
Upload → sharp resize (2400px max, WebP q85) → save to NAS
       → generate thumbnail (400px, WebP q80) → save to PVC
       → generate medium (1200px, WebP q85) → save to PVC
       → store metadata in Photo model
```

Originals are always `.webp` regardless of upload format.

## Testing

- **Framework:** Vitest + happy-dom + Testing Library + MSW
- **Mocks:** Prisma mocked via `src/__tests__/mocks/prisma.ts`
- **Run:** `npm test` (268 tests, <1s)

## GSD Planning

Planning files in `.planning/`:
- `STATE.md` — current position, decisions, what's done
- `ROADMAP.md` — milestone/phase structure
- `PROJECT.md` — tech stack overview
- `phases/` — per-phase PLAN.md and SUMMARY.md files

Current: v1.3 complete, v2.0 (AI Integration) is next.
