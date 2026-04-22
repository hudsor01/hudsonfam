import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pg Pool BEFORE importing anything that touches jobs-db.ts.
// The singleton in jobs-db.ts constructs `new pg.Pool(...)` at module import
// time, so the mock must intercept that construction. vi.mock factories are
// hoisted above imports, so the mock query must be smuggled across via
// vi.hoisted() (plain top-level `const` is not visible inside the factory).
const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock("pg", () => {
  class MockPool {
    query = mockQuery;
  }
  return { default: { Pool: MockPool } };
});

import { getTailoredResumePdf } from "@/lib/jobs-db";

describe("getTailoredResumePdf", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns the base64 string when a row with pdf_data exists", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ pdf_data: "JVBERi0xLjQ=" }],
    });
    const result = await getTailoredResumePdf(123);
    expect(result).toBe("JVBERi0xLjQ=");
    expect(mockQuery).toHaveBeenCalledWith(
      "SELECT pdf_data FROM tailored_resumes WHERE job_id = $1",
      [123]
    );
  });

  it("returns null when the row exists but pdf_data is null", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ pdf_data: null }] });
    const result = await getTailoredResumePdf(123);
    expect(result).toBeNull();
  });

  it("returns null when no row exists", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getTailoredResumePdf(999);
    expect(result).toBeNull();
  });

  it("propagates pg errors (route handler returns 500)", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    await expect(getTailoredResumePdf(123)).rejects.toThrow("connection refused");
  });
});
