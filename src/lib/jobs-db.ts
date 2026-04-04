import pg from "pg";

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

export const JOB_STATUSES = [
  "new",
  "interested",
  "applied",
  "interview",
  "offer",
  "rejected",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number] | "dismissed";

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
  const result = await pool.query(
    `SELECT id, external_id, source, title, company, url, location,
            remote_type, salary_min, salary_max, salary_currency,
            posted_date, tags, match_score, status, cover_letter_generated,
            created_at, updated_at
     FROM jobs
     WHERE status != 'dismissed'
     ORDER BY match_score DESC NULLS LAST, created_at DESC`
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
