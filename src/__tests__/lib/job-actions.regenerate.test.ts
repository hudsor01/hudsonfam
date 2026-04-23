import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Contract tests for Phase 24 Plan 24-02 — the two new owner-triggered
 * Server Actions that clone the Plan 23-02 regenerate pattern:
 *
 *   - regenerateTailoredResume(jobId)     — AI-ACTION-05
 *   - regenerateSalaryIntelligence(jobId) — AI-ACTION-06
 *
 * Both return a discriminated union and MUST NOT throw (D-08):
 *   { ok: true; baseline: string | null } | { ok: false; sentinel: ErrorSentinel }
 *
 * Invariants locked by these tests (per 24-CONTEXT.md D-08):
 *   1. requireRole denial prevents getJobDetail AND sendSignedWebhook from firing (D-12)
 *   2. Success shape is { ok: true, baseline } with the server-read baseline
 *      (tailored_resume → generated_at ISO; salary_intelligence → search_date YYYY-MM-DD)
 *   3. Webhook-failure sentinel is propagated via { ok: false, sentinel }, never thrown
 *   4. Idempotency key is a fresh UUID v4 per call (D-03 — no stale-key replay risk)
 *   5. DB read failure → { ok: false, sentinel: "unavailable" } WITHOUT firing the
 *      webhook (T-23-02-05 pattern — DB outage must not spawn n8n runs)
 *
 * Cloned structurally from src/__tests__/lib/job-actions.trigger.test.ts (Phase 23);
 * the existing Phase 23 file tests triggerCompanyResearch + regenerateCoverLetter
 * and stays put.
 */

// Hoisted mocks — vi.mock factories hoist above plain consts (same pattern as
// Phase 23's job-actions.trigger.test.ts:27-37).
const {
  mockRequireRole,
  mockSendSignedWebhook,
  mockGetJobDetail,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockRequireRole: vi.fn().mockResolvedValue({ user: { role: "owner" } }),
  mockSendSignedWebhook: vi.fn(),
  mockGetJobDetail: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireRole: mockRequireRole }));
vi.mock("@/lib/webhooks", () => ({
  sendSignedWebhook: mockSendSignedWebhook,
}));
vi.mock("@/lib/jobs-db", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getJobDetail: mockGetJobDetail,
}));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));

beforeEach(() => {
  mockRequireRole.mockClear().mockResolvedValue({ user: { role: "owner" } });
  mockSendSignedWebhook.mockClear();
  mockGetJobDetail.mockClear();
  mockRevalidatePath.mockClear();
});

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// ── regenerateTailoredResume (AI-ACTION-05) ───────────────────────────────────

describe("regenerateTailoredResume — Server Action contract (AI-ACTION-05)", () => {
  it("returns { ok: true, baseline } with server-read tailored_resume.generated_at", async () => {
    const serverBaseline = "2026-04-20T12:34:56.000Z";
    mockGetJobDetail.mockResolvedValue({
      tailored_resume: {
        generated_at: serverBaseline,
        content: "resume body",
        model_used: null,
      },
    });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateTailoredResume } = await import("@/lib/job-actions");
    const result = await regenerateTailoredResume(42);

    expect(result).toEqual({ ok: true, baseline: serverBaseline });
    expect(mockSendSignedWebhook).toHaveBeenCalledWith(
      "regenerate-tailored-resume",
      { job_id: 42 },
      expect.stringMatching(UUID_V4_REGEX),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/jobs");
  });

  it("returns { ok: true, baseline: null } when job has no tailored_resume yet", async () => {
    mockGetJobDetail.mockResolvedValue({ tailored_resume: null });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateTailoredResume } = await import("@/lib/job-actions");
    const result = await regenerateTailoredResume(42);

    expect(result).toEqual({ ok: true, baseline: null });
    expect(mockSendSignedWebhook).toHaveBeenCalledOnce();
  });

  it("returns { ok: false, sentinel } and does NOT throw when webhook fails after baseline read", async () => {
    mockGetJobDetail.mockResolvedValue({
      tailored_resume: { generated_at: "2026-04-20T00:00:00.000Z" },
    });
    mockSendSignedWebhook.mockResolvedValue({
      ok: false,
      sentinel: "timeout",
    });

    const { regenerateTailoredResume } = await import("@/lib/job-actions");
    const result = await regenerateTailoredResume(42);

    expect(result).toEqual({ ok: false, sentinel: "timeout" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns { ok: false, sentinel: 'unavailable' } when DB read throws — sendSignedWebhook never called (T-23-02-05)", async () => {
    mockGetJobDetail.mockRejectedValue(new Error("ETIMEDOUT"));

    const { regenerateTailoredResume } = await import("@/lib/job-actions");
    const result = await regenerateTailoredResume(42);

    expect(result).toEqual({ ok: false, sentinel: "unavailable" });
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire", async () => {
    mockRequireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    const { regenerateTailoredResume } = await import("@/lib/job-actions");
    await expect(regenerateTailoredResume(42)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockGetJobDetail).not.toHaveBeenCalled();
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
  });
});

// ── regenerateSalaryIntelligence (AI-ACTION-06) ───────────────────────────────

describe("regenerateSalaryIntelligence — Server Action contract (AI-ACTION-06)", () => {
  it("returns { ok: true, baseline } with server-read salary_intelligence.search_date (YYYY-MM-DD)", async () => {
    // D-04: search_date is a Postgres date, not a timestamp; baseline is a
    // YYYY-MM-DD string. The predicate downstream is date-granular — this
    // test locks the contract at the Server Action layer.
    const serverBaseline = "2026-04-20";
    mockGetJobDetail.mockResolvedValue({
      salary_intelligence: {
        search_date: serverBaseline,
        report_json: null,
        llm_analysis: null,
      },
    });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateSalaryIntelligence } = await import("@/lib/job-actions");
    const result = await regenerateSalaryIntelligence(42);

    expect(result).toEqual({ ok: true, baseline: serverBaseline });
    expect(mockSendSignedWebhook).toHaveBeenCalledWith(
      "regenerate-salary-intelligence",
      { job_id: 42 },
      expect.stringMatching(UUID_V4_REGEX),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/jobs");
  });

  it("returns { ok: true, baseline: null } when job has no salary_intelligence yet", async () => {
    mockGetJobDetail.mockResolvedValue({ salary_intelligence: null });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateSalaryIntelligence } = await import("@/lib/job-actions");
    const result = await regenerateSalaryIntelligence(42);

    expect(result).toEqual({ ok: true, baseline: null });
    expect(mockSendSignedWebhook).toHaveBeenCalledOnce();
  });

  it("returns { ok: false, sentinel } and does NOT throw when webhook fails after baseline read", async () => {
    mockGetJobDetail.mockResolvedValue({
      salary_intelligence: { search_date: "2026-04-20" },
    });
    mockSendSignedWebhook.mockResolvedValue({
      ok: false,
      sentinel: "rate limit",
    });

    const { regenerateSalaryIntelligence } = await import("@/lib/job-actions");
    const result = await regenerateSalaryIntelligence(42);

    expect(result).toEqual({ ok: false, sentinel: "rate limit" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns { ok: false, sentinel: 'unavailable' } when DB read throws — sendSignedWebhook never called (T-23-02-05)", async () => {
    mockGetJobDetail.mockRejectedValue(new Error("ETIMEDOUT"));

    const { regenerateSalaryIntelligence } = await import("@/lib/job-actions");
    const result = await regenerateSalaryIntelligence(42);

    expect(result).toEqual({ ok: false, sentinel: "unavailable" });
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire", async () => {
    mockRequireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));

    const { regenerateSalaryIntelligence } = await import("@/lib/job-actions");
    await expect(regenerateSalaryIntelligence(42)).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mockGetJobDetail).not.toHaveBeenCalled();
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
  });
});
