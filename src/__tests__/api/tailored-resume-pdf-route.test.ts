import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireRole + getTailoredResumePdf BEFORE importing the route.
// Must use vi.hoisted() because vi.mock() factories are lifted above
// imports and cannot close over top-level `const`s directly.
const { mockRequireRole, mockGetTailoredResumePdf } = vi.hoisted(() => ({
  mockRequireRole: vi.fn(),
  mockGetTailoredResumePdf: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
}));
vi.mock("@/lib/jobs-db", () => ({
  getTailoredResumePdf: (...args: unknown[]) => mockGetTailoredResumePdf(...args),
}));

import { GET } from "@/app/api/jobs/[id]/tailored-resume-pdf/route";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/jobs/[id]/tailored-resume-pdf", () => {
  beforeEach(() => {
    mockRequireRole.mockReset();
    mockGetTailoredResumePdf.mockReset();
  });

  it("returns 200 + PDF headers when pdf_data is present", async () => {
    mockRequireRole.mockResolvedValueOnce(undefined);
    // "JVBERi0xLjQK" decodes to "%PDF-1.4\n" → 9 bytes
    mockGetTailoredResumePdf.mockResolvedValueOnce("JVBERi0xLjQK");

    const response = await GET(
      new Request("http://test/api/jobs/123/tailored-resume-pdf"),
      makeParams("123")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="tailored-resume-job-123.pdf"'
    );
    expect(response.headers.get("Content-Length")).toBe("9");
  });

  it("returns 404 when pdf_data is null", async () => {
    mockRequireRole.mockResolvedValueOnce(undefined);
    mockGetTailoredResumePdf.mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://test/api/jobs/123/tailored-resume-pdf"),
      makeParams("123")
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toEqual({ error: "No PDF available" });
  });

  it("returns 400 on non-numeric id", async () => {
    mockRequireRole.mockResolvedValueOnce(undefined);
    // Must not even reach the getTailoredResumePdf call
    const response = await GET(
      new Request("http://test/api/jobs/abc/tailored-resume-pdf"),
      makeParams("abc")
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({ error: "Invalid job ID" });
    expect(mockGetTailoredResumePdf).not.toHaveBeenCalled();
  });

  it("throws when requireRole rejects (non-owner session)", async () => {
    mockRequireRole.mockRejectedValueOnce(new Error("UNAUTHORIZED"));
    await expect(
      GET(
        new Request("http://test/api/jobs/123/tailored-resume-pdf"),
        makeParams("123")
      )
    ).rejects.toThrow("UNAUTHORIZED");
    expect(mockGetTailoredResumePdf).not.toHaveBeenCalled();
  });

  it("awaits the params Promise correctly (Next.js 16 async params)", async () => {
    mockRequireRole.mockResolvedValueOnce(undefined);
    mockGetTailoredResumePdf.mockResolvedValueOnce("JVBERi0xLjQK");

    // Pass params as a Promise (Next.js 16 shape) — regression guard for Pitfall 3
    const response = await GET(
      new Request("http://test/api/jobs/456/tailored-resume-pdf"),
      { params: Promise.resolve({ id: "456" }) }
    );

    expect(response.status).toBe(200);
    expect(mockGetTailoredResumePdf).toHaveBeenCalledWith(456);
  });
});
