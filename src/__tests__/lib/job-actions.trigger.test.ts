import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Contract tests for Phase 23 Plan 23-02 — the two new owner-triggered
 * Server Actions that consume sendSignedWebhook from Plan 23-01:
 *
 *   - triggerCompanyResearch(jobId) — AI-ACTION-03
 *   - regenerateCoverLetter(jobId)  — AI-ACTION-04 + D-06 amended
 *
 * Both return a discriminated union and MUST NOT throw (D-08):
 *   { ok: true } | { ok: false; sentinel: ErrorSentinel }
 *   regenerateCoverLetter ok-branch additionally carries `baseline: string | null`
 *   (pre-webhook cover_letters.generated_at read server-side — D-06 amended,
 *    eliminates client-clock skew in the poll-until-advance predicate).
 *
 * Invariants locked by these tests:
 *   1. requireRole denial prevents sendSignedWebhook from firing (D-12)
 *   2. Success shape is exactly { ok: true } (or { ok: true, baseline } for regenerate)
 *   3. Webhook-failure sentinel is propagated via { ok: false, sentinel }, never thrown
 *   4. Idempotency key is a fresh UUID v4 per call (D-03 — no stale-key replay risk)
 *   5. regenerateCoverLetter reads baseline BEFORE firing webhook; DB error returns
 *      "unavailable" without ever calling sendSignedWebhook (T-23-02-05)
 */

// Hoisted mocks — vi.mock factories hoist above plain consts.
// Pattern from src/__tests__/components/tailored-resume-section.test.tsx.
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

describe("triggerCompanyResearch — Server Action contract (AI-ACTION-03)", () => {
  it("rejects non-owner via requireRole — sendSignedWebhook never fires", async () => {
    mockRequireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    await expect(triggerCompanyResearch(1)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
  });

  it("returns { ok: true } on successful webhook and passes UUID v4 key (D-03)", async () => {
    mockSendSignedWebhook.mockResolvedValue({ ok: true });
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    const result = await triggerCompanyResearch(42);

    expect(result).toEqual({ ok: true });
    expect(mockSendSignedWebhook).toHaveBeenCalledWith(
      "job-company-intel",
      { job_id: 42 },
      expect.stringMatching(UUID_V4_REGEX),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/jobs");
  });

  it("returns { ok: false, sentinel } and does NOT throw when webhook fails (D-08)", async () => {
    mockSendSignedWebhook.mockResolvedValue({
      ok: false,
      sentinel: "rate limit",
    });
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    const result = await triggerCompanyResearch(42);

    expect(result).toEqual({ ok: false, sentinel: "rate limit" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("passes a fresh UUID idempotency key on every call (D-03)", async () => {
    mockSendSignedWebhook.mockResolvedValue({ ok: true });
    const { triggerCompanyResearch } = await import("@/lib/job-actions");
    await triggerCompanyResearch(1);
    await triggerCompanyResearch(1);

    const firstKey = mockSendSignedWebhook.mock.calls[0][2];
    const secondKey = mockSendSignedWebhook.mock.calls[1][2];
    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).toMatch(UUID_V4_REGEX);
    expect(secondKey).toMatch(UUID_V4_REGEX);
  });
});

describe("regenerateCoverLetter — Server Action contract (AI-ACTION-04 + D-06 amended)", () => {
  it("returns { ok: true, baseline } with server-read generated_at (D-06)", async () => {
    const serverBaseline = "2026-04-20T12:34:56.000Z";
    mockGetJobDetail.mockResolvedValue({
      cover_letter: {
        generated_at: serverBaseline,
        content: "text",
        model_used: null,
      },
    });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateCoverLetter } = await import("@/lib/job-actions");
    const result = await regenerateCoverLetter(42);

    expect(result).toEqual({ ok: true, baseline: serverBaseline });
    expect(mockSendSignedWebhook).toHaveBeenCalledWith(
      "regenerate-cover-letter",
      { job_id: 42 },
      expect.stringMatching(UUID_V4_REGEX),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/jobs");
  });

  it("returns { ok: true, baseline: null } when job has no cover letter yet", async () => {
    mockGetJobDetail.mockResolvedValue({ cover_letter: null });
    mockSendSignedWebhook.mockResolvedValue({ ok: true });

    const { regenerateCoverLetter } = await import("@/lib/job-actions");
    const result = await regenerateCoverLetter(42);

    expect(result).toEqual({ ok: true, baseline: null });
  });

  it("returns { ok: false, sentinel } and does NOT throw when webhook fails after baseline read", async () => {
    mockGetJobDetail.mockResolvedValue({
      cover_letter: { generated_at: "2026-01-01T00:00:00.000Z" },
    });
    mockSendSignedWebhook.mockResolvedValue({
      ok: false,
      sentinel: "timeout",
    });

    const { regenerateCoverLetter } = await import("@/lib/job-actions");
    const result = await regenerateCoverLetter(42);

    expect(result).toEqual({ ok: false, sentinel: "timeout" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns { ok: false, sentinel: 'unavailable' } when DB read throws — sendSignedWebhook never called (T-23-02-05)", async () => {
    mockGetJobDetail.mockRejectedValue(new Error("ETIMEDOUT"));

    const { regenerateCoverLetter } = await import("@/lib/job-actions");
    const result = await regenerateCoverLetter(42);

    expect(result).toEqual({ ok: false, sentinel: "unavailable" });
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("rejects non-owner via requireRole — neither getJobDetail nor sendSignedWebhook fire", async () => {
    mockRequireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    const { regenerateCoverLetter } = await import("@/lib/job-actions");
    await expect(regenerateCoverLetter(1)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockGetJobDetail).not.toHaveBeenCalled();
    expect(mockSendSignedWebhook).not.toHaveBeenCalled();
  });
});
