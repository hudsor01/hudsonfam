"use server";

import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  updateJobStatus as dbUpdateStatus,
  createApplication,
  getJob as dbGetJob,
  getJobDetail,
} from "@/lib/jobs-db";
import type { JobDetail } from "@/lib/jobs-db";

const N8N_WEBHOOK_BASE =
  process.env.N8N_WEBHOOK_URL || "http://n8n.cloud.svc.cluster.local:5678";

async function fireWebhook(
  path: string,
  body: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${N8N_WEBHOOK_BASE}/webhook/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Fire-and-forget
  }
}

/**
 * Fetch full job detail (cover letter, company research) for the detail sheet.
 */
export async function fetchJobDetail(
  jobId: number
): Promise<JobDetail | null> {
  await requireRole(["owner"]);
  return getJobDetail(jobId);
}

/**
 * Change a job's pipeline status. Auto-creates an applications entry
 * when moving to "applied" and fires n8n webhooks for sync.
 */
export async function updateJobStatus(
  jobId: number,
  newStatus: string
): Promise<void> {
  await requireRole(["owner"]);

  await dbUpdateStatus(jobId, newStatus);

  if (newStatus === "applied") {
    await createApplication(jobId);
  }

  if (newStatus === "rejected") {
    void fireWebhook("job-feedback-sync", { job_id: jobId, action: "reject" });
  }
  if (newStatus === "interested") {
    const job = await dbGetJob(jobId);
    if (job?.company) {
      void fireWebhook("job-company-intel", {
        job_id: jobId,
        company_name: job.company,
        company_url: job.company_url,
      });
    }
  }

  revalidatePath("/admin/jobs");
}

/** Mark a job as dismissed — removes it from the active queue without deleting the row. */
export async function dismissJob(jobId: number): Promise<void> {
  await requireRole(["owner"]);
  await dbUpdateStatus(jobId, "dismissed");
  void fireWebhook("job-feedback-sync", { job_id: jobId, action: "dismiss" });
  revalidatePath("/admin/jobs");
}

/**
 * Un-dismiss a previously dismissed job, resetting its status to "new".
 * Dismissed jobs can be recovered from the Dismissed tab.
 */
export async function undismissJob(jobId: number): Promise<void> {
  await requireRole(["owner"]);
  await dbUpdateStatus(jobId, "new");
  revalidatePath("/admin/jobs");
}
