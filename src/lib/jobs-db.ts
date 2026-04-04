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
  status?: string;
}): Promise<Job[]> {
  const { limit = 100, offset = 0, source, status } = opts || {};

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let idx = 1;

  if (source) {
    conditions.push(`source = $${idx++}`);
    params.push(source);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(limit, offset);
  const result = await pool.query(
    `SELECT id, external_id, source, title, company, url, location,
            remote_type, salary_min, salary_max, salary_currency,
            posted_date, tags, match_score, status, cover_letter_generated,
            created_at, updated_at
     FROM jobs ${where}
     ORDER BY created_at DESC
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
