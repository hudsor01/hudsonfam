-- Remove the events feature.
--
-- The Event model and its public/dashboard pages, iCal feed, server actions,
-- and homepage section were all removed. The Visibility enum was used only by
-- Event, so it is dropped too. Drop the table before the enum type it depends on.

DROP TABLE IF EXISTS "Event";
DROP TYPE IF EXISTS "Visibility";
