import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { attachFreshness } from "@/lib/job-actions";

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
