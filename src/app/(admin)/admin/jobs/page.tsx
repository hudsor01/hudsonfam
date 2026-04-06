export const dynamic = "force-dynamic";

import { getJobs, getJobStats, getPipelineStats } from "@/lib/jobs-db";
import { JobsDashboard } from "./jobs-dashboard";
import { updateJobStatus, dismissJob, undismissJob } from "@/lib/job-actions";

export default async function JobsPage() {
  const [activeJobs, dismissedJobs, stats, pipeline] = await Promise.all([
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
    getJobStats(),
    getPipelineStats(),
  ]);

  return (
    <JobsDashboard
      activeJobs={activeJobs}
      dismissedJobs={dismissedJobs}
      stats={stats}
      pipeline={pipeline}
      onStatusChange={updateJobStatus}
      onDismiss={dismissJob}
      onUndismiss={undismissJob}
    />
  );
}
