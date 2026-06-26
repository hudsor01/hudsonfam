# Requirements: thehudsonfam.com — v6.0 Photo Management Overhaul

**Defined:** 2026-06-26
**Core Value:** A single home for the Hudson family — content for everyone, and Grandma Hudson's recipes preserved and made readable for even the oldest relatives.

## v6.0 Requirements

### Featured (homepage grid) — FEAT

- [ ] **FEAT-01**: The homepage shows a 3×3 grid of up to 9 featured photos; if fewer than 9 are featured, only those render (no empty tiles).
- [ ] **FEAT-02**: The owner curates the featured set from a dashboard manager that shows a live preview mirroring the homepage grid.
- [ ] **FEAT-03**: The owner can add any photo to the featured set from the full photo library and drag to reorder the set.
- [ ] **FEAT-04**: A photo may be featured whether or not it's in a collection; no photo appears more than once in the featured set.

### Collections — COLL

- [ ] **COLL-01**: A photo belongs to at most one collection; adding a photo to a collection removes it from All Photos and from any other collection.
- [ ] **COLL-02**: The owner manages a collection's photos from a per-collection page — add photos from the library and reorder them.
- [ ] **COLL-03**: The "Moving to Dallas" collection is removed with its photos retained (they fall back to All Photos); three empty starter collections exist: "Extending 1407 Judy Driveway", "Richard Jr's 38th Birthday Dinner", "Dad's Trips to Japan".

### Public photos page — PHOTOS

- [ ] **PHOTOS-01**: The public /photos page lists every collection as a card at the top.
- [ ] **PHOTOS-02**: The public /photos page shows an "All Photos" section = every photo that is in no collection.
- [ ] **PHOTOS-03**: No photo filename or title is rendered anywhere on the public site (homepage, /photos, lightbox).

### Visibility & upload — VIS

- [ ] **VIS-01**: Every uploaded photo is publicly visible (in All Photos or its collection) — there is no separate "publish" step in the owner's workflow.
- [ ] **VIS-02**: New uploads default to visible, all existing photos are set visible, and the dashboard publish toggle is removed.

## Future Requirements

Deferred — tracked, not in this milestone.

- **FEAT-F1**: Per-photo captions/titles authored by the owner and shown on hover (currently all titles hidden; revisit only if the owner wants captions).
- **COLL-F1**: Reorder collections themselves on /photos (this milestone uses a fixed order — most-recent first).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rename/edit image titles in the dashboard | Owner explicitly does not want names rendered; hiding them removes the need to manage them. |
| Drag-and-drop a photo directly between collections in the dashboard grid | Per-collection "add from library" (which auto-removes from any other collection) covers it more simply. |
| Removing the `published` DB column outright | Kept as always-true plumbing to avoid touching the `/api/images` auth gate in this milestone; the *owner-facing* publish step is removed. |
| Auth-gated/private photos | v6.0 makes all uploads public by owner decision; a private-photo tier is not in scope. |

## Traceability

Filled by the roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEAT-01..04 | — | Pending |
| COLL-01..03 | — | Pending |
| PHOTOS-01..03 | — | Pending |
| VIS-01..02 | — | Pending |
