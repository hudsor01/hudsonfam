/**
 * Zod schemas for LLM-produced artifact rows from the shared n8n Postgres.
 *
 * Per CONTEXT.md D-11 (milestone-level fail-open decision):
 *   - safeParse at the getJobDetail return boundary
 *   - On failure: console.error with jobId + issues, return null for that nested artifact
 *   - Keep the outer JobDetail (and the page) alive
 *
 * These schemas are the runtime source of truth. When the schema and the TS
 * interface disagree, the schema is authoritative — TS interfaces in jobs-db.ts
 * are re-derived here (z.infer) or kept source-compatible by hand.
 *
 * Field-name note: CompanyResearch uses `created_at` while CoverLetter and
 * TailoredResume use `generated_at`. Plan 20-06's `attachFreshness` helper
 * handles both field names without a schema transform (the "less magic"
 * option resolved in 20-RESEARCH.md Open Question 2).
 */

import { z } from "zod";

export const CoverLetterSchema = z.object({
  id: z.number(),
  content: z.string(),
  pdf_data: z.string().nullable(),
  quality_score: z.number().nullable(),
  generated_at: z.string(), // ISO string after .toISOString() in jobs-db.ts
  model_used: z.string(),
});

export const CompanyResearchSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  company_url: z.string().nullable(),
  glassdoor_rating: z.number().nullable(),
  salary_range_min: z.number().nullable(),
  salary_range_max: z.number().nullable(),
  salary_currency: z.string().nullable(),
  tech_stack: z.array(z.string()),
  funding_stage: z.string().nullable(),
  employee_count: z.string().nullable(),
  recent_news: z.string().nullable(),
  ai_summary: z.string().nullable(),
  created_at: z.string(),
});

export const TailoredResumeSchema = z.object({
  id: z.number(),
  content: z.string(),
  pdf_data: z.string().nullable(),
  model_used: z.string().nullable(),
  generated_at: z.string(),
});

/**
 * Zod schema for salary_intelligence rows.
 *
 * Per CONTEXT.md D-01, schema is deliberately permissive today:
 *   - report_json: z.unknown() — shape depends on whatever task #11 ships
 *   - llm_analysis: z.string().nullable() — may be null if workflow generated
 *     raw_results but not the final prose
 *
 * Other columns match live-DB types (pg driver coerces integer / date /
 * timestamp / text / jsonb appropriately; ISO string for dates after
 * .toISOString() in jobs-db.ts, per the CoverLetter/TailoredResume pattern).
 */
export const SalaryIntelligenceSchema = z.object({
  id: z.number(),
  search_date: z.string(),            // ISO date string after .toISOString() in jobs-db.ts
  report_json: z.unknown(),           // D-01: loose shape until task #11 stabilizes upstream
  raw_results: z.string().nullable(),
  llm_analysis: z.string().nullable(),
  created_at: z.string(),             // ISO string
  updated_at: z.string().nullable(),  // updated_at may be null on first insert
});

/**
 * safeParse wrapper that logs schema drift server-side and returns null on failure.
 *
 * Passes null/undefined inputs through untouched (a nested LEFT JOIN miss is a
 * null row, not an error). On safeParse failure, emits:
 *
 *   console.error("[jobs-db] <label> schema drift", { jobId, issues })
 *
 * The "[jobs-db]" prefix matches the convention used elsewhere in jobs-db.ts.
 * Downstream log tooling can grep for it.
 *
 * @param schema Zod schema for the artifact
 * @param raw object built from pg row (or null if the JOIN missed)
 * @param label short identifier for the log line ("cover_letter", etc.)
 * @param jobId the job this artifact belongs to (for log correlation)
 */
export function parseOrLog<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  label: string,
  jobId: number
): T | null {
  if (raw === null || raw === undefined) return null;
  const result = schema.safeParse(raw);
  if (!result.success) {
    console.error(`[jobs-db] ${label} schema drift`, {
      jobId,
      issues: result.error.issues,
    });
    return null;
  }
  return result.data;
}
