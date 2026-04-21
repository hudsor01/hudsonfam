import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { SectionErrorBoundary } from "@/app/(admin)/admin/jobs/section-error-boundary";

function Exploder({ message = "boom" }: { message?: string }): React.ReactElement {
  throw new Error(message);
}

describe("SectionErrorBoundary", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("renders children when there is no error", () => {
    const { container } = render(
      <SectionErrorBoundary section="tailored_resume" jobId={42}>
        <p>hello</p>
      </SectionErrorBoundary>
    );
    expect(container.textContent).toContain("hello");
    expect(container.textContent).not.toContain("Couldn");
  });

  it("renders fallback when a child throws during render", () => {
    const { container } = render(
      <SectionErrorBoundary section="tailored_resume" jobId={42}>
        <Exploder message="rehype plugin exploded" />
      </SectionErrorBoundary>
    );
    // Fallback copy (exact, per UI-SPEC §3)
    expect(container.textContent).toContain(
      "Couldn’t render this section — the data may have changed shape."
    );
    // Heading still renders with section label
    expect(container.textContent).toContain("Tailored Resume");
    // Error detail is NEVER surfaced to DOM
    expect(container.textContent).not.toContain("rehype plugin exploded");
    expect(container.textContent).not.toContain("Error:");
  });

  it("logs server-side error payload on render failure", () => {
    render(
      <SectionErrorBoundary section="cover_letter" jobId={99}>
        <Exploder message="schema drift" />
      </SectionErrorBoundary>
    );
    // At least one call matched the [ai-section] format
    const aiSectionCalls = errorSpy.mock.calls.filter(
      (args) => typeof args[0] === "string" && args[0].includes("[ai-section]")
    );
    expect(aiSectionCalls.length).toBeGreaterThanOrEqual(1);
    const [, payload] = aiSectionCalls[0] as [
      string,
      { section: string; jobId: number; error: string; stack?: string }
    ];
    expect(payload.section).toBe("cover_letter");
    expect(payload.jobId).toBe(99);
    expect(payload.error).toBe("schema drift");
    expect(typeof payload.stack === "string" || payload.stack === undefined).toBe(true);
  });

  it("isolates errors — a failing boundary next to a healthy one leaves the healthy one intact", () => {
    const { container } = render(
      <>
        <SectionErrorBoundary section="cover_letter" jobId={1}>
          <Exploder />
        </SectionErrorBoundary>
        <SectionErrorBoundary section="tailored_resume" jobId={1}>
          <p>still here</p>
        </SectionErrorBoundary>
      </>
    );
    expect(container.textContent).toContain("Cover Letter");
    expect(container.textContent).toContain(
      "Couldn’t render this section"
    );
    expect(container.textContent).toContain("still here");
  });

  it("fallback uses muted-foreground and italic, NOT destructive styling", () => {
    const { container } = render(
      <SectionErrorBoundary section="tailored_resume" jobId={1}>
        <Exploder />
      </SectionErrorBoundary>
    );
    const body = container.querySelector("p");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("text-muted-foreground");
    expect(body?.className).toContain("italic");
    expect(body?.className).not.toContain("text-destructive");
    expect(body?.className).not.toContain("bg-destructive");
  });

  it("renders the correct label for each section kind", () => {
    const sections: Array<["cover_letter" | "tailored_resume" | "company_research" | "salary_intelligence", string]> = [
      ["cover_letter", "Cover Letter"],
      ["tailored_resume", "Tailored Resume"],
      ["company_research", "Company Intel"],
      ["salary_intelligence", "Salary Intelligence"],
    ];
    for (const [section, label] of sections) {
      const { container } = render(
        <SectionErrorBoundary section={section} jobId={1}>
          <Exploder />
        </SectionErrorBoundary>
      );
      expect(container.textContent).toContain(label);
    }
  });
});
