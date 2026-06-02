# Phase 32: Prune & Dashboard Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 32-prune-dashboard-cleanup
**Areas discussed:** DB migration strategy, Removed-route behavior, Dashboard refactor depth, Blog content salvage

---

## DB Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Verify-then-drop | Check row counts; drop cleanly if empty, dump-first if non-empty | ✓ |
| Drop unconditionally | Destructive migration, no checks or backup | |
| Leave orphan tables | Remove from Prisma schema only; tables stay in Neon | |

**User's choice:** Verify-then-drop
**Notes:** Row counts couldn't be checked (DB query blocked); seed restore only loaded users/album/photo/events so tables are likely empty, but DB `BlogPost` could hold in-app-authored posts distinct from the 3 MDX files — hence verify before dropping.

---

## Removed-Route Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| 404 | Per the requirement; low-traffic family site | |
| Redirect to home | 308 redirect /blog + /family → / for existing bookmarks | ✓ |
| Let Claude decide | Pick during planning | |

**User's choice:** Redirect to home
**Notes:** Supersedes the "return 404" wording in PRUNE-01/02. Implement via `next.config.ts` `redirects()` (wildcard `/blog/:slug*`). QUAL-03 grep check needs a carve-out for the redirect rules.

---

## Dashboard Refactor Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Clean-prune only | Remove dead pages/nav/actions, leave survivors as-is | |
| Prune + consolidate | Also restructure surviving dashboard areas + rework overview | ✓ |
| Let Claude decide | Pick during planning | |

**User's choice:** Prune + consolidate
**Notes:** Goal is a coherent dashboard reflecting only surviving content (Photos/Events/Members/Memorial), reusing shared `src/components/dashboard/` primitives — not just two deleted pages.

---

## Blog Content Salvage

| Option | Description | Selected |
|--------|-------------|----------|
| Delete all | Remove content/blog entirely; homepage copy authored fresh in Phase 33 | ✓ |
| Salvage welcome copy | Preserve welcome-to-the-hudsons for Phase 33 homepage copy | |
| Let Claude decide | Pick during planning | |

**User's choice:** Delete all
**Notes:** YAGNI. All 3 MDX posts removed with no salvage.

---

## Claude's Discretion

- Migration file naming and redirect status-code mechanics
- Exactly how far to consolidate surviving dashboard layouts (within "coherent + uses shared primitives")

## Deferred Ideas

None — discussion stayed within phase scope.
