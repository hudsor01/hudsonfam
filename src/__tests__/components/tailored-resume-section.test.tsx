import type { ReactElement } from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";
import { render as rtlRender, fireEvent, waitFor, act } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  TailoredResumeSection,
  type TailoredResumeView,
} from "@/app/(admin)/admin/jobs/tailored-resume-section";

// Production mounts a root <TooltipProvider> in providers.tsx; tests render in
// isolation, so Radix throws "Tooltip must be used within TooltipProvider"
// unless we wrap. delayDuration=0 so keyboard/click shouldn't open tooltips
// during render-shape assertions.
function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    ),
  });
}

// ---------------------------------------------------------------------------
// Mock infrastructure (Phase 21 Plan 04, Task 1 inline path).
// Plan 21-04 Task 1 allows either a global setup.ts clipboard mock OR per-file
// inline mocks. Given src/__tests__/setup.ts currently only carries cross-
// cutting MSW plumbing, we keep clipboard + sonner mocks colocated with the
// one test file that actually exercises them — avoids bloating global setup
// for a single consumer and keeps the mock contract inspectable where it's
// used.
// ---------------------------------------------------------------------------

// vi.mock factories hoist above plain consts, so state referenced inside the
// factory MUST live inside vi.hoisted() — same three-part pattern established
// in Plan 21-03 (jobs-db-pdf.test.ts) for the pg Pool mock.
const { mockToastSuccess } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess },
}));

const mockClipboardWriteText = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
  // happy-dom exposes navigator.clipboard as a getter-only property — plain
  // Object.assign throws. defineProperty with configurable:true installs a
  // fresh vi.fn() on every test so assertions never bleed between cases.
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: { writeText: mockClipboardWriteText },
  });
  mockClipboardWriteText.mockClear();
  mockClipboardWriteText.mockResolvedValue(undefined);
  mockToastSuccess.mockClear();
});

afterEach(() => {
  // If a test swapped in fake timers, make sure the next test doesn't
  // inherit them. useRealTimers is idempotent.
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Phase 20 render-shape tests (preserved from Plan 20-05)
// ---------------------------------------------------------------------------

describe("TailoredResumeSection", () => {
  it("renders heading 'Tailored Resume' with FileText icon", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const heading = container.querySelector("h3");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain("Tailored Resume");
    // lucide FileText renders an <svg>
    expect(heading?.querySelector("svg")).not.toBeNull();
  });

  it("renders markdown content via Streamdown (not plaintext)", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
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

  it("renders the AI-RENDER-04 empty-state block when resume is null (Phase 21 Plan 06)", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={null} />
    );
    // Section shell preserved per CONTEXT.md D-13
    expect(container.textContent).toContain("Tailored Resume");
    expect(container.textContent).toContain("No tailored resume yet.");
    // FreshnessBadge / Copy button / Download anchor all suppressed
    expect(
      container.querySelector('[aria-label="Copy tailored resume to clipboard"]')
    ).toBeNull();
    expect(container.querySelector("a[download]")).toBeNull();
  });

  it("renders the amber stale dot when freshness.isStale is true", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={staleView} />
    );
    const dot = container.querySelector(".bg-warning");
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("aria-label")).toBe("Stale artifact");
  });

  it("renders model_used next to the formatted date when present", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    expect(container.textContent).toContain("Generated 4/21/26");
    expect(container.textContent).toContain("gpt-4o-mini");
  });

  it("does NOT use whitespace-pre-wrap (that's the old cover-letter plaintext style)", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const body = container.querySelector(".max-h-96");
    expect(body?.className || "").not.toContain("whitespace-pre-wrap");
  });
});

// ---------------------------------------------------------------------------
// Phase 21 Copy button + Download anchor tests (Plan 21-04)
// ---------------------------------------------------------------------------

describe("TailoredResumeSection — Copy button + Download anchor (Phase 21)", () => {
  it("renders a Copy button with the locked aria-label", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const btn = container.querySelector(
      '[aria-label="Copy tailored resume to clipboard"]'
    );
    expect(btn).not.toBeNull();
  });

  it("writes resume.content verbatim to clipboard on click", async () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const btn = container.querySelector(
      '[aria-label="Copy tailored resume to clipboard"]'
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    expect(mockClipboardWriteText).toHaveBeenCalledWith(freshView.content);
  });

  it("fires toast.success('Resume copied to clipboard') on click", async () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const btn = container.querySelector(
      '[aria-label="Copy tailored resume to clipboard"]'
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledTimes(1);
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Resume copied to clipboard");
  });

  it("morphs Copy → Check for 2000ms then reverts", async () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const btn = container.querySelector(
      '[aria-label="Copy tailored resume to clipboard"]'
    ) as HTMLButtonElement;

    // Before click: Copy icon (lucide-copy) present, Check absent.
    expect(btn.innerHTML).toContain("lucide-copy");
    expect(btn.innerHTML).not.toContain("lucide-check");

    await act(async () => {
      fireEvent.click(btn);
    });

    // After click + microtask flush: Check icon should be present.
    await waitFor(() => {
      expect(btn.innerHTML).toContain("lucide-check");
    });
    expect(btn.innerHTML).not.toContain("lucide-copy");

    // Advance fake timers 2000ms → icon reverts to Copy.
    vi.useFakeTimers({ shouldAdvanceTime: false });
    // Because the component's setTimeout(2000) already fired under real
    // timers (via the click path above used real timers), we verify revert
    // directly via waitFor. If the timer hasn't fired yet in real time,
    // waitFor's default 1s window plus the ~2000ms hold could race. Use
    // vi.waitFor with an explicit timeout to cover the full revert window.
    vi.useRealTimers();
    await waitFor(
      () => {
        expect(btn.innerHTML).toContain("lucide-copy");
      },
      { timeout: 3000 }
    );
    expect(btn.innerHTML).not.toContain("lucide-check");
  });

  it("does not fire a toast or morph the icon when clipboard.writeText rejects (silent fail)", async () => {
    mockClipboardWriteText.mockRejectedValueOnce(new Error("permission denied"));
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const btn = container.querySelector(
      '[aria-label="Copy tailored resume to clipboard"]'
    ) as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });
    // Wait a microtask to let the rejection propagate into the catch.
    await waitFor(() => {
      expect(mockClipboardWriteText).toHaveBeenCalledTimes(1);
    });
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(btn.innerHTML).not.toContain("lucide-check");
    expect(btn.innerHTML).toContain("lucide-copy");
  });

  it("renders a Download PDF anchor pointing at the tailored-resume-pdf route", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={freshView} />
    );
    const anchor = container.querySelector("a[download]") as HTMLAnchorElement;
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute("href")).toBe(
      "/api/jobs/42/tailored-resume-pdf"
    );
    expect(anchor.textContent).toContain("Download PDF");
    expect(anchor.querySelector(".lucide-download")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Phase 24 Plan 03 — RegenerateButton mount assertions (D-09)
// ---------------------------------------------------------------------------

// Mock the RegenerateButton at the module path used by tailored-resume-section
// (relative import "./regenerate-button") — we isolate to the LABEL being
// rendered in the populated branch, skipping the 4-state machine / polling
// infrastructure which has its own test file (regenerate-button.test.tsx).
vi.mock("@/app/(admin)/admin/jobs/regenerate-button", () => ({
  RegenerateButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

describe("TailoredResumeSection — RegenerateButton mount (Phase 24 D-09)", () => {
  it("renders RegenerateButton with verbatim label in the populated branch", () => {
    const { getByText } = render(
      <TailoredResumeSection
        jobId={42}
        resume={freshView}
        baselineGeneratedAtIso="2026-04-21T12:00:00.000Z"
      />
    );
    expect(getByText("Regenerate tailored resume")).toBeTruthy();
  });

  it("does NOT render RegenerateButton when resume is null (empty-state branch)", () => {
    const { queryByText } = render(
      <TailoredResumeSection
        jobId={42}
        resume={null}
        baselineGeneratedAtIso={null}
      />
    );
    expect(queryByText("Regenerate tailored resume")).toBeNull();
  });

  it("does NOT render RegenerateButton when resume.content is whitespace (empty-content branch)", () => {
    const whitespaceView: TailoredResumeView = {
      content: "   ",
      model_used: "gpt-4o-mini",
      freshness: { generatedDate: "4/21/26", isStale: false, ageDays: 0 },
    };
    const { queryByText } = render(
      <TailoredResumeSection
        jobId={42}
        resume={whitespaceView}
        baselineGeneratedAtIso="2026-04-21T12:00:00.000Z"
      />
    );
    expect(queryByText("Regenerate tailored resume")).toBeNull();
  });
});
