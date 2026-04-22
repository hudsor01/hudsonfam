import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  TailoredResumeSection,
  type TailoredResumeView,
} from "@/app/(admin)/admin/jobs/tailored-resume-section";

const freshView: TailoredResumeView = {
  content: "# Richard Hudson\n\n**Senior Engineer**\n\n- item",
  model_used: "gpt-4o-mini",
  freshness: { generatedDate: "4/21/26", isStale: false, ageDays: 0 },
};

const staleView: TailoredResumeView = {
  content: "# Resume",
  model_used: "gpt-4o-mini",
  freshness: { generatedDate: "4/1/26", isStale: true, ageDays: 20 },
};

describe("TailoredResumeSection", () => {
  it("renders heading 'Tailored Resume' with FileText icon", () => {
    const { container } = render(<TailoredResumeSection resume={freshView} />);
    const heading = container.querySelector("h3");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain("Tailored Resume");
    // lucide FileText renders an <svg>
    expect(heading?.querySelector("svg")).not.toBeNull();
  });

  it("renders markdown content via Streamdown (not plaintext)", () => {
    const { container } = render(<TailoredResumeSection resume={freshView} />);
    // Streamdown produces an <h1> for "# Richard Hudson" and a
    // <span data-streamdown="strong"> for **bold** (not a <strong> tag)
    expect(container.querySelector("h1")).not.toBeNull();
    expect(
      container.querySelector('[data-streamdown="strong"]')
    ).not.toBeNull();
    // Container body uses UI-SPEC styling (bg-card/50, max-h-96)
    const body = container.querySelector(".max-h-96");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("bg-card/50");
    expect(body?.className).toContain("overflow-y-auto");
  });

  it("returns null when resume is null (Phase 20 hides section; empty state is Phase 21)", () => {
    const { container } = render(<TailoredResumeSection resume={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the amber stale dot when freshness.isStale is true", () => {
    const { container } = render(<TailoredResumeSection resume={staleView} />);
    const dot = container.querySelector(".bg-warning");
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("aria-label")).toBe("Stale artifact");
  });

  it("renders model_used next to the formatted date when present", () => {
    const { container } = render(<TailoredResumeSection resume={freshView} />);
    expect(container.textContent).toContain("Generated 4/21/26");
    expect(container.textContent).toContain("gpt-4o-mini");
  });

  it("does NOT use whitespace-pre-wrap (that's the old cover-letter plaintext style)", () => {
    const { container } = render(<TailoredResumeSection resume={freshView} />);
    const body = container.querySelector(".max-h-96");
    expect(body?.className || "").not.toContain("whitespace-pre-wrap");
  });
});
