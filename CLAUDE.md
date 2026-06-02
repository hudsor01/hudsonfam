# CLAUDE.md — thehudsonfam.com

## What This Is

Family website. Next.js 16 App Router, Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, deployed on Vercel.

**URL:** https://thehudsonfam.com
**Repo:** hudsor01/hudsonfam

## Commands

```bash
npm run dev          # Dev server
npm run build        # Production build
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
- **Better Auth** — Google OAuth + email/password, Postgres-backed sessions (Redis removed in Phase 30)
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
│   └── api/             # API routes
# (admin)/ removed in Phase 30 — homelab monitoring dashboard deleted; re-add under FUTURE-02
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
Push to main (GitHub) → Vercel git integration builds + deploys automatically
```

- **Host:** Vercel — no Docker, no GHCR, no Flux, no K3s.
- **Build:** Vercel detects Next.js; runs `next build` (no standalone output).
- **Env vars:** Set in Vercel project Settings → Environment Variables (Production scope). Values come from `.env.local`. See Environment Variables section for full list.
- **Custom domain:** thehudsonfam.com → Vercel (Cloudflare DNS CNAME/A per Vercel domain instructions; Cloudflare Tunnel retired).
- **Database:** Neon PostgreSQL (pooled `DATABASE_URL` + direct `DIRECT_DATABASE_URL` for migrations).
- **Images:** Cloudflare R2 — proxied through `/api/images/[...path]` (no direct public bucket URL).
- **Sessions:** Postgres-backed via Better Auth (no Redis).

### Manual deploy

```bash
# Trigger a deployment without a push (requires Vercel CLI):
vercel --prod

# Or push to main — Vercel auto-deploys on every push.
```

## Environment Variables

```
DATABASE_URL          # Neon PostgreSQL (pooled, @prisma/adapter-pg)
DIRECT_DATABASE_URL   # Neon PostgreSQL direct (migrations only)
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OWNER_EMAIL           # Email auto-promoted to owner role on signup

# Cloudflare R2 — photo object storage (replaces NAS/PVC)
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT           # https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL         # optional — public bucket URL; omit to proxy through /api/images
```

> **FUTURE-02:** The homelab monitoring admin (Glance replacement) was removed
> entirely in Phase 30 (route group, `/api/dashboard`, and `src/lib/dashboard/*`
> deleted; homelab offline indefinitely). `/admin` 404s. SONARR_API_KEY /
> RADARR_API_KEY / JELLYFIN_API_KEY are no longer referenced — app boots without
> them. The `src/proxy.ts` CSP middleware (scoped to `/admin/*`) is kept as
> dormant security infrastructure for when the admin returns. Re-add under FUTURE-02.

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
