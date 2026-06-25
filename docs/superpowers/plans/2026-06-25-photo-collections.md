# Photo Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace album-only organization + URL-paste memorial photos with one media library where a `Photo` joins many `Collection`s (`CollectionPhoto`), visibility is an explicit `Photo.published` flag, and each placement has its own order/caption/layout — including drag-to-reorder in the dashboard.

**Architecture:** Expand → backfill → cut over → contract, so the app keeps working throughout. Phases 1–5 are additive (new schema/actions/helpers live alongside `Album`); Phase 6–9 cut every surface over to collections; Phase 10 drops `Album`/`Photo.albumId`. Spec: `docs/superpowers/specs/2026-06-25-photo-collections-design.md`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Prisma v7 (`@prisma/adapter-pg`, output `./generated/prisma`), Neon Postgres, Vitest + mocked Prisma (`src/__tests__/mocks/prisma.ts`), DiceUI Sortable (`@diceui/sortable`, dnd-kit), Cloudflare R2 images via `/api/images`.

**Environment notes:**
- Migrations use `DIRECT_DATABASE_URL` via `prisma.config.ts`: `npx prisma migrate dev`.
- The backfill script reads `.env.local` (gitignored) — **run on `main`/this branch, not a worktree**.
- Tests: `npm test`. Typecheck: `npm run typecheck`. Lint: `npm run lint`.
- Commit footer line: `[hudsor01]`.

---

## File Structure

**Create:**
- `src/lib/photo-layout.ts` — pure `layoutToSpan(layout, width, height)` → bento `className`.
- `src/lib/collection-actions.ts` — all collection server actions (`requireRole`-gated).
- `scripts/backfill-collections.ts` — one-shot data backfill.
- `src/components/dashboard/sortable-photo-grid.tsx` — DiceUI-Sortable wrapper (client).
- `src/components/ui/sortable.tsx` — added by the DiceUI registry CLI.
- `src/__tests__/lib/photo-layout.test.ts`, `src/__tests__/lib/collection-actions.test.ts`.

**Modify:**
- `prisma/schema.prisma` — add `Collection`, `CollectionPhoto`, `Photo.published`; (Phase 10) remove `Album`, `Photo.albumId`.
- `src/app/api/images/[...path]/route.ts:69` — gate `!photo.albumId` → `!photo.published`.
- `src/app/(dashboard)/dashboard/photos/page.tsx` + `photo-actions.tsx` — publish toggle + add-to-collection.
- `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx` + `src/app/api/photos/route.ts` — collection picker / published.
- `src/app/(dashboard)/dashboard/photos/albums/*` → collections management (sortable).
- `src/app/(dashboard)/dashboard/memorial/media/page.tsx` + `media-form.tsx` — pick-from-library.
- `src/app/(public)/photos/page.tsx` + `[album]/page.tsx`, `src/app/(public)/page.tsx`, `src/app/(public)/richard-hudson-sr/page.tsx` — read collections / `published`.
- `src/__tests__/prod-readiness.test.ts`, `src/__tests__/lib/images.test.ts` — update assertions.

---

## Phase 1 — Schema expand (additive)

### Task 1: Add Collection / CollectionPhoto / Photo.published

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the two models and the `published` field; keep `Album`/`albumId` for now.** Insert after the `Photo` model and add `published` + relation inside `Photo`:

```prisma
model Collection {
  id           String   @id @default(cuid())
  slug         String   @unique
  title        String
  description  String?
  kind         String   @default("album") // "album" | "surface"
  coverPhotoId String?
  date         DateTime?
  createdAt    DateTime @default(now())
  photos       CollectionPhoto[]
}

model CollectionPhoto {
  id           String     @id @default(cuid())
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  photoId      String
  photo        Photo      @relation(fields: [photoId], references: [id], onDelete: Cascade)
  sortOrder    Int        @default(0)
  caption      String?
  layout       String     @default("auto") // "auto" | "wide" | "tall" | "feature"

  @@unique([collectionId, photoId])
  @@index([collectionId, sortOrder])
  @@index([photoId])
}
```

In `model Photo { ... }` add these two lines (leave `albumId`/`album` in place for now):

```prisma
  published     Boolean           @default(false)
  collections   CollectionPhoto[]
```

and add `@@index([published])`.

- [ ] **Step 2: Create the migration.**

Run: `npx prisma migrate dev --name add_collections`
Expected: migration created under `prisma/migrations/`, client regenerated to `./generated/prisma`, no errors.

- [ ] **Step 3: Typecheck.**

Run: `npm run typecheck`
Expected: exit 0 (the new `prisma.collection` / `prisma.collectionPhoto` delegates exist; `Photo.published` typed).

- [ ] **Step 4: Add the new delegates to the Prisma test mock.**

Modify `src/__tests__/mocks/prisma.ts` — add `collection` and `collectionPhoto` mock objects mirroring the existing `photo`/`album` shape (`findMany`, `findUnique`, `create`, `update`, `delete`, `deleteMany`, `count`, plus `createMany`/`updateMany` for `collectionPhoto`).

- [ ] **Step 5: Run tests (nothing should break — purely additive).**

Run: `npm test`
Expected: all pass.

- [ ] **Step 6: Commit.**

```bash
git add prisma/schema.prisma prisma/migrations src/__tests__/mocks/prisma.ts generated/prisma
git commit -m "feat(db): add Collection/CollectionPhoto + Photo.published (expand)

[hudsor01]"
```

---

## Phase 2 — Layout helper (pure, TDD)

### Task 2: `layoutToSpan`

**Files:**
- Create: `src/lib/photo-layout.ts`
- Test: `src/__tests__/lib/photo-layout.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { describe, it, expect } from 'vitest';
import { layoutToSpan } from '@/lib/photo-layout';

describe('layoutToSpan', () => {
  it('maps explicit layouts to spans', () => {
    expect(layoutToSpan('wide', 100, 100)).toBe('md:col-span-2');
    expect(layoutToSpan('tall', 100, 100)).toBe('md:row-span-2');
    expect(layoutToSpan('feature', 100, 100)).toBe('md:col-span-2 md:row-span-2');
  });
  it('auto: landscape -> wide, portrait -> tall, square -> normal', () => {
    expect(layoutToSpan('auto', 1600, 900)).toBe('md:col-span-2');   // landscape
    expect(layoutToSpan('auto', 900, 1600)).toBe('md:row-span-2');   // portrait
    expect(layoutToSpan('auto', 1000, 1000)).toBe('');               // square
  });
  it('auto with missing dimensions -> normal', () => {
    expect(layoutToSpan('auto', 0, 0)).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run src/__tests__/lib/photo-layout.test.ts`
Expected: FAIL — `layoutToSpan` not found.

- [ ] **Step 3: Implement.**

```ts
// src/lib/photo-layout.ts
export type PhotoLayout = 'auto' | 'wide' | 'tall' | 'feature';

/** Bento span className for the LayoutGrid (md:grid-cols-3, auto-rows). */
export function layoutToSpan(layout: string, width: number, height: number): string {
  switch (layout) {
    case 'wide': return 'md:col-span-2';
    case 'tall': return 'md:row-span-2';
    case 'feature': return 'md:col-span-2 md:row-span-2';
    case 'auto':
    default: {
      if (!width || !height) return '';
      const ratio = width / height;
      if (ratio >= 1.2) return 'md:col-span-2'; // landscape
      if (ratio <= 0.8) return 'md:row-span-2'; // portrait
      return '';                                 // square-ish
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes.**

Run: `npx vitest run src/__tests__/lib/photo-layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/photo-layout.ts src/__tests__/lib/photo-layout.test.ts
git commit -m "feat(photos): layout->span helper (aspect-aware auto)

[hudsor01]"
```

---

## Phase 3 — Collection server actions (TDD)

All actions live in `src/lib/collection-actions.ts`, start with `"use server"`, and call `requireRole(["owner","admin","member"])` (mutating membership) or `requireRole(["owner"])` for destructive collection ops — mirror the role choices in `src/lib/dashboard-actions.ts`. Each calls `revalidatePath` for affected routes.

### Task 3: `addPhotoToCollection` (+ auto-publish)

**Files:**
- Create: `src/lib/collection-actions.ts`
- Test: `src/__tests__/lib/collection-actions.test.ts`

- [ ] **Step 1: Write the failing test** (model mocks on `src/__tests__/prod-readiness.test.ts`: `vi.mock('@/lib/auth')`, `vi.mock('@/lib/session', requireRole resolves to a session)`, `vi.mock('next/cache')`, prisma via the mock).

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '@/__tests__/mocks/prisma';
import { addPhotoToCollection } from '@/lib/collection-actions';

vi.mock('@/lib/session', () => ({
  requireRole: vi.fn().mockResolvedValue({ user: { id: 'u1', role: 'owner' } }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it('creates the join row at next sortOrder and publishes the photo', async () => {
  prismaMock.collectionPhoto.count.mockResolvedValue(2);
  prismaMock.collectionPhoto.create.mockResolvedValue({ id: 'cp1' });
  prismaMock.photo.update.mockResolvedValue({ id: 'p1', published: true });

  await addPhotoToCollection('col1', 'p1');

  expect(prismaMock.collectionPhoto.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ collectionId: 'col1', photoId: 'p1', sortOrder: 2 }) })
  );
  expect(prismaMock.photo.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { published: true } });
});
```

- [ ] **Step 2: Run to verify it fails.**

Run: `npx vitest run src/__tests__/lib/collection-actions.test.ts`
Expected: FAIL — module/function missing.

- [ ] **Step 3: Implement the file header + action.**

```ts
"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";

const EDIT_ROLES = ["owner", "admin", "member"];

async function revalidateSurfaces() {
  revalidatePath("/photos");
  revalidatePath("/richard-hudson-sr");
  revalidatePath("/");
  revalidatePath("/dashboard/photos");
}

export async function addPhotoToCollection(collectionId: string, photoId: string) {
  await requireRole(EDIT_ROLES);
  const sortOrder = await prisma.collectionPhoto.count({ where: { collectionId } });
  await prisma.collectionPhoto.create({ data: { collectionId, photoId, sortOrder } });
  await prisma.photo.update({ where: { id: photoId }, data: { published: true } });
  await revalidateSurfaces();
}
```

- [ ] **Step 4: Run to verify it passes.** `npx vitest run src/__tests__/lib/collection-actions.test.ts` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/collection-actions.ts src/__tests__/lib/collection-actions.test.ts
git commit -m "feat(collections): addPhotoToCollection action

[hudsor01]"
```

### Task 4: `removePhotoFromCollection`

- [ ] **Step 1: Test** — asserts it deletes the `@@unique([collectionId, photoId])` join row and does **not** unpublish the photo.

```ts
it('removes the join row and leaves published untouched', async () => {
  prismaMock.collectionPhoto.delete.mockResolvedValue({ id: 'cp1' });
  await removePhotoFromCollection('col1', 'p1');
  expect(prismaMock.collectionPhoto.delete).toHaveBeenCalledWith({
    where: { collectionId_photoId: { collectionId: 'col1', photoId: 'p1' } },
  });
  expect(prismaMock.photo.update).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Verify fail.** `npx vitest run src/__tests__/lib/collection-actions.test.ts` → FAIL.
- [ ] **Step 3: Implement.**

```ts
export async function removePhotoFromCollection(collectionId: string, photoId: string) {
  await requireRole(EDIT_ROLES);
  await prisma.collectionPhoto.delete({
    where: { collectionId_photoId: { collectionId, photoId } },
  });
  await revalidateSurfaces();
}
```

- [ ] **Step 4: Verify pass.** PASS.
- [ ] **Step 5: Commit.** `git commit -am "feat(collections): removePhotoFromCollection\n\n[hudsor01]"`

### Task 5: `reorderCollectionPhoto`

- [ ] **Step 1: Test** — given an ordered `photoIds[]`, every row's `sortOrder` is set to its index via a transaction.

```ts
it('writes sortOrder = index for each photo in order', async () => {
  prismaMock.$transaction.mockResolvedValue([]);
  await reorderCollectionPhoto('col1', ['pB', 'pA', 'pC']);
  expect(prismaMock.collectionPhoto.update).toHaveBeenNthCalledWith(1, {
    where: { collectionId_photoId: { collectionId: 'col1', photoId: 'pB' } }, data: { sortOrder: 0 },
  });
  expect(prismaMock.collectionPhoto.update).toHaveBeenNthCalledWith(3, {
    where: { collectionId_photoId: { collectionId: 'col1', photoId: 'pC' } }, data: { sortOrder: 2 },
  });
});
```

- [ ] **Step 2: Verify fail.**
- [ ] **Step 3: Implement.**

```ts
export async function reorderCollectionPhoto(collectionId: string, photoIds: string[]) {
  await requireRole(EDIT_ROLES);
  await prisma.$transaction(
    photoIds.map((photoId, sortOrder) =>
      prisma.collectionPhoto.update({
        where: { collectionId_photoId: { collectionId, photoId } },
        data: { sortOrder },
      })
    )
  );
  await revalidateSurfaces();
}
```

- [ ] **Step 4: Verify pass.**
- [ ] **Step 5: Commit.**

### Task 6: `setPhotoLayout`, `setPhotoPublished`

- [ ] **Step 1: Tests.**

```ts
it('setPhotoLayout updates the join row layout', async () => {
  await setPhotoLayout('col1', 'p1', 'feature');
  expect(prismaMock.collectionPhoto.update).toHaveBeenCalledWith({
    where: { collectionId_photoId: { collectionId: 'col1', photoId: 'p1' } }, data: { layout: 'feature' },
  });
});
it('setPhotoPublished updates the photo flag', async () => {
  await setPhotoPublished('p1', false);
  expect(prismaMock.photo.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { published: false } });
});
```

- [ ] **Step 2: Verify fail. Step 3: Implement.**

```ts
const LAYOUTS = ["auto", "wide", "tall", "feature"];
export async function setPhotoLayout(collectionId: string, photoId: string, layout: string) {
  await requireRole(EDIT_ROLES);
  if (!LAYOUTS.includes(layout)) throw new Error("Invalid layout");
  await prisma.collectionPhoto.update({
    where: { collectionId_photoId: { collectionId, photoId } }, data: { layout },
  });
  await revalidateSurfaces();
}
export async function setPhotoPublished(photoId: string, published: boolean) {
  await requireRole(EDIT_ROLES);
  await prisma.photo.update({ where: { id: photoId }, data: { published } });
  await revalidateSurfaces();
}
```

- [ ] **Step 4: Verify pass. Step 5: Commit.**

### Task 7: `createCollection`, `updateCollection`, `deleteCollection`

- [ ] **Step 1: Tests** — `createCollection` slugifies the title and defaults `kind:"album"`; `deleteCollection` requires `["owner"]` and refuses reserved surface slugs (`memorial`).

```ts
it('createCollection slugifies title', async () => {
  prismaMock.collection.create.mockResolvedValue({ id: 'c1' });
  await createCollection({ title: 'Lake Trip 2024' });
  expect(prismaMock.collection.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ slug: 'lake-trip-2024', kind: 'album' }) })
  );
});
it('deleteCollection refuses reserved surface slugs', async () => {
  prismaMock.collection.findUnique.mockResolvedValue({ id: 'm', slug: 'memorial', kind: 'surface' });
  await expect(deleteCollection('m')).rejects.toThrow(/reserved/i);
});
```

- [ ] **Step 2: Verify fail. Step 3: Implement** (add a `slugify` helper; `deleteCollection` looks up by id, throws if `kind === 'surface'`).

```ts
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
export async function createCollection(input: { title: string; description?: string; kind?: string }) {
  await requireRole(EDIT_ROLES);
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  await prisma.collection.create({
    data: { title, slug: slugify(title), description: input.description?.trim() || null, kind: input.kind === "surface" ? "surface" : "album" },
  });
  revalidatePath("/photos"); revalidatePath("/dashboard/photos");
}
export async function updateCollection(id: string, input: { title?: string; description?: string; coverPhotoId?: string | null }) {
  await requireRole(EDIT_ROLES);
  await prisma.collection.update({ where: { id }, data: {
    ...(input.title ? { title: input.title.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.coverPhotoId !== undefined ? { coverPhotoId: input.coverPhotoId } : {}),
  }});
  revalidatePath("/photos"); revalidatePath("/dashboard/photos");
}
export async function deleteCollection(id: string) {
  await requireRole(["owner"]);
  const c = await prisma.collection.findUnique({ where: { id } });
  if (c?.kind === "surface") throw new Error("Reserved surface collection cannot be deleted");
  await prisma.collection.delete({ where: { id } }); // CollectionPhoto rows cascade
  revalidatePath("/photos"); revalidatePath("/dashboard/photos");
}
```

- [ ] **Step 4: Verify pass.** `npm test` → PASS. **Step 5: Commit.**

---

## Phase 4 — Visibility cutover (`/api/images`)

### Task 8: Gate on `published`

**Files:**
- Modify: `src/app/api/images/[...path]/route.ts` (line ~69)
- Test: `src/__tests__/prod-readiness.test.ts` (or the route's existing test)

- [ ] **Step 1: Update the failing assertion / add one** asserting the route gates on `published`, not `albumId`:

```ts
it('image route gates visibility on published, not album membership', async () => {
  const route = await fs.readFile(
    path.join(process.cwd(), 'src', 'app', 'api', 'images', '[...path]', 'route.ts'), 'utf-8');
  expect(route).toMatch(/requiresAuth\s*=\s*!photo\.published/);
  expect(route).not.toMatch(/!photo\.albumId/);
});
```

- [ ] **Step 2: Run, verify fail.** `npx vitest run src/__tests__/prod-readiness.test.ts` → FAIL.
- [ ] **Step 3: Change the gate.** In `route.ts`, replace `const requiresAuth = !photo.albumId;` with `const requiresAuth = !photo.published;` and update the nearby comment. Remove `include: { album: true }` if `album` is no longer used in the handler (keep if still referenced for other logic — check and prune).
- [ ] **Step 4: Verify pass + full suite.** `npm test` → PASS.
- [ ] **Step 5: Commit.**

```bash
git commit -am "feat(images): gate visibility on Photo.published

[hudsor01]"
```

---

## Phase 5 — Backfill (run once against live DB)

### Task 9: Backfill script

**Files:**
- Create: `scripts/backfill-collections.ts` (model on `scripts/fix-photo-data.ts`)

- [ ] **Step 1: Write the script.**

```ts
// scripts/backfill-collections.ts — run: bun run scripts/backfill-collections.ts
import prisma from "@/lib/prisma";

async function main() {
  // 1. Album -> Collection(kind=album); reuse album.id as collection.id for stable refs.
  const albums = await prisma.album.findMany({ include: { photos: { orderBy: { createdAt: "asc" } } } });
  for (const a of albums) {
    await prisma.collection.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, slug: a.slug, title: a.title, description: a.description, kind: "album", coverPhotoId: a.coverPhotoId, date: a.date },
    });
    // 2. Photo.albumId -> CollectionPhoto + publish
    let i = 0;
    for (const p of a.photos) {
      await prisma.collectionPhoto.upsert({
        where: { collectionId_photoId: { collectionId: a.id, photoId: p.id } },
        update: {}, create: { collectionId: a.id, photoId: p.id, sortOrder: i++ },
      });
      await prisma.photo.update({ where: { id: p.id }, data: { published: true } });
    }
  }
  // 3. Reserved memorial surface collection.
  await prisma.collection.upsert({
    where: { slug: "memorial" }, update: {},
    create: { slug: "memorial", title: "Richard Hudson Sr.", kind: "surface" },
  });
  // 4. MemorialMedia(type=photo) whose URL is /api/images/<id> -> memorial collection.
  const mem = await prisma.collection.findUnique({ where: { slug: "memorial" } });
  const photoRows = await prisma.memorialMedia.findMany({ where: { type: "photo" }, orderBy: { sortOrder: "asc" } });
  for (const m of photoRows) {
    const match = m.url.match(/\/api\/images\/([a-z0-9-]+)/i);
    if (!match) { console.warn("Skip unresolvable memorial photo URL:", m.url); continue; }
    const photoId = match[1];
    const exists = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!exists) { console.warn("Skip memorial URL with no Photo:", m.url); continue; }
    await prisma.collectionPhoto.upsert({
      where: { collectionId_photoId: { collectionId: mem!.id, photoId } },
      update: {}, create: { collectionId: mem!.id, photoId, sortOrder: m.sortOrder, caption: m.caption },
    });
    await prisma.photo.update({ where: { id: photoId }, data: { published: true } });
  }
  console.log("Backfill complete.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Dry-verify counts before.** `npm run verify:db` (or `bun run scripts/verify-db-state.ts`) — note album/photo/published counts.
- [ ] **Step 3: Run the backfill.**

Run: `bun run scripts/backfill-collections.ts`
Expected: "Backfill complete.", no errors.

- [ ] **Step 4: Verify in DB.** Confirm: `collection` rows = albums + 1 (memorial); `collectionPhoto` rows = photos-in-album; `Photo.published=true` count = photos-in-album. (Use a quick `prisma` query or the Neon console.)
- [ ] **Step 5: Commit the script.**

```bash
git add scripts/backfill-collections.ts
git commit -m "chore(db): backfill collections from albums + memorial media

[hudsor01]"
```

---

## Phase 6 — Dashboard library controls

### Task 10: Publish toggle + add-to-collection on each photo

**Files:**
- Modify: `src/app/(dashboard)/dashboard/photos/page.tsx` (fetch all collections; pass to `PhotoActions`)
- Modify: `src/app/(dashboard)/dashboard/photos/photo-actions.tsx`

- [ ] **Step 1: Extend `PhotoActions` props** to accept `photo: { id; published }`, `collections: {id;title}[]`, and `memberIds: string[]` (collectionIds the photo is in). Page passes them: `prisma.collection.findMany({ orderBy: { title: 'asc' } })` and per-photo membership from `photo.collections`.
- [ ] **Step 2: Add menu items** in `photo-actions.tsx` (existing `DropdownMenu`):
  - A "Published" `DropdownMenuCheckboxItem` calling `setPhotoPublished(photo.id, !photo.published)`.
  - A submenu "Add to collection" listing collections; each item toggles `addPhotoToCollection`/`removePhotoFromCollection(collectionId, photo.id)` based on membership.
  - Keep the existing delete item.
  Wrap calls in the existing `toast` success/error pattern. Import actions from `@/lib/collection-actions`.
- [ ] **Step 3: Typecheck + lint.** `npm run typecheck && npm run lint` → exit 0.
- [ ] **Step 4: Manual verify** (`npm run dev` → `/dashboard/photos`): toggling publish + add/remove to a collection works and persists (refetch).
- [ ] **Step 5: Commit.**

```bash
git commit -am "feat(dashboard): per-photo publish toggle + add-to-collection

[hudsor01]"
```

### Task 11: Upload form — optional collection + published

**Files:**
- Modify: `src/app/(dashboard)/dashboard/photos/upload/upload-form.tsx`, `src/app/api/photos/route.ts`

- [ ] **Step 1:** Replace the "Album (optional)" `<select>` data source with collections (`kind:"album"` + surfaces). Keep optional. Add a "Publish now" checkbox (default checked).
- [ ] **Step 2:** In `route.ts`, after creating the `Photo`: set `published` from the form flag; if a `collectionId` was provided, create a `CollectionPhoto` (and force `published:true`). Remove the `albumId` write (now superseded; leave column until Phase 10).
- [ ] **Step 3: Typecheck + manual upload test** (upload → appears in library; if collection chosen, shows there and is publicly fetchable).
- [ ] **Step 4: Commit.**

---

## Phase 7 — Collections management + Sortable

### Task 12: Install DiceUI Sortable

- [ ] **Step 1:** `bunx --bun shadcn@latest registry add @diceui` then `bunx --bun shadcn@latest add @diceui/sortable --yes`. Remove any stray `pnpm-lock.yaml`/`pnpm-workspace.yaml` the CLI emits (this is a bun repo).
- [ ] **Step 2: Typecheck.** Fix any React-19 `JSX.Element` issues (use `React.ReactNode`) as we did for LayoutGrid.
- [ ] **Step 3: Commit.** `git commit -am "feat(ui): add DiceUI Sortable via shadcn registry\n\n[hudsor01]"`

### Task 13: `SortablePhotoGrid` wrapper

**Files:**
- Create: `src/components/dashboard/sortable-photo-grid.tsx` (client)

- [ ] **Step 1:** Build a client component that takes `collectionId` and `items: {photoId; url; caption; layout}[]`, renders them with `Sortable`/`SortableItem`, and on drag end calls `reorderCollectionPhoto(collectionId, newPhotoIdOrder)`. Each tile has a layout selector (`setPhotoLayout`) and a remove button (`removePhotoFromCollection`). Use optimistic local state + `toast`.
- [ ] **Step 2: Typecheck + lint.**
- [ ] **Step 3: Commit.**

### Task 14: Collections management pages (replace albums)

**Files:**
- Modify/replace: `src/app/(dashboard)/dashboard/photos/albums/*` → a collections list + `[id]` editor embedding `SortablePhotoGrid`; "New collection" calls `createCollection`.

- [ ] **Step 1:** List page: `prisma.collection.findMany({ where: { kind: 'album' } })` with photo counts; surfaces listed separately (read-only slug). Editor page: collection + its ordered photos → `SortablePhotoGrid`; title/description/cover editing via `updateCollection`; delete via `deleteCollection`.
- [ ] **Step 2:** Update the sidebar/nav links from "Albums" to "Collections" (keep `/dashboard/photos/albums` route path or rename to `/collections` and add a redirect — keep path to minimize churn).
- [ ] **Step 3: Typecheck, lint, manual verify** (create collection, drag-reorder, set layout, delete).
- [ ] **Step 4: Commit.**

---

## Phase 8 — Memorial dashboard: pick from library

### Task 15: Replace URL-paste with library picker

**Files:**
- Modify: `src/app/(dashboard)/dashboard/memorial/media/page.tsx`, `media-form.tsx`

- [ ] **Step 1:** Photos section now manages the `memorial` collection: a "library picker" (grid of all `Photo`s with an Add toggle → `addPhotoToCollection(memorialId, photoId)`) + the `SortablePhotoGrid` for the current memorial photos (order/layout/caption/remove). Fetch the memorial collection by `slug:"memorial"`.
- [ ] **Step 2:** Keep the **videos** section exactly as-is (`addMemorialMedia`/`removeMemorialMedia`, `type:"video"`). Remove only the photo path from the URL form.
- [ ] **Step 3: Typecheck, lint, manual verify.**
- [ ] **Step 4: Commit.**

---

## Phase 9 — Public surfaces cutover

### Task 16: `/photos` + `/photos/[slug]`

**Files:**
- Modify: `src/app/(public)/photos/page.tsx`, `src/app/(public)/photos/[album]/page.tsx`

- [ ] **Step 1:** `/photos`: `prisma.collection.findMany({ where: { kind: 'album' }, include: { photos: { include: { photo: true }, orderBy: { sortOrder: 'asc' }, take: 1 } } })`; cover = `coverPhotoId` ?? first photo. `[album]` route param matches `collection.slug`; render its `CollectionPhoto`→`photo` list ordered by `sortOrder`, images via `/api/images/${photo.id}`.
- [ ] **Step 2: Update** `prod-readiness.test.ts` assertions that referenced `album` reads to collections. `npm test` → PASS.
- [ ] **Step 3: Typecheck, lint, manual verify.**
- [ ] **Step 4: Commit.**

### Task 17: Homepage

**Files:**
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1:** Replace `prisma.photo.findMany({ where: { albumId: { not: null } } })` with `where: { published: true }`, `orderBy: { createdAt: 'desc' }`, `take: <existing limit>`.
- [ ] **Step 2: Typecheck, lint, manual verify** (homepage preview shows published photos).
- [ ] **Step 3: Commit.**

### Task 18: Memorial page LayoutGrid from collection

**Files:**
- Modify: `src/app/(public)/richard-hudson-sr/page.tsx`

- [ ] **Step 1:** Replace `getMemorialPhotos()` (currently `memorialMedia` type=photo) with a query of the `memorial` collection's photos: `prisma.collectionPhoto.findMany({ where: { collection: { slug: 'memorial' } }, include: { photo: true }, orderBy: { sortOrder: 'asc' } })`. Build LayoutGrid cards: `thumbnail: /api/images/${cp.photo.id}?size=medium`, `alt`/`content`: `cp.caption ?? cp.photo.caption ?? "Richard Hudson Sr."`, `className: layoutToSpan(cp.layout, cp.photo.width, cp.photo.height)`. Keep the empty state and the videos block (`MemorialMedia` type=video).
- [ ] **Step 2:** Update `generateMetadata` + the ImageGallery JSON-LD to use the collection photos (first photo for OG). Update the memorial test that asserts the gallery source. `npm test` → PASS.
- [ ] **Step 3: Typecheck, lint, manual verify** (add a photo to the memorial collection in the dashboard → appears on `/richard-hudson-sr` in order, correct bento layout).
- [ ] **Step 4: Commit.**

---

## Phase 10 — Contract (drop Album/albumId) + cleanup

### Task 19: Remove dead album code, then drop schema

**Files:**
- Delete/modify: `src/lib/dashboard-actions.ts` (remove `createAlbum`/`updateAlbum` if fully replaced; keep `deletePhoto`), old `albums/album-form.tsx` if unused.
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Grep for residual references.** `grep -rn "albumId\|prisma.album\|\.album\b\|Album" src` → ensure none remain in app code (only `Collection`). Fix any stragglers.
- [ ] **Step 2: Remove `Album` model + `Photo.albumId`/`album` relation + `@@index([albumId])`** from `prisma/schema.prisma`.
- [ ] **Step 3: Migrate.** `npx prisma migrate dev --name drop_albums` → applies the drop.
- [ ] **Step 4: Update the prisma mock** (remove `album`) and any remaining tests referencing albums. `npm test` → PASS.
- [ ] **Step 5: Full verification.** `npm run typecheck && npm run lint && npm test` → all green.
- [ ] **Step 6: Commit.**

```bash
git commit -am "feat(db): drop Album/Photo.albumId (contract) + remove dead album code

[hudsor01]"
```

### Task 20: Final sweep

- [ ] **Step 1:** Re-read the spec; confirm every surface reads collections/`published`. Manual smoke: upload → publish → add to an album collection → shows on `/photos`; add to memorial collection, reorder, set a "feature" tile → shows on memorial.
- [ ] **Step 2:** Open the PR: `gh pr create --base main` summarizing the migration. Confirm CI (Vercel + lint/typecheck/test) green.

---

## Self-Review Notes

- **Spec coverage:** schema (T1), `published` gate (T8), layout helper (T2), all 8 server actions (T3–T7), backfill incl. memorial-media URL resolution (T9), drag-reorder via DiceUI (T12–T14), memorial pick-from-library (T15), every public surface (T16–T18), videos preserved (T15/T18), contract (T19). ✓
- **Visibility rule:** add auto-publishes (T3), remove never unpublishes (T4), toggle is manual (T6, T10) — matches spec. ✓
- **Type consistency:** join unique key is `collectionId_photoId` everywhere; action names match the spec list; `layoutToSpan` signature consistent across T2/T18.
