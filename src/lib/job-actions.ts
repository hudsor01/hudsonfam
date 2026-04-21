"use server";

import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { formatDistanceToNowStrict } from "date-fns";
import {
  updateJobStatus as dbUpdateStatus,
  createApplication,
  getJob as dbGetJob,
  getJobDetail,
} from "@/lib/jobs-db";
import type {
  CoverLetter,
  CompanyResearch,
  TailoredResume,
  ArtifactFreshness,
  FreshJobDetail,
} from "@/lib/jobs-db";
import { isStale, STALE_THRESHOLDS } from "@/lib/job-freshness";

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
 * Attach pre-computed freshness (relativeTime, isStale, ageDays) to an
 * artifact server-side. Handles both field names — `generated_at` (cover
 * letter, tailored resume) and `created_at` (company research) — without a
 * schema-level transform (per RESEARCH.md §Open Question 2).
 *
 * Silent on malformed input: an unparseable ISO string yields zeroed
 * freshness rather than throwing, so a malformed row never blows up render.
 */
function attachFreshness<T extends { generated_at: string } | { created_at: string }>(
  artifact: T | null,
  thresholdDays: number
): (T & { freshness: ArtifactFreshness }) | null {
  if (!artifact) return null;
  // Company research uses created_at; cover_letter + tailored_resume use generated_at.
  const iso =
    "generated_at" in artifact
      ? (artifact as { generated_at: string }).generated_at
      : (artifact as { created_at: string }).created_at;
  const generated = new Date(iso);
  if (Number.isNaN(generated.getTime())) {
    return {
      ...artifact,
      freshness: { relativeTime: "", isStale: false, ageDays: 0 },
    } as T & { freshness: ArtifactFreshness };
  }
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - generated.getTime()) / 86_400_000)
  );
  return {
    ...artifact,
    freshness: {
      relativeTime: formatDistanceToNowStrict(generated, { addSuffix: true }),
      isStale: isStale(iso, thresholdDays),
      ageDays,
    },
  } as T & { freshness: ArtifactFreshness };
}

/**
 * Fetch full job detail (cover letter, company research, tailored resume)
 * for the detail sheet, with server-side freshness attached to each artifact.
 *
 * Freshness thresholds per CONTEXT.md D-01:
 *   - cover_letter: 14 days
 *   - tailored_resume: 14 days
 *   - company_research: 60 days
 *
 * Client never runs new Date() — all relative-time strings + isStale booleans
 * are pre-computed here so hydration is stable.
 */
export async function fetchJobDetail(
  jobId: number
): Promise<FreshJobDetail | null> {
  await requireRole(["owner"]);
  const detail = await getJobDetail(jobId);
  if (!detail) return null;

  return {
    ...detail,
    cover_letter: attachFreshness<CoverLetter>(
      detail.cover_letter,
      STALE_THRESHOLDS.cover_letter
    ),
    tailored_resume: attachFreshness<TailoredResume>(
      detail.tailored_resume,
      STALE_THRESHOLDS.tailored_resume
    ),
    company_research: attachFreshness<CompanyResearch>(
      detail.company_research,
      STALE_THRESHOLDS.company_research
    ),
  };
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
