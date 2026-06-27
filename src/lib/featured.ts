// FEAT-04: the `featured` surface collection drives the homepage 3×3 grid and is
// capped at this many photos. Plain constants (no "use server") so they can be
// imported by server actions, queries, and client components alike.
export const FEATURED_SLUG = "featured";
export const FEATURED_MAX = 9;
