import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ZodIssue } from "zod";
import {
  CoverLetterSchema,
  CompanyResearchSchema,
  TailoredResumeSchema,
  parseOrLog,
} from "@/lib/jobs-schemas";

describe("jobs-schemas parseOrLog (fail-open)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  const validCoverLetter = {
    id: 42,
    content: "Hello, World",
    pdf_data: null,
    quality_score: 8,
    generated_at: "2026-04-21T10:00:00.000Z",
    model_used: "gpt-4o-mini",
  };

  it("returns the parsed object for a valid row", () => {
    const result = parseOrLog(CoverLetterSchema, validCoverLetter, "cover_letter", 42);
    expect(result).toEqual(validCoverLetter);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null and logs on missing required field", () => {
    const broken = { ...validCoverLetter } as Record<string, unknown>;
    delete broken.content;
    const result = parseOrLog(CoverLetterSchema, broken, "cover_letter", 42);
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [msg, payload] = errorSpy.mock.calls[0] as [string, { jobId: number; issues: unknown[] }];
    expect(msg).toContain("[jobs-db] cover_letter schema drift");
    expect(payload.jobId).toBe(42);
    expect(Array.isArray(payload.issues)).toBe(true);
    expect(payload.issues.length).toBeGreaterThan(0);
  });

  it("returns null and logs on wrong-typed field", () => {
    const broken = { ...validCoverLetter, quality_score: "high" as unknown as number };
    const result = parseOrLog(CoverLetterSchema, broken, "cover_letter", 99);
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const payload = errorSpy.mock.calls[0][1] as { jobId: number };
    expect(payload.jobId).toBe(99);
  });

  it("returns null silently when raw is null (no-row case)", () => {
    const result = parseOrLog(CoverLetterSchema, null, "cover_letter", 1);
    expect(result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null silently when raw is undefined", () => {
    const result = parseOrLog(CoverLetterSchema, undefined, "cover_letter", 1);
    expect(result).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("never throws on pathological input", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => parseOrLog(CoverLetterSchema, circular, "cover_letter", 1)).not.toThrow();
    expect(() => parseOrLog(CoverLetterSchema, "not an object", "cover_letter", 1)).not.toThrow();
    expect(() => parseOrLog(CoverLetterSchema, 42, "cover_letter", 1)).not.toThrow();
  });

  it("accepts a valid tailored_resume with null model_used", () => {
    const row = {
      id: 7,
      content: "# Resume",
      pdf_data: null,
      model_used: null,
      generated_at: "2026-04-21T10:00:00.000Z",
    };
    const result = parseOrLog(TailoredResumeSchema, row, "tailored_resume", 7);
    expect(result).toEqual(row);
  });

  it("accepts a tailored_resume with pdf_data as null", () => {
    const result = TailoredResumeSchema.safeParse({
      id: 1,
      content: "resume",
      pdf_data: null,
      model_used: "gpt-4o-mini",
      generated_at: "2026-04-21T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a tailored_resume with pdf_data as a base64 string", () => {
    const result = TailoredResumeSchema.safeParse({
      id: 1,
      content: "resume",
      pdf_data: "JVBERi0xLjQKJeLjz9M=", // "%PDF-1.4" base64 prefix
      model_used: "gpt-4o-mini",
      generated_at: "2026-04-21T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a tailored_resume with pdf_data as a non-string non-null value", () => {
    const result = TailoredResumeSchema.safeParse({
      id: 1,
      content: "resume",
      pdf_data: 123,
      model_used: "gpt-4o-mini",
      generated_at: "2026-04-21T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tailored_resume when pdf_data is missing (schema is required, not optional)", () => {
    const result = TailoredResumeSchema.safeParse({
      id: 1,
      content: "resume",
      model_used: "gpt-4o-mini",
      generated_at: "2026-04-21T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const pdfIssue = result.error.issues.find((i: ZodIssue) => i.path.includes("pdf_data"));
      expect(pdfIssue).toBeDefined();
    }
  });

  it("accepts a valid company_research row with typical nullable fields", () => {
    const row = {
      id: 3,
      company_name: "Acme",
      company_url: null,
      glassdoor_rating: null,
      salary_range_min: null,
      salary_range_max: null,
      salary_currency: "USD",
      tech_stack: [],
      funding_stage: null,
      employee_count: null,
      recent_news: null,
      ai_summary: null,
      created_at: "2026-04-21T10:00:00.000Z",
    };
    const result = parseOrLog(CompanyResearchSchema, row, "company_research", 3);
    expect(result).toEqual(row);
  });
});
