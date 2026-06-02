# Phase 32: Prune & Dashboard Cleanup — Pattern Map

**Mapped:** 2026-06-02
**Files analyzed:** 5 created/modified files (+ 30 pure deletions listed separately)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/(dashboard)/dashboard/page.tsx` | page (server component) | CRUD / request-response | self (current version, lines 1–173) | exact — surgical edit of existing file |
| `next.config.ts` | config | request-response (redirect) | self (current version, lines 1–48) | exact — additive edit |
| `prisma/schema.prisma` | model/migration | CRUD | existing `prisma/migrations/` files | role-match |
| `src/app/(dashboard)/layout.tsx` | layout / middleware | request-response | self (current version, lines 1–54) | exact — surgical edit |
| `src/components/dashboard/app-sidebar.tsx` | component (client) | event-driven (nav) | self (current version, lines 1–172) | exact — surgical edit |

---

## Pattern Assignments

### `src/app/(dashboard)/dashboard/page.tsx` (page, CRUD / request-response)

**Analog:** self — current file at `src/app/(dashboard)/dashboard/page.tsx`

This is a surgical edit: remove blog/update queries and replace `<CollapsibleCard title="Recent Posts">` with `<CollapsibleCard title="Recent Photos">`. All existing patterns are preserved.

**Imports pattern — keep these, remove QuickUpdateDialog** (lines 1–8):
```typescript
import Link from "next/link";
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { CollapsibleCard } from "@/components/dashboard/collapsible-card";
import { QuickEventDialog } from "./quick-actions";   // ← remove QuickUpdateDialog here
```

Add `Image` import for the new Recent Photos card:
```typescript
import Image from "next/image";
```

**Prisma query pattern — surviving queries only** (lines 12–33, after edit):
```typescript
await connection();
const [photoCount, albumCount, eventCount] = await Promise.all([
  prisma.photo.count(),
  prisma.album.count(),
  prisma.event.count(),
]);

const recentPhotos = await prisma.photo.findMany({
  orderBy: { createdAt: "desc" },
  take: 4,
  select: {
    id: true,
    thumbnailPath: true,
    createdAt: true,
    album: { select: { name: true } },
  },
});

const upcomingEvents = await prisma.event.findMany({
  where: { startDate: { gte: new Date() } },
  orderBy: { startDate: "asc" },
  take: 5,
  select: { id: true, title: true, startDate: true },
});
```

**Stats grid pattern — 3 cards replacing 5** (lines 35–69, after edit):

The `stats` array shrinks to 3 entries. The grid class changes from `@lg:grid-cols-5` to `@sm:grid-cols-3`. All other markup is identical to current pattern:
```tsx
const stats = [
  { label: "Photos", value: photoCount, href: "/dashboard/photos" },
  { label: "Albums", value: albumCount, href: "/dashboard/photos/albums" },
  { label: "Events", value: eventCount, href: "/dashboard/events" },
];

// Grid wrapper: drop @lg:grid-cols-5, use @sm:grid-cols-3
<div className="@container grid grid-cols-2 @sm:grid-cols-3 gap-4 mt-6">
  {stats.map((stat) => (
    <a key={stat.label} href={stat.href}>
      <Card hover padding="md" className="text-center">
        <div className="text-xl @sm:text-2xl font-semibold text-primary">
          {stat.value}
        </div>
        <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
          {stat.label}
        </div>
      </Card>
    </a>
  ))}
</div>
```

**Quick actions pattern — remove New Post, New Update, QuickUpdateDialog** (lines 71–110, after edit):
```tsx
<div className="mt-8">
  <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
    Quick Actions
  </h2>
  <div className="flex flex-wrap gap-3">
    <a
      href="/dashboard/photos/upload"
      className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
    >
      Upload Photos
    </a>
    <Link
      href="/dashboard/photos/albums/new"
      className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
    >
      New Album
    </Link>
    <Link
      href="/dashboard/events/new"
      className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:border-primary/30 transition-colors"
    >
      New Event
    </Link>
    <QuickEventDialog />
  </div>
</div>
```

**Recent Photos CollapsibleCard — new content replacing "Recent Posts"** (lines 113–140, after edit):

Pattern source for thumbnail rendering: `src/components/public/photo-grid-preview.tsx` lines 25–31 and `src/app/(public)/photos/page.tsx` lines 51–55.
Pattern source for CollapsibleCard row layout: current "Upcoming Events" card, lines 142–169.
```tsx
{/* Recent activity */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
  {/* Recent photos */}
  <CollapsibleCard title="Recent Photos">
    <div>
      {recentPhotos.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm font-medium text-foreground">No photos yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload your first photo to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 p-3">
          {recentPhotos.map((photo) => (
            <a
              key={photo.id}
              href="/dashboard/photos"
              className="aspect-square rounded-md overflow-hidden bg-background block"
            >
              <Image
                src={`/api/images/${photo.id}?size=thumbnail`}
                alt={photo.album?.name ?? "Photo"}
                width={200}
                height={200}
                className="w-full h-full object-cover hover:opacity-80 transition-opacity"
                unoptimized
              />
            </a>
          ))}
        </div>
      )}
    </div>
  </CollapsibleCard>

  {/* Upcoming events — unchanged */}
  <CollapsibleCard title="Upcoming Events">
    ...
  </CollapsibleCard>
</div>
```

**Empty state pattern — copy exact copy strings from UI-SPEC.md:**
- Recent Photos empty: heading `"No photos yet"` + body `"Upload your first photo to get started."`
- Upcoming Events empty (existing, unchanged): `"No upcoming events."` → upgrade to match spec: heading `"No upcoming events"` + body `"Create an event to see it here."`

---

### `next.config.ts` (config, request-response)

**Analog:** self — current `next.config.ts` lines 1–48

**Pattern: add `redirects()` as a new async method on the config object** — insert before `export default`:
```typescript
// next.config.ts — add inside const nextConfig: NextConfig = { ... }
async redirects() {
  return [
    {
      source: "/blog",
      destination: "/",
      permanent: true,
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
```

Place it after `reactStrictMode: true` and before `cacheComponents: true` (order within the object is arbitrary; grouping with other routing config is conventional).

`permanent: true` in Next.js App Router issues HTTP 308. The existing config shape is `const nextConfig: NextConfig = { ... }; export default nextConfig;` — maintain that shape exactly.

---

### `prisma/schema.prisma` (model, CRUD / migration)

**Analog:** existing migration files in `prisma/migrations/` for destructive-migration shape.

**Pattern: delete three contiguous blocks.** No new code is written; three blocks are removed:

Block 1 — `PostStatus` enum (locate by `enum PostStatus`):
```prisma
// DELETE this entire block:
enum PostStatus {
  DRAFT
  PUBLISHED
}
```

Block 2 — `BlogPost` model (locate by `model BlogPost`): delete the entire model block.

Block 3 — `FamilyUpdate` model (locate by `model FamilyUpdate`): delete the entire model block.

**Do NOT touch** the `Visibility` enum — it is shared with `Event`.

After editing, run:
```bash
npx prisma migrate dev --name remove-blog-familyupdate
npx prisma generate
```

Migration output dir is `./generated/prisma/` (confirmed in schema generator block).

---

### `src/app/(dashboard)/layout.tsx` (layout, request-response)

**Analog:** self — current file lines 30–41

**Pattern: remove two entries from the `navLinks` array** (lines 32–33 and 35–36):
```typescript
// BEFORE (lines 30–41):
const navLinks = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/posts", label: "Posts" },       // ← DELETE
  { href: "/dashboard/photos", label: "Photos" },
  { href: "/dashboard/events", label: "Events" },
  { href: "/dashboard/updates", label: "Updates" },   // ← DELETE
];

if (userRole === "owner") {
  navLinks.push({ href: "/dashboard/members", label: "Members" });
  navLinks.push({ href: "/dashboard/memorial", label: "Memorial" });
}

// AFTER:
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

All other layout code (Suspense boundary, `DashboardShell`, `requireRole`, `SidebarProvider`) is unchanged.

---

### `src/components/dashboard/app-sidebar.tsx` (component, event-driven nav)

**Analog:** self — current file lines 1–47

**Pattern: remove two `iconMap` entries + their unused lucide imports.**

Lucide imports block (lines 6–18) — remove `FileText` and `Bell`:
```typescript
// BEFORE (lines 6–18):
import {
  LayoutDashboard,
  FileText,       // ← DELETE (Posts icon)
  Image,
  CalendarDays,
  Bell,           // ← DELETE (Updates icon)
  Users,
  Heart,
  Home,
  Settings,
  LogOut,
  ChevronsUpDown,
  AppWindow,
} from "lucide-react";

// AFTER:
import {
  LayoutDashboard,
  Image,
  CalendarDays,
  Users,
  Heart,
  Home,
  Settings,
  LogOut,
  ChevronsUpDown,
  AppWindow,
} from "lucide-react";
```

`iconMap` (lines 38–47) — remove `Posts` and `Updates` keys:
```typescript
// BEFORE:
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Posts: FileText,      // ← DELETE
  Photos: Image,
  Events: CalendarDays,
  Updates: Bell,        // ← DELETE
  Services: AppWindow,
  Members: Users,
  Memorial: Heart,
};

// AFTER:
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Photos: Image,
  Events: CalendarDays,
  Services: AppWindow,
  Members: Users,
  Memorial: Heart,
};
```

All other component code (sidebar structure, active state logic, user popover, sign-out handler) is unchanged.

---

## Shared Patterns

### Image proxy URL pattern
**Source:** `src/components/public/photo-grid-preview.tsx` line 26, `src/app/(public)/photos/page.tsx` line 51
**Apply to:** `dashboard/page.tsx` new Recent Photos card
```tsx
src={`/api/images/${photo.id}?size=thumbnail`}
```
Always `unoptimized` on `<Image>` when using the proxy route (Next.js image optimization would double-process). Width/height `200×200` for dashboard thumbnails.

### CollapsibleCard row layout
**Source:** `src/app/(dashboard)/dashboard/page.tsx` lines 150–165 (Upcoming Events rows)
**Apply to:** Any new list rows inside CollapsibleCard
```tsx
<a
  key={item.id}
  href={`/dashboard/area/${item.id}`}
  className="flex items-center justify-between px-5 py-3 not-last:border-b not-last:border-border/50 hover:bg-background/50 transition-colors"
>
  <span className="text-sm text-foreground truncate mr-3">{item.title}</span>
  <span className="text-xs text-text-dim shrink-0">{/* meta */}</span>
</a>
```

### CollapsibleCard empty state
**Source:** `src/app/(dashboard)/dashboard/page.tsx` lines 117–119 (existing simple empty state)
**Apply to:** Both CollapsibleCard sections
```tsx
// Simple single-line form (existing):
<div className="px-5 py-4 text-sm text-muted-foreground">No upcoming events.</div>

// Heading+body form for new Recent Photos empty state (per UI-SPEC copywriting contract):
<div className="px-5 py-8 text-center">
  <p className="text-sm font-medium text-foreground">No photos yet</p>
  <p className="text-xs text-muted-foreground mt-1">Upload your first photo to get started.</p>
</div>
```

### Dashboard stat card
**Source:** `src/app/(dashboard)/dashboard/page.tsx` lines 53–68
**Apply to:** Stats grid in reworked overview
```tsx
<a key={stat.label} href={stat.href}>
  <Card hover padding="md" className="text-center">
    <div className="text-xl @sm:text-2xl font-semibold text-primary">
      {stat.value}
    </div>
    <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
      {stat.label}
    </div>
  </Card>
</a>
```
Use `<Card hover padding="md">` (not `MetricCard`) — the overview already uses this pattern and changing to `MetricCard` would be a scope expansion.

---

## Pure Deletions — No Analog Needed

These 30 files are deleted outright. No pattern matching required; the planner records them as `rm` or `git rm` actions.

| File | Reason |
|------|--------|
| `content/blog/building-a-family-website.mdx` | D-04 |
| `content/blog/our-dallas-adventure.mdx` | D-04 |
| `content/blog/welcome-to-the-hudsons.mdx` | D-04 |
| `src/app/(public)/blog/page.tsx` | PRUNE-01 |
| `src/app/(public)/blog/[slug]/page.tsx` | PRUNE-01 |
| `src/app/api/blog/rss/route.ts` | PRUNE-01 |
| `src/components/public/featured-post.tsx` | PRUNE-01 |
| `src/components/public/post-card.tsx` | PRUNE-01 |
| `src/lib/blog.ts` | PRUNE-01 |
| `src/app/(public)/family/page.tsx` | PRUNE-02 |
| `src/app/(public)/family/load-more-updates.tsx` | PRUNE-02 |
| `src/components/public/update-card.tsx` | PRUNE-02 |
| `src/app/(dashboard)/dashboard/posts/page.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/posts/new/page.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/posts/[id]/page.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/posts/post-form.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/posts/post-actions.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/posts/posts-data-table.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/posts/columns.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/updates/page.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/updates/new/page.tsx` | PRUNE-04 |
| `src/app/(dashboard)/dashboard/updates/new/update-form.tsx` | PRUNE-04 |
| `src/__tests__/lib/blog.test.ts` | D-06 |

### Files requiring surgical edits (no new pattern — edit against self):

| File | Change Type |
|------|-------------|
| `src/app/(public)/page.tsx` | Remove getAllPosts / FeaturedPost / PostCard imports + JSX (D-05) |
| `src/app/(public)/layout.tsx` | Remove Blog + Family from navLinks + footer (PRUNE-05) |
| `src/app/layout.tsx` | Remove RSS alternates metadata (PRUNE-05) |
| `src/app/not-found.tsx` | Remove Blog nav link + replace "Read the Blog" CTA with "View Photos" → `/photos` |
| `src/app/sitemap.ts` | Remove getAllPosts import + /blog + /family entries + blogPages (PRUNE-05) |
| `src/components/command-palette.tsx` | Remove blog/family/posts/updates entries + unused lucide imports (PRUNE-05) |
| `src/lib/dashboard-actions.ts` | Delete Posts + FamilyUpdates + quickCreateUpdate functions (PRUNE-04) |
| `src/app/(dashboard)/dashboard/quick-actions.tsx` | Delete QuickUpdateDialog + its imports (PRUNE-04) |
| `src/__tests__/lib/dashboard-actions.test.ts` | Surgical removal per RESEARCH.md §Files to EDIT (D-06) |
| `src/__tests__/mocks/prisma.ts` | Remove blogPost + familyUpdate mock objects (D-06) |
| `src/__tests__/prod-readiness.test.ts` | Remove RSS/blog/sitemap/content describe blocks (D-06) |
| `src/__tests__/production-bugs.test.ts` | Remove createPost/deletePost/createUpdate/deleteUpdate imports + test blocks + PAGES_USING_PRISMA entries (D-06) |

---

## Metadata

**Analog search scope:** `src/app/(dashboard)/`, `src/components/dashboard/`, `src/app/(public)/photos/`, `src/components/public/`, `next.config.ts`, `prisma/`
**Files scanned:** 9 (all read directly)
**Pattern extraction date:** 2026-06-02
