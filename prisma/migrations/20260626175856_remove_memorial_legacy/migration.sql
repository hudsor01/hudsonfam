-- Remove legacy memorial backend.
--
-- The memorial page redesign (PR #14) made the page static: the obituary text
-- is hardcoded and photos are driven by the "memorial" Collection. This drops
-- the now-orphaned tables that nothing reads:
--   * Memory          — the removed "share a memory" submissions
--   * MemorialMedia    — the removed video/photo media (photos moved to Collection)
--   * MemorialContent  — the removed editable page-content sections
--
-- These tables have no foreign keys referencing them, so the drops are clean.
-- Indexes are dropped implicitly with their tables.

DROP TABLE IF EXISTS "Memory";
DROP TABLE IF EXISTS "MemorialMedia";
DROP TABLE IF EXISTS "MemorialContent";
