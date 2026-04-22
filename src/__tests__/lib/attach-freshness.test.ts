import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { attachFreshness } from "@/lib/attach-freshness";

describe("attachFreshness — Intl.DateTimeFormat(America/Chicago)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T14:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats generated_at as M/D/YY in America/Chicago", () => {
    const input = {
      id: 1,
      content: "x",
      model_used: "gpt-4o-mini",
      generated_at: "2026-04-18T14:00:00.000Z",
    };
    const result = attachFreshness(input, 14);
    expect(result).not.toBeNull();
    expect(result!.freshness.generatedDate).toBe("4/18/26");
    expect(result!.freshness.isStale).toBe(false);
    expect(result!.freshness.ageDays).toBe(3);
  });

  it("returns null when artifact is null", () => {
    expect(attachFreshness(null, 14)).toBeNull();
  });

  it("returns zeroed freshness on unparseable ISO string (silent fail-open)", () => {
    const input = {
      id: 1,
      content: "x",
      model_used: "m",
      generated_at: "not-a-date",
    };
    const result = attachFreshness(input, 14);
    expect(result).not.toBeNull();
    expect(result!.freshness).toEqual({
      generatedDate: "",
      isStale: false,
      ageDays: 0,
    });
  });

  it("uses created_at for company_research branch", () => {
    const input = {
      id: 1,
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
      created_at: "2026-04-21T05:00:00.000Z",
    };
    const result = attachFreshness(input, 60);
    expect(result).not.toBeNull();
    // 2026-04-21T05:00:00Z = 2026-04-21 00:00:00 Chicago (CDT UTC-5)
    expect(result!.freshness.generatedDate).toBe("4/21/26");
  });

  it("marks stale when age >= thresholdDays", () => {
    const input = {
      id: 1,
      content: "x",
      model_used: "m",
      generated_at: "2026-04-01T14:00:00.000Z",
    };
    const result = attachFreshness(input, 14);
    expect(result!.freshness.generatedDate).toBe("4/1/26");
    expect(result!.freshness.isStale).toBe(true);
    expect(result!.freshness.ageDays).toBe(20);
  });
});

describe("attachFreshness — tri-field dispatch (Phase 22 extension)", () => {
  const FROZEN_NOW = new Date("2026-04-22T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("dispatches on search_date when neither generated_at nor created_at present (salary_intelligence)", () => {
    const artifact = {
      id: 1,
      search_date: "2026-04-21T00:00:00Z",
      report_json: { min: 120000 },
      raw_results: null,
      llm_analysis: "test",
      created_at: "2026-03-01T00:00:00Z", // intentionally older
      updated_at: null,
    };
    const result = attachFreshness(artifact, 30);
    expect(result).not.toBeNull();
    // search_date (4/21) wins over created_at (3/1) per dispatch priority
    expect(result!.freshness.generatedDate).toBe("4/20/26");
    expect(result!.freshness.isStale).toBe(false);
    expect(result!.freshness.ageDays).toBe(1);
  });

  it("prefers generated_at over search_date when both are present (existing behavior preserved)", () => {
    const artifact = {
      generated_at: "2026-04-22T00:00:00Z",
      search_date: "2026-01-01T00:00:00Z", // older — should be ignored
    };
    const result = attachFreshness(artifact, 14);
    expect(result).not.toBeNull();
    // Chicago TZ conversion of 4/22/00Z → 4/21/26 (CDT UTC-5)
    // Key assertion: NOT 1/1/26 (which would be the ignored search_date)
    expect(result!.freshness.generatedDate).not.toContain("1/1/26");
    expect(result!.freshness.generatedDate).toBe("4/21/26");
  });

  it("falls through to created_at when neither generated_at nor search_date present (company_research preserved)", () => {
    const artifact = {
      created_at: "2026-04-22T12:00:00Z",
      other_field: "x",
    };
    const result = attachFreshness(artifact, 60);
    expect(result).not.toBeNull();
    expect(result!.freshness.ageDays).toBe(0);
  });
});
