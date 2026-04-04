"use server";

import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  updateJobStatus as dbUpdateStatus,
  createApplication,
} from "@/lib/jobs-db";

/**
 * Generic status changer for a job. When newStatus is "applied", also
 * auto-creates an applications table entry (D-06: zero friction).
 */
export async function updateJobStatus(
  jobId: number,
  newStatus: string
): Promise<void> {
  await requireRole(["owner"]);

  await dbUpdateStatus(jobId, newStatus);

  // Per D-06: auto-create applications entry when status changes to "applied"
  if (newStatus === "applied") {
    await createApplication(jobId);
  }

  revalidatePath("/admin/jobs");
}

/**
 * Mark a job as dismissed — removes it from the active queue without
 * deleting the row from the database (D-05).
 */
export async function dismissJob(jobId: number): Promise<void> {
  await requireRole(["owner"]);
  await dbUpdateStatus(jobId, "dismissed");
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
