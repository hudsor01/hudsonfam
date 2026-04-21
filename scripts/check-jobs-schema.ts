/**
 * Schema drift guard (AI-DATA-04).
 *
 * Connects to the n8n Postgres via JOBS_DATABASE_URL, queries
 * information_schema.columns for each table jobs-db.ts reads, and fails with
 * a clear message if any expected column is missing.
 *
 * Scope per CONTEXT.md D-08: only the columns jobs-db.ts actually queries —
 * NOT a full schema-snapshot comparison. n8n adds columns on upgrades; those
 * additions are not drift from our perspective.
 *
 * Invoked via `npm run test:schema` (bun runtime, same as seed:content).
 * Wired as a .git/hooks/pre-push git hook (see scripts/install-hooks.sh).
 */

import pg from "pg";

const EXPECTED: Record<string, string[]> = {
  jobs: [
    "id", "external_id", "source", "title", "company", "company_url",
    "description", "url", "location", "remote_type",
    "salary_min", "salary_max", "salary_currency",
    "posted_date", "tags", "match_score", "status",
    "cover_letter_generated", "created_at", "updated_at",
    "package_ready", "company_research_id",
  ],
  cover_letters: [
    "id", "job_id", "content", "pdf_data", "quality_score",
    "generated_at", "model_used",
  ],
  company_research: [
    "id", "company_name", "company_url", "glassdoor_rating",
    "salary_range_min", "salary_range_max", "salary_currency",
    "tech_stack", "funding_stage", "employee_count",
    "recent_news", "ai_summary", "created_at",
  ],
  tailored_resumes: [
    "id", "job_id", "content", "model_used", "generated_at",
  ],
  recruiter_outreach: [
    "id", "job_id", "contact_name", "contact_role", "context",
    "linkedin_connect", "linkedin_dm", "warm_email", "full_output",
    "sent_at", "generated_at",
  ],
  applications: [
    "id", "job_id", "applied_date", "status",
  ],
};

async function main() {
  if (!process.env.JOBS_DATABASE_URL) {
    console.warn(
      "[test:schema] JOBS_DATABASE_URL not set — skipping drift check (non-failure)"
    );
    process.exit(0);
  }

  // Host-only log (no password) so the operator can confirm the target DB.
  const hostPart = process.env.JOBS_DATABASE_URL.split("@")[1] ?? "<unparseable>";
  console.log(`[test:schema] connecting to ${hostPart}`);

  const pool = new pg.Pool({ connectionString: process.env.JOBS_DATABASE_URL });
  const errors: string[] = [];
  let columnCount = 0;

  try {
    for (const [table, expectedCols] of Object.entries(EXPECTED)) {
      const res = await pool.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [table]
      );
      const actualCols = new Set(res.rows.map((r: { column_name: string }) => r.column_name));
      for (const col of expectedCols) {
        columnCount++;
        if (!actualCols.has(col)) {
          errors.push(
            `Expected column '${col}' on table '${table}' (referenced in jobs-db.ts); not found in n8n database.`
          );
        }
      }
    }
  } catch (err) {
    console.error("[test:schema] Query error:", err instanceof Error ? err.message : err);
    await pool.end();
    process.exit(1);
  }

  await pool.end();

  if (errors.length > 0) {
    console.error("[test:schema] Schema drift detected:");
    for (const e of errors) console.error("  " + e);
    process.exit(1);
  }
  console.log(
    `[test:schema] OK — verified ${Object.keys(EXPECTED).length} tables, ${columnCount} columns.`
  );
}

main().catch((e) => {
  console.error("[test:schema] Unexpected error:", e);
  process.exit(1);
});
