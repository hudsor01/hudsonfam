---
phase: 40-data-setup-quality-gate
plan: 01
type: ops
wave: 1
requirements: [COLL-03]
autonomous: false   # live-DB + prod merge — owner-confirmed gated steps
must_haves:
  truths:
    - "Moving to Dallas collection is gone; its 3 photos remain (now All Photos)"
    - "Three starter album collections exist: Extending 1407 Judy Driveway, Richard Jr's 38th Birthday Dinner, Dad's Trips to Japan"
    - "A featured surface collection (slug: featured) exists and drives the homepage grid"
    - "All existing photos are published:true (visible)"
    - "lint + test + Vercel build are green; v6.0 is live on thehudsonfam.com"
---

<objective>
Final go-live for v6.0. Code (phases 37-39) is complete on milestone/v6.0-photos and renders gracefully with no featured/starter data. This phase ships the code to production and performs the gated, owner-confirmed live-DB setup. (COLL-03 + ROADMAP phase-40 success criteria.)
</objective>

<gated_steps>
All steps below are deliberate, owner-confirmed operations (NOT auto-applied on deploy).

## A. Ship the code
1. Open PR: milestone/v6.0-photos -> main. Confirm CI (lint/typecheck/test) + Vercel build green.
2. Merge -> production deploys v6.0. (Homepage featured grid renders an empty state until step B seeds it — graceful, by design.)

## B. Live-DB data setup (Neon SQL — owner-confirmed)
1. CREATE the featured surface collection: kind="surface", slug="featured", title="Featured".
2. CREATE 3 starter album collections (kind="album", empty): "Extending 1407 Judy Driveway", "Richard Jr's 38th Birthday Dinner", "Dad's Trips to Japan".
3. BACKFILL: UPDATE "Photo" SET published=true WHERE published=false  (all uploads public).
4. SEED featured with the 6 already-curated photos (the previous homepage set) so the homepage launches populated; owner adjusts via /dashboard/photos/featured.
5. DELETE the "Moving to Dallas" collection + its 3 CollectionPhoto links (photos retained -> All Photos).
   (Destructive on the Collection/CollectionPhoto rows only; the Photo rows are NOT deleted.)

## C. Verify live
- Homepage shows the featured grid; /photos shows the 3 starter collections (empty) + All Photos (uncollected photos render); /dashboard/photos/featured + albums/[id] managers work; owner can curate.
</gated_steps>

<output>
Create .planning/phases/40-data-setup-quality-gate/40-SUMMARY.md after go-live.
</output>
