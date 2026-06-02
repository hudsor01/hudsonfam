-- Minimal content restore from 2026-04-04 hudsonfam backup (secret-free)
-- 1 user (no password — owner re-auths via Google OAuth/OWNER_EMAIL), 1 album, 1 photo, 5 events.
-- Load into Neon AFTER prisma migrate. FK checks bypassed during load.
-- NOTE: Photo originalPath points to NAS; Phase 30 must fetch that 1 file -> R2 + reprocess thumbnail.
BEGIN;
SET session_replication_role = replica;

COPY public."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role, banned, "banReason", "banExpires") FROM stdin;
GfEHAyEFnvZJJyOzYy8M5Qjc4vVzM5yk	Richard Hudson	rhudsontspr@gmail.com	t	https://lh3.googleusercontent.com/a/ACg8ocJuJ8TEyhG9jwLaXe6yAO6U5Ah8M_iqPTmQ7SeiM-hsFehntlLi=s96-c	2026-04-02 04:35:37.431	2026-04-02 04:35:37.431	member	f	\N	\N
\.

COPY public."Album" (id, title, slug, description, "coverPhotoId", date, "createdAt") FROM stdin;
cmn8hinqw0005p1ttk12g9wa8	Moving to Dallas	moving-to-dallas	Photos from our big move and first days in Dallas.	\N	2026-03-01 00:00:00	2026-03-27 05:52:37.304
\.

COPY public."Photo" (id, title, caption, "albumId", "originalPath", "thumbnailPath", width, height, "takenAt", "uploadedById", "createdAt") FROM stdin;
d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec	me and jr	\N	\N	/data/hudsonfam/originals/unassigned/d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec.jpg	/data/thumbnails/d9c2e950-f0e6-4bf4-85f4-1793e87ab8ec-thumbnail.webp	1080	1440	\N	GfEHAyEFnvZJJyOzYy8M5Qjc4vVzM5yk	2026-04-02 19:03:28.129
\.

COPY public."Event" (id, title, description, location, "startDate", "endDate", "allDay", "createdById", visibility, "createdAt", "updatedAt") FROM stdin;
cmn8hinqb0000p1ttw2mw8cdj	Easter Brunch	Family brunch at the new house. Bring your appetite.	Our place	2026-04-05 16:00:00	2026-04-05 19:00:00	f	seed	PUBLIC	2026-03-27 05:52:37.273	2026-03-27 05:52:37.273
cmn8hinqb0001p1tt4a5h5ubz	Dallas Arboretum Visit	Spring flowers are in bloom. Let's go see them.	Dallas Arboretum	2026-04-12 15:00:00	2026-04-12 21:00:00	f	seed	PUBLIC	2026-03-27 05:52:37.273	2026-03-27 05:52:37.273
cmn8hinqb0002p1ttt6ikd54s	Game Night	Board games, snacks, and questionable strategy.	Our place	2026-04-19 00:00:00	2026-04-19 04:00:00	f	seed	FAMILY	2026-03-27 05:52:37.273	2026-03-27 05:52:37.273
cmn8hinqb0003p1tt9ywd4ss4	Memorial Day Weekend	Long weekend plans TBD. Suggestions welcome.	\N	2026-05-23 05:00:00	2026-05-26 04:59:00	t	seed	PUBLIC	2026-03-27 05:52:37.273	2026-03-27 05:52:37.273
cmn8hinqb0004p1ttv0k1hrl6	Summer BBQ	Kicking off summer the right way. Burgers, dogs, and cold drinks.	Backyard	2026-06-06 21:00:00	2026-06-07 02:00:00	f	seed	PUBLIC	2026-03-27 05:52:37.273	2026-03-27 05:52:37.273
\.

SET session_replication_role = origin;
COMMIT;
