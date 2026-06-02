---
phase: 32-prune-dashboard-cleanup
reviewed: 2026-06-02T00:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - next.config.ts
  - prisma/migrations/20260602212415_remove_blog_familyupdate/migration.sql
  - prisma/schema.prisma
  - src/__tests__/lib/dashboard-actions.test.ts
  - src/__tests__/mocks/prisma.ts
  - src/__tests__/prod-readiness.test.ts
  - src/__tests__/production-bugs.test.ts
  - src/app/(dashboard)/dashboard/page.tsx
  - src/app/(dashboard)/dashboard/quick-actions.tsx
  - src/app/(dashboard)/layout.tsx
  - src/app/(public)/layout.tsx
  - src/app/(public)/page.tsx
  - src/app/layout.tsx
  - src/app/not-found.tsx
  - src/app/sitemap.ts
  - src/components/command-palette.tsx
  - src/components/dashboard/app-sidebar.tsx
  - src/lib/dashboard-actions.ts
findings:
  critical: 2
  warning: 4
  info: 3
  total: 9
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-06-02
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

Phase 32 removed the Blog and Family Updates subsystems (routes, DB models, server actions) and cleaned up the dashboard and homepage to reflect the reduced surface area. The migration is narrow and correct — it drops only `BlogPost`, `FamilyUpdate`, and `PostStatus`; surviving tables and the `Visibility` enum are completely untouched. No reviewed source file retains a reference to the removed models.

Two critical issues were found: `deletePhoto` in `dashboard-actions.ts` deletes the Prisma row but leaves the R2 objects (original + thumbnail + medium) as permanent orphans, and the `DialogFooter` component is rendered inside the mobile Drawer path of `QuickEventDialog` where it has no semantic parent, producing a broken submit button in the Drawer layout. Several warnings follow around a dead icon entry in the sidebar map, a Settings link that goes nowhere, stale metadata copy, and a misleading comment in `proxy.ts`. The tests are in good shape with no gutted assertion blocks.

---

## Critical Issues

### CR-01: `deletePhoto` orphans R2 objects — storage leak on every delete

**File:** `src/lib/dashboard-actions.ts:173-178`
**Issue:** `deletePhoto` calls `prisma.photo.delete` only. It never reads `originalPath` / `thumbnailPath` from the record before deleting it, so the three R2 objects (`originals/{albumId}/{id}.webp`, `derived/{id}-thumbnail.webp`, `derived/{id}-medium.webp`) are left in the bucket forever. There is no background job or lifecycle rule to clean them up. Every photo deletion leaks three R2 objects.
**Fix:**
```typescript
export async function deletePhoto(id: string) {
  await requireRole(["owner", "admin"]);

  // Read paths before deletion so we can clean R2
  const photo = await prisma.photo.findUnique({
    where: { id },
    select: { originalPath: true, thumbnailPath: true },
  });

  await prisma.photo.delete({ where: { id } });

  if (photo) {
    const { S3Client, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
    const r2 = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    const mediumKey = photo.thumbnailPath.replace("-thumbnail.webp", "-medium.webp");
    await r2.send(new DeleteObjectsCommand({
      Bucket: process.env.R2_BUCKET!,
      Delete: {
        Objects: [
          { Key: photo.originalPath },
          { Key: photo.thumbnailPath },
          { Key: mediumKey },
        ],
      },
    }));
  }

  revalidatePath("/dashboard/photos");
  revalidatePath("/photos");
}
```

### CR-02: `DialogFooter` rendered in Drawer branch — submit button broken on mobile

**File:** `src/app/(dashboard)/dashboard/quick-actions.tsx:125-151`
**Issue:** The `<form>` passed as `children` to `ResponsiveDialog` contains a `<DialogFooter>` wrapping the submit button. On desktop this renders inside `<DialogContent>` and is fine. On mobile the same `children` render inside `<DrawerContent>` with no `<DialogContent>` parent. `DialogFooter` is a styled `<div>` keyed to the Dialog's flex layout; without that context its positioning breaks (the submit button either disappears into the `px-4` content area or overflows). The `DrawerFooter` is already rendered separately with a Cancel button, so the mobile user sees two footer zones and the "Create Event" submit may be hidden.

**Fix:** Extract the submit button out of `DialogFooter` and use conditional rendering, or pass a separate `footer` prop to `ResponsiveDialog`:
```tsx
// In QuickEventDialog, remove <DialogFooter> and use plain flex:
<form onSubmit={handleSubmit} className="space-y-4">
  <div className="space-y-1.5">
    <Label htmlFor="quick-event-title">Title</Label>
    <Input id="quick-event-title" name="title" placeholder="Event title" required />
  </div>
  <div className="space-y-1.5">
    <Label htmlFor="quick-event-date">Date</Label>
    <Input id="quick-event-date" name="startDate" type="date" required />
  </div>
  {/* Works in both Dialog and Drawer layouts */}
  <div className="flex justify-end pt-2">
    <Button type="submit" disabled={isPending}>
      {isPending ? "Creating..." : "Create Event"}
    </Button>
  </div>
</form>
```

---

## Warnings

### WR-01: Dead `Services: AppWindow` entry in sidebar `iconMap`

**File:** `src/components/dashboard/app-sidebar.tsx:15,40`
**Issue:** `AppWindow` is imported from lucide-react and mapped as `Services: AppWindow` in `iconMap`. The `/dashboard/services` route does not exist (confirmed: directory absent), and the dashboard layout in `(dashboard)/layout.tsx` never injects a Services nav link. The import and map entry are dead code that will never be hit.
**Fix:** Remove the `AppWindow` import and the `Services` entry from `iconMap`:
```typescript
// Remove:
import { ..., AppWindow } from "lucide-react";
// Remove from iconMap:
Services: AppWindow,
```

### WR-02: "Settings" popover link navigates to `/dashboard` (wrong destination)

**File:** `src/components/dashboard/app-sidebar.tsx:143-150`
**Issue:** The Settings item in the user popover uses `href="/dashboard"` — it navigates to the dashboard overview page, not a settings page. There is no `/dashboard/settings` route. This is either a placeholder that was never removed, or a mislabeled link. A user clicking "Settings" expects account/preference settings; instead they are silently redirected to the same page they are already on.
**Fix:** Either remove the Settings link entirely until a settings page exists, or replace it with a relevant destination:
```tsx
// Option A: remove until /dashboard/settings is built
// Option B: rename to "Dashboard" or point to a real page
<Link href="/dashboard">
  <Settings className="size-4" />
  Dashboard
</Link>
```

### WR-03: `rel="noopener"` missing `noreferrer` on external links

**File:** `src/app/(public)/layout.tsx:83`, `src/app/not-found.tsx:67`
**Issue:** Both `<a target="_blank">` links to `hudsondigitalsolutions.com` use `rel="noopener"` without `noreferrer`. `noopener` prevents the opened tab from accessing `window.opener`, but `noreferrer` also strips the `Referer` header so the linked site cannot identify where the click originated. For a private family site this is a privacy consideration — the referrer will expose `thehudsonfam.com` URLs to a third-party domain on every click. The prod-readiness test at line 939 explicitly checks for `rel="noopener"` but does not enforce `noreferrer`.
**Fix:**
```tsx
rel="noopener noreferrer"
```

### WR-04: `proxy.ts` comment references "blog MDX" — stale after blog removal

**File:** `src/proxy.ts:30,81`
**Issue:** Lines 30 and 81 contain comments that explicitly mention "blog MDX" as a reason to keep the CSP middleware scoped to `/admin/*` only. The blog was removed in this phase. The comment is now misleading — it implies blog MDX routes still exist and would be broken by a wider CSP scope, which is false. Future maintainers may be misled when evaluating whether to expand or remove the CSP middleware.
**Fix:** Update the comment to remove the blog reference:
```typescript
// D-05: scope strictly to /admin — do NOT expand to /(.*) because photo OG tags,
// memorial, and public pages use inline styles / external images that a broader
// CSP would block.
```

---

## Info

### IN-01: Root metadata description refers to "Stories" — vestigial blog copy

**File:** `src/app/layout.tsx:11,19,24`
**Issue:** The `description` string `"Stories, photos, and life updates from our corner of the world"` appears in the default metadata, OpenGraph, and Twitter card. "Stories" and "life updates" were the pitch for the now-removed Blog and FamilyUpdate features. The site no longer has those sections.
**Fix:** Update to match the current feature set, e.g.: `"Photos, events, and memories from our corner of the world"`.

### IN-02: `prod-readiness.test.ts` file header claims to cover "GFM tables" — no such test

**File:** `src/__tests__/prod-readiness.test.ts:6`
**Issue:** The JSDoc comment at the top lists "Bug fix verification (photo URLs, GFM tables, event relative time)" as a covered area. The GFM tables test was apparently removed when the blog was pruned, but the header comment was not updated. This is misleading noise — a developer reading the file header believes GFM/Markdown table rendering is tested here.
**Fix:** Remove "GFM tables" from the file-level comment:
```typescript
 * - Bug fix verification (photo URLs, event relative time)
```

### IN-03: MSW imports in `production-bugs.test.ts` are unused (suppressed with `void`)

**File:** `src/__tests__/production-bugs.test.ts:14-15,533-535`
**Issue:** `server`, `http`, and `HttpResponse` are imported from MSW and their only use is `void server; void http; void HttpResponse;` at the bottom — explicit suppression of an "unused import" lint error. No test in the file actually uses MSW handlers. The imports exist as scaffolding for future HTTP-intercepting tests that were never written.
**Fix:** Remove the three imports and the three `void` suppressions. If MSW handler tests are added later, re-add at that time:
```typescript
// Remove:
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';
// Remove from bottom:
void server;
void http;
void HttpResponse;
```

---

_Reviewed: 2026-06-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
