import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render as rtlRender,
  fireEvent,
  act,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { TriggerCompanyResearchButton } from "@/app/(admin)/admin/jobs/trigger-company-research-button";

// Hoisted mocks — must be hoisted before module init so the vi.mock factory
// below can reference them (Plan 23-02 `vi.hoisted` + `vi.mock` + dynamic
// import pattern — PATTERNS.md §7).
const { mockTriggerCompanyResearch, mockFetchJobDetail } = vi.hoisted(() => ({
  mockTriggerCompanyResearch: vi.fn(),
  mockFetchJobDetail: vi.fn(),
}));

vi.mock("@/lib/job-actions", () => ({
  triggerCompanyResearch: mockTriggerCompanyResearch,
  fetchJobDetail: mockFetchJobDetail,
}));

function render(ui: ReactElement) {
  return rtlRender(ui);
}

beforeEach(() => {
  vi.useFakeTimers();
  mockTriggerCompanyResearch.mockClear();
  mockFetchJobDetail.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("TriggerCompanyResearchButton — behavior (AI-ACTION-03)", () => {
  it("renders with label 'Research this company' in idle state; button not disabled", () => {
    const { getByRole } = render(<TriggerCompanyResearchButton jobId={1} />);
    const btn = getByRole("button");
    expect(btn).toHaveTextContent("Research this company");
    expect(btn).not.toBeDisabled();
  });

  it("clicking fires triggerCompanyResearch once with the jobId", async () => {
    mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
    mockFetchJobDetail.mockResolvedValue({ company_research: null });
    const { getByRole } = render(<TriggerCompanyResearchButton jobId={42} />);
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(mockTriggerCompanyResearch).toHaveBeenCalledWith(42);
    expect(mockTriggerCompanyResearch).toHaveBeenCalledTimes(1);
  });

  it("in-progress: button is disabled with aria-busy=true after click (G-1)", async () => {
    mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
    mockFetchJobDetail.mockResolvedValue({ company_research: null });
    const { getByRole } = render(<TriggerCompanyResearchButton jobId={1} />);
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    const btn = getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("polls fetchJobDetail every 3 seconds (D-05 cadence)", async () => {
    mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
    mockFetchJobDetail.mockResolvedValue({ company_research: null });
    const { getByRole } = render(<TriggerCompanyResearchButton jobId={1} />);
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
    expect(mockFetchJobDetail).toHaveBeenCalledWith(1);
  });

  it("stops polling when company_research is no longer null (INSERT-wait predicate D-06)", async () => {
    mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
    mockFetchJobDetail
      .mockResolvedValueOnce({ company_research: null })
      .mockResolvedValueOnce({ company_research: null })
      .mockResolvedValue({ company_research: { company_name: "Acme" } });
    const { getByRole } = render(<TriggerCompanyResearchButton jobId={1} />);
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // Should have stopped at 3rd tick; button returns to idle
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
    expect(getByRole("button")).not.toBeDisabled();

    // Further ticks do NOT trigger additional polls (interval cleared).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
  });

  it("times out after 60 polls (180s) and shows 'Error: unavailable' verbatim (D-05 cap)", async () => {
    mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
    mockFetchJobDetail.mockResolvedValue({ company_research: null });
    const { getByRole, getByText } = render(
      <TriggerCompanyResearchButton jobId={1} />,
    );
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(60);
    expect(getByText("Error: unavailable")).toBeInTheDocument();
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("clears interval on unmount mid-poll — no setState-after-unmount (Pitfall 6)", async () => {
    mockTriggerCompanyResearch.mockResolvedValue({ ok: true });
    mockFetchJobDetail.mockResolvedValue({ company_research: null });
    const { getByRole, unmount } = render(
      <TriggerCompanyResearchButton jobId={1} />,
    );
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    // Call count frozen at 1 — interval cleared on unmount cleanup
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["timeout"],
    ["auth"],
    ["rate limit"],
    ["unavailable"],
  ] as const)(
    "displays 'Error: %s' verbatim when Server Action returns that sentinel (G-3)",
    async (sentinel) => {
      mockTriggerCompanyResearch.mockResolvedValue({ ok: false, sentinel });
      const { getByRole, getByText } = render(
        <TriggerCompanyResearchButton jobId={1} />,
      );
      await act(async () => {
        fireEvent.click(getByRole("button"));
      });
      expect(getByText(`Error: ${sentinel}`)).toBeInTheDocument();
      expect(getByRole("button")).not.toBeDisabled();
    },
  );
});

describe("trigger-company-research-button.tsx — UI-SPEC grep gates", () => {
  const BTN_PATH = path.join(
    process.cwd(),
    "src/app/(admin)/admin/jobs/trigger-company-research-button.tsx",
  );
  const btnSource = readFileSync(BTN_PATH, "utf-8");

  it("G-1: aria-busy attribute is present on the Button element", () => {
    expect(btnSource).toMatch(/aria-busy=\{/);
  });

  it("G-2: no raw Tailwind color class names (text-red-*, bg-green-*, etc.)", () => {
    expect(btnSource).not.toMatch(
      /(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-\d/,
    );
  });

  it("G-5: label 'Research this company' matches ROADMAP SC #1 verbatim", () => {
    expect(btnSource).toMatch(/Research this company/);
  });
});
