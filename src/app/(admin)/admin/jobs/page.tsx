export const dynamic = "force-dynamic";

import { getJobs, getJobStats } from "@/lib/jobs-db";
import { JobsDashboard } from "./jobs-dashboard";

export default async function JobsPage() {
  const [jobs, stats] = await Promise.all([
    getJobs({ limit: 200 }),
    getJobStats(),
  ]);

  const rows = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company || "",
    source: job.source,
    location: job.location || "Remote",
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency || "USD",
    match_score: job.match_score,
    status: job.status,
    url: job.url || "",
    posted_date: job.posted_date,
    created_at: job.created_at,
  }));

  return <JobsDashboard rows={rows} stats={stats} />;
}
