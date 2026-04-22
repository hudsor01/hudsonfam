"use server";

import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/session";
import { revalidatePath } from "next/cache";
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
  SalaryIntelligence,
  ArtifactFreshness,
  FreshJobDetail,
} from "@/lib/jobs-db";
import { STALE_THRESHOLDS } from "@/lib/job-freshness";
import { attachFreshness } from "@/lib/attach-freshness";
import { sendSignedWebhook, type ErrorSentinel } from "@/lib/webhooks";

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
 * Fetch full job detail (cover letter, company research, tailored resume)
 * for the detail sheet, with server-side freshness attached to each artifact.
 *
 * Freshness thresholds per CONTEXT.md D-01:
 *   - cover_letter: 14 days
 *   - tailored_resume: 14 days
 *   - company_research: 60 days
 *   - salary_intelligence: 30 days
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
    salary_intelligence: attachFreshness<SalaryIntelligence>(
      detail.salary_intelligence,
      STALE_THRESHOLDS.salary_intelligence   // 30 — already declared in job-freshness.ts:22
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

/**
 * Owner-triggered: fire the job-company-intel n8n workflow for a job whose
 * company_research row is currently null (INSERT-wait semantics per D-06).
 *
 * Contract (AI-ACTION-03):
 *   - First line `await requireRole(["owner"])` (D-12 — grep-gate enforced)
 *   - Fresh `randomUUID()` idempotency key per call (D-03 — n8n 24h dedup window
 *     handles network-retry; new click → new UUID → new run)
 *   - Returns discriminated-union; never throws (D-08 — no raw error leak)
 *   - `revalidatePath` only on ok=true (keeps caller on failure branch)
 */
export async function triggerCompanyResearch(
  jobId: number,
): Promise<{ ok: true } | { ok: false; sentinel: ErrorSentinel }> {
  await requireRole(["owner"]);
  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "job-company-intel",
    { job_id: jobId },
    idempotencyKey,
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true };
}

/**
 * Owner-triggered: fire the regenerate-cover-letter n8n workflow.
 *
 * D-06 amended: reads pre-webhook `cover_letters.generated_at` server-side
 * BEFORE firing the webhook, and returns it as `baseline` in the ok=true
 * response. The client component polls until a later `generated_at` overtakes
 * this baseline — no client-clock access, no browser-skew bug surface.
 *
 * DB-read failure path (T-23-02-05): returns `{ ok: false, sentinel: "unavailable" }`
 * WITHOUT firing sendSignedWebhook — a DB outage must not produce spurious
 * n8n runs, and the raw error never crosses the return boundary.
 *
 * Contract (AI-ACTION-04):
 *   - First line `await requireRole(["owner"])` (D-12)
 *   - Fresh `randomUUID()` idempotency key per call (D-03)
 *   - Returns `{ ok: true, baseline: string | null } | { ok: false, sentinel }` (D-08)
 */
export async function regenerateCoverLetter(
  jobId: number,
): Promise<
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel }
> {
  await requireRole(["owner"]);

  let baseline: string | null = null;
  try {
    const detail = await getJobDetail(jobId);
    baseline = detail?.cover_letter?.generated_at ?? null;
  } catch {
    // DB error — no raw e.message across the boundary (T-23-02-05); webhook
    // intentionally NOT fired so a DB outage can't spawn n8n runs.
    return { ok: false, sentinel: "unavailable" };
  }

  const idempotencyKey = randomUUID();
  const res = await sendSignedWebhook(
    "regenerate-cover-letter",
    { job_id: jobId },
    idempotencyKey,
  );
  if (!res.ok) return { ok: false, sentinel: res.sentinel };
  revalidatePath("/admin/jobs");
  return { ok: true, baseline };
}
