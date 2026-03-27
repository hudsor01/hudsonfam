# thehudsonfam.com — UI/UX Enhancement Plan (Tailwind v4 + shadcn/ui)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the UI/UX of thehudsonfam.com using Tailwind CSS v4 features and shadcn/ui v4 components — replacing custom primitives with battle-tested, accessible, composable components.

**Architecture:** Install shadcn/ui CLI, configure for our navy-gold dark theme with OKLCH colors, incrementally replace custom components while maintaining the editorial design aesthetic.

**Tech Stack:** Tailwind CSS v4.2, shadcn/ui (latest), Lucide icons, Sonner, cmdk, Embla Carousel, Radix UI primitives

**Analysis:** `docs/ui-enhancement-analysis.md`

---

## Phase 1: Foundation — shadcn/ui Setup + Quick Wins (30 min)

### Task 1: Install shadcn/ui and configure for navy-gold theme

- [ ] Run `bunx shadcn@latest init` — configure for Tailwind v4, RSC, new-york style
- [ ] Update `components.json` with correct aliases
- [ ] Update `globals.css` to use `@theme inline` pattern with OKLCH navy-gold colors mapped to shadcn CSS variables (--background, --foreground, --primary, --secondary, --accent, --muted, --card, --popover, --destructive, --border, --input, --ring, --sidebar)
- [ ] Add `color-scheme-dark` to `<html>` element (fixes light scrollbars)
- [ ] Install `tw-animate-css` for shadcn animations
- [ ] Install `lucide-react` for consistent icon system
- [ ] Add `cn()` utility function at `src/lib/utils.ts`
- [ ] Verify build passes

### Task 2: Tailwind v4 quick wins

- [ ] Replace all `w-X h-X` pairs with `size-X` (avatars, logos, icons)
- [ ] Add `motion-safe:` prefix to all `animate-spin` and `animate-pulse` usage
- [ ] Add `field-sizing-content` class to all `<textarea>` elements
- [ ] Add custom animation tokens to `@theme`: fade-in, fade-in-up, slide-in-right
- [ ] Add custom radius/shadow tokens: --radius-card, --shadow-card, --shadow-elevated
- [ ] Verify build + tests pass

## Phase 2: Core Component Replacements (2-3 hours)

### Task 3: Add Sonner toast notifications

- [ ] `bunx shadcn@latest add sonner`
- [ ] Add `<Toaster />` to root layout
- [ ] Theme Sonner toasts to navy-gold (dark background, gold accents)
- [ ] Add toast calls to all dashboard CRUD server actions (post created, photo uploaded, event saved, etc.)
- [ ] Add toast to memory submission (public memorial page)
- [ ] Add toast to invite creation
- [ ] Add error toasts for failed operations
- [ ] Verify all toast interactions work

### Task 4: Add AlertDialog for destructive actions

- [ ] `bunx shadcn@latest add alert-dialog`
- [ ] Wrap "Delete Post" action in AlertDialog confirmation
- [ ] Wrap "Delete Photo" action in AlertDialog
- [ ] Wrap "Delete Event" action in AlertDialog
- [ ] Wrap "Delete Update" action in AlertDialog
- [ ] Wrap "Ban User" action in AlertDialog
- [ ] Wrap "Reject Memory" action in AlertDialog
- [ ] Wrap "Remove Media" action in AlertDialog
- [ ] Theme AlertDialog destructive variant with red accent

### Task 5: Replace MobileNav with Sheet

- [ ] `bunx shadcn@latest add sheet`
- [ ] Rewrite MobileNav to use Sheet sliding from left
- [ ] Add proper focus trapping and backdrop
- [ ] Add swipe-to-close support
- [ ] Include all nav links + Sign In
- [ ] Show active page indicator
- [ ] Verify mobile responsiveness

### Task 6: Add Avatar component

- [ ] `bunx shadcn@latest add avatar`
- [ ] Replace manual first-letter avatars in UpdateCard
- [ ] Replace manual avatars in memorial memories
- [ ] Replace manual avatars in members list
- [ ] Add avatar to dashboard sidebar user section
- [ ] Add avatar to nav bar for authenticated users
- [ ] Support user-uploaded profile images (from Better Auth user.image)

## Phase 3: Dashboard Upgrade (3-4 hours)

### Task 7: Replace dashboard sidebar with shadcn Sidebar

- [ ] `bunx shadcn@latest add sidebar`
- [ ] Rewrite `(dashboard)/layout.tsx` using SidebarProvider + Sidebar
- [ ] Add Lucide icons to each nav item (LayoutDashboard, FileText, Image, Calendar, MessageCircle, Users, Heart)
- [ ] Add collapsible support (icon-only mode)
- [ ] Add SidebarRail for resize
- [ ] Mobile-responsive: auto-collapse to Sheet on small screens
- [ ] Add user info footer with avatar
- [ ] Add "View Site" and "Admin" links

### Task 8: Add Dialog for dashboard quick actions

- [ ] `bunx shadcn@latest add dialog`
- [ ] "New Event" quick action opens Dialog with EventForm instead of page navigation
- [ ] "New Update" quick action opens Dialog with UpdateForm
- [ ] "Upload Photos" quick action opens Dialog with upload zone
- [ ] Keep full-page forms for posts (they have more fields) and albums

### Task 9: Replace native selects with shadcn Select

- [ ] `bunx shadcn@latest add select`
- [ ] Replace PostForm status `<select>` with Select
- [ ] Replace EventForm visibility `<select>` with Select
- [ ] Replace UploadForm album `<select>` with Select (with album grouping)
- [ ] Replace memorial relationship `<select>` with Select (with grouped categories)
- [ ] Replace MemberActions role `<select>` with Select

### Task 10: Add Tooltip to dashboard metrics

- [ ] `bunx shadcn@latest add tooltip`
- [ ] Add TooltipProvider to dashboard layout
- [ ] Add tooltips to ClusterMetrics (explain CPU Req%, Memory%)
- [ ] Add tooltips to ServerStats (NVMe usage, CPU details)
- [ ] Add tooltips to UPS status indicators
- [ ] Add tooltips to service monitor status dots (explain healthy/unhealthy/unknown)
- [ ] Add tooltips to truncated post/event titles in dashboard

## Phase 4: Content Pages Polish (2-3 hours)

### Task 11: Add Tabs to events page

- [ ] `bunx shadcn@latest add tabs`
- [ ] Replace events page Upcoming/Past sections with TabsList + TabsContent
- [ ] Add event count badge to each tab trigger
- [ ] Smooth tab transition

### Task 12: Replace blog pagination with shadcn Pagination

- [ ] `bunx shadcn@latest add pagination`
- [ ] Replace custom blog page pagination with Pagination component
- [ ] Add proper ellipsis for large page counts
- [ ] Maintain tag filter query params across pages

### Task 13: Add Breadcrumb navigation

- [ ] `bunx shadcn@latest add breadcrumb`
- [ ] Replace memorial page custom breadcrumb with shadcn Breadcrumb
- [ ] Add breadcrumbs to blog post detail pages (Home > Blog > Post Title)
- [ ] Add breadcrumbs to album detail pages (Home > Photos > Album Name)
- [ ] Add breadcrumbs to all dashboard sub-pages (Dashboard > Posts > Edit)

### Task 14: Replace loading skeletons with Skeleton component

- [ ] `bunx shadcn@latest add skeleton`
- [ ] Rewrite `(public)/loading.tsx` with Skeleton components matching actual page shapes
- [ ] Rewrite `(dashboard)/loading.tsx` with Skeleton components
- [ ] Add Skeleton to Suspense boundaries for blog posts and photo albums

### Task 15: Add Carousel to memorial page photos

- [ ] `bunx shadcn@latest add carousel`
- [ ] Add horizontal carousel view for memorial photos (alternative to grid)
- [ ] Auto-play with pause on hover
- [ ] Previous/Next navigation with Lucide icons
- [ ] Responsive: fewer items on mobile

## Phase 5: Advanced Enhancements (2-3 hours)

### Task 16: Add Calendar date picker to EventForm

- [ ] `bunx shadcn@latest add calendar popover`
- [ ] Replace datetime-local inputs in EventForm with Calendar + Popover pattern
- [ ] Support date range for multi-day events
- [ ] Style calendar with navy-gold accent

### Task 17: Add Drawer for mobile form interactions

- [ ] `bunx shadcn@latest add drawer`
- [ ] Create responsive Dialog+Drawer hook: renders Dialog on desktop, Drawer on mobile
- [ ] Apply to "New Event" and "New Update" dialogs from Task 8
- [ ] Apply to photo detail view on mobile

### Task 18: Add container queries to dashboard widgets

- [ ] Add `@container` to dashboard grid parents
- [ ] Update MetricCard to use `@sm:` container queries instead of `md:` viewport queries
- [ ] Update MediaStatsWidget grid to use container queries
- [ ] Update ServiceMonitor layout to use container queries
- [ ] Verify widgets look correct at all grid sizes

### Task 19: Add ScrollArea + Separator

- [ ] `bunx shadcn@latest add scroll-area separator`
- [ ] Replace all manual `border-t border-border` dividers with Separator (memorial page, homepage, dashboard sections)
- [ ] Add ScrollArea to dashboard sidebar for content overflow
- [ ] Add ScrollArea to MDX code blocks for consistent dark scrollbars
- [ ] Add ScrollArea to lightbox thumbnail strip (if adding one)

### Task 20: Add Command palette (Cmd+K)

- [ ] `bunx shadcn@latest add command`
- [ ] Create global CommandDialog accessible from any page via Cmd+K
- [ ] Command groups: Pages (Home, Blog, Photos, Events, Family, Memorial), Dashboard (Overview, Posts, Photos, Events, Updates, Members), Quick Actions (New Post, Upload Photo, New Event)
- [ ] Search through blog posts and events
- [ ] Add keyboard shortcut hint in nav
- [ ] Style with navy-gold theme

---

## Summary

| Phase | Tasks | Effort | Impact |
|-------|-------|--------|--------|
| 1: Foundation | 2 | 30 min | Theme + quick wins |
| 2: Core Components | 4 | 2-3 hrs | Toasts, confirmations, mobile nav, avatars |
| 3: Dashboard | 4 | 3-4 hrs | Sidebar, dialogs, selects, tooltips |
| 4: Content Pages | 5 | 2-3 hrs | Tabs, pagination, breadcrumbs, skeletons, carousel |
| 5: Advanced | 5 | 2-3 hrs | Calendar, drawer, container queries, command palette |
| **Total** | **20** | **~10-15 hrs** | **Production-grade UI/UX** |
