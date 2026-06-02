# Phase 32: Prune & Dashboard Cleanup — Research

**Researched:** 2026-06-02
**Domain:** Removal + refactor — Next.js App Router, Prisma v7 migration, dashboard consolidation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 Verify-then-drop.** Check `BlogPost` and `FamilyUpdate` row counts first. If both empty → drop both tables in a single Prisma migration. If either non-empty → dump to `.planning/` before dropping. Never leave orphan tables in Neon. Migrations run via `DIRECT_DATABASE_URL` (`npx prisma migrate dev`, per `prisma.config.ts`).
- **D-02 Redirect, not 404.** `/blog`, `/blog/[slug]`, `/family` → 308 permanent redirect to `/`. Implement in `next.config.ts` `redirects()` with wildcard `/blog/:slug*`. Supersedes "return 404" wording in PRUNE-01/02.
- **D-03 Prune + consolidate.** Remove `/dashboard/posts*` and `/dashboard/updates*` pages, nav entries, dead server actions/tests. AND restructure surviving dashboard areas (Photos, Events, Members, Memorial) using shared `src/components/dashboard/` primitives; rework overview to reflect only surviving content.
- **D-04 Delete all blog content.** Remove `content/blog/` entirely (3 MDX posts). No salvage.
- **D-05 Neutralize homepage blog dependency in Phase 32.** Strip blog sections from `src/app/(public)/page.tsx` so build stays green. Recipes restructure (HOME-01/02) is Phase 33.
- **D-06 Keep `npm test` green continuously.** Delete/update tests referencing blog/familyUpdate in this phase.

### Claude's Discretion

Migration file naming, redirect status-code mechanics, and exactly how far to consolidate the surviving dashboard layouts (within "coherent + uses shared primitives") are Claude's call during planning.

### Deferred Ideas (OUT OF SCOPE)

None — Phase 33 = recipes-first homepage; Phase 34 = photo render fix; Phase 35 = nav/footer IA; Phase 36 = full lint/test gate.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRUNE-01 | Blog removed end-to-end — routes, MDX, lib, RSS, components, no public links | Removal surface map §Files to Delete + §Files to Edit |
| PRUNE-02 | Family Updates removed end-to-end — routes, components, no nav/footer links | Removal surface map §Files to Delete + §Files to Edit |
| PRUNE-03 | `BlogPost` + `FamilyUpdate` models removed via migration; `prisma generate` succeeds | §Prisma Migration Mechanics |
| PRUNE-04 | Dashboard CRUD removed — `/dashboard/posts*`, `/dashboard/updates*` routes + nav + server actions | Removal surface map §Files to Delete |
| PRUNE-05 | Cross-cutting refs cleaned — command-palette, sitemap, not-found, root layout, public layout | §Files to Edit — detailed line-level map |
| DASH-01 | Dashboard nav lists only surviving areas — Photos, Events, Members, Memorial | §Dashboard Consolidation |
| DASH-02 | Dashboard overview reflects only surviving content | §Dashboard Consolidation — new overview shape |
| DASH-03 | Dashboard structure refactored — shared primitives reused, no orphaned routes | §Dashboard Consolidation |

</phase_requirements>

---

## Summary

Phase 32 is a pure removal and refactor phase with no new features. The dominant risk is **incomplete removal** — a single missed import breaks the build; a missed test assertion fails `npm test`. The research below provides a fully verified, file-by-file removal checklist.

The codebase has been fully read. Every file referencing blog, BlogPost, FamilyUpdate, or their UI surfaces has been identified. There are **no foreign-key relations** from other models to `BlogPost` or `FamilyUpdate` in `schema.prisma` — both models reference `authorId`/`postedById` as bare string fields (no Prisma `@relation`), so the migration can drop them directly without cascading constraint work. The `PostStatus` enum is owned entirely by `BlogPost` and must also be dropped in the migration.

The test surface is larger than CONTEXT.md suggested: `prod-readiness.test.ts` and `production-bugs.test.ts` both contain heavy blog/RSS/FamilyUpdate test logic that must be surgically removed. The ISR/dynamic-rendering test (`PAGES_USING_PRISMA` array) explicitly lists `(public)/family/page.tsx`, `(dashboard)/dashboard/posts/*`, and `(dashboard)/dashboard/updates/page.tsx` — those entries must be removed from the array. `src/__tests__/mocks/prisma.ts` has `blogPost` and `familyUpdate` mock objects that must be pruned.

**Primary recommendation:** Work in deletion order — content files first, then public routes, then dashboard routes, then lib/actions, then cross-cutting refs, then tests, then schema migration. This order keeps `npm run build` green at each checkpoint.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Blog route removal | Frontend Server (SSR) | — | Route group `(public)/blog` is App Router server component; deleted entirely |
| Family Updates route removal | Frontend Server (SSR) | — | Route group `(public)/family` is App Router server component; deleted entirely |
| 308 redirects for old URLs | Frontend Server (SSR) | — | `next.config.ts` `redirects()` runs at the Next.js request layer before routes |
| DB model drop | Database / Storage | — | Prisma migration; DIRECT_DATABASE_URL bypasses PgBouncer |
| Dashboard cleanup | Frontend Server (SSR) | — | Dashboard layout + nav live in `(dashboard)/layout.tsx`; AppSidebar is client |
| Homepage de-blog | Frontend Server (SSR) | — | `page.tsx` is a Server Component; strip imports and JSX, keep sidebar |

---

## Exhaustive Removal-Surface Map

This is the canonical source-of-truth for the planner. Every file is marked **DELETE** or **EDIT** with exact scope.

### Files to DELETE (30 files + 1 directory)

#### Blog content
| File | Notes |
|------|-------|
| `content/blog/building-a-family-website.mdx` | D-04 |
| `content/blog/our-dallas-adventure.mdx` | D-04 |
| `content/blog/welcome-to-the-hudsons.mdx` | D-04 |

#### Blog public routes
| File | Notes |
|------|-------|
| `src/app/(public)/blog/page.tsx` | Blog listing page |
| `src/app/(public)/blog/[slug]/page.tsx` | Blog detail page (also contains `remarkGfm` import used only here) |

#### Blog API
| File | Notes |
|------|-------|
| `src/app/api/blog/rss/route.ts` | RSS feed; entire `src/app/api/blog/` directory becomes empty |

#### Blog public components
| File | Notes |
|------|-------|
| `src/components/public/featured-post.tsx` | Only consumer: `(public)/page.tsx` (being stripped per D-05) |
| `src/components/public/post-card.tsx` | Consumers: `(public)/page.tsx` + `(public)/blog/page.tsx` (both being stripped/deleted) |

#### Blog lib
| File | Notes |
|------|-------|
| `src/lib/blog.ts` | `getAllPosts`, `getPostBySlug`, `getAllTags`, `getPostsByTag`, `BlogFrontmatter`, `BlogPostMeta`, `BlogPost` types |

#### Family Updates public routes
| File | Notes |
|------|-------|
| `src/app/(public)/family/page.tsx` | Family updates listing |
| `src/app/(public)/family/load-more-updates.tsx` | Server Action for pagination; imports `UpdateCard` |

#### Family Updates public components
| File | Notes |
|------|-------|
| `src/components/public/update-card.tsx` | Only consumers: both `family/` pages above |

#### Dashboard posts routes (PRUNE-04)
| File | Notes |
|------|-------|
| `src/app/(dashboard)/dashboard/posts/page.tsx` | Imports `prisma.blogPost` + `deletePost` + `PostsDataTable` |
| `src/app/(dashboard)/dashboard/posts/new/page.tsx` | New post form page |
| `src/app/(dashboard)/dashboard/posts/[id]/page.tsx` | Edit post page |
| `src/app/(dashboard)/dashboard/posts/post-form.tsx` | Post CRUD form |
| `src/app/(dashboard)/dashboard/posts/post-actions.tsx` | Post action buttons |
| `src/app/(dashboard)/dashboard/posts/posts-data-table.tsx` | Table component |
| `src/app/(dashboard)/dashboard/posts/columns.tsx` | Column definitions |

#### Dashboard updates routes (PRUNE-04)
| File | Notes |
|------|-------|
| `src/app/(dashboard)/dashboard/updates/page.tsx` | Imports `prisma.familyUpdate` + `deleteUpdate` |
| `src/app/(dashboard)/dashboard/updates/new/page.tsx` | New update form page |
| `src/app/(dashboard)/dashboard/updates/new/update-form.tsx` | Update CRUD form |

#### Tests (D-06)
| File | Action | Notes |
|------|--------|-------|
| `src/__tests__/lib/blog.test.ts` | **DELETE** | Entire file tests `getAllPosts`, `getPostBySlug`, `getAllTags`, `getPostsByTag` — all from deleted `lib/blog.ts` |

### Files to EDIT (exact changes per file)

#### `src/app/(public)/page.tsx` — D-05 homepage strip
- Remove imports: `FeaturedPost`, `PostCard`, `getAllPosts`
- Remove variables: `allPosts`, `publishedPosts`, `featuredPost`, `recentPosts`
- Remove JSX: entire "Featured Post" `<section>` block (lines 80-95), "Recent Posts Grid" `<section>` block (lines 98-120), "Empty state when no posts" `<section>` block (lines 122-133)
- Keep: `prisma` import, `Hero`, `Sidebar`, `SectionHeader`, `Separator`, events query, photos query, sidebar rendering
- Result: homepage shows Hero + Sidebar (events + photos). Phase 33 adds recipes content.

#### `src/app/(public)/layout.tsx` — PRUNE-05 nav + footer links
- Remove from `navLinks` array: `{ href: "/blog", label: "Blog" }` and `{ href: "/family", label: "Family" }` (lines 12 and 16)
- Remove from footer links: `<Link href="/blog">Blog</Link>` (line 70-72) and `<Link href="/family">Family</Link>` (lines 79-81)
- Keep: Home, Photos, Recipes, Events, In Memory nav links; Photos and Events footer links

#### `src/app/layout.tsx` — PRUNE-05 root layout RSS link
- Remove from `metadata.alternates.types`: `"application/rss+xml": "/api/blog/rss"` (lines 28-30)
- Keep: all other metadata

#### `src/app/not-found.tsx` — PRUNE-05
- Remove nav link: `<Link href="/blog">Blog</Link>` (line 20) from the inline nav
- Replace the CTA button for "Read the Blog" (line 51-56) with something neutral (e.g. "View Photos") or remove it

#### `src/app/sitemap.ts` — PRUNE-05
- Remove import: `import { getAllPosts } from "@/lib/blog"` (line 2)
- Remove static entry: the `/blog` entry from `staticPages` (lines 18-23)
- Remove static entry: the `/family` entry from `staticPages` (lines 43-47)
- Remove the `blogPages` variable and its `getAllPosts()` call (lines 56-62)
- Remove `...blogPages` from the final `return` array
- Keep: static pages for `/photos`, `/events`, `/richard-hudson-sr`, `/recipes`; recipe + album dynamic entries

#### `src/components/command-palette.tsx` — PRUNE-05
- Remove from `publicPages`: `{ label: "Blog", href: "/blog", icon: BookOpen }` and `{ label: "Family", href: "/family", icon: Users }`
- Remove from `dashboardPages`: `{ label: "Posts", href: "/dashboard/posts", icon: FileText }` and `{ label: "Updates", href: "/dashboard/updates", icon: Bell }`
- Remove from `quickActions`: `{ label: "New Post", href: "/dashboard/posts/new", icon: FilePlus }` and `{ label: "New Update", href: "/dashboard/updates/new", icon: MessageSquarePlus }`
- Remove unused lucide imports: `BookOpen`, `Users`, `FileText`, `Bell`, `FilePlus`, `MessageSquarePlus`

#### `src/app/(dashboard)/layout.tsx` — DASH-01 nav cleanup
- Remove from `navLinks`: `{ href: "/dashboard/posts", label: "Posts" }` and `{ href: "/dashboard/updates", label: "Updates" }`
- Keep: Overview, Photos, Events, Members (owner-only), Memorial (owner-only)

#### `src/lib/dashboard-actions.ts` — PRUNE-04 action removal
- Delete the entire **Posts** section: `createPost`, `updatePost`, `deletePost` functions (lines 10-85)
- Delete the entire **Family Updates** section: `createUpdate`, `deleteUpdate`, `quickCreateUpdate` functions (lines 225-332)
- Keep: Albums, Events, Members, Photos, Invites, `quickCreateEvent`
- Note: `quickCreateUpdate` is in the Quick-create section (lines 316-332) — delete it too

#### `src/app/(dashboard)/dashboard/page.tsx` — DASH-02 overview rework
- Remove from `Promise.all`: `prisma.blogPost.count()`, `prisma.blogPost.count({ where: { status: "PUBLISHED" } })`, `prisma.familyUpdate.count()` (lines 13-20)
- Remove `recentPosts` query (lines 22-27)
- Remove from `stats` array: `{ label: "Posts", ... }` and `{ label: "Updates", ... }` entries (lines 36-41)
- Remove `<CollapsibleCard title="Recent Posts">` section (lines 115-140)
- Remove `<Link href="/dashboard/posts/new">New Post</Link>` quick action button (lines 77-82)
- Remove `<a href="/dashboard/updates/new">New Update</a>` quick action button (lines 101-106)
- Remove import of `QuickUpdateDialog` (keep `QuickEventDialog`)
- Remove `<QuickUpdateDialog />` from quick actions (line 108)
- Keep: photos/albums/events counts, upcomingEvents query, CollapsibleCard for Upcoming Events, Quick Actions for Upload Photos / New Album / New Event / Quick Event

#### `src/app/(dashboard)/dashboard/quick-actions.tsx` — remove QuickUpdateDialog
- Delete the entire `QuickUpdateDialog` component (lines 159-213)
- Remove import: `quickCreateUpdate` from `@/lib/dashboard-actions` (line 30)
- Remove import: `MessageSquarePlus` from lucide-react (line 6)
- Remove import: `Textarea` from `@/components/ui/textarea` (line 12)
- Keep: `QuickEventDialog` and all its dependencies

#### `src/__tests__/lib/dashboard-actions.test.ts` — D-06 test surgery
- Remove the entire **Posts** describe block: `createPost`, `updatePost`, `deletePost` suites (lines 81-224)
- Remove the **Family Updates** describe block: `createUpdate`, `deleteUpdate` suites (lines 382-408)
- Remove from imports: `createPost`, `updatePost`, `deletePost`, `createUpdate`, `deleteUpdate` (lines 28-37)
- Remove mock setup in `beforeEach`: `prismaMock.blogPost.*` and `prismaMock.familyUpdate.*` lines (lines 63-66, 71-72)
- Remove from auth enforcement tests: `createPost`, `deletePost` test cases (lines 526-548) and the `createPost` requireRole test + `deletePost` requireRole test
- Keep: createAlbum, updateAlbum, createEvent, deleteEvent, updateUserRole, banUser, unbanUser, deletePhoto, createInvite, deleteInvite, auth guard tests for remaining actions

#### `src/__tests__/mocks/prisma.ts` — D-06 mock cleanup
- Remove the `blogPost` mock object (lines 6-14)
- Remove the `familyUpdate` mock object (lines 36-44)
- Keep: album, photo, event, inviteToken, user, memory, memorialMedia, memorialContent

#### `src/__tests__/prod-readiness.test.ts` — D-06 sweeping surgery
- Remove import: `getAllPosts, getPostBySlug` from `@/lib/blog` (line 72)
- Delete entire **SEO — RSS Feed** describe block (lines 755-796): file reads `src/app/api/blog/rss/route.ts` which will be deleted
- Delete inside **SEO — Sitemap** describe block:
  - Remove test `'sitemap includes all static pages'` which asserts `/blog` and `/family` are present (lines 724-733) — replace with test asserting they are NOT present (or simply delete it)
  - Remove test `'sitemap generates blog post entries from getAllPosts'` (lines 735-742)
- Delete inside **Bug Fix Verification**:
  - Remove test `'blog page uses remark-gfm plugin for GFM table support'` (lines 498-504) — reads deleted file `blog/[slug]/page.tsx`
- Delete entire **Blog — Content Handling** describe block at end (lines 1036-1067): reads from `lib/blog` which is deleted
- Delete inside **Integration — Page Rendering**:
  - Remove test `'blog getPostBySlug prevents path traversal attacks'` (lines 1017-1024)
  - Remove test `'blog getPostBySlug returns null for empty slug'` (lines 1026-1029)
- Keep: Memorial tests, invite token tests, Auth tests, iCal tests, robots.txt tests, layout backlink test, seed photo URL tests, event relative time tests

#### `src/__tests__/production-bugs.test.ts` — D-06 surgery
- Remove from imports: `createPost`, `deletePost`, `createUpdate`, `deleteUpdate` (lines 71-82)
- Remove from `FormData validation` describe block: `createPost` test cases (lines 126-143), `createUpdate` test case (lines 170-175)
- Remove from `Auth guard enforcement` describe block: all `blogPost` mock setup in `beforeEach` (line 120), test cases for `createPost` (lines 187-195), `deletePost` (lines 197-202), `deleteUpdate` (lines 219-224), `createPost` role list test (lines 255-263), `deletePost` owner/admin test (lines 265-272)
- Remove from `PAGES_USING_PRISMA` array in ISR test:
  - `'(public)/family/page.tsx'` (line 646)
  - `'(dashboard)/dashboard/posts/page.tsx'` (line 651)
  - `'(dashboard)/dashboard/posts/[id]/page.tsx'` (line 652)
  - `'(dashboard)/dashboard/updates/page.tsx'` (line 659)
- Remove entire `Database schema field alignment` describe block tests for `createPost data shape` (lines 515-544) and `createUpdate data includes all required FamilyUpdate fields` (lines 615-629) — the schema fields no longer exist
- Remove entire `Blog edge cases` describe block (lines 479-498)
- Update `FormData validation` beforeEach to remove `prismaMock.blogPost.create` and `prismaMock.familyUpdate.create` mock setup lines (119-124)
- Keep: all event tests, auth tests for surviving actions, invite token security, photo upload validation, ISR tests for surviving pages

---

## Prisma Migration Mechanics

### Schema changes required
1. Delete the `BlogPost` model block from `prisma/schema.prisma`
2. Delete the `FamilyUpdate` model block from `prisma/schema.prisma`
3. Delete the `PostStatus` enum from `prisma/schema.prisma` — it is owned entirely by `BlogPost` and has no other consumers

**Verified:** Neither `BlogPost` nor `FamilyUpdate` has any `@relation` referencing them from other models. `authorId` and `postedById` are bare `String` fields — no foreign-key constraint to clean up. [VERIFIED: schema.prisma read]

### Migration workflow

```bash
# Step 1: Count rows before migration (verify-then-drop per D-01)
DIRECT_DATABASE_URL=<value> node -e "
const { PrismaClient } = require('./generated/prisma');
const p = new PrismaClient();
Promise.all([p.blogPost.count(), p.familyUpdate.count()])
  .then(([b, f]) => { console.log('BlogPost rows:', b); console.log('FamilyUpdate rows:', f); })
  .finally(() => p.\$disconnect());
"

# Step 2a: If both counts are 0 — proceed with migration directly
# Step 2b: If either count > 0 — dump first:
DIRECT_DATABASE_URL=<value> node -e "
const { PrismaClient } = require('./generated/prisma');
const p = new PrismaClient();
Promise.all([p.blogPost.findMany(), p.familyUpdate.findMany()])
  .then(([posts, updates]) => {
    const fs = require('fs');
    fs.writeFileSync('.planning/blogpost-dump.json', JSON.stringify(posts, null, 2));
    fs.writeFileSync('.planning/familyupdate-dump.json', JSON.stringify(updates, null, 2));
    console.log('Dumped', posts.length, 'posts and', updates.length, 'updates');
  })
  .finally(() => p.\$disconnect());
"

# Step 3: Edit schema.prisma (remove BlogPost, FamilyUpdate, PostStatus)

# Step 4: Create and apply the migration
npx prisma migrate dev --name remove-blog-familyupdate

# Step 5: Regenerate the Prisma client (output → ./generated/prisma/)
npx prisma generate

# Step 6: Verify TypeScript no longer sees .blogPost or .familyUpdate
# (npm run build will catch this)
```

**Generated SQL the migration will produce (approximately):**
```sql
DROP TABLE "BlogPost";
DROP TABLE "FamilyUpdate";
DROP TYPE "PostStatus";
```

**Why `migrate dev` not `db push`:** `prisma.config.ts` uses `DIRECT_DATABASE_URL` (bypasses PgBouncer) and the project standard is `migrate dev` which creates a versioned migration file. `db push` skips migration history — never use it here. [VERIFIED: prisma.config.ts read]

**Output dir:** `./generated/prisma/` (not `node_modules`) — confirmed in `prisma/schema.prisma` generator block. `npx prisma generate` targets this path automatically via the schema config. [VERIFIED: schema.prisma read]

---

## next.config redirects() Mechanics

### Syntax for 308 permanent redirects with wildcard

```typescript
// next.config.ts — add redirects() function
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... existing config ...
  async redirects() {
    return [
      {
        source: "/blog",
        destination: "/",
        permanent: true,  // HTTP 308 for same-method preservation; Next.js uses 308 for permanent
      },
      {
        source: "/blog/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/family",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

**Notes:**
- `permanent: true` emits HTTP 308 (preserves POST method) in Next.js. [ASSUMED — Next.js docs state permanent: true issues 308; consistent with D-02 requirement]
- The `:slug*` wildcard matches zero or more path segments, covering both `/blog/some-post` and `/blog/category/post` patterns. [ASSUMED — standard Next.js wildcard syntax]
- The redirect `source` is the path pattern that no longer has a live route after deletion. There is **no collision**: once `src/app/(public)/blog/` and `src/app/(public)/family/` directories are deleted, those routes cease to exist, and the redirect fires.
- **QUAL-03 carve-out (D-02):** The grep check "zero `/blog` or `/family` references in `src/`" must allow `next.config.ts`. The redirect *sources* reference the paths — that is legitimate infrastructure, not a live feature. The planner must document this exception in VALIDATION.md.

---

## Dashboard Consolidation

### Surviving dashboard areas and their current file locations

| Area | Route | Page File | Data Source |
|------|-------|-----------|-------------|
| Overview | `/dashboard` | `dashboard/page.tsx` | `prisma.photo`, `prisma.album`, `prisma.event` |
| Photos | `/dashboard/photos*` | `dashboard/photos/` (6 files) | `prisma.photo`, `prisma.album` |
| Events | `/dashboard/events*` | `dashboard/events/` (6 files) | `prisma.event` |
| Members | `/dashboard/members` | `dashboard/members/` (5 files) | `prisma.user`, `prisma.inviteToken` |
| Memorial | `/dashboard/memorial*` | `dashboard/memorial/` (6 files) | `prisma.memory`, `prisma.memorialMedia`, `prisma.memorialContent` |

### Shared primitives available (all in `src/components/dashboard/`)

| Primitive | File | Purpose |
|-----------|------|---------|
| `CollapsibleCard` | `collapsible-card.tsx` | Expandable card with header + content slot |
| `MetricCard` | `metric-card.tsx` | Single-stat display card |
| `AppSidebar` | `app-sidebar.tsx` | Sidebar nav — consumes `navLinks` prop |
| `DataTable` | `data-table.tsx` | TanStack Table wrapper |
| `Breadcrumbs` | `breadcrumbs.tsx` | Breadcrumb nav |
| `WidgetCard` | `widget-card.tsx` | Generic widget card |

### New dashboard overview shape (post-removal)

The reworked `/dashboard/page.tsx` should:
1. Remove all `blogPost` and `familyUpdate` Prisma queries and their stats cards
2. Remove `<QuickUpdateDialog />` and "New Post" / "New Update" quick action buttons
3. Keep the `<CollapsibleCard title="Upcoming Events">` section
4. Replace `<CollapsibleCard title="Recent Posts">` with a `<CollapsibleCard title="Recent Photos">` or similar (shows recently uploaded photos — data already fetched in Phase 31 homepage sidebar) — Claude's discretion
5. Stats grid: Photos, Albums, Events (3 stats instead of 5) — use `MetricCard` if available

### AppSidebar iconMap
The `iconMap` in `app-sidebar.tsx` maps label strings to Lucide icons. After removing `Posts` and `Updates` entries, the `FileText` and `Bell` icons become unused in `iconMap` — remove them to avoid dead code. The `iconMap` keys that survive: `Overview`, `Photos`, `Events`, `Services`, `Members`, `Memorial`.

---

## Common Pitfalls

### Pitfall 1: Missed ISR page array entries in production-bugs.test.ts
**What goes wrong:** The `PAGES_USING_PRISMA` array (line 644) lists pages that must call `connection()`. After deleting `family/page.tsx`, `posts/page.tsx`, `posts/[id]/page.tsx`, `updates/page.tsx`, those entries must be removed from the array or the test fails trying to read non-existent files (the test uses `fs.readFile` with a try/catch that skips missing files — so it actually passes silently, but the intent is corrupted). Remove to keep the test accurate.
**How to avoid:** Remove the 4 entries from `PAGES_USING_PRISMA`.

### Pitfall 2: prod-readiness.test.ts RSS and blog SEO tests read deleted files
**What goes wrong:** `SEO -- RSS Feed` describe block reads `src/app/api/blog/rss/route.ts` directly via `fs.readFile`. After deletion, the test throws `ENOENT` → test fails. Same for the `Bug Fix Verification` test that reads `src/app/(public)/blog/[slug]/page.tsx`.
**How to avoid:** Delete those describe blocks in full before deleting the files, or the test suite fails on any interim commit.
**Warning signs:** `npm test` shows `ENOENT: no such file or directory` errors in `prod-readiness.test.ts`.

### Pitfall 3: sitemap.ts getAllPosts import + dead /blog and /family entries
**What goes wrong:** `sitemap.ts` imports `getAllPosts` and references the static `/blog` and `/family` paths. After `lib/blog.ts` is deleted, `npm run build` fails with a module-not-found error in `sitemap.ts`.
**How to avoid:** Edit `sitemap.ts` before or at the same time as deleting `lib/blog.ts`.

### Pitfall 4: Root layout RSS alternates link
**What goes wrong:** `src/app/layout.tsx` line 28-30 has `alternates: { types: { "application/rss+xml": "/api/blog/rss" } }`. After the RSS route is deleted, browsers requesting the feed get a 404. The metadata stays in the HTML `<head>` unless removed.
**How to avoid:** Remove the `alternates.types` entry from `src/app/layout.tsx`.

### Pitfall 5: quickCreateUpdate in quick-actions.tsx
**What goes wrong:** `quick-actions.tsx` imports `quickCreateUpdate` from `dashboard-actions.ts` (line 30). After removing `quickCreateUpdate` from the actions file, this import breaks the build.
**How to avoid:** Delete `QuickUpdateDialog` component from `quick-actions.tsx` and remove its import simultaneously with removing `quickCreateUpdate` from `dashboard-actions.ts`.

### Pitfall 6: proxy.ts comment mentions "blog MDX"
**What goes wrong:** `src/proxy.ts` has a comment (line 30) reading "Public site (blog MDX, photo OG tags, memorial..." and a comment on line 81 about "blog MDX". These are comments only — no import, no functional reference. No action needed for build correctness, but PRUNE-05 requires no dead references. Claude's discretion on whether comment-only references are "cleaned".
**How to avoid:** The comments are in context explaining why the CSP scope is `/admin/*` only — they are rationale comments referencing the public site surface, not a live feature import. Safe to leave unless lint enforcement requires it.

### Pitfall 7: production-bugs.test.ts imports createPost/deletePost/createUpdate/deleteUpdate
**What goes wrong:** `production-bugs.test.ts` imports `createPost`, `deletePost`, `createUpdate`, `deleteUpdate` from `dashboard-actions.ts`. After removing those exports, the import at line 71-82 causes a TypeScript/Vitest compile error.
**How to avoid:** Remove those imports AND their test blocks before or simultaneously with removing the actions.

### Pitfall 8: PostStatus enum in generated Prisma client
**What goes wrong:** After the migration drops the `PostStatus` enum and `BlogPost` model, the generated Prisma client no longer exports `PostStatus`. Any surviving file that imports `PostStatus` from `@/generated/prisma` or `@prisma/client` will break. Current scan shows no file outside the posts dashboard imports `PostStatus` — but verify with grep after editing.
**Verify command:** `grep -rn "PostStatus" src/ --include="*.ts" --include="*.tsx"` — should return 0 results after cleanup.

---

## Code Examples

### next.config.ts redirects() pattern
```typescript
// Source: Next.js App Router redirects documentation [ASSUMED]
async redirects() {
  return [
    { source: "/blog", destination: "/", permanent: true },
    { source: "/blog/:slug*", destination: "/", permanent: true },
    { source: "/family", destination: "/", permanent: true },
  ];
},
```

### Prisma schema — after removal (relevant excerpt)
```prisma
// Delete these two model blocks + the PostStatus enum:

// enum PostStatus { DRAFT; PUBLISHED }  ← DELETE
// model BlogPost { ... }                ← DELETE
// model FamilyUpdate { ... }            ← DELETE

// The Visibility enum is shared with Event — DO NOT DELETE:
enum Visibility {
  PUBLIC
  FAMILY
}
```

### Dashboard layout navLinks after cleanup
```typescript
// src/app/(dashboard)/layout.tsx
const navLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/photos", label: "Photos" },
  { href: "/dashboard/events", label: "Events" },
];

if (userRole === "owner") {
  navLinks.push({ href: "/dashboard/members", label: "Members" });
  navLinks.push({ href: "/dashboard/memorial", label: "Memorial" });
}
```

### Homepage after D-05 strip (minimal shape)
```tsx
// src/app/(public)/page.tsx — after blog strip
import prisma from "@/lib/prisma";
import { Hero } from "@/components/public/hero";
import { connection } from "next/server";
import { Sidebar } from "@/components/public/sidebar";
import { Separator } from "@/components/ui/separator";

export default async function HomePage() {
  await connection();
  const events = await prisma.event.findMany({ /* ... */ });
  const photos = await prisma.photo.findMany({ /* ... */ });
  // ... map to sidebar props ...
  return (
    <div>
      <Hero />
      <Separator />
      <div className="max-w-7xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
        <Sidebar events={sidebarEvents} photos={sidebarPhotos} />
      </div>
    </div>
  );
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 308 redirects | Custom middleware | `next.config.ts redirects()` | Built-in, runs at infra layer, no runtime cost |
| Schema migration | Manual SQL | `npx prisma migrate dev` | Versioned, reversible, tracked in `prisma/migrations/` |
| Row count/dump before drop | Raw psql | Prisma client in a Node script | Already have the client; type-safe; consistent with project tooling |

---

## Validation Architecture

> `workflow.nyquist_validation` is absent from `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts) |
| Config file | `vitest.config.ts` |
| Quick run | `npm test -- --run` |
| Full suite | `npm test` |

### Phase Requirements → Validation Map

| Req | Behavior to Verify | Test Type | Command / Check | Notes |
|-----|--------------------|-----------|-----------------|-------|
| PRUNE-01 | `/blog` and `/blog/[slug]` redirect 308 → `/` | Smoke (manual) | `curl -I https://thehudsonfam.com/blog` | Post-deploy; local: redirect in next.config + no route = build verifies |
| PRUNE-01 | No blog imports anywhere in `src/` | Static grep | `grep -rn "getAllPosts\|from.*lib/blog\|featured-post\|post-card" src/` must return 0 | Run before every commit in this phase |
| PRUNE-01 | `content/blog/` is deleted | Filesystem | `ls content/blog/` must fail (ENOENT) | |
| PRUNE-02 | `/family` redirects 308 → `/` | Smoke | `curl -I https://thehudsonfam.com/family` | Post-deploy |
| PRUNE-02 | No familyUpdate imports in `src/` | Static grep | `grep -rn "familyUpdate\|FamilyUpdate\|update-card" src/` must return 0 | |
| PRUNE-03 | Prisma migration applies cleanly | Build gate | `npx prisma migrate dev` exits 0; `npx prisma generate` exits 0 | |
| PRUNE-03 | `prisma.blogPost` and `prisma.familyUpdate` no longer exist | TypeScript | `npm run build` exits 0 (tsc would catch any residual references) | |
| PRUNE-04 | Dashboard posts/updates routes are gone | Filesystem grep | `find src/app -type d -name "posts" -path "*/dashboard/*"` and `find src/app -type d -name "updates" -path "*/dashboard/*"` return nothing | |
| PRUNE-04 | `createPost`, `updatePost`, `deletePost`, `createUpdate`, `deleteUpdate` removed from dashboard-actions.ts | Static grep | `grep -n "createPost\|deletePost\|createUpdate\|deleteUpdate" src/lib/dashboard-actions.ts` returns 0 | |
| PRUNE-05 | No blog/family links in nav or footer | Static grep | `grep -rn '"/blog"\|"/family"' src/app/\(public\)/layout.tsx` returns 0 | QUAL-03 carve-out: next.config.ts is allowed |
| PRUNE-05 | No RSS link in root layout | Static grep | `grep "api/blog/rss" src/app/layout.tsx` returns 0 | |
| PRUNE-05 | Sitemap has no /blog or /family entries | Static grep | `grep '"/blog"\|"/family"' src/app/sitemap.ts` returns 0 | |
| PRUNE-05 | Command palette has no blog/posts/updates/family entries | Static grep | `grep '"Blog"\|"Posts"\|"Updates"\|"Family"\|/blog\|/family\|dashboard/posts\|dashboard/updates' src/components/command-palette.tsx` returns 0 | |
| DASH-01 | Dashboard nav has no Posts or Updates entries | Static grep | `grep '"Posts"\|"Updates"\|dashboard/posts\|dashboard/updates' src/app/\(dashboard\)/layout.tsx` returns 0 | |
| DASH-02 | Dashboard overview has no blogPost/familyUpdate queries | Static grep | `grep "blogPost\|familyUpdate" src/app/\(dashboard\)/dashboard/page.tsx` returns 0 | |
| DASH-03 | No orphaned dashboard route dirs | Filesystem | `ls src/app/(dashboard)/dashboard/posts` and `ls src/app/(dashboard)/dashboard/updates` both fail | |
| D-05 | Homepage has no getAllPosts / FeaturedPost / PostCard | Static grep | `grep "getAllPosts\|FeaturedPost\|PostCard\|lib/blog" src/app/\(public\)/page.tsx` returns 0 | |
| D-06 | `npm test` passes | Test suite | `npm test` exits 0 | Run after every wave |
| QUAL-01 | Build succeeds | Build | `npm run build` exits 0 | Phase gate |

### Sampling Rate

- **Per task commit:** `npm test -- --run` (Vitest run mode, no watch)
- **Per wave merge:** `npm test` + `npm run build`
- **Phase gate:** `npm run build` + `npm test` both green before marking phase complete

### Wave 0 Gaps

None — existing test infrastructure covers all phase requirements. No new test files need to be created in this phase; the work is deletion/reduction of existing tests.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Prisma client script, build | Yes | Confirmed (project runs) | — |
| `npx prisma migrate dev` | PRUNE-03 | Yes | Prisma v7 installed | — |
| `DIRECT_DATABASE_URL` | Migration | Yes (in .env.local / Vercel) | — | Must be set; no fallback for migration |
| Neon PostgreSQL | Migration apply | Yes (Neon free tier, project active) | — | — |

**Missing dependencies with no fallback:** None identified.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `permanent: true` in `next.config.ts redirects()` issues HTTP 308 | redirects() Mechanics | Could issue 301 instead of 308; functionally equivalent for GET requests but different semantics for POST |
| A2 | `:slug*` wildcard in redirects() matches zero-or-more segments | redirects() Mechanics | If it requires one-or-more, `/blog` base path needs a separate rule (which is already included anyway) |
| A3 | proxy.ts blog comment references are comment-only and safe to leave | Pitfall 6 | No risk to build; cosmetic only |

**All other findings are VERIFIED by direct file reads of the actual codebase.**

---

## Sources

### Primary (HIGH confidence — direct codebase reads)
- `prisma/schema.prisma` — verified model structure, no foreign keys on BlogPost/FamilyUpdate
- `prisma.config.ts` — verified `DIRECT_DATABASE_URL` + `migrate dev` pattern
- `src/lib/dashboard-actions.ts` — verified full action list including quickCreateUpdate
- `src/app/(public)/page.tsx` — verified getAllPosts + FeaturedPost + PostCard imports and JSX
- `src/app/(public)/layout.tsx` — verified navLinks + footer links exact lines
- `src/app/layout.tsx` — verified RSS alternates metadata
- `src/app/sitemap.ts` — verified getAllPosts import + static /blog and /family entries
- `src/app/not-found.tsx` — verified Blog nav link + "Read the Blog" CTA
- `src/components/command-palette.tsx` — verified all blog/posts/updates/family entries
- `src/app/(dashboard)/layout.tsx` — verified navLinks Posts + Updates entries
- `src/app/(dashboard)/dashboard/page.tsx` — verified blogPost.count + familyUpdate.count + recentPosts queries
- `src/app/(dashboard)/dashboard/quick-actions.tsx` — verified QuickUpdateDialog + quickCreateUpdate import
- `src/__tests__/lib/blog.test.ts` — verified: entire file is blog-only, safe to delete
- `src/__tests__/lib/dashboard-actions.test.ts` — verified exact describe blocks to remove
- `src/__tests__/mocks/prisma.ts` — verified blogPost + familyUpdate mock objects
- `src/__tests__/prod-readiness.test.ts` — verified RSS tests, blog content tests, sitemap tests reading deleted files
- `src/__tests__/production-bugs.test.ts` — verified ISR PAGES_USING_PRISMA entries, blogPost mock usage, createPost/createUpdate imports
- `src/proxy.ts` — verified: only comment references, no functional blog code
- `src/components/dashboard/app-sidebar.tsx` — verified iconMap has Posts/Updates entries
- `next.config.ts` — verified: no existing redirects() function; needs to be added

### Secondary (ASSUMED)
- Next.js 16 `redirects()` permanent:true → HTTP 308 behaviour [A1]
- `:slug*` wildcard syntax [A2]

---

## Metadata

**Confidence breakdown:**
- Removal surface map: HIGH — all files read directly
- Prisma migration: HIGH — schema.prisma + prisma.config.ts read; mechanics are standard Prisma v7
- next.config redirects: MEDIUM — syntax is standard; 308 vs 301 detail is ASSUMED
- Test surgery: HIGH — all test files read in full; line-level changes documented
- Dashboard consolidation: HIGH — all layout/nav/overview files read directly

**Research date:** 2026-06-02
**Valid until:** Indefinite (no external dependencies change; all findings are from in-repo reads)
