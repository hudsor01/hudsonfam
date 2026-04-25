# Plan 21-01: Tailored Resume PDF Pipeline — Summary

**Status:** ✓ Complete
**Executed:** 2026-04-22
**Mode:** Automated by Claude (via kubectl + direct DB INSERT), NOT the originally-specified user-driven flow
**Commit:** this plan ships no hudsonfam code; artifacts archived to `artifacts/` subdirectory of the phase directory

---

## Architectural Deviation from Plan / CONTEXT.md D-04

The plan as originally written (and CONTEXT.md D-04 task 1) specified extending the existing `Job Search: Application Packager` workflow in place with a parallel resume-PDF branch. Research during execution (see `21-RESEARCH.md` §Finding #1) established the Stirling-PDF pattern lives there. However, during execution, the following options were evaluated:

| Option | Approach | Verdict |
|---|---|---|
| A. Modify Application Packager workflow in place | DB UPDATE on nodes/connections JSON of existing 12-node workflow | Rejected — high risk of breaking a working production workflow; connections JSON surgery is fragile |
| **B. Create new standalone workflow** | Fresh `Job Search: Tailored Resume PDF` workflow cloning the Build HTML → Stirling Render → Assemble PDF → Store PDF pattern | **Selected** — uses proven node configs, isolated failure domain, zero risk to Application Packager |
| C. Lazy generation in hudsonfam API route | Client-side PDF on first download via Stirling-PDF Basic Auth | Rejected after Stirling auth investigation revealed it needs HTTP Header API Key credential currently only stored in n8n's encrypted credential vault; adding it to hudsonfam deployment requires homelab-repo ExternalSecret + Flux reconcile round trip, negating the "you do" user preference |

**User approved Option C first, then reviewed the Stirling auth finding and approved pivot to Option B.** Both deviations were explicitly surfaced and approved before execution.

## What was built

### 1. Schema migration (n8n database, homelab Postgres cluster)

```sql
ALTER TABLE tailored_resumes ADD COLUMN IF NOT EXISTS pdf_data TEXT;
```

Verified:
- `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tailored_resumes' AND column_name='pdf_data'` → one row
- Column position: 7th (after `created_at`)
- Nullable; no default

Applied via `kubectl exec -n homelab postgres-1 -c postgres -- psql -U postgres -d n8n -c "ALTER TABLE..."`.

Artifact archived to `.planning/phases/21-polish-copy-pdf-empty-states-link-out/artifacts/001-alter-tailored-resumes-add-pdf-data.sql`.

### 2. New n8n workflow: "Job Search: Tailored Resume PDF"

**ID:** `TailoredResume01`
**Status:** active (published + activated by n8n on pod restart)
**Schedule:** every 15 minutes
**Node count:** 8
**Connections:** 7
**Owner project:** `sxEHXIHSiVpO5Kqg` (same project as existing Job Search workflows)

**Node graph:**

```
Schedule Trigger (15 min)  ──┐
                             ├──▶ Fetch Unpackaged Resume ──▶ IF Has Resume ──▶ Build Resume HTML ──▶ Stirling Render ──▶ Assemble Resume PDF ──▶ Store Resume PDF
Manual Trigger             ──┘                                    │
                                                                  └── (false: no-op)
```

**Node configurations:**
- `Fetch Unpackaged Resume`: Postgres executeQuery — `SELECT j.id as job_id, j.title, j.company, tr.id as tailored_resume_id, tr.content as resume_content FROM jobs j JOIN tailored_resumes tr ON tr.job_id = j.id WHERE tr.pdf_data IS NULL ORDER BY j.match_score DESC NULLS LAST, tr.generated_at DESC LIMIT 1;`
- `IF Has Resume`: version 2.2 conditional — checks `tailored_resume_id` exists (filters empty-queue case)
- `Build Resume HTML`: Code node — markdown→HTML converter (inline regex-based; handles h1-h6, bold, italic, code, unordered lists, paragraphs) wrapping content in Georgia-serif styled shell
- `Stirling Render`: HTTP Request 4.2 — POST multipart/form-data to `http://stirling-pdf.cloud.svc.cluster.local:8080/api/v1/convert/html/pdf` with HTTP Header Auth credential id `xDzoQNreWH78jsn4`
- `Assemble Resume PDF`: Code node — reads Stirling binary output, converts to base64, forwards metadata
- `Store Resume PDF`: Postgres executeQuery — string-interpolated UPDATE (matches Application Packager pattern; SQL injection risk mitigated by base64 charset constraint + trusted internal source)

**Creation path (direct DB manipulation, NOT n8n UI):**
1. `INSERT INTO workflow_entity` with nodes/connections as dollar-quoted JSON
2. `INSERT INTO workflow_history` with same versionId (required for publish state)
3. `UPDATE workflow_entity SET activeVersionId = versionId` (marks it published)
4. `INSERT INTO workflow_published_version` (links entity to its active history version)
5. `INSERT INTO shared_workflow` with role `workflow:owner` + project `sxEHXIHSiVpO5Kqg` (required; n8n fails activation without this)
6. `kubectl rollout restart deployment/n8n -n cloud` twice (once after initial INSERT to discover, once after shared_workflow to activate)

Artifacts archived:
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/artifacts/n8n-tailored-resume-pdf-nodes.json`
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/artifacts/n8n-tailored-resume-pdf-connections.json`

### 3. UAT readiness

`tailored_resumes.pdf_data` baseline state post-execution:

```
 total | null_pdf | have_pdf
-------+----------+----------
     7 |        6 |        1
```

Verified `have_pdf = 1` contains a real PDF:
- `LENGTH(pdf_data) = 10,552` (base64, ≈7,914 decoded bytes)
- First 12 base64 chars: `JVBERi0xLjcK` → decodes to `%PDF-1.7\n` (PDF magic bytes)
- Row: `tailored_resume_id = 1, job_id = 2589`

The remaining 6 rows will backfill over the next ~90 minutes (6 × 15-minute schedule fires) once the 15-min schedule cadence resumes. Plan 21-08 UAT can run against `tailored_resume_id = 1` immediately.

## Known issues / follow-ups

- **Scheduler fires once per restart during verification window:** During the 1-min verification run (temporarily shortened schedule for testing), only 1 execution fired before n8n was restarted again to restore the 15-min schedule. The workflow itself is correct — subsequent 15-min fires will backfill the remaining 6 rows. No action required; verify via periodic `SELECT COUNT(*) FROM tailored_resumes WHERE pdf_data IS NOT NULL`.
- **Artifacts live in hudsonfam repo, not homelab repo:** Homelab repo does not yet have a `migrations/` or `workflows/` folder convention. Archiving to `.planning/phases/21-.../artifacts/` keeps the source-of-truth JSON + SQL co-located with the phase context. If the homelab repo later adopts a migrations folder convention, copy `001-alter-tailored-resumes-add-pdf-data.sql` there.
- **Schedule vs. hourly:** Plan 21-01 didn't specify a schedule interval; 15 min was chosen to mirror Application Packager's cadence. Can be dialed up/down via `UPDATE workflow_entity SET nodes = jsonb_set(...)` + pod restart.
- **Error handling:** The workflow has no explicit error branch. If Stirling-PDF returns an error or the UPDATE fails, the execution logs to n8n's normal error handler (Central Error Handler workflow) via the project's error-workflow setting on Application Packager; this new workflow doesn't explicitly set `errorWorkflow` — consider extending later if fire-and-forget failures matter.

## Acceptance criteria (from PLAN.md)

- [x] `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='tailored_resumes' AND column_name='pdf_data'` returns exactly one row with `pdf_data` → **verified**
- [x] `SELECT COUNT(*) FROM tailored_resumes WHERE pdf_data IS NOT NULL` returns >= 1 → **verified (=1)**
- [x] The most recent row's `LENGTH(pdf_data) >= 1000` → **verified (=10,552)**
- [x] Spot-check PDF magic bytes: base64 prefix `JVBERi0x` decodes to `%PDF-1.x` → **verified**
- [ ] ~~SQL migration file exists in homelab repo~~ — deviated: archived in hudsonfam `artifacts/` (see follow-ups)
- [ ] ~~Workflow JSON file committed to homelab repo~~ — deviated: same as above

## Next

Wave 2 unblocked: Plans 21-02 (Zod schema + EXPECTED map) and 21-03 (jobs-db.ts extension + API route) can now push without schema-drift guard failing, because `pdf_data` column is live on the `tailored_resumes` table.
