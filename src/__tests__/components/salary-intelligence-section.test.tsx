import { describe, it, expect } from "vitest";
import { render as rtlRender } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { ReactElement } from "react";
import {
  SalaryIntelligenceSection,
  type SalaryIntelligenceView,
} from "@/app/(admin)/admin/jobs/salary-intelligence-section";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";

function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    ),
  });
}

const baseFreshness = { generatedDate: "4/21/26", isStale: false, ageDays: 1 };

const minMedianMaxView: SalaryIntelligenceView = {
  report_json: { min: 120000, median: 150000, max: 180000, currency: "USD" },
  llm_analysis: "Market tight in H1 2026.",
  freshness: baseFreshness,
};

const percentilesView: SalaryIntelligenceView = {
  report_json: { p25: 120000, p50: 150000, p75: 180000, currency: "USD" },
  llm_analysis: "Upper-quartile bonus observed.",
  freshness: baseFreshness,
};

const unrecognizedEmptyView: SalaryIntelligenceView = {
  report_json: { random: "junk" },
  llm_analysis: "   ",
  freshness: baseFreshness,
};

const headlineOnlyView: SalaryIntelligenceView = {
  report_json: { min: 120000, max: 180000, currency: "USD" },
  llm_analysis: null,
  freshness: baseFreshness,
};

const proseOnlyView: SalaryIntelligenceView = {
  report_json: { garbage: true }, // parseSalaryHeadline returns null
  llm_analysis: "Narrative-only insight.",
  freshness: baseFreshness,
};

const missingCurrencyView: SalaryIntelligenceView = {
  report_json: { min: 120000, max: 180000 }, // no currency
  llm_analysis: "Prose here.",
  freshness: baseFreshness,
};

describe("SalaryIntelligenceSection — branch rendering", () => {
  it("null salary → renders heading + missing-state italic copy from EMPTY_STATE_COPY", () => {
    const { container } = render(<SalaryIntelligenceSection salary={null} />);
    const h3 = container.querySelector("h3");
    expect(h3?.textContent).toContain("Salary Intelligence");
    const body = container.querySelector("p.italic");
    expect(body?.textContent).toBe(EMPTY_STATE_COPY.salary_intelligence.missing);
  });

  it("unrecognized JSON + blank prose → renders heading + empty-state italic copy", () => {
    const { container } = render(<SalaryIntelligenceSection salary={unrecognizedEmptyView} />);
    const h3 = container.querySelector("h3");
    expect(h3?.textContent).toContain("Salary Intelligence");
    const body = container.querySelector("p.italic");
    expect(body?.textContent).toBe(EMPTY_STATE_COPY.salary_intelligence.empty);
  });

  it("missing currency → headline hides; if prose present, Streamdown renders only", () => {
    const { container } = render(<SalaryIntelligenceSection salary={missingCurrencyView} />);
    const figures = container.querySelectorAll(".tabular-nums");
    expect(figures.length).toBe(0); // no headline row
    // Streamdown container SHOULD be present because prose has content
    const streamdownContainer = container.querySelector(".bg-card\\/50");
    expect(streamdownContainer).toBeTruthy();
  });
});

describe("SalaryIntelligenceSection — populated branches", () => {
  it("MIN_MEDIAN_MAX shape renders 3 figures with Min / Median / Max labels", () => {
    const { container, getAllByText } = render(<SalaryIntelligenceSection salary={minMedianMaxView} />);
    expect(getAllByText("Min").length).toBe(1);
    expect(getAllByText("Median").length).toBe(1);
    expect(getAllByText("Max").length).toBe(1);
    // 3 tabular-num figure spans
    const figures = container.querySelectorAll(".tabular-nums");
    expect(figures.length).toBe(3);
  });

  it("PERCENTILES shape renders 3 figures with 25th / 50th / 75th labels", () => {
    const { getAllByText } = render(<SalaryIntelligenceSection salary={percentilesView} />);
    expect(getAllByText("25th").length).toBe(1);
    expect(getAllByText("50th").length).toBe(1);
    expect(getAllByText("75th").length).toBe(1);
  });

  it("every headline figure is accompanied by a <ProvenanceTag source='llm'> with text-warning class", () => {
    const { getAllByText } = render(<SalaryIntelligenceSection salary={minMedianMaxView} />);
    // Three "LLM estimate" badges
    const tags = getAllByText("LLM estimate");
    expect(tags.length).toBe(3);
    for (const tag of tags) {
      expect(tag.className).toContain("text-warning");
      expect(tag.className).toContain("text-[10px]");
    }
  });

  it("headline-only (prose null) → headline row renders, Streamdown container absent", () => {
    const { container } = render(<SalaryIntelligenceSection salary={headlineOnlyView} />);
    const figures = container.querySelectorAll(".tabular-nums");
    expect(figures.length).toBe(2); // min + max
    const streamdownContainer = container.querySelector(".bg-card\\/50");
    expect(streamdownContainer).toBeNull();
  });

  it("prose-only (unrecognized JSON) → Streamdown renders, headline row absent", () => {
    const { container } = render(<SalaryIntelligenceSection salary={proseOnlyView} />);
    const figures = container.querySelectorAll(".tabular-nums");
    expect(figures.length).toBe(0);
    const streamdownContainer = container.querySelector(".bg-card\\/50");
    expect(streamdownContainer).toBeTruthy();
  });

  it("Streamdown container carries bg-card/50 + border-border classes (Phase 20 posture inherited)", () => {
    const { container } = render(<SalaryIntelligenceSection salary={minMedianMaxView} />);
    const streamdownContainer = container.querySelector(".bg-card\\/50");
    expect(streamdownContainer).toBeTruthy();
    expect(streamdownContainer?.className).toContain("border-border");
    expect(streamdownContainer?.className).toContain("max-h-96");
    expect(streamdownContainer?.className).toContain("overflow-y-auto");
  });

  it("heading is always present across all render branches (Plan 21-06 always-render-shell)", () => {
    for (const variant of [null, unrecognizedEmptyView, minMedianMaxView, percentilesView, headlineOnlyView, proseOnlyView]) {
      const { container, unmount } = render(<SalaryIntelligenceSection salary={variant} />);
      const h3 = container.querySelector("h3");
      expect(h3?.textContent).toContain("Salary Intelligence");
      unmount();
    }
  });
});

describe("SalaryIntelligenceSection — anti-CTA drift guard (grep gate G-5 + G-3)", () => {
  it("missing-state copy matches EMPTY_STATE_COPY verbatim (no inline literal drift)", () => {
    const { container } = render(<SalaryIntelligenceSection salary={null} />);
    const body = container.querySelector("p.italic");
    expect(body?.textContent).toBe("No salary intelligence yet.");
    expect(body?.textContent).toBe(EMPTY_STATE_COPY.salary_intelligence.missing);
  });

  it("empty-state copy matches EMPTY_STATE_COPY verbatim", () => {
    const { container } = render(<SalaryIntelligenceSection salary={unrecognizedEmptyView} />);
    const body = container.querySelector("p.italic");
    expect(body?.textContent).toBe("Salary intelligence was generated but is empty.");
    expect(body?.textContent).toBe(EMPTY_STATE_COPY.salary_intelligence.empty);
  });

  it.each([
    EMPTY_STATE_COPY.salary_intelligence.missing,
    EMPTY_STATE_COPY.salary_intelligence.empty,
  ])("copy '%s' passes the anti-CTA rule (no imperative verbs, no !, exactly one period)", (copy) => {
    const forbidden = /\b(click|regenerate|run|generate now|try|retry|please|start|begin|trigger)\b/i;
    expect(copy).not.toMatch(forbidden);
    expect(copy).not.toContain("!");
    const periods = (copy.match(/\./g) || []).length;
    expect(periods).toBe(1);
  });
});
