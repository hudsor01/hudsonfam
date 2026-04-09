export const dynamic = "force-dynamic";

import { getJobs, getJobsByStatus, getJobStats, getPipelineStats } from "@/lib/jobs-db";
import { JobsDashboard } from "./jobs-dashboard";
import { updateJobStatus, dismissJob, undismissJob } from "@/lib/job-actions";

export default async function JobsPage() {
  const [activeJobs, dismissedJobs, jobsByStatus, stats, pipeline] = await Promise.all([
    getJobs({
      limit: 500,
      statuses: ["new", "interested", "applied", "interview", "offer", "rejected"],
      sortBy: "match_score",
      sortDir: "desc",
    }),
    getJobs({
      limit: 200,
      statuses: ["dismissed"],
      sortBy: "created_at",
      sortDir: "desc",
    }),
    getJobsByStatus(),
    getJobStats(),
    getPipelineStats(),
  ]);

  return (
    <JobsDashboard
      activeJobs={activeJobs}
      dismissedJobs={dismissedJobs}
      jobsByStatus={jobsByStatus}
      stats={stats}
      pipeline={pipeline}
      onStatusChange={updateJobStatus}
      onDismiss={dismissJob}
      onUndismiss={undismissJob}
    />
  );
}
