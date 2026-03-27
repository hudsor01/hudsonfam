# UI Enhancement Analysis: Tailwind CSS v4 + shadcn/ui v4

**Project**: thehudsonfam.com (Next.js 16 family website)
**Date**: 2026-03-27
**Stack**: Next.js 16.2.1, React 19.2.4, Tailwind CSS 4.2.2, Prisma 7.5, better-auth

---

## Current Project Inventory

### UI Components (src/components/ui/)
- **Button** -- primary/accent/ghost variants, sm/md/lg sizes, loading state
- **Card** -- hover prop, padding variants, CardHeader/CardContent subcomponents
- **Badge** -- default/primary/accent/outline variants
- **Input** -- label/error support, auto-generated ID
- **SectionHeader** -- dual-mode: page title (serif h1) or section label (uppercase tracking)

### Public Components (src/components/public/)
- Hero, FeaturedPost, PostCard, EventCard, UpdateCard
- Sidebar (events + photos + weather), PhotoGridPreview
- Lightbox (keyboard + touch swipe), MobileNav (hamburger dropdown)
- WeatherWidget (Open-Meteo API), MDX components

### Dashboard Components (src/components/dashboard/)
- WidgetCard, MetricCard, ServerStatsWidget, ClusterMetrics
- UpsStatusWidget, MediaStatsWidget, WeatherWidget, ServiceMonitor, Bookmarks

### Pages
- **Public**: Home, Blog (with pagination + tag filter), Photos (albums), Events (upcoming/past), Family (updates feed with load-more), Memorial (Richard Hudson Sr.)
- **Auth**: Login, Signup, Forgot Password, Reset, Verify
- **Dashboard**: Overview (stats + quick actions), Posts CRUD, Photos Upload, Albums CRUD, Events CRUD, Updates CRUD, Members (owner), Memorial admin
- **Admin**: Server dashboard (Prometheus/k8s metrics, UPS, weather, bookmarks)

### Current Theme (globals.css)
```css
@theme {
  --color-bg: #171d2a;
  --color-surface: #1a2232;
  --color-border: #2a3345;
  --color-primary: #5b8dd9;
  --color-accent: #d4ad6a;
  --color-text: #f0e8d8;
  --color-text-muted: #7a88a0;
  --color-text-dim: #5a6680;
  --font-serif: "Georgia", "Times New Roman", serif;
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: "Fira Code", "Consolas", monospace;
}
```

Dark-only design (html has `class="dark"` hardcoded). No light mode. Navy + gold color system.

---

## Part 1: Tailwind CSS v4 -- What We Are Missing

### 1.1 Theme System Improvements

**Current state**: We use `@theme` correctly with custom colors and fonts. However, we are underutilizing the theme system.

**Missing opportunities**:

1. **No custom radius tokens** -- We hardcode `rounded-xl`, `rounded-lg`, `rounded-md` etc. throughout the codebase. Defining `--radius-*` tokens in `@theme` would create a consistent design language and make global radius changes trivial.

2. **No custom shadow tokens** -- Cards and surfaces use default Tailwind shadows or none. Custom shadows matching the navy/gold palette (e.g., subtle blue-tinted shadows) would add depth.

3. **No custom spacing overrides** -- Default 0.25rem base is fine, but specific layout spacing constants (like sidebar width at `w-56`) could be theme tokens.

4. **No easing/transition tokens** -- We use `transition-colors duration-200` everywhere manually. Defining `--ease-*` tokens like `--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)` would standardize animations.

5. **No custom animation tokens** -- We only use `animate-spin` and `animate-pulse`. We should define project-specific animations like fade-in, slide-up, and scale-in for page transitions and element reveals.

6. **Colors not in OKLCh** -- Our colors are hex values. Converting to OKLCh would give us access to the wider P3 color gamut on modern displays, making the gold accent richer on supported screens.

7. **No `@theme inline` usage** -- shadcn/ui v4 recommends `@theme inline` when referencing other CSS variables to avoid resolution issues in nested contexts. If we adopt shadcn/ui's CSS variable pattern, this is critical.

### 1.2 Container Queries (First-Class in v4)

Container queries are now built into Tailwind v4 with no plugin needed. These are high-impact for our layout.

**Where container queries would help**:

1. **Dashboard widget cards** -- The admin dashboard grid (`grid-cols-1 md:grid-cols-3`) uses viewport breakpoints. With `@container`, MetricCard and WidgetCard could adapt based on their container width, not the viewport. This means widgets look correct whether they are in a 1-column or 4-column layout.

2. **Sidebar components** -- The public Sidebar renders at `320px` fixed width. Its internal components (events list, photo grid, weather) could use `@container` to adjust layout when the sidebar is resized or used in different contexts.

3. **PostCard / FeaturedPost** -- These cards appear in 1-column, 2-column, and 3-column grids. Container queries would let the card internally decide whether to show/hide metadata, adjust image aspect ratios, or switch text sizes based on available width rather than viewport width.

4. **MediaStatsWidget** -- The nested `grid grid-cols-1 md:grid-cols-3` for Sonarr/Radarr/Jellyfin would benefit from container queries since it is already inside a responsive parent grid.

5. **UpdateCard image grid** -- Images switch between `grid-cols-1`, `grid-cols-2`, and `grid-cols-2 sm:grid-cols-3` using viewport breakpoints. Container queries would make this work correctly regardless of where the card is rendered.

### 1.3 New Animation & Transition Utilities

**What we should adopt**:

1. **Custom `@keyframes` in `@theme`** -- Define entrance animations for page content:
   - `fade-in`: opacity 0 to 1 (for lazy-loaded content)
   - `fade-in-up`: opacity + translateY for card reveals
   - `scale-in`: for lightbox image entrance
   - `slide-in-right`: for mobile nav panel

2. **`@starting-style` support via `starting:` variant** -- This lets us animate elements as they appear without JavaScript. Key use cases:
   - Lightbox overlay entrance (currently instant, no animation)
   - Mobile nav dropdown appearance (currently instant show/hide)
   - Toast/notification appearance (if we add Sonner)
   - Popover entrances for tooltips

3. **`transition-discrete`** -- For animating `display: none` to `display: block` transitions. Useful for the mobile nav and lightbox which toggle visibility.

4. **`motion-safe` / `motion-reduce` variants** -- We use `animate-spin` and `animate-pulse` without reduced-motion guards. All animations should be wrapped with `motion-safe:` for accessibility.

### 1.4 Gradient Enhancements

1. **`bg-linear-*` with angle values** -- The memorial page hero uses `bg-gradient-to-b` and `bg-[radial-gradient(...)]`. The new `bg-linear-45`, `bg-conic-*`, and `bg-radial-*` utilities would simplify these.

2. **Gradient interpolation modifiers** -- `bg-linear-to-r/oklch` produces more vivid gradients. The navy-to-gold gradients on the site would benefit from OKLCh interpolation.

### 1.5 Other v4 Features We Should Use

1. **`field-sizing-content`** -- Auto-resize textareas without JavaScript. We have textareas in PostForm, EventForm, and MemoryForm that would benefit.

2. **`color-scheme-dark`** -- Removes ugly light scrollbars in our dark theme. Should be applied to `<html>` or `<body>`.

3. **`not-*` variant** -- Useful for `not-last:border-b` patterns in our list components (dashboard recent posts, events, service monitor).

4. **`nth-*` variants** -- Could replace our manual grid span logic in the memorial photo gallery.

5. **`inset-shadow-*` and `inset-ring-*`** -- Could add depth to our Card component for a more refined surface treatment.

6. **3D Transform utilities** -- `perspective-*`, `rotate-x-*`, `rotate-y-*` could enhance the photo grid hover effects and card interactions.

7. **`size-*` utility** -- Replace all `w-X h-X` pairs (e.g., `w-8 h-8` on avatars) with `size-8`. This is a quick cleanup.

8. **`data-*` variants** -- `data-current:opacity-100` for nav active states instead of conditional className logic.

### 1.6 @theme inline vs @theme

**Recommendation for our use case**: Use `@theme` (not inline) for our current setup since we define terminal values (hex colors, font stacks) rather than referencing other CSS variables. If we adopt shadcn/ui's dual light/dark CSS variable pattern, switch to `@theme inline` for the color mappings to avoid variable resolution issues in nested contexts.

---

## Part 2: shadcn/ui -- Component-by-Component Analysis

### Dialog

**What**: Modal overlay for forms, confirmations, and focused content. Composed of DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose.

**Our current approach**: No dialog component. Forms are inline on dedicated pages (PostForm, EventForm). The lightbox is a custom full-screen overlay, not a dialog.

**Enhancement**: Replace inline forms with Dialog-based modals for quick actions. "New Event" and "New Update" could be created in dialogs without page navigation. The MemberActions component (role changes, banning) would benefit from confirmation dialogs. Memorial memory moderation (approve/reject) needs a preview dialog.

**Where**: Dashboard quick actions, member management, memorial moderation, photo delete confirmations.

**Priority**: High

---

### Sheet

**What**: Side panel that slides in from any edge (left/right/top/bottom). Extends Dialog for supplementary content.

**Our current approach**: Mobile nav is a custom absolute-positioned dropdown that appears on click. The dashboard sidebar is a static `<aside>`.

**Enhancement**: Replace MobileNav with a Sheet sliding from the right (or left) for a polished mobile experience with proper focus trapping, backdrop, and swipe-to-close. The dashboard sidebar could become a Sheet on mobile for responsive behavior.

**Where**: Mobile navigation, dashboard sidebar on mobile, photo details panel, event details.

**Priority**: High

---

### Sonner (Toast)

**What**: Opinionated toast notification system with success/error/info/warning/promise variants.

**Our current approach**: No toast system. Form errors display inline. Success feedback is typically a redirect. Upload results show inline success/error counts.

**Enhancement**: Add toast notifications for all user actions: post created/updated, photo uploaded, event saved, memory submitted, member role changed, invite sent. Especially valuable for the photo upload flow (per-file success/error toasts). Promise toasts for async operations like photo processing.

**Where**: All CRUD operations across dashboard, photo uploads, memory submissions, auth actions.

**Priority**: High

---

### Tabs

**What**: Layered content panels shown one at a time. TabsList, TabsTrigger, TabsContent.

**Our current approach**: No tabs component. The memorial admin page has separate links for memories/media/content. The dashboard overview shows all stats in a single scroll.

**Enhancement**: The memorial admin could use tabs for Memories/Media/Content instead of separate pages. The events page could use tabs for Upcoming/Past instead of the `<details>` collapse. Blog page tag filters could be presented as a scrollable tab bar. The dashboard could tab between Overview/Services/Bookmarks.

**Where**: Memorial admin, events page, blog tag filters, dashboard sections, user settings.

**Priority**: Medium

---

### Accordion

**What**: Collapsible content sections. AccordionItem, AccordionTrigger, AccordionContent. Single or multiple open modes.

**Our current approach**: Past events use a native `<details>` element for collapse. No other collapsible content.

**Enhancement**: Replace `<details>` on events page with a styled Accordion. FAQ sections could use Accordion. Blog post sidebar (if added) could collapse sections. Dashboard service groups could be collapsible.

**Where**: Events page (past events), potential FAQ page, dashboard service groups.

**Priority**: Low

---

### Avatar

**What**: User image with fallback. Avatar, AvatarImage, AvatarFallback. Supports badges, groups, and sizes.

**Our current approach**: Manual avatar placeholder using first-letter-in-circle pattern (UpdateCard, memorial memories). No actual image support. Hardcoded `w-8 h-8 rounded-full bg-primary/20` styling.

**Enhancement**: Replace all manual avatar implementations with proper Avatar component. Adds image loading with graceful fallback, consistent sizing (sm/md/lg), AvatarGroup for showing multiple family members, and status badges. The members page user list would benefit from avatars.

**Where**: UpdateCard, memorial memories, members list, dashboard user info, nav bar user avatar.

**Priority**: High

---

### Tooltip

**What**: Contextual info on hover/focus. TooltipProvider, Tooltip, TooltipTrigger, TooltipContent.

**Our current approach**: No tooltips anywhere. Dashboard metric labels, icons, and abbreviated text have no hover explanations.

**Enhancement**: Add tooltips to dashboard metric cards (explain what CPU Req%, Memory% mean), service monitor status dots (explain up/down/unknown), icon-only buttons, truncated text, and nav icons. The admin dashboard especially needs tooltips for the dense data displays.

**Where**: Admin dashboard (all metrics), service monitor, icon buttons, truncated post/event titles.

**Priority**: Medium

---

### Skeleton

**What**: Placeholder loading animation component. Single utility component.

**Our current approach**: Custom skeleton loading in `loading.tsx` files using manual `animate-pulse` divs with hardcoded heights and widths.

**Enhancement**: Replace manual skeleton markup with composable Skeleton components. More consistent loading states. Can create reusable skeleton variants (SkeletonCard, SkeletonAvatar, SkeletonText) that match the actual content shape.

**Where**: All loading.tsx files (public + dashboard), any Suspense boundary.

**Priority**: Medium

---

### Sidebar (shadcn)

**What**: Full-featured application sidebar with SidebarProvider, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, collapsible support, rail, and responsive mobile behavior.

**Our current approach**: Static `<aside>` in dashboard layout with hardcoded `w-56` width, simple `<a>` links, and no mobile responsiveness. The sidebar does not collapse and is not accessible on mobile.

**Enhancement**: Replace the dashboard sidebar with shadcn's Sidebar component. Gains: collapsible to icon-only mode, mobile-responsive (auto-hides with Sheet on mobile), SidebarRail for resize, organized menu groups with icons, active state management, user profile footer.

**Where**: Dashboard layout (primary use), potentially admin layout.

**Priority**: High

---

### Breadcrumb

**What**: Hierarchical navigation path. BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis.

**Our current approach**: Manual breadcrumb on the memorial page only, built with plain HTML `<ol>` and schema.org markup.

**Enhancement**: Replace the custom breadcrumb with shadcn Breadcrumb component. Extend to all nested pages: blog post detail, album detail, dashboard CRUD pages (Dashboard > Posts > Edit "Title"), event detail. Consistent styling and accessibility.

**Where**: Memorial page (replace existing), blog post pages, album detail, all dashboard sub-pages.

**Priority**: Medium

---

### Command

**What**: Command palette with search, grouping, and keyboard shortcuts. Built on cmdk library.

**Our current approach**: No command palette or global search.

**Enhancement**: Add a Cmd+K command palette for power-user navigation across the site. Commands: navigate to any page, search posts/events/photos, quick actions (new post, upload photo, new event), dashboard shortcuts. This would be a premium UX feature for family admins.

**Where**: Global (available from any page), especially valuable in the dashboard.

**Priority**: Low (polish feature)

---

### Select

**What**: Styled dropdown select with grouping, search, and custom rendering. Replaces native `<select>`.

**Our current approach**: Native `<select>` elements for post status, event visibility, album picker (upload form). Unstyled beyond border/bg matching.

**Enhancement**: Replace all native `<select>` elements with shadcn Select. Consistent styling with the design system. Supports grouping (e.g., group albums by year), custom item rendering, and keyboard navigation.

**Where**: PostForm (status select), EventForm (visibility select), UploadForm (album select), members page (role change).

**Priority**: Medium

---

### Switch

**What**: Toggle between on/off states. Replaces checkbox for boolean toggles.

**Our current approach**: Native checkbox for "All day event" toggle in EventForm. Manual styling.

**Enhancement**: Replace the "All day event" checkbox with a Switch component. Better visual clarity for boolean toggles. Could also use for: event visibility toggle, post publish/draft toggle, member ban/unban toggle.

**Where**: EventForm (all-day toggle), post publish toggle, notification preferences.

**Priority**: Low

---

### Carousel

**What**: Content slider with swipe gestures and navigation. Built on Embla Carousel.

**Our current approach**: Photo grid is a static grid layout. No carousel or slider anywhere.

**Enhancement**: Add carousel for featured photos on the home page sidebar. Album pages could offer a carousel view mode alongside the grid. The memorial page photo gallery could offer a horizontal scroll carousel. FeaturedPost could cycle through multiple featured posts.

**Where**: Home page (featured content), album alternate view, memorial photos.

**Priority**: Low

---

### Progress

**What**: Progress bar showing completion percentage.

**Our current approach**: Custom ProgressBar component in ServerStatsWidget using manual div-width styling.

**Enhancement**: Replace the custom ProgressBar with shadcn Progress component. More consistent, accessible, and supports labels. Could also use for photo upload progress (show per-file progress), blog writing progress, or photo processing status.

**Where**: Admin dashboard (CPU/Memory/Disk bars), photo upload progress.

**Priority**: Low

---

### Alert Dialog

**What**: Modal for critical confirmations that interrupts workflow. AlertDialogAction, AlertDialogCancel.

**Our current approach**: No confirmation dialogs. Destructive actions (delete post, ban user, reject memory) happen immediately or redirect.

**Enhancement**: Add AlertDialog for all destructive actions: delete post, delete photo, delete album, delete event, ban member, reject memory. The destructive variant provides clear visual weight for irreversible actions.

**Where**: All delete/destructive actions in dashboard, member management, memorial moderation.

**Priority**: High

---

### Drawer

**What**: Mobile-friendly bottom sheet. Alternative to Dialog on mobile.

**Our current approach**: No drawer component. Mobile interactions use the same desktop layouts.

**Enhancement**: Use Drawer as the mobile equivalent of Dialog/Sheet. When creating events, posts, or updates on mobile, a Drawer sliding up from the bottom is more natural than a centered modal. Could also use responsive Dialog+Drawer pattern: Dialog on desktop, Drawer on mobile.

**Where**: All mobile form interactions, photo detail view on mobile, event quick-view.

**Priority**: Medium

---

### Calendar

**What**: Date picker with range selection, month/year navigation, timezone support.

**Our current approach**: Native `datetime-local` input for event dates. No visual calendar picker.

**Enhancement**: Replace the datetime-local inputs in EventForm with a proper Calendar + Popover date picker. Better UX, visual consistency, and support for date range selection (multi-day events). The events page sidebar could show a mini calendar highlighting dates with events.

**Where**: EventForm date inputs, events page sidebar calendar view.

**Priority**: Medium

---

### Pagination

**What**: Page navigation with Previous/Next, numbered pages, and ellipsis.

**Our current approach**: Custom pagination in blog page using manually styled Link elements with conditional active states.

**Enhancement**: Replace the custom blog pagination with shadcn Pagination component. Consistent styling, proper ellipsis for large page counts, accessible markup. Could extend to photo albums, family updates (replace load-more), and dashboard lists.

**Where**: Blog page (replace existing), photo albums, family updates.

**Priority**: Medium

---

### Scroll Area

**What**: Cross-browser custom scrollbar with consistent styling.

**Our current approach**: Default browser scrollbars everywhere. MDX content overflows with native scroll.

**Enhancement**: Use ScrollArea for: dashboard sidebar (if content overflows), lightbox image lists, command palette results, long event descriptions, MDX code blocks. Removes the jarring light scrollbar appearance in our dark theme.

**Where**: Dashboard sidebar, code blocks in blog posts, any fixed-height scrollable container.

**Priority**: Low

---

### Separator

**What**: Semantic horizontal/vertical divider.

**Our current approach**: Manual `<div className="border-t border-border" />` dividers throughout the site (home page, memorial page uses many).

**Enhancement**: Replace all manual border dividers with Separator component. Semantic HTML (`<hr>` or role="separator"), consistent styling, supports both horizontal and vertical orientation. The memorial page alone has 5 manual dividers.

**Where**: Home page section dividers, memorial page dividers, dashboard sections, sidebar sections.

**Priority**: Low

---

### Toggle

**What**: Two-state button (on/off).

**Our current approach**: No toggle buttons.

**Enhancement**: Could use for view mode toggles (grid/list view for photos/blog), text formatting controls (if rich text editor is added), filter toggles on blog page.

**Where**: Photo view mode toggle, blog layout preferences.

**Priority**: Low

---

### Popover

**What**: Rich content overlay triggered by a button. Portal-rendered.

**Our current approach**: No popovers. Additional information requires page navigation.

**Enhancement**: Use Popover for: user profile dropdown in nav, event quick-peek from sidebar, photo metadata display, date picker (Calendar inside Popover). More contextual than full-page navigation for quick information.

**Where**: Nav user menu, date picker, photo EXIF data, event quick-view.

**Priority**: Medium

---

## Part 3: Recommended Enhancement Plan

### Tier 1: High Impact, Low-Medium Effort

These changes deliver the most user-visible improvements and should be done first.

1. **Add Sonner toast notifications** -- Install `sonner`, add `<Toaster />` to root layout, add toast calls to all CRUD operations. Immediate feedback improvement across the entire app.
   - Effort: Low (1-2 hours)
   - Impact: Every user action gets visible feedback

2. **Replace MobileNav with Sheet** -- Swap the custom hamburger dropdown for a Sheet sliding from the left. Gains proper focus trapping, backdrop, animation, and swipe-to-close.
   - Effort: Low (1-2 hours)
   - Impact: Better mobile navigation experience

3. **Add AlertDialog for destructive actions** -- Wrap delete/ban/reject actions in AlertDialog confirmations. Prevents accidental data loss.
   - Effort: Low (2-3 hours)
   - Impact: Safety for all destructive operations

4. **Replace dashboard sidebar with shadcn Sidebar** -- Full sidebar component with collapsible support, mobile responsiveness, and organized menu groups. Biggest single UX improvement for the dashboard.
   - Effort: Medium (3-4 hours)
   - Impact: Dashboard becomes mobile-usable, sidebar is collapsible

5. **Add Avatar component** -- Replace all manual first-letter circles with proper Avatar. Add user profile images.
   - Effort: Low (1-2 hours)
   - Impact: Visual polish across UpdateCard, members, memorial

6. **Add `color-scheme-dark` to html** -- One-line fix to remove light scrollbars throughout the dark theme.
   - Effort: Trivial
   - Impact: Fixes jarring scrollbar mismatch

7. **Replace `w-X h-X` with `size-X`** -- Quick find-and-replace cleanup. At least 15 instances in the codebase.
   - Effort: Trivial
   - Impact: Cleaner code

### Tier 2: Medium Impact, Medium Effort

These add polish and improve specific workflows.

8. **Add Dialog for dashboard quick actions** -- "New Event", "New Update" as dialogs instead of page navigation. Faster content creation.
   - Effort: Medium (3-4 hours)
   - Impact: Faster dashboard workflow

9. **Replace native `<select>` with shadcn Select** -- PostForm status, EventForm visibility, UploadForm album. Consistent design.
   - Effort: Low (2 hours)
   - Impact: Visual consistency across all forms

10. **Add Breadcrumb navigation** -- Extend breadcrumbs from memorial page to all nested pages (blog posts, album detail, dashboard sub-pages).
    - Effort: Medium (2-3 hours)
    - Impact: Better navigation context

11. **Replace custom pagination with shadcn Pagination** -- Blog page gets proper pagination component with ellipsis support.
    - Effort: Low (1-2 hours)
    - Impact: Better blog navigation

12. **Replace loading skeletons with Skeleton component** -- Consistent loading states with composable Skeleton elements.
    - Effort: Low (1-2 hours)
    - Impact: Polished loading experience

13. **Add Tooltip to dashboard metrics** -- Explain CPU Req%, Memory%, UPS stats, service status dots.
    - Effort: Low (1-2 hours)
    - Impact: Dashboard is more understandable

14. **Add Calendar date picker to EventForm** -- Replace datetime-local with Calendar + Popover. Better date selection UX.
    - Effort: Medium (2-3 hours)
    - Impact: Improved event creation experience

15. **Add Tabs to events page** -- Replace `<details>` collapse with Upcoming/Past tabs.
    - Effort: Low (1 hour)
    - Impact: Cleaner events page navigation

16. **Add Drawer for mobile form interactions** -- Responsive Dialog+Drawer pattern: Dialog on desktop, Drawer on mobile.
    - Effort: Medium (2-3 hours)
    - Impact: Native-feeling mobile forms

### Tier 3: Low Impact or High Effort

These are polish features or require more architectural changes.

17. **Define custom animations in @theme** -- fade-in, slide-up, scale-in keyframes for page transitions.
    - Effort: Low (1 hour)
    - Impact: Subtle animation polish

18. **Add `motion-safe`/`motion-reduce` guards** -- Wrap animate-spin, animate-pulse with reduced-motion support.
    - Effort: Trivial
    - Impact: Accessibility compliance

19. **Adopt container queries for dashboard widgets** -- `@container` on widget parent grids so cards adapt to container width.
    - Effort: Medium (2-3 hours)
    - Impact: Widgets work correctly at any grid size

20. **Convert hex colors to OKLCh** -- Richer colors on P3 displays. Non-breaking change.
    - Effort: Low (30 min)
    - Impact: Subtle visual improvement on modern displays

21. **Add custom radius/shadow theme tokens** -- `--radius-card`, `--shadow-card` for consistent surface treatment.
    - Effort: Low (30 min)
    - Impact: Easier global design changes

22. **Add Popover for nav user menu** -- Dropdown showing user info, settings, logout.
    - Effort: Medium (1-2 hours)
    - Impact: Better auth UX

23. **Add ScrollArea for custom scrollbars** -- Replace default scrollbars in sidebar, code blocks, and fixed containers.
    - Effort: Low (1 hour)
    - Impact: Visual consistency in dark theme

24. **Replace manual dividers with Separator** -- Semantic separator component across all pages.
    - Effort: Low (1 hour)
    - Impact: Semantic HTML, consistency

25. **Add Command palette (Cmd+K)** -- Global search and navigation for power users.
    - Effort: High (4-6 hours)
    - Impact: Premium admin UX feature

26. **Add Carousel for photo highlights** -- Home page and memorial page photo carousels.
    - Effort: Medium (2-3 hours)
    - Impact: More engaging photo presentation

27. **Replace Progress bar with shadcn Progress** -- Dashboard stats progress bars.
    - Effort: Low (30 min)
    - Impact: Consistency

28. **Add `field-sizing-content` to textareas** -- Auto-resize without JS.
    - Effort: Trivial
    - Impact: Better textarea UX

29. **Use `@starting-style` for animations** -- CSS-only entrance animations for lightbox, mobile nav, toasts.
    - Effort: Medium (2 hours)
    - Impact: Smooth transitions without JS

30. **Add Toggle for photo view modes** -- Grid/list toggle on photos page.
    - Effort: Low (1 hour)
    - Impact: User preference in photo viewing

### Quick Wins (Under 30 Minutes Each)

These can be done immediately with minimal effort:

- Add `color-scheme-dark` class to `<html>` element
- Replace all `w-X h-X` pairs with `size-X` utility
- Add `motion-safe:` prefix to `animate-spin` and `animate-pulse` usage
- Add `field-sizing-content` class to all `<textarea>` elements
- Convert hex colors to OKLCh in globals.css
- Add custom `--radius-*` and `--ease-*` tokens to `@theme`

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Current custom UI components | 5 |
| Current custom page components | 12 |
| shadcn/ui components analyzed | 23 |
| High priority enhancements | 7 |
| Medium priority enhancements | 9 |
| Low priority enhancements | 14 |
| Quick wins (under 30 min) | 6 |
| Tailwind v4 features to adopt | 12+ |

### Top 5 Highest-ROI Changes

1. **Sonner toasts** -- Trivial to add, every user action benefits
2. **Sheet for mobile nav** -- Small effort, transforms mobile experience
3. **AlertDialog for destructive actions** -- Safety net for all delete/ban operations
4. **shadcn Sidebar for dashboard** -- Makes dashboard mobile-responsive
5. **Avatar component** -- Visual polish across 4+ pages with minimal effort
