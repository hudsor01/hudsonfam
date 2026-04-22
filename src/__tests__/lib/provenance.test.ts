import { describe, it, expect } from "vitest";
import { provenanceColor, provenanceLabel, type ProvenanceSource } from "@/lib/provenance";

describe("provenanceColor — 4-source semantic token mapping", () => {
  it('returns text-muted-foreground for "scraped" (lowest-trust tier)', () => {
    expect(provenanceColor("scraped")).toBe("text-muted-foreground");
  });
  it('returns text-warning for "llm" (LLM estimate, needs scrutiny)', () => {
    expect(provenanceColor("llm")).toBe("text-warning");
  });
  it('returns text-success for "company_research" (higher-trust — LLM researched)', () => {
    expect(provenanceColor("company_research")).toBe("text-success");
  });
  it('returns text-muted-foreground for "original_posting" (reserved — parity with scraped)', () => {
    expect(provenanceColor("original_posting")).toBe("text-muted-foreground");
  });
});

describe("provenanceLabel — 4-source verbatim label mapping", () => {
  it('returns "scraped" for "scraped"', () => {
    expect(provenanceLabel("scraped")).toBe("scraped");
  });
  it('returns "LLM estimate" for "llm"', () => {
    expect(provenanceLabel("llm")).toBe("LLM estimate");
  });
  it('returns "company research" for "company_research"', () => {
    expect(provenanceLabel("company_research")).toBe("company research");
  });
  it('returns "posted" for "original_posting"', () => {
    expect(provenanceLabel("original_posting")).toBe("posted");
  });
});

describe("provenanceColor + provenanceLabel — consistency across all sources", () => {
  const sources: ProvenanceSource[] = ["scraped", "llm", "company_research", "original_posting"];

  it.each(sources)("both functions accept source %s without throwing", (source) => {
    expect(() => provenanceColor(source)).not.toThrow();
    expect(() => provenanceLabel(source)).not.toThrow();
  });

  it("returns a non-empty string from both functions for every source", () => {
    for (const source of sources) {
      expect(provenanceColor(source).length).toBeGreaterThan(0);
      expect(provenanceLabel(source).length).toBeGreaterThan(0);
    }
  });

  it("maps lower-trust sources (scraped, original_posting) to the same neutral color", () => {
    expect(provenanceColor("scraped")).toBe(provenanceColor("original_posting"));
  });
});
