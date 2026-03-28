# shadcn/ui Component Integration Audit

**Date:** 2026-03-28
**Total installed:** 40 components

## INTEGRATED (22 components — imported in application code)

| Component | Imports | Used In |
|-----------|---------|---------|
| alert | 6 | Form error banners |
| alert-dialog | 6 | Delete confirmations, post/event/photo actions |
| avatar | 3 | Memorial page, members, update cards |
| badge | 13 | Status badges across all list pages |
| breadcrumb | 1 | DashboardBreadcrumbs wrapper |
| button | 6 | Forms, actions, navigation |
| card | 8 | Dashboard widgets, list items, content areas |
| command | 1 | CommandPalette (Cmd+K) |
| dropdown-menu | 4 | PostActions, EventActions, PhotoActions, PostRowActions |
| input | 4 | Forms (post, event, album, auth) |
| scroll-area | 1 | Dashboard sidebar nav |
| section-header | 27 | Every page header (most used component) |
| select | 7 | Member role select, form selects |
| separator | 2 | Homepage, memorial page dividers |
| sheet | 1 | Mobile nav (via sidebar dep) |
| skeleton | 2 | Loading states |
| sonner | 1 | Toast provider (Providers component) |
| switch | 1 | Form toggles |
| tabs | 1 | Memorial memories moderation (Pending/Approved) |
| tooltip | 3 | Dashboard tooltips |
| delete-button | 2 | Custom: delete actions with AlertDialog |
| post-row-actions | 1 | Custom: dropdown for post list |

## NOT YET INTEGRATED (18 components — installed, zero application imports)

| Component | Planned Phase | Integration Target |
|-----------|--------------|-------------------|
| calendar | Phase 11 | Event form date picker (replace datetime-local) |
| checkbox | Phase 10 | TanStack Form integration |
| collapsible | Phase 12 | Dashboard collapsible widget sections |
| context-menu | Phase 12 | Right-click actions on dashboard items |
| dialog | Phase 11 | Quick actions on dashboard overview |
| drawer | Phase 11 | Mobile-responsive quick action forms |
| hover-card | Phase 12 | User avatar hover details in member list |
| label | Phase 10 | TanStack Form field labels |
| navigation-menu | Phase 12 | Evaluate for public site nav upgrade |
| pagination | Phase 11 | Blog and photo list pagination |
| popover | Phase 11 | User profile menu, date picker |
| progress | Phase 11 | Photo upload progress indicator |
| radio-group | Phase 10 | TanStack Form radio inputs |
| resizable | Phase 12 | Evaluate for dashboard panel layout |
| sidebar | Phase 9 | Full SidebarProvider dashboard upgrade |
| slider | Phase 12 | Evaluate for admin settings |
| textarea | Phase 10 | TanStack Form textarea fields |
| toggle / toggle-group | Phase 12 | Formatting toolbars, filter toggles |
