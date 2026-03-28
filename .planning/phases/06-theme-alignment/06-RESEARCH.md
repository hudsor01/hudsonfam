# Phase 6-12: Tailwind v4 + shadcn/ui Integration — Research

**Researched:** 2026-03-28
**Domain:** Tailwind CSS v4, shadcn/ui ecosystem
**Confidence:** HIGH — based on full official documentation review

## Summary

Comprehensive audit of Tailwind CSS v4 (tailwindcss.com/docs, 100+ pages) and shadcn/ui (ui.shadcn.com, 70+ pages) documentation compared against the current hudsonfam codebase. Found 5 critical issues with incorrect usage, 17 unused Tailwind v4 features, and 11 unleveraged shadcn ecosystem features.

**Primary recommendation:** Fix CSS variable naming to shadcn standard first (Phase 6), then adopt TW4 features and integrate unused components.

## Critical Issues Found

### 1. CSS Variable Naming Mismatch
shadcn/ui expects: `--background`, `--foreground`, `--primary`, `--accent` (no prefix)
We use: `--color-bg`, `--color-text`, `--color-primary`, `--color-accent`
Impact: Components inconsistently reference `bg-bg`/`text-text` vs `bg-background`/`text-foreground`

### 2. Hardcoded Colors
- alert-dialog.tsx: `bg-red-500`/`hover:bg-red-600` instead of `bg-destructive`
- delete-button.tsx: hardcoded red text instead of `text-destructive`

### 3. Template Literal className
- card.tsx and badge.tsx use `${hover ? "..." : ""}` instead of `cn()`
- Breaks Tailwind Merge class deduplication

### 4. HSL Sidebar Fallback
- globals.css lines 149-169: `:root` and `.dark` blocks with HSL colors
- Conflicts with OKLCH @theme system

### 5. Unintegrated Components
10+ components installed but never imported: Calendar, Dialog, Drawer, Pagination, Popover, Progress, Sheet, Sidebar

## Tailwind v4 Features Catalog

### Typography (NEW)
- `text-balance` — Distributes text evenly across lines (headings, max ~6 lines)
- `text-pretty` — Prevents orphans on last line (body text)
- `text-sm/6` — Font-size/line-height combo syntax

### Form (NEW)
- `field-sizing-content` — Auto-expanding textareas without JS
- `accent-primary` — Theme checkboxes/radios/range inputs
- `caret-primary` — Theme input cursor color

### Layout (NEW)
- Container queries: `@container` parent, `@sm:`/`@md:`/`@lg:` children
- `grid-cols-subgrid` / `grid-rows-subgrid` — Nested grid alignment
- Logical properties: `ps-*`, `pe-*`, `ms-*`, `me-*` — RTL readiness

### Effects (NEW)
- Shadow colors: `shadow-primary/20` — Themed tinted shadows
- Inset shadows: `inset-shadow-*` — Inner depth effects
- 3D transforms: `perspective-*`, `rotate-x-*`, `rotate-y-*`
- Gradient interpolation: `bg-linear-to-r/oklch`

### Interaction (NEW)
- Scroll snap: `snap-x snap-mandatory` + `snap-center`
- `@starting-style` — CSS-only enter animations

### Variants (NEW)
- `not-*` — Negation: `not-last:border-b`
- `open:` — For `<details>` elements
- `inert` — For disabled regions
- `contrast-more:` / `contrast-less:` — Accessibility

### v3→v4 Breaking Changes
- `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`
- `ring` default: 1px currentColor (was 3px blue-500)
- `border` default: currentColor (was gray-200)
- CSS variable syntax: `bg-(--var)` not `bg-[--var]`
- @theme in CSS replaces tailwind.config.js

## shadcn/ui Ecosystem Catalog

### Theming System
- Semantic tokens: background/foreground pairs in OKLCH
- Required tokens: --background, --foreground, --primary, --primary-foreground, --secondary, --secondary-foreground, --muted, --muted-foreground, --accent, --accent-foreground, --destructive, --destructive-foreground, --border, --input, --ring, --radius
- Chart tokens: --chart-1 through --chart-5
- Sidebar tokens: --sidebar-background, --sidebar-foreground, etc.

### Blocks (Pre-built Layouts)
- 16 sidebar variants (sidebar-01 to sidebar-16)
- Dashboard block (dashboard-01: sidebar + charts + data table)
- 5 login variants (login-01 to login-05)
- Install: `npx shadcn add [block-name]`

### CLI v4 (March 2026)
- `init --preset [code]` — Apply design system preset
- `add --dry-run` — Preview changes
- `add --diff` — Compare with registry
- `migrate radix` — Consolidate @radix-ui packages
- `migrate rtl` — Add right-to-left support
- `migrate icons` — Switch icon library
- `build` — Generate registry JSON
- `docs` — Fetch component documentation
- `info` — Display project configuration

### Skills for AI (March 2026)
- `pnpm dlx skills add shadcn/ui`
- Provides project-aware context to AI agents
- Reads components.json for configuration intelligence

### Design System Presets (March 2026)
- Compress 8 design parameters into shareable short code
- `npx shadcn init --preset [code]`
- Parameters: style, colors, fonts, icons, radius, shadows, borders, animations

### Form Integration
- Supports TanStack Form + zod (user requirement)
- Also supports react-hook-form + zod
- Field, FieldLabel, FieldDescription, FieldGroup components

### Data Table
- @tanstack/react-table integration
- Pattern: columns.tsx + data-table.tsx + page.tsx
- Features: pagination, sorting, filtering, column visibility, row selection

### Additional Components Not Yet Installed
- Label, Textarea, Checkbox, Radio Group, Slider, Toggle Group
- Hover Card, Collapsible, Resizable, Navigation Menu, Context Menu, Menubar

## Sources

### Primary (HIGH confidence)
- tailwindcss.com/docs — All utility pages, theme, config, upgrade guide, variants (fetched 100+ pages)
- ui.shadcn.com/docs — All component pages, theming, CLI, blocks, registry, changelog (fetched 70+ pages)

### Secondary (MEDIUM confidence)
- ui.shadcn.com/blocks — Block catalog and installation patterns
- ui.shadcn.com/themes — Theme presets and color system
- ui.shadcn.com/colors — Color palette reference

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (30 days — both ecosystems stable)
