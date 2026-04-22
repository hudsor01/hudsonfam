import pg from "pg";
import {
  CoverLetterSchema,
  CompanyResearchSchema,
  TailoredResumeSchema,
  parseOrLog,
} from "./jobs-schemas";

const globalForPool = globalThis as unknown as { jobsPool: pg.Pool };

function createPool() {
  return new pg.Pool({
    connectionString: process.env.JOBS_DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30000,
  });
}

const pool = globalForPool.jobsPool || createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPool.jobsPool = pool;
}

// Re-export from shared constants (client-safe, no pg import)
export { JOB_STATUSES, type JobStatus } from "./job-constants";

export interface Job {
  id: number;
  external_id: string;
  source: string;
  title: string;
  company: string | null;
  company_url: string | null;
  description: string | null;
  url: string | null;
  location: string | null;
  remote_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_date: string | null;
  tags: string[];
  match_score: number;
  status: string;
  cover_letter_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoverLetter {
  id: number;
  content: string;
  pdf_data: string | null;
  quality_score: number | null;
  generated_at: string;
  model_used: string;
}

export interface CompanyResearch {
  id: number;
  company_name: string;
  company_url: string | null;
  glassdoor_rating: number | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  salary_currency: string | null;
  tech_stack: string[];
  funding_stage: string | null;
  employee_count: string | null;
  recent_news: string | null;
  ai_summary: string | null;
  created_at: string;
}

export interface TailoredResume {
  id: number;
  content: string;
  pdf_data: string | null;
  model_used: string | null;
  generated_at: string;
}

export interface JobDetail extends Job {
  description: string | null;
  company_url: string | null;
  cover_letter: CoverLetter | null;
  company_research: CompanyResearch | null;
  tailored_resume: TailoredResume | null;
}

/** Freshness metadata computed server-side and attached by fetchJobDetail. */
export interface ArtifactFreshness {
  generatedDate: string;
  isStale: boolean;
  ageDays: number;
}

/**
 * Enriched JobDetail returned from fetchJobDetail (server action).
 * Each nested LLM artifact carries a pre-computed freshness field so the
 * client never runs `new Date()` during render (hydration-safe).
 */
export interface FreshJobDetail
  extends Omit<JobDetail, "cover_letter" | "tailored_resume" | "company_research"> {
  cover_letter: (CoverLetter & { freshness: ArtifactFreshness }) | null;
  tailored_resume: (TailoredResume & { freshness: ArtifactFreshness }) | null;
  company_research: (CompanyResearch & { freshness: ArtifactFreshness }) | null;
}

export interface PipelineStats {
  collected: number;
  scored: number;
  coverLetters: number;
  packaged: number;
  applied: number;
  interviews: number;
}

export interface JobStats {
  total: number;
  bySource: { source: string; count: number }[];
  byStatus: { status: string; count: number }[];
  newestJob: string | null;
  oldestJob: string | null;
}

export async function getJobs(opts?: {
  limit?: number;
  offset?: number;
  source?: string;
  statuses?: string[];
  search?: string;
  scoreMin?: number;
  scoreMax?: number;
  sortBy?: "created_at" | "match_score" | "title";
  sortDir?: "asc" | "desc";
}): Promise<Job[]> {
  const {
    limit = 100,
    offset = 0,
    source,
    statuses,
    search,
    scoreMin,
    scoreMax,
    sortBy = "match_score",
    sortDir = "desc",
  } = opts || {};

  const conditions: string[] = [];
  const params: (string | number | string[])[] = [];
  let idx = 1;

  if (source) {
    conditions.push(`source = $${idx++}`);
    params.push(source);
  }
  if (statuses && statuses.length > 0) {
    conditions.push(`status = ANY($${idx++})`);
    params.push(statuses);
  }
  if (search) {
    conditions.push(`(title ILIKE $${idx} OR company ILIKE $${idx})`);
    idx++;
    params.push(`%${search}%`);
  }
  if (scoreMin !== undefined) {
    conditions.push(`match_score >= $${idx++}`);
    params.push(scoreMin);
  }
  if (scoreMax !== undefined) {
    conditions.push(`match_score <= $${idx++}`);
    params.push(scoreMax);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Whitelist sort column and direction to prevent SQL injection
  const allowedSortBy = ["created_at", "match_score", "title"] as const;
  const allowedSortDir = ["asc", "desc"] as const;
  const safeSortBy = allowedSortBy.includes(sortBy as (typeof allowedSortBy)[number])
    ? sortBy
    : "match_score";
  const safeSortDir = allowedSortDir.includes(sortDir as (typeof allowedSortDir)[number])
    ? sortDir
    : "desc";

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT id, external_id, source, title, company, url, location,
            remote_type, salary_min, salary_max, salary_currency,
            posted_date, tags, match_score, status, cover_letter_generated,
            created_at, updated_at
     FROM jobs ${where}
     ORDER BY ${safeSortBy} ${safeSortDir} NULLS LAST, created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );

  return result.rows;
}

export async function getJobStats(): Promise<JobStats> {
  const [totalRes, bySourceRes, byStatusRes, datesRes] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as total FROM jobs"),
    pool.query(
      "SELECT source, COUNT(*)::int as count FROM jobs GROUP BY source ORDER BY count DESC"
    ),
    pool.query(
      "SELECT status, COUNT(*)::int as count FROM jobs GROUP BY status ORDER BY count DESC"
    ),
    pool.query(
      "SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM jobs"
    ),
  ]);

  return {
    total: totalRes.rows[0]?.total || 0,
    bySource: bySourceRes.rows,
    byStatus: byStatusRes.rows,
    newestJob: datesRes.rows[0]?.newest?.toISOString() || null,
    oldestJob: datesRes.rows[0]?.oldest?.toISOString() || null,
  };
}

export async function getJobsByStatus(): Promise<Record<string, Job[]>> {
  const pipelineStatuses = ["new", "interested", "applied", "interview", "offer", "rejected"];
  const result = await pool.query(
    `SELECT id, external_id, source, title, company, company_url,
            description, url, location, remote_type,
            salary_min, salary_max, salary_currency,
            posted_date, tags, match_score, status,
            cover_letter_generated, created_at, updated_at
     FROM jobs
     WHERE status = ANY($1)
     ORDER BY match_score DESC NULLS LAST, created_at DESC`,
    [pipelineStatuses]
  );
  const grouped: Record<string, Job[]> = {};
  for (const row of result.rows) {
    if (!grouped[row.status]) grouped[row.status] = [];
    grouped[row.status].push(row);
  }
  return grouped;
}

export async function updateJobStatus(
  jobId: number,
  newStatus: string
): Promise<void> {
  await pool.query(
    "UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2",
    [newStatus, jobId]
  );
}

export async function createApplication(jobId: number): Promise<void> {
  // Use INSERT ... WHERE NOT EXISTS to avoid duplicates without requiring
  // a unique constraint on the applications table.
  await pool.query(
    `INSERT INTO applications (job_id, applied_date, status)
     SELECT $1, CURRENT_DATE, 'applied'
     WHERE NOT EXISTS (
       SELECT 1 FROM applications WHERE job_id = $1
     )`,
    [jobId]
  );
}

export async function getJob(jobId: number): Promise<Job | null> {
  const result = await pool.query(
    `SELECT id, external_id, source, title, company, company_url, url, location,
            remote_type, salary_min, salary_max, salary_currency,
            posted_date, tags, match_score, status, cover_letter_generated,
            created_at, updated_at
     FROM jobs WHERE id = $1`,
    [jobId]
  );
  return result.rows[0] ?? null;
}

export async function getJobDetail(jobId: number): Promise<JobDetail | null> {
  const result = await pool.query(
    `SELECT
       j.id, j.external_id, j.source, j.title, j.company, j.company_url,
       j.description, j.url, j.location, j.remote_type,
       j.salary_min, j.salary_max, j.salary_currency,
       j.posted_date, j.tags, j.match_score, j.status,
       j.cover_letter_generated, j.created_at, j.updated_at,
       cl.id AS cl_id, cl.content AS cl_content,
       cl.quality_score AS cl_quality_score,
       cl.generated_at AS cl_generated_at,
       cl.model_used AS cl_model_used,
       cr.id AS cr_id, cr.company_name AS cr_company_name,
       cr.company_url AS cr_company_url,
       cr.glassdoor_rating AS cr_glassdoor_rating,
       cr.salary_range_min AS cr_salary_range_min,
       cr.salary_range_max AS cr_salary_range_max,
       cr.salary_currency AS cr_salary_currency,
       cr.tech_stack AS cr_tech_stack,
       cr.funding_stage AS cr_funding_stage,
       cr.employee_count AS cr_employee_count,
       cr.recent_news AS cr_recent_news,
       cr.ai_summary AS cr_ai_summary,
       cr.created_at AS cr_created_at,
       tr.id AS tr_id, tr.content AS tr_content,
       tr.pdf_data AS tr_pdf_data,
       tr.model_used AS tr_model_used,
       tr.generated_at AS tr_generated_at
     FROM jobs j
     LEFT JOIN cover_letters cl ON cl.job_id = j.id
     LEFT JOIN company_research cr ON cr.id = j.company_research_id
     LEFT JOIN tailored_resumes tr ON tr.job_id = j.id
     WHERE j.id = $1`,
    [jobId]
  );

  const row = result.rows[0];
  if (!row) return null;

  const coverLetter = parseOrLog(
    CoverLetterSchema,
    row.cl_id
      ? {
          id: row.cl_id,
          content: row.cl_content,
          pdf_data: null, // Omit large base64 from detail view
          quality_score: row.cl_quality_score,
          generated_at:
            row.cl_generated_at?.toISOString?.() ?? row.cl_generated_at,
          model_used: row.cl_model_used,
        }
      : null,
    "cover_letter",
    jobId
  );

  const companyResearch = parseOrLog(
    CompanyResearchSchema,
    row.cr_id
      ? {
          id: row.cr_id,
          company_name: row.cr_company_name,
          company_url: row.cr_company_url,
          glassdoor_rating: row.cr_glassdoor_rating,
          salary_range_min: row.cr_salary_range_min,
          salary_range_max: row.cr_salary_range_max,
          salary_currency: row.cr_salary_currency ?? "USD",
          tech_stack: row.cr_tech_stack ?? [],
          funding_stage: row.cr_funding_stage,
          employee_count: row.cr_employee_count,
          recent_news: row.cr_recent_news,
          ai_summary: row.cr_ai_summary,
          created_at: row.cr_created_at?.toISOString?.() ?? row.cr_created_at,
        }
      : null,
    "company_research",
    jobId
  );

  const tailoredResume = parseOrLog(
    TailoredResumeSchema,
    row.tr_id
      ? {
          id: row.tr_id,
          content: row.tr_content,
          pdf_data: null, // Omit large base64 from detail view — matches cover-letter pattern at line 326
          model_used: row.tr_model_used,
          generated_at:
            row.tr_generated_at?.toISOString?.() ?? row.tr_generated_at,
        }
      : null,
    "tailored_resume",
    jobId
  );

  return {
    id: row.id,
    external_id: row.external_id,
    source: row.source,
    title: row.title,
    company: row.company,
    company_url: row.company_url,
    description: row.description,
    url: row.url,
    location: row.location,
    remote_type: row.remote_type,
    salary_min: row.salary_min,
    salary_max: row.salary_max,
    salary_currency: row.salary_currency,
    posted_date: row.posted_date,
    tags: row.tags ?? [],
    match_score: row.match_score,
    status: row.status,
    cover_letter_generated: row.cover_letter_generated,
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
    cover_letter: coverLetter,
    company_research: companyResearch,
    tailored_resume: tailoredResume,
  };
}

export async function getCoverLetterPdf(jobId: number): Promise<string | null> {
  const result = await pool.query(
    "SELECT pdf_data FROM cover_letters WHERE job_id = $1",
    [jobId]
  );
  return result.rows[0]?.pdf_data ?? null;
}

export async function getTailoredResumePdf(jobId: number): Promise<string | null> {
  const result = await pool.query(
    "SELECT pdf_data FROM tailored_resumes WHERE job_id = $1",
    [jobId]
  );
  return result.rows[0]?.pdf_data ?? null;
}

export async function getPipelineStats(): Promise<PipelineStats> {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS collected,
       COUNT(*) FILTER (WHERE match_score >= 5)::int AS scored,
       COUNT(*) FILTER (WHERE cover_letter_generated = true)::int AS cover_letters,
       COUNT(*) FILTER (WHERE package_ready = true)::int AS packaged,
       COUNT(*) FILTER (WHERE status = 'applied')::int AS applied,
       COUNT(*) FILTER (WHERE status = 'interview')::int AS interviews
     FROM jobs`
  );
  const row = result.rows[0];
  return {
    collected: row.collected,
    scored: row.scored,
    coverLetters: row.cover_letters,
    packaged: row.packaged,
    applied: row.applied,
    interviews: row.interviews,
  };
}
