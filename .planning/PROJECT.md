# thehudsonfam.com

## Overview
Custom family website replacing Glance dashboard. Next.js 16 App Router with Tailwind CSS v4, shadcn/ui, Prisma v7, Better Auth, deployed on K3s.

## Tech Stack
- Next.js 16.2.1 (App Router, Server Components)
- Tailwind CSS v4.2 + shadcn/ui (28 components installed)
- TypeScript
- Prisma v7 + PostgreSQL (via PgBouncer)
- Better Auth + Google OAuth
- sharp (image processing)
- MDX (blog content)
- Vitest + MSW (270 tests)

## Architecture
Single Next.js monolith with 4 route groups:
- `(public)` — public site (homepage, blog, photos, events, family, memorial)
- `(auth)` — login, signup, forgot, reset, verify
- `(dashboard)` — content management for family (posts, photos, albums, events, updates, members, memorial admin)
- `(admin)` — homelab monitoring for owner (Glance replacement)

## Deployment
Docker → GHCR → Flux GitOps → K3s cluster
URL: thehudsonfam.com via Cloudflare Tunnel
