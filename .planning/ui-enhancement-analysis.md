# UI Enhancement Analysis: Tailwind CSS v4 + shadcn/ui

**Project**: thehudsonfam.com (Next.js 16 family website)
**Date**: 2026-03-27
**Stack**: Next.js 16.2.1, React 19.2.4, Tailwind CSS 4.2.2, Prisma 7.5, better-auth

---

## Current Project Inventory

### UI Components (src/components/ui/) -- 5 components

| Component | Features | Patterns |
|-----------|----------|----------|
| **Button** | primary/accent/ghost variants, sm/md/lg sizes, loading spinner, disabled state | forwardRef, template literal className concatenation |
| **Card** | hover prop, padding variants (none/sm/md/lg), CardHeader/CardContent subcomponents | forwardRef, conditional hover styles |
| **Badge** | default/primary/accent/outline variants | forwardRef, Record-based variant map |
| **Input** | label/error support, auto-generated ID from label text | forwardRef, conditional error border |
| **SectionHeader** | dual-mode: page title (serif h1 + subtitle) or section label (uppercase tracking), optional action link | forwardRef, conditional rendering by title presence |

### Public Components (src/components/public/) -- 11 components

| Component | Type | Key Features |
|-----------|------|-------------|
| **Hero** | Server | Centered heading with accent tagline, serif title, italic subtitle |
| **FeaturedPost** | Server | Cover image with zoom hover, full-card link via absolute overlay, tag badges, reading time |
| **PostCard** | Server | Compact blog card, 16:9 aspect ratio, line-clamped excerpt, 2 tag limit |
| **EventCard** | Server | Calendar/location icons, relative time label badge, date range formatting |
| **UpdateCard** | Server | Social-post style with avatar initial, relative timestamps, responsive image grid |
| **Sidebar** | Server | Composed of events list, PhotoGridPreview, WeatherWidget in stacked cards |
| **PhotoGridPreview** | Server | 3-column grid of 6 thumbnails with placeholder slots |
| **Lightbox** | Client | Full-screen overlay, keyboard nav (Esc/arrows), touch swipe, counter |
| **MobileNav** | Client | Hamburger toggle, absolute dropdown, pathname-based active state |
| **WeatherWidget** | Server (async) | Open-Meteo API, 30-min ISR cache, weather code to emoji mapping |
| **MDX Components** | Server | Full typography system: h1-h4, p, a, lists, blockquote, code/pre, table, img with figcaption |

### Dashboard Components (src/components/dashboard/) -- 9 components

| Component | Key Features |
|-----------|-------------|
| **WidgetCard** | Header bar with icon + title, content area, card wrapper |
| **MetricCard** | Centered value + label, 5 color options (green/gold/red/blue/default) |
| **ServerStatsWidget** | CPU/Memory/NVMe progress bars with color thresholds (green/yellow/red) |
| **ClusterMetrics** | Pods/Namespaces/CPU Req/Memory in horizontal divided layout |
| **UpsStatusWidget** | Battery/Load/Runtime metrics, status badge (Online/On Battery/Low Battery) |
| **MediaStatsWidget** | 3-column grid: Sonarr/Radarr/Jellyfin with series/queue/missing counts |
| **WeatherWidget** | SVG weather icons, temperature/feels-like/humidity/wind display |
| **ServiceMonitor** | Status dots (up/down/unknown), overall health badge, response time, clickable links |
| **Bookmarks** | 3-column grouped links with external link icons |

### Pages (26 routes across 4 route groups)

| Group | Pages |
|-------|-------|
| **Public** (9) | Home, Blog (pagination + tag filter), Blog [slug], Photos, Photos [album], Events, Family (updates + load-more), Memorial, Not Found |
| **Auth** (5) | Login, Signup, Forgot Password, Reset Password, Verify Email |
| **Dashboard** (12) | Overview, Posts list, Post new, Post edit [id], Photos list, Upload, Albums list, Album new, Album edit [id], Events list, Event new, Event edit [id], Updates list, Update new, Members, Memorial admin (overview + memories + media + content sub-pages) |
| **Admin** (1) | Server dashboard (Prometheus/K8s metrics, UPS, weather, service health, bookmarks) |

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

Dark-only design (html has `class="dark"` hardcoded). No light mode. Navy + gold color system. No radius tokens, no shadow tokens, no easing tokens, no animation tokens, no chart colors, no sidebar-specific colors.

---

## Section 1: shadcn/ui Complete Ecosystem

### 1.1 Philosophy and Architecture

shadcn/ui is fundamentally different from component libraries like Material UI, Chakra, or Mantine. It is a **code distribution platform**, not an npm package. The philosophy rests on five pillars:

1. **Open Code**: You receive the actual component source code. You own it, modify it, and maintain it. No version lock-in, no `!important` overrides, no wrapping components to customize them.

2. **Composition**: Every component shares a common interface. Subcomponents compose together predictably (Dialog + Form, Popover + Calendar = DatePicker, etc.). No special APIs to learn per component.

3. **Distribution**: A flat-file schema and CLI tool (`shadcn`) distribute components across projects. The `add` command copies source files into your project. The `build` command generates registry JSON for sharing your own components.

4. **Beautiful Defaults**: Components arrive styled with OKLCH colors, Tailwind v4 theme tokens, and sensible defaults. The theming system uses CSS variables with a `background`/`foreground` pairing convention.

5. **AI-Ready**: Open code and consistent APIs make components fully readable and modifiable by AI tools. The `shadcn docs` CLI command provides component documentation for agent workflows.

### 1.2 Theming System Deep-Dive

shadcn/ui's theme system is built on two layers:

**Layer 1: CSS Custom Properties** (defined in `:root` and `.dark`)
```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  /* ... */
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  /* ... */
}
```

**Layer 2: @theme inline bridge** (connects CSS vars to Tailwind utilities)
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  /* ... */
}
```

The `@theme inline` directive is critical: it tells Tailwind to resolve the variable *value* at build time rather than outputting a `var()` reference. This prevents resolution issues when CSS variables are overridden at different cascade levels (e.g., inside `.dark`).

**Complete token list** (30 tokens):

| Token | Foreground Pair | Purpose |
|-------|----------------|---------|
| `background` | `foreground` | Page background and default text |
| `card` | `card-foreground` | Elevated card surfaces |
| `popover` | `popover-foreground` | Floating overlays (popover, dropdown, dialog) |
| `primary` | `primary-foreground` | Primary actions (buttons, badges, active states) |
| `secondary` | `secondary-foreground` | Lower-emphasis filled actions |
| `muted` | `muted-foreground` | Subtle surfaces, descriptions, placeholders |
| `accent` | `accent-foreground` | Interactive hover/focus highlights |
| `destructive` | -- | Error/danger states |
| `border` | -- | Default borders |
| `input` | -- | Form control borders |
| `ring` | -- | Focus rings |
| `chart-1` through `chart-5` | -- | Chart color palette |
| `sidebar` | `sidebar-foreground` | Sidebar surface |
| `sidebar-primary` | `sidebar-primary-foreground` | Active sidebar items |
| `sidebar-accent` | `sidebar-accent-foreground` | Sidebar hover states |
| `sidebar-border` | -- | Sidebar dividers |
| `sidebar-ring` | -- | Sidebar focus rings |
| `radius` | -- | Base radius (derived scale via calc()) |

**Radius scale** (derived from a single `--radius` value):
- `radius-sm` = `--radius * 0.6`
- `radius-md` = `--radius * 0.8`
- `radius-lg` = `--radius` (base)
- `radius-xl` = `--radius * 1.4`
- `radius-2xl` = `--radius * 1.8`
- `radius-3xl` = `--radius * 2.2`
- `radius-4xl` = `--radius * 2.6`

**How this maps to our project**: Our current `@theme` uses direct hex colors (`--color-bg`, `--color-surface`, etc.) without the `background`/`foreground` pairing convention. To adopt shadcn/ui components without conflict, we need to either:
- (A) Map our existing tokens to shadcn's token names, or
- (B) Maintain our tokens alongside shadcn's, using `@theme inline` for the shadcn bridge

Option A is recommended. Our `--color-bg` maps to `background`, `--color-surface` maps to `card`, `--color-primary` maps to `primary`, `--color-accent` maps to our gold accent (not shadcn's generic `accent`), etc.

### 1.3 CLI and Tooling

The `shadcn` CLI provides:

| Command | Purpose |
|---------|---------|
| `shadcn init` | Initialize project with `components.json`, globals.css, and theme |
| `shadcn add <component>` | Copy component source files into project |
| `shadcn add --all` | Add every component at once |
| `shadcn build` | Generate registry JSON from `registry.json` |
| `shadcn docs [component]` | Fetch component documentation from terminal |
| `shadcn info` | Display project framework, installed components, docs links |
| `shadcn search` | Search registries for components |
| `shadcn view <items>` | Preview registry items before installing |
| `shadcn migrate rtl` | Convert physical CSS to logical properties |
| `shadcn migrate radix` | Update `@radix-ui/react-*` to unified `radix-ui` package |

**Key flags**: `--dry-run` (preview changes), `--diff` (show file diff), `--overwrite` (force replace), `--cwd` (working directory), `--base` (radix or base primitives).

**Our approach**: Run `shadcn init` to generate `components.json`, then selectively `shadcn add` only the components we need. This gives us the source code to customize while maintaining the ability to diff against upstream changes.

### 1.4 Blocks (Pre-Built Page Layouts)

shadcn/ui provides complete page-level compositions called "blocks" that combine multiple components:

**Dashboard blocks** (Dashboard-01):
- Full application shell with AppSidebar, breadcrumbs, charts (ChartAreaInteractive), data tables, section cards
- Uses SidebarProvider + SidebarInset pattern for responsive layout
- Includes site header with SidebarTrigger

**Sidebar blocks** (7+ variants):
- Sidebar-03: Submenus with collapsible groups
- Sidebar-07: Icon-only collapse mode
- All include breadcrumb navigation and responsive mobile behavior

**Authentication blocks** (Login-03, Login-04, etc.):
- Login forms with muted backgrounds, split layouts with images
- Signup, forgot password, and verification flows

**Relevance to our project**: The Dashboard-01 block is a near-perfect starting point for our dashboard layout. It demonstrates the exact SidebarProvider + collapsible sidebar + breadcrumb + content area pattern we need. The Login blocks could replace our auth pages for a more polished experience.

### 1.5 Charts (Recharts Integration)

shadcn/ui's chart system wraps Recharts with three helper components:

| Component | Purpose |
|-----------|---------|
| `ChartContainer` | Responsive wrapper with `min-h-*` requirement |
| `ChartTooltip` + `ChartTooltipContent` | Themed tooltips with dot/line/dashed indicators |
| `ChartLegend` + `ChartLegendContent` | Styled legend with custom name keys |

Chart types available: Area, Bar, Line, Pie, Radar, Radial -- each with 10+ variants.

`ChartConfig` separates data concerns from display concerns:
```typescript
const chartConfig = {
  cpu: { label: "CPU Usage", color: "var(--chart-1)" },
  memory: { label: "Memory", color: "var(--chart-2)" },
}
```

**Relevance to our project**: The admin dashboard currently shows raw numbers in MetricCard components. Adding Recharts via shadcn's chart system would let us display CPU/Memory/Disk as area/line charts over time, service health as bar charts, and NAS storage as radial gauges. The `accessibilityLayer` prop adds keyboard and screen reader support to charts automatically.

### 1.6 Component-by-Component Analysis (All 50 Components)

#### Category A: High Relevance -- We need these

| Component | Description | Our Current Approach | Enhancement |
|-----------|-------------|---------------------|-------------|
| **Dialog** | Modal overlay with header/title/description/footer | No dialogs; forms are on dedicated pages | Quick-create modals for events/updates without navigation |
| **Alert Dialog** | Interrupting confirmation modal (AlertDialogAction/Cancel) | No confirmation for destructive actions | Confirm delete post/photo/album, ban user, reject memory |
| **Sheet** | Slide-in panel from any edge (left/right/top/bottom) | MobileNav is a custom absolute dropdown | Polished mobile nav with focus trapping, backdrop, swipe |
| **Sonner** | Toast notification system (success/error/info/warning/promise) | No toast system; feedback via redirect or inline | Every CRUD action gets visible feedback |
| **Sidebar** | Full app sidebar with SidebarProvider, collapsible modes (offcanvas/icon/none), mobile Sheet, SidebarMenu hierarchy, SidebarRail, Cmd+B toggle, cookie persistence | Static `<aside>` with hardcoded `w-56`, no mobile support | Collapsible sidebar, mobile-responsive, organized menu groups |
| **Avatar** | Image with fallback (AvatarImage/AvatarFallback), sizes (sm/default/lg), AvatarBadge, AvatarGroup, AvatarGroupCount | Manual first-letter-in-circle (`w-8 h-8 rounded-full bg-primary/20`) | Proper image loading with fallback, consistent sizing, group display |
| **Tooltip** | Contextual info on hover/focus, side positioning (top/right/bottom/left), TooltipProvider required | No tooltips anywhere | Dashboard metrics get explanations, icon buttons get labels |
| **Skeleton** | Loading placeholder with shimmer animation | Manual `animate-pulse` divs in loading.tsx files | Composable SkeletonCard, SkeletonAvatar, SkeletonText |
| **Breadcrumb** | Hierarchical nav (BreadcrumbList/Item/Link/Page/Separator/Ellipsis), dropdown integration | Manual breadcrumb on memorial page only | All nested pages get consistent breadcrumbs |
| **Select** | Styled dropdown (SelectTrigger/Value/Content/Item/Group/Label), popper positioning, form integration | Native `<select>` elements unstyled | Consistent design across all form selects |
| **Tabs** | Layered panels (TabsList/Trigger/Content), line variant, vertical orientation | No tabs; `<details>` for past events collapse | Events Upcoming/Past, memorial admin sections, blog tag filters |
| **Pagination** | Page nav (PaginationContent/Item/Link/Previous/Next/Ellipsis) | Custom pagination with manual Link styling | Consistent blog pagination with ellipsis support |
| **Progress** | Progress bar with value prop | Custom ProgressBar in ServerStatsWidget | Consistent accessible progress for CPU/Memory/Disk |
| **Calendar** | Date picker with single/range/multiple modes, month/year dropdowns, timezone support | Native `datetime-local` input | Visual calendar picker for EventForm |
| **Popover** | Rich floating content (PopoverTrigger/Content/Header/Title/Description) | No popovers | User profile dropdown, date picker, photo EXIF display |
| **Drawer** | Mobile bottom sheet from Vaul library, direction prop (top/right/bottom/left) | No drawer; same layout on mobile and desktop | Responsive Dialog+Drawer pattern: Dialog on desktop, Drawer on mobile |
| **Dropdown Menu** | Full menu system with groups, checkboxes, radio items, sub-menus, shortcuts, destructive variant | No dropdown menus | Post actions menu (edit/delete/publish), album actions, member role change |
| **Form/Field** | Field/FieldControl/FieldLabel/FieldDescription/FieldMessage, React Hook Form + TanStack Form integration | Custom label/error pattern in Input component | Consistent form layout with validation messaging |
| **Switch** | Toggle on/off control, sizes (sm/default), field integration | Native checkbox for "All day event" toggle | Visual toggle for all boolean controls |
| **Item** | Versatile list item with ItemMedia/Content/Title/Description/Actions/Group | Manual list items with custom flex layouts | Consistent list patterns across dashboard |

#### Category B: Medium Relevance -- Would improve specific areas

| Component | Description | Where It Helps |
|-----------|-------------|---------------|
| **Accordion** | Collapsible sections (single/multiple mode) | Events page past events, FAQ, dashboard service groups |
| **Command** | Command palette (CommandDialog/Input/List/Group/Item/Shortcut) | Cmd+K global search/navigation for admins |
| **Carousel** | Content slider on Embla (CarouselContent/Item/Previous/Next, autoplay) | Featured photos on home page, memorial gallery, featured posts rotation |
| **Scroll Area** | Cross-browser custom scrollbar | Dashboard sidebar overflow, MDX code blocks, command palette results |
| **Navigation Menu** | Desktop nav with dropdowns (NavigationMenuTrigger/Content/Link) | Public site top navigation with dropdown sections |
| **Data Table** | TanStack Table with sorting/filtering/pagination/row selection | Dashboard posts list, photos list, members table |
| **Hover Card** | Preview content on hover (openDelay/closeDelay, side positioning) | Blog post previews in dashboard, member profile previews |
| **Resizable** | Draggable panel groups (ResizablePanelGroup/Panel/Handle) | Dashboard layout customization, split-view editors |
| **Table** | Styled table (TableHeader/Body/Row/Head/Cell/Caption/Footer) | Dashboard data tables, MDX table styling |
| **Alert** | Callout with variants (default/destructive), AlertTitle/Description/Action | Success/error messages on form pages, system notifications |
| **Toggle Group** | Multi-button selection (single/multiple, outline variant, spacing) | View mode toggles (grid/list), text formatting toolbar |
| **Input OTP** | One-time password input with copy-paste, pattern validation | Email verification code entry |

#### Category C: Low Relevance -- Nice-to-have or edge cases

| Component | Description | Potential Use |
|-----------|-------------|--------------|
| **Collapsible** | Simple expand/collapse panel | Sidebar sections, settings panels |
| **Separator** | Semantic `<hr>` with horizontal/vertical orientation | Replace manual `border-t border-border` dividers |
| **Toggle** | Two-state button (on/off) | View mode preferences, formatting controls |
| **Aspect Ratio** | Container maintaining aspect ratio | Already using `aspect-square`, `aspect-[16/9]` utilities |
| **Context Menu** | Right-click menu with checkboxes, radio items, sub-menus | Photo right-click actions in gallery |
| **Menubar** | Desktop application menu bar | Not typical for family website |
| **Label** | Accessible label element | Already handled by Input component |
| **Radio Group** | Radio button selection with choice card pattern | Form selections (post visibility, event type) |
| **Checkbox** | Checkbox with indeterminate state | Bulk select in photo management, task lists |
| **Textarea** | Styled textarea | Already have textarea styling in forms |
| **Slider** | Range input with single/range/multi-thumb modes | Photo filters, settings controls |
| **Badge** | Variants: default/secondary/destructive/outline/ghost/link | Already have Badge; shadcn version has more variants |
| **Button** | Variants: default/outline/secondary/ghost/destructive/link, sizes: xs/sm/default/lg/icon-* | Already have Button; shadcn version has more variants and sizes |
| **Card** | Card/CardHeader/CardTitle/CardDescription/CardAction/CardContent/CardFooter, size="sm" | Already have Card; shadcn version has more subcomponents |

---

## Section 2: Tailwind CSS v4 Complete Feature Audit

### 2.1 Theme System (@theme)

**What v4 provides**: The `@theme` directive replaces `tailwind.config.js`. Every `--namespace-name` variable registered in `@theme` automatically creates corresponding utility classes. The namespace determines which utilities are generated.

**Complete namespace reference**:

| Namespace | Utilities Generated | Our Usage |
|-----------|-------------------|-----------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*`, `shadow-*`, etc. | **Used**: 7 colors defined. Missing: chart colors, sidebar colors, destructive, secondary, muted foregrounds |
| `--font-*` | `font-*` | **Used**: serif, sans, mono |
| `--text-*` | `text-*` (font-size) | Not customized (using defaults) |
| `--font-weight-*` | `font-*` (weight) | Not customized |
| `--tracking-*` | `tracking-*` | Not customized |
| `--leading-*` | `leading-*` | Not customized |
| `--breakpoint-*` | `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | Not customized |
| `--container-*` | `@sm:`, `@md:`, `@lg:`, etc. | **Not used at all** |
| `--spacing` | `px-*`, `py-*`, `m-*`, `w-*`, `h-*`, `gap-*`, etc. | Not customized (0.25rem default) |
| `--radius-*` | `rounded-*` | **Not defined** -- hardcoding `rounded-xl`, `rounded-lg`, `rounded-md` throughout |
| `--shadow-*` | `shadow-*` | **Not defined** -- not using shadows on cards/surfaces |
| `--inset-shadow-*` | `inset-shadow-*` | Not used |
| `--drop-shadow-*` | `drop-shadow-*` | Not used |
| `--blur-*` | `blur-*` | Not used |
| `--perspective-*` | `perspective-*` | Not used |
| `--aspect-*` | `aspect-*` | Not customized (using built-in video/square) |
| `--ease-*` | `ease-*` | **Not defined** -- using `transition-colors duration-200` manually |
| `--animate-*` | `animate-*` | **Not defined** -- only using default `animate-spin`, `animate-pulse` |

**What we are missing**:

1. **No radius tokens**: We hardcode `rounded-xl` on cards, `rounded-lg` on inputs/buttons, `rounded-md` on small elements, `rounded-full` on badges/avatars. A single `--radius` base with derived scale would let us adjust the entire design's roundness from one value.

2. **No shadow tokens**: Cards and surfaces use no shadows. Custom navy-tinted shadows (e.g., `--shadow-card: 0 4px 12px -2px oklch(0.12 0.02 250 / 0.3)`) would add depth appropriate to the dark theme.

3. **No easing tokens**: We use Tailwind's default `cubic-bezier(0.4, 0, 0.2, 1)` everywhere. Defining `--ease-smooth`, `--ease-snappy`, `--ease-bounce` would standardize animation feel.

4. **No animation tokens**: Only `animate-spin` and `animate-pulse` from defaults. We need `fade-in`, `fade-in-up`, `scale-in`, `slide-in-right` for UI transitions.

5. **Colors not in OKLCH**: Our colors are hex. OKLCH provides wider P3 gamut (richer gold accent on modern displays) and perceptually uniform lightness manipulation.

6. **No chart colors**: shadcn/ui expects `chart-1` through `chart-5` tokens. We have none, which matters for the Recharts integration.

7. **No sidebar-specific colors**: shadcn's Sidebar component expects `sidebar`, `sidebar-foreground`, `sidebar-primary`, etc. tokens.

### 2.2 Container Queries (Built-in, No Plugin)

Container queries are first-class in v4. Mark a parent with `@container`, then use `@sm:`, `@md:`, `@lg:`, etc. on children.

**Default container breakpoints**:

| Variant | Width |
|---------|-------|
| `@3xs` | 16rem (256px) |
| `@2xs` | 18rem (288px) |
| `@xs` | 20rem (320px) |
| `@sm` | 24rem (384px) |
| `@md` | 28rem (448px) |
| `@lg` | 32rem (512px) |
| `@xl` | 36rem (576px) |
| `@2xl` | 42rem (672px) |
| `@3xl` | 48rem (768px) |
| `@4xl` | 56rem (896px) |
| `@5xl` | 64rem (1024px) |

Also supports: `@max-*` variants, range queries (`@sm:@max-md:`), named containers (`@container/main` + `@sm/main:`), and container query length units (`w-[50cqw]`).

**Where container queries would help in our project**:

1. **Dashboard widget grid**: `MetricCard`, `WidgetCard`, `ClusterMetrics`, `UpsStatusWidget` all use viewport breakpoints (`md:grid-cols-3`). With `@container` on the grid parent, widgets would adapt to their container width, working correctly whether placed in a 1-column, 2-column, or 4-column layout.

2. **MediaStatsWidget**: The nested `grid grid-cols-1 md:grid-cols-3` for Sonarr/Radarr/Jellyfin is already inside a responsive parent grid. Container queries would prevent layout breakage when the parent shrinks.

3. **PostCard / FeaturedPost**: These cards appear in varying column counts. Container queries would let the card adjust image aspect ratios, text sizes, and metadata visibility based on available width.

4. **UpdateCard image grid**: Currently switches between `grid-cols-1`, `grid-cols-2`, `grid-cols-3` using viewport breakpoints. Should use container queries.

5. **Public Sidebar**: At a fixed width, its internal components could use `@container` for consistent behavior if the sidebar width ever changes.

### 2.3 New Variants (v4 + v4.1)

**v4 variants not yet used in our project**:

| Variant | CSS | Where to use |
|---------|-----|-------------|
| `starting:` | `@starting-style` | Lightbox entrance, mobile nav appearance, toast entrance |
| `not-*` | `:not(...)` | `not-last:border-b` in list items, `not-hover:opacity-75` |
| `nth-*` | `:nth-child(...)` | Memorial photo gallery span logic, alternating card styles |
| `in-*` | Parent state without `group` class | Nested hover effects without `group` markers |
| `open:` | `:popover-open, [open]` | Popover/dialog/details open states |
| `inert:` | `[inert]` | Dim content behind modals |
| `data-*` | `[data-...]` | `data-current:opacity-100` for nav active states |
| `motion-safe:` | `prefers-reduced-motion: no-preference` | Guard all animations |
| `motion-reduce:` | `prefers-reduced-motion: reduce` | Reduced motion alternatives |
| `contrast-more:` | `prefers-contrast: more` | High contrast mode support |
| `pointer-fine:` | `pointer: fine` | Mouse-specific interactions |
| `pointer-coarse:` | `pointer: coarse` | Touch-specific hit targets |
| `user-valid:` | `:user-valid` (v4.1) | Show valid state only after user interaction |
| `user-invalid:` | `:user-invalid` (v4.1) | Show invalid state only after user interaction |
| `details-content:` | `::details-content` (v4.1) | Style `<details>` content section |
| `noscript:` | `scripting: none` (v4.1) | Fallback for no-JS users |
| `forced-colors:` | `forced-colors: active` | Windows high-contrast mode support |
| `*` (children) | `& > *` | Style all direct children |
| `**` (descendants) | `& *` | Style all descendants |

### 2.4 New Utilities (v4 + v4.1)

**v4 utilities we should adopt**:

| Utility | CSS | Impact |
|---------|-----|--------|
| `size-*` | `width` + `height` | Replace all `w-X h-X` pairs (15+ instances: avatars, icons, status dots) |
| `color-scheme-dark` | `color-scheme: dark` | Fix light scrollbars in dark theme |
| `field-sizing-content` | `field-sizing: content` | Auto-resize textareas without JS |
| `bg-linear-*` | `linear-gradient(angle, ...)` | Replace `bg-gradient-to-*` with angle-based gradients |
| `bg-radial-*` | `radial-gradient(...)` | Simplified radial gradients for hero/memorial |
| `bg-conic-*` | `conic-gradient(...)` | New gradient type for decorative elements |
| `inset-shadow-*` | `box-shadow: inset ...` | Depth treatment for card surfaces |
| `inset-ring-*` | Inset ring utilities | Refined focus states on inputs |
| `perspective-*` | `perspective: ...` | 3D photo hover effects |
| `rotate-x-*` / `rotate-y-*` | 3D rotation | Card flip animations, photo tilt effects |
| `translate-z-*` | 3D translation | Depth effects in grids |
| `transform-3d` | `transform-style: preserve-3d` | Enable 3D child transforms |

**v4.1 utilities we should adopt**:

| Utility | CSS | Impact |
|---------|-----|--------|
| `text-shadow-*` | `text-shadow: ...` | Hero title depth, heading visual weight |
| `text-shadow-<color>` | Colored text shadows | Gold text shadow on accent text |
| `mask-*` | CSS mask image | Photo fade effects, gradient overlays on images |
| `wrap-break-word` / `wrap-anywhere` | `overflow-wrap` | Long URLs in blog posts, email addresses |
| `drop-shadow-<color>` | Colored drop shadows | Colored drop shadows on SVG icons |
| `pointer-fine:` / `pointer-coarse:` | Device pointer type | Touch-optimized targets |
| `items-baseline-last` | `align-items: last baseline` | Grid alignment for mixed-height content |
| `justify-center-safe` | Safe center alignment | Prevent content clipping when overflowing |

### 2.5 Gradient System

v4 expanded gradients significantly:

**Linear gradients**: `bg-linear-to-r` (directional) and `bg-linear-45` (angle-based) with OKLCH as default interpolation space.

**Radial gradients**: `bg-radial` with position support (`bg-radial-[at_25%_25%]`).

**Conic gradients**: `bg-conic-180` with hue rotation.

**Interpolation modifiers**: Append `/oklch`, `/srgb`, `/hsl` or `/longer`, `/shorter`, `/increasing`, `/decreasing` to control color blending.

**Impact on our project**: The memorial page uses `bg-gradient-to-b` and `bg-[radial-gradient(...)]`. The FeaturedPost and PostCard use `bg-gradient-to-br from-primary/10 to-accent/10` for placeholder backgrounds. Switching to `bg-linear-to-br/oklch from-primary/10 to-accent/10` would produce more vivid navy-to-gold gradients. Conic gradients could create decorative elements on the hero section.

### 2.6 Filter and Backdrop Filter System

All filters are available as utilities with customizable theme values:

**Standard filters**: `blur-*`, `brightness-*`, `contrast-*`, `drop-shadow-*`, `grayscale-*`, `hue-rotate-*`, `saturate-*`, `sepia-*`

**Backdrop filters**: `backdrop-blur-*`, `backdrop-brightness-*`, `backdrop-contrast-*`, `backdrop-grayscale-*`, etc.

**Impact on our project**:
- Photo grid: `hover:brightness-110` or `hover:saturate-125` for interactive photo effects
- Lightbox backdrop: `backdrop-blur-sm` on the overlay for a frosted glass effect
- Memorial page: `sepia` or `grayscale` filters on historical photos
- Dashboard: `backdrop-blur-md` on overlay dialogs for depth

### 2.7 Animation System

v4 allows defining `@keyframes` directly inside `@theme`:

```css
@theme {
  --animate-fade-in: fade-in 0.3s ease-out;
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

Then use with `animate-fade-in`, `motion-safe:animate-fade-in`, `md:animate-fade-in`, etc.

Combined with the `starting:` variant (for `@starting-style`), we can create pure CSS entrance animations without JavaScript:
```html
<div popover class="transition-opacity starting:open:opacity-0 open:opacity-100">
```

And `transition-discrete` enables animating `display: none` <-> `display: block` transitions, useful for the lightbox and mobile nav.

### 2.8 Text Shadow (v4.1)

New text-shadow utilities with 5 sizes and color support:

```html
<h1 class="text-shadow-lg text-shadow-accent/20">The Hudson Family</h1>
```

Adds visual depth to the Hero title and section headings.

### 2.9 Mask Utilities (v4.1)

Composable CSS masking for gradient fades on images:

```html
<img class="mask-b-from-50%" /> <!-- Fade to transparent at bottom from 50% -->
<img class="mask-radial-from-transparent mask-radial-to-black" /> <!-- Radial fade -->
```

Perfect for photo grid hover effects, hero background images, and memorial section transitions.

### 2.10 @theme inline vs @theme

| Directive | When to Use |
|-----------|------------|
| `@theme` | Terminal values: hex colors, font stacks, spacing values. Creates CSS custom properties on `:root`. |
| `@theme inline` | Values referencing other CSS variables: `var(--background)`, `var(--radius)`. Resolves at build time to avoid cascade issues. |
| `@theme static` | Force CSS variable output even if unused (for JavaScript consumption). |

**For our project**: Use `@theme` for our direct color/font values, and `@theme inline` for the shadcn bridge variables that reference `:root`/`.dark` CSS properties.

### 2.11 Color-Scheme Utility

```html
<html class="dark color-scheme-dark">
```

This single class tells the browser to render native UI elements (scrollbars, form controls, text selection) in dark mode. Without it, our dark theme gets jarring light-colored scrollbars.

### 2.12 Field-Sizing Utility

```html
<textarea class="field-sizing-content">
```

Auto-resizes the textarea to fit its content without JavaScript. Applies to our PostForm content textarea, EventForm description, MemoryForm text, and UpdateForm content.

### 2.13 Scroll Snap

Built-in scroll snap utilities for smooth carousel-like scrolling:

```html
<div class="snap-x snap-mandatory overflow-x-auto flex gap-4">
  <div class="snap-center shrink-0 w-80">...</div>
  <div class="snap-center shrink-0 w-80">...</div>
</div>
```

Types: `snap-x`, `snap-y`, `snap-both`. Strictness: `snap-mandatory`, `snap-proximity`. Alignment: `snap-start`, `snap-center`, `snap-end`, `snap-align-none`.

**Impact**: Photo album horizontal scroll, memorial photo gallery, featured posts carousel -- all without a JS carousel library.

---

## Section 3: Complete Enhancement Plan

### Phase 1: Foundation (Theme + Quick Wins)

These are non-breaking changes that establish the design token foundation and fix immediate issues.

**Task 1: Add `color-scheme-dark` to html element**
- File: `src/app/layout.tsx`
- Change: Add `color-scheme-dark` class to `<html>` tag
- Effort: Trivial (1 line)
- Impact: Fixes light scrollbars across entire app

**Task 2: Convert hex colors to OKLCH in globals.css**
- File: `src/styles/globals.css`
- Change: Convert all 7 hex color values to OKLCH notation
- Values:
  - `#171d2a` -> `oklch(0.17 0.02 256)` (bg)
  - `#1a2232` -> `oklch(0.19 0.02 254)` (surface)
  - `#2a3345` -> `oklch(0.27 0.03 252)` (border)
  - `#5b8dd9` -> `oklch(0.63 0.13 255)` (primary)
  - `#d4ad6a` -> `oklch(0.78 0.11 80)` (accent)
  - `#f0e8d8` -> `oklch(0.94 0.02 85)` (text)
  - `#7a88a0` -> `oklch(0.61 0.04 250)` (text-muted)
  - `#5a6680` -> `oklch(0.48 0.04 252)` (text-dim)
- Effort: Low (15 min)
- Impact: Richer colors on P3 displays

**Task 3: Add radius tokens to @theme**
- File: `src/styles/globals.css`
- Change: Add `--radius` base and derived scale matching shadcn/ui convention
- New tokens: `--radius: 0.625rem` with derived `--radius-sm` through `--radius-4xl` via `@theme inline`
- Effort: Low (15 min)
- Impact: Single-value radius control for entire design

**Task 4: Add shadow tokens to @theme**
- File: `src/styles/globals.css`
- Change: Define navy-tinted custom shadows
- New tokens: `--shadow-card`, `--shadow-elevated`, `--shadow-subtle`
- Effort: Low (15 min)
- Impact: Depth treatment for cards and surfaces

**Task 5: Add easing tokens to @theme**
- File: `src/styles/globals.css`
- Change: Define transition timing functions
- New tokens: `--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)`, `--ease-snappy: cubic-bezier(0.2, 0, 0, 1)`, `--ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)`
- Effort: Low (10 min)
- Impact: Standardized animation feel

**Task 6: Add animation keyframes to @theme**
- File: `src/styles/globals.css`
- Change: Define entrance animations
- New animations:
  - `--animate-fade-in`: opacity 0 -> 1 (0.3s ease-out)
  - `--animate-fade-in-up`: opacity + translateY(8px) -> 0 (0.4s ease-out)
  - `--animate-scale-in`: opacity + scale(0.95) -> 1 (0.2s ease-out)
  - `--animate-slide-in-right`: translateX(100%) -> 0 (0.3s ease-smooth)
  - `--animate-slide-in-left`: translateX(-100%) -> 0 (0.3s ease-smooth)
- Effort: Low (20 min)
- Impact: CSS-only entrance animations for UI elements

**Task 7: Add chart and sidebar color tokens**
- File: `src/styles/globals.css`
- Change: Define `chart-1` through `chart-5` and all `sidebar-*` tokens in `:root`/`.dark` with `@theme inline` bridge
- Effort: Low (20 min)
- Impact: Enables shadcn chart and sidebar components

**Task 8: Set up shadcn/ui theme bridge with @theme inline**
- File: `src/styles/globals.css`
- Change: Add `@theme inline` block mapping our tokens to shadcn token names (background, foreground, card, primary, etc.) and the `@layer base` defaults
- Effort: Low (30 min)
- Impact: All shadcn components work with our navy-gold theme

**Task 9: Replace all `w-X h-X` pairs with `size-X`**
- Files: Multiple (15+ instances across components)
- Locations: avatar circles (`w-8 h-8` -> `size-8`), icon SVGs (`w-4 h-4` -> `size-4`, `w-5 h-5` -> `size-5`), status dots (`w-2 h-2` -> `size-2`), weather icon (`w-10 h-10` -> `size-10`), etc.
- Effort: Low (20 min)
- Impact: Cleaner code

**Task 10: Add `motion-safe:` guards to animations**
- Files: `src/components/ui/button.tsx` (spinner), all loading.tsx files (pulse skeletons)
- Change: `animate-spin` -> `motion-safe:animate-spin`, `animate-pulse` -> `motion-safe:animate-pulse`
- Effort: Trivial (10 min)
- Impact: Accessibility compliance

**Task 11: Add `field-sizing-content` to textareas**
- Files: `src/app/(dashboard)/dashboard/posts/post-form.tsx`, `src/app/(dashboard)/dashboard/events/event-form.tsx`, `src/app/(dashboard)/dashboard/updates/new/update-form.tsx`, `src/app/(public)/richard-hudson-sr/memory-form.tsx`
- Change: Add `field-sizing-content` class to all `<textarea>` elements
- Effort: Trivial (10 min)
- Impact: Auto-resizing textareas without JS

**Phase 1 total: 11 tasks, ~3 hours**

---

### Phase 2: Core Components (shadcn/ui Installation)

Install and integrate the highest-impact shadcn/ui components.

**Task 12: Initialize shadcn/ui**
- Run: `bunx shadcn@latest init`
- Creates: `components.json`, updates `globals.css` (merge with existing), installs `radix-ui` dependency
- Effort: Low (15 min)
- Impact: Enables all subsequent component additions

**Task 13: Install Sonner toast notifications**
- Run: `bunx shadcn@latest add sonner`
- File changes: `src/app/layout.tsx` (add `<Toaster />`), all Server Actions and form handlers (add `toast()` calls)
- Coverage: Post create/update/delete, photo upload success/failure, album create/update/delete, event create/update/delete, update create/delete, memory submit/approve/reject, member invite/role-change/ban, invite validation
- Effort: Medium (2-3 hours -- many touch points)
- Impact: Every user action gets visible feedback

**Task 14: Install and integrate Avatar component**
- Run: `bunx shadcn@latest add avatar`
- Files: `src/components/public/update-card.tsx`, `src/app/(dashboard)/dashboard/members/page.tsx`, `src/app/(public)/richard-hudson-sr/page.tsx` (memories section), dashboard nav user display
- Change: Replace manual `<div className="w-8 h-8 rounded-full bg-primary/20 ...">R</div>` with `<Avatar><AvatarFallback>R</AvatarFallback></Avatar>`
- Effort: Low (1-2 hours)
- Impact: Consistent avatars with future image support

**Task 15: Install and integrate Alert Dialog for destructive actions**
- Run: `bunx shadcn@latest add alert-dialog`
- Files: Dashboard delete actions for posts, photos, albums, events, updates; `src/app/(dashboard)/dashboard/members/member-actions.tsx` (ban), `src/app/(dashboard)/dashboard/memorial/memories/memory-actions.tsx` (reject)
- Change: Wrap every delete/ban/reject action in `<AlertDialog><AlertDialogTrigger>...</AlertDialogTrigger><AlertDialogContent>...</AlertDialogContent></AlertDialog>`
- Effort: Medium (2-3 hours)
- Impact: Prevents accidental data loss

**Task 16: Install and integrate Sheet for mobile navigation**
- Run: `bunx shadcn@latest add sheet`
- File: `src/components/public/mobile-nav.tsx`
- Change: Replace the entire custom hamburger dropdown with Sheet component sliding from left
- Gains: Proper focus trapping, backdrop overlay, animation, swipe-to-close, body scroll lock
- Effort: Low (1-2 hours)
- Impact: Polished mobile navigation

**Task 17: Install and integrate Tooltip for dashboard metrics**
- Run: `bunx shadcn@latest add tooltip`
- File: `src/app/layout.tsx` (add `<TooltipProvider>`), `src/components/dashboard/metric-card.tsx`, `src/components/dashboard/service-monitor.tsx`, `src/components/dashboard/cluster-metrics.tsx`
- Change: Wrap metric labels and status dots with tooltips explaining what the values mean
- Effort: Low (1-2 hours)
- Impact: Dashboard becomes self-documenting

**Task 18: Install and replace loading skeletons with Skeleton component**
- Run: `bunx shadcn@latest add skeleton`
- Files: `src/app/(public)/loading.tsx`, `src/app/(dashboard)/loading.tsx`
- Change: Replace manual `animate-pulse` placeholder divs with composable `<Skeleton>` components
- Effort: Low (1-2 hours)
- Impact: Consistent loading states

**Task 19: Install and integrate Select component**
- Run: `bunx shadcn@latest add select`
- Files: `src/app/(dashboard)/dashboard/posts/post-form.tsx` (status), `src/app/(dashboard)/dashboard/events/event-form.tsx` (visibility), `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx` (album)
- Change: Replace native `<select>` elements with `<Select><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>...</SelectContent></Select>`
- Effort: Medium (2 hours)
- Impact: Visual consistency across forms

**Task 20: Install and integrate Switch component**
- Run: `bunx shadcn@latest add switch`
- File: `src/app/(dashboard)/dashboard/events/event-form.tsx`
- Change: Replace native checkbox for "All day event" with Switch toggle
- Effort: Low (30 min)
- Impact: Better boolean toggle UX

**Phase 2 total: 9 tasks, ~12-16 hours**

---

### Phase 3: Dashboard Overhaul

**Task 21: Install and integrate shadcn Sidebar for dashboard**
- Run: `bunx shadcn@latest add sidebar`
- Files: `src/app/(dashboard)/layout.tsx` (complete rewrite), new `src/components/dashboard/app-sidebar.tsx`
- Change: Replace static `<aside className="w-56">` with full SidebarProvider + Sidebar + SidebarContent + SidebarMenu hierarchy
- Features gained: Collapsible to icon-only mode, mobile-responsive (auto Sheet on mobile), SidebarRail for resize, organized menu groups with icons, active state via `isActive`, user profile in SidebarFooter, Cmd+B keyboard shortcut
- Effort: High (4-6 hours)
- Impact: Dashboard becomes mobile-usable, sidebar is collapsible

**Task 22: Install and integrate Breadcrumb for dashboard navigation**
- Run: `bunx shadcn@latest add breadcrumb`
- Files: All dashboard sub-pages (posts/[id], photos/upload, albums/[id], events/[id], memorial/*)
- Change: Add `<Breadcrumb><BreadcrumbList>...</BreadcrumbList></Breadcrumb>` to all nested dashboard pages showing path (Dashboard > Posts > Edit "Title")
- Also replace custom breadcrumb on memorial page
- Effort: Medium (2-3 hours)
- Impact: Clear navigation context everywhere

**Task 23: Install and integrate Dialog for dashboard quick actions**
- Run: `bunx shadcn@latest add dialog`
- File: `src/app/(dashboard)/dashboard/page.tsx`
- Change: Add "New Event" and "New Update" buttons that open DialogContent with inline forms, avoiding page navigation for quick content creation
- Effort: Medium (3-4 hours)
- Impact: Faster dashboard workflow

**Task 24: Install and integrate Dropdown Menu for resource actions**
- Run: `bunx shadcn@latest add dropdown-menu`
- Files: Dashboard posts list, photos list, albums list, events list, updates list, members list
- Change: Add three-dot menu on each row with actions (Edit, Delete, Publish/Unpublish for posts; Download, Delete for photos; etc.)
- Effort: Medium (3-4 hours)
- Impact: Consistent action patterns across dashboard

**Task 25: Install and integrate Tabs for dashboard sections**
- Run: `bunx shadcn@latest add tabs`
- Files: `src/app/(dashboard)/dashboard/memorial/page.tsx`, `src/app/(public)/events/page.tsx`
- Change: Memorial admin uses Tabs for Memories/Media/Content instead of separate pages; Events page uses Tabs for Upcoming/Past instead of `<details>` collapse
- Effort: Low (2 hours)
- Impact: Cleaner section navigation

**Task 26: Install Progress and replace custom ProgressBar**
- Run: `bunx shadcn@latest add progress`
- File: `src/components/dashboard/server-stats.tsx`
- Change: Replace custom `ProgressBar` component with shadcn `<Progress value={percent} />`
- Effort: Low (30 min)
- Impact: Accessible progress bars with consistent styling

**Task 27: Adopt container queries for dashboard widgets**
- Files: `src/components/dashboard/cluster-metrics.tsx`, `src/components/dashboard/media-stats.tsx`, `src/components/dashboard/server-stats.tsx`, `src/app/(admin)/admin/admin-client.tsx`
- Change: Add `@container` to widget grid parents, replace `md:grid-cols-3` with `@md:grid-cols-3` (or appropriate container breakpoint) on child layouts
- Effort: Medium (2-3 hours)
- Impact: Widgets adapt to container width, not viewport

**Task 28: Install and integrate charts for dashboard metrics**
- Run: `bunx shadcn@latest add chart`
- Files: New components in `src/components/dashboard/`, admin dashboard page
- Change: Add area/line charts for CPU/Memory over time (from Prometheus), radial chart for disk usage, bar chart for media library growth
- Requires: API endpoint returning time-series data from Prometheus
- Effort: High (6-8 hours including API work)
- Impact: Visual data representation instead of raw numbers

**Phase 3 total: 8 tasks, ~24-32 hours**

---

### Phase 4: Public Site Polish

**Task 29: Install and integrate Calendar + Popover for EventForm date picker**
- Run: `bunx shadcn@latest add calendar popover`
- File: `src/app/(dashboard)/dashboard/events/event-form.tsx`
- Change: Replace `<input type="datetime-local">` with Calendar inside Popover trigger
- Also: Add optional events sidebar mini-calendar on events page
- Effort: Medium (2-3 hours)
- Impact: Visual date selection UX

**Task 30: Install and integrate Pagination for blog**
- Run: `bunx shadcn@latest add pagination`
- File: `src/app/(public)/blog/page.tsx`
- Change: Replace custom pagination links with `<Pagination><PaginationContent>...</PaginationContent></Pagination>`
- Effort: Low (1-2 hours)
- Impact: Consistent pagination with ellipsis

**Task 31: Install and integrate Drawer for mobile forms**
- Run: `bunx shadcn@latest add drawer`
- Files: Dialog-based forms from Task 23
- Change: Implement responsive Dialog+Drawer pattern: render Dialog on desktop (`min-width: 768px`), Drawer on mobile
- Effort: Medium (2-3 hours per form)
- Impact: Native-feeling mobile form experience

**Task 32: Install and integrate Popover for user profile menu**
- File: `src/app/(public)/layout.tsx` nav section, `src/app/(dashboard)/layout.tsx` sidebar footer
- Change: Add user avatar button that opens Popover with user name, email, settings link, sign out button
- Effort: Low (1-2 hours)
- Impact: Proper user account access

**Task 33: Add entrance animations to page content**
- Files: Hero, FeaturedPost, PostCard, EventCard, UpdateCard, Sidebar sections
- Change: Add `animate-fade-in-up` to page-level content, `animate-fade-in` to card reveals, `animate-scale-in` to lightbox image entrance
- Use `motion-safe:` prefix on all animations
- Effort: Low (1-2 hours)
- Impact: Subtle polish on page transitions

**Task 34: Add `@starting-style` animations to overlays**
- Files: `src/components/public/lightbox.tsx`, mobile nav Sheet, toast Toaster
- Change: Use `starting:opacity-0 transition-opacity` for CSS-only entrance animations
- Note: Requires browser support check; falls back gracefully
- Effort: Low (1 hour)
- Impact: Smooth overlay transitions without JS

**Task 35: Apply gradient interpolation upgrades**
- Files: `src/components/public/featured-post.tsx`, `src/components/public/post-card.tsx`, memorial page
- Change: Replace `bg-gradient-to-br` with `bg-linear-to-br/oklch` for more vivid navy-to-gold gradients
- Effort: Trivial (15 min)
- Impact: Richer gradient colors on P3 displays

**Task 36: Add text shadows to headings**
- Files: `src/components/public/hero.tsx`, section headers
- Change: Add `text-shadow-sm text-shadow-accent/10` to Hero h1 for subtle depth
- Effort: Trivial (10 min)
- Impact: Visual depth on headings

**Task 37: Add photo filter effects**
- Files: `src/components/public/photo-grid-preview.tsx`, album photo grid
- Change: Add `hover:brightness-110 hover:saturate-110 transition-all` on photo thumbnails; `backdrop-blur-sm` on lightbox overlay
- Effort: Low (30 min)
- Impact: Interactive photo hover effects

**Task 38: Implement scroll snap for photo albums**
- Files: `src/app/(public)/photos/[album]/album-photo-grid.tsx`
- Change: Add horizontal scroll snap gallery as alternate view: `snap-x snap-mandatory overflow-x-auto flex gap-4` with `snap-center` on items
- Effort: Low (1 hour)
- Impact: Swipeable photo gallery without carousel library

**Phase 4 total: 10 tasks, ~14-20 hours**

---

### Phase 5: Advanced Enhancements

**Task 39: Install and integrate Command palette (Cmd+K)**
- Run: `bunx shadcn@latest add command`
- Files: New `src/components/command-palette.tsx`, `src/app/layout.tsx`
- Change: Global Cmd+K search with groups: Navigate (pages), Search (posts, events, photos), Quick Actions (new post, upload photo, new event), Dashboard (server status)
- Requires: Search API endpoint
- Effort: High (4-6 hours)
- Impact: Power-user navigation feature

**Task 40: Install and integrate Carousel for featured content**
- Run: `bunx shadcn@latest add carousel`
- Files: Home page sidebar or hero area, memorial page gallery
- Change: Auto-playing carousel for featured photos with navigation dots
- Effort: Medium (2-3 hours)
- Impact: More engaging content presentation

**Task 41: Install and integrate Scroll Area for custom scrollbars**
- Run: `bunx shadcn@latest add scroll-area`
- Files: Dashboard sidebar, MDX code blocks, command palette results
- Change: Wrap scrollable containers in `<ScrollArea>` for consistent dark-themed scrollbars
- Effort: Low (1-2 hours)
- Impact: Visual consistency in scrollable areas

**Task 42: Install and integrate Separator for semantic dividers**
- Run: `bunx shadcn@latest add separator`
- Files: Memorial page (5 manual dividers), home page section dividers, sidebar between sections
- Change: Replace `<div className="border-t border-border" />` with `<Separator />`
- Effort: Low (1 hour)
- Impact: Semantic HTML, consistent styling

**Task 43: Install and integrate Data Table for dashboard lists**
- Run: `bunx shadcn@latest add table` (already a dep of data-table pattern)
- Files: Dashboard posts list, photos list, members list
- Change: Implement TanStack Table with sorting, filtering, pagination, row selection
- Effort: High (6-8 hours)
- Impact: Professional data management in dashboard

**Task 44: Install and integrate Alert component for system messages**
- Run: `bunx shadcn@latest add alert`
- Files: Auth pages (login errors), dashboard (system status), memorial (submission confirmation)
- Change: Replace inline error/success text with `<Alert variant="destructive">` or `<Alert>`
- Effort: Low (1-2 hours)
- Impact: Consistent alert styling

**Task 45: Add 3D transform effects to photo interactions**
- Files: Photo grid, featured post cards
- Change: Add `perspective-distant` on grid parent, `hover:rotate-y-2 hover:scale-105 transition-transform transform-3d` on photo cards for subtle 3D tilt on hover
- Effort: Low (1 hour)
- Impact: Premium interactive feel

**Task 46: Install and integrate Input OTP for email verification**
- Run: `bunx shadcn@latest add input-otp`
- File: `src/app/(auth)/verify/page.tsx`
- Change: Replace text input with `<InputOTP maxLength={6}>` for verification code entry
- Effort: Low (1 hour)
- Impact: Better verification flow UX

**Task 47: Add mask utilities for photo effects**
- Files: Photo grid, hero section, memorial gallery
- Change: `mask-b-from-70%` on hero background image for bottom fade; `mask-radial-from-transparent mask-radial-to-black` on memorial gallery for vignette effect
- Effort: Low (30 min)
- Impact: Subtle photo presentation polish

**Task 48: Add `not-*` and `nth-*` variants to list components**
- Files: ServiceMonitor, event lists, dashboard post lists
- Change: Replace manual `last:border-b-0` patterns with `not-last:border-b`; use `nth-*` for alternating styles
- Effort: Low (30 min)
- Impact: Cleaner variant logic

**Task 49: Add `user-valid` / `user-invalid` to form inputs**
- Files: All form pages (login, signup, post-form, event-form, etc.)
- Change: Replace `invalid:border-red-400` with `user-invalid:border-red-400` so validation only shows after user interaction
- Effort: Low (30 min)
- Impact: Better form validation UX

**Task 50: Add `pointer-coarse` touch target adjustments**
- Files: Mobile nav links, sidebar menu items, small buttons
- Change: Add `pointer-coarse:p-4` or `pointer-coarse:min-h-12` for larger touch targets on mobile devices
- Effort: Low (30 min)
- Impact: Accessibility on touch devices

**Task 51: Install and integrate Navigation Menu for public site**
- Run: `bunx shadcn@latest add navigation-menu`
- File: `src/app/(public)/layout.tsx` desktop nav
- Change: Replace simple nav links with NavigationMenu supporting dropdown content for Blog (recent posts), Photos (featured albums), About (family members)
- Effort: Medium (2-3 hours)
- Impact: Rich desktop navigation

**Task 52: Install and integrate Hover Card for preview content**
- Run: `bunx shadcn@latest add hover-card`
- Files: Dashboard post/event links, blog tag links
- Change: Preview blog posts and events on hover without navigation
- Effort: Low (1-2 hours)
- Impact: Quick content preview

**Task 53: Install and integrate Form/Field components for consistent form layout**
- Run: `bunx shadcn@latest add field` (or form integration via React Hook Form guide)
- Files: All dashboard forms (post-form, event-form, album-form, upload-form, invite-form, memory-form, content-form, media-form, update-form)
- Change: Wrap all form inputs in Field/FieldLabel/FieldDescription/FieldMessage pattern for consistent spacing, labels, and error display
- Effort: High (4-6 hours -- many forms)
- Impact: Consistent, accessible form layout across entire app

**Task 54: Add `wrap-anywhere` to long text content**
- Files: Blog post content, event descriptions, user-submitted memories
- Change: Add `wrap-anywhere` or `wrap-break-word` to content containers to prevent long URLs or words from breaking layout
- Effort: Trivial (15 min)
- Impact: Prevents layout overflow from user content

**Phase 5 total: 16 tasks, ~26-38 hours**

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Current custom UI components | 5 |
| Current custom page components (public) | 11 |
| Current custom page components (dashboard) | 9 |
| Total pages/routes | 26 |
| shadcn/ui components analyzed | 50 |
| shadcn/ui components recommended to install | 28 |
| Tailwind v4 features to adopt | 22 |
| Total enhancement tasks | 54 |

### Phase Breakdown

| Phase | Tasks | Effort | Focus |
|-------|-------|--------|-------|
| **Phase 1: Foundation** | 11 | ~3 hours | Theme tokens, quick wins, OKLCH, accessibility |
| **Phase 2: Core Components** | 9 | ~12-16 hours | Essential shadcn/ui components (toast, avatar, alerts, sheet, tooltip, skeleton, select, switch) |
| **Phase 3: Dashboard Overhaul** | 8 | ~24-32 hours | Sidebar, breadcrumbs, dialogs, menus, tabs, charts, container queries |
| **Phase 4: Public Site Polish** | 10 | ~14-20 hours | Calendar, pagination, drawer, animations, gradients, filters, scroll snap |
| **Phase 5: Advanced** | 16 | ~26-38 hours | Command palette, data tables, 3D transforms, forms, navigation, hover cards |

### Top 10 Highest-ROI Changes

1. **Task 1: `color-scheme-dark`** -- 1 line, fixes every scrollbar in the app
2. **Task 13: Sonner toasts** -- Every CRUD action gets instant feedback
3. **Task 16: Sheet for mobile nav** -- Replaces broken dropdown with polished slide-in
4. **Task 15: AlertDialog for destructive actions** -- Safety net for all delete/ban operations
5. **Task 21: shadcn Sidebar for dashboard** -- Makes entire dashboard mobile-responsive
6. **Task 14: Avatar component** -- Visual polish across 4+ pages, future image support
7. **Task 8: shadcn theme bridge** -- Unlocks all shadcn components in our navy-gold theme
8. **Task 9: `size-*` cleanup** -- Immediate code quality improvement, 15+ files
9. **Task 11: `field-sizing-content`** -- Auto-resize textareas, zero JS, 4 forms benefit
10. **Task 17: Tooltip on dashboard** -- Dashboard becomes self-documenting for non-technical users
