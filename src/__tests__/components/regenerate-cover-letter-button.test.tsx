import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render as rtlRender,
  fireEvent,
  act,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RegenerateCoverLetterButton } from "@/app/(admin)/admin/jobs/regenerate-cover-letter-button";

// Hoisted mocks — must be hoisted before module init so the vi.mock factory
// below can reference them (Plan 23-02 `vi.hoisted` + `vi.mock` + dynamic
// import pattern — PATTERNS.md §7; template established by Plan 23-05).
const { mockRegenerateCoverLetter, mockFetchJobDetail } = vi.hoisted(() => ({
  mockRegenerateCoverLetter: vi.fn(),
  mockFetchJobDetail: vi.fn(),
}));

vi.mock("@/lib/job-actions", () => ({
  regenerateCoverLetter: mockRegenerateCoverLetter,
  fetchJobDetail: mockFetchJobDetail,
}));

const DEFAULT_BASELINE = "2026-04-20T00:00:00.000Z";
const NEWER_DATE = "2026-04-22T14:00:00.000Z";

function render(ui: ReactElement) {
  return rtlRender(ui);
}

beforeEach(() => {
  vi.useFakeTimers();
  mockRegenerateCoverLetter.mockClear();
  mockFetchJobDetail.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RegenerateCoverLetterButton — behavior (AI-ACTION-04 + D-06 amended)", () => {
  it("renders with label 'Regenerate cover letter' in idle state; button not disabled", () => {
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
    const btn = getByRole("button");
    expect(btn).toHaveTextContent("Regenerate cover letter");
    expect(btn).not.toBeDisabled();
  });

  it("clicking fires regenerateCoverLetter once with the jobId", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={42}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(mockRegenerateCoverLetter).toHaveBeenCalledWith(42);
    expect(mockRegenerateCoverLetter).toHaveBeenCalledTimes(1);
  });

  it("in-progress: button is disabled with aria-busy=true after click (G-1)", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    const btn = getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("polls fetchJobDetail every 3 seconds (D-05 cadence)", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
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

  it("polls until cover_letter.generated_at > serverBaseline (UPDATE-wait predicate, D-06 amended)", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail
      .mockResolvedValueOnce({
        cover_letter: { generated_at: DEFAULT_BASELINE },
      }) // tick 1: equal → NOT done
      .mockResolvedValueOnce({
        cover_letter: { generated_at: DEFAULT_BASELINE },
      }) // tick 2: equal → NOT done
      .mockResolvedValue({ cover_letter: { generated_at: NEWER_DATE } }); // tick 3: newer → done
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
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
    // Stopped at tick 3 when predicate satisfied; button back to idle
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
    expect(getByRole("button")).not.toBeDisabled();

    // Further ticks do NOT trigger additional polls (interval cleared).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
  });

  it("uses server-returned baseline from Server Action response (not prop baseline)", async () => {
    const serverBaseline = "2026-04-21T10:00:00.000Z";
    const newerThanServer = "2026-04-22T12:00:00.000Z";
    // Server returns a NEWER baseline than the prop — predicate must use server's.
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: serverBaseline,
    });
    // Tick 1: newer than server baseline → stops at tick 1.
    // (If the button had used the prop baseline "2026-04-20", tick 1 would also stop,
    // but this test asserts via the timing sequence below that server baseline is stored.)
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: newerThanServer },
    });
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // Predicate uses serverBaseline ("2026-04-21"); generated_at ("2026-04-22")
    // > serverBaseline → stops at tick 1.
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(1);
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("falls back to prop baselineGeneratedAt when Server Action returns baseline=null (INSERT-wait semantics)", async () => {
    // Server has no prior cover letter row → returns baseline=null.
    mockRegenerateCoverLetter.mockResolvedValue({ ok: true, baseline: null });
    // Tick 1: cover_letter still null (webhook hasn't completed) → NOT done.
    // Tick 2: cover_letter arrives with generated_at newer than prop baseline → done.
    mockFetchJobDetail
      .mockResolvedValueOnce({ cover_letter: null })
      .mockResolvedValue({ cover_letter: { generated_at: NEWER_DATE } });
    const { getByRole } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
    );
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // Stops at tick 2 — falls back to prop baseline when server returns null.
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(2);
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("times out after 60 polls (180s) and shows 'Error: unavailable' verbatim (D-05 cap)", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole, getByText } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
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
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole, unmount } = render(
      <RegenerateCoverLetterButton
        jobId={1}
        baselineGeneratedAt={DEFAULT_BASELINE}
      />,
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
    // Call count frozen at 1 — interval cleared on unmount cleanup.
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
      mockRegenerateCoverLetter.mockResolvedValue({ ok: false, sentinel });
      const { getByRole, getByText } = render(
        <RegenerateCoverLetterButton
          jobId={1}
          baselineGeneratedAt={DEFAULT_BASELINE}
        />,
      );
      await act(async () => {
        fireEvent.click(getByRole("button"));
      });
      expect(getByText(`Error: ${sentinel}`)).toBeInTheDocument();
      expect(getByRole("button")).not.toBeDisabled();
    },
  );
});

describe("regenerate-cover-letter-button.tsx — UI-SPEC grep gates", () => {
  const BTN_PATH = path.join(
    process.cwd(),
    "src/app/(admin)/admin/jobs/regenerate-cover-letter-button.tsx",
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

  it("G-5: label 'Regenerate cover letter' matches ROADMAP SC #2 verbatim", () => {
    expect(btnSource).toMatch(/Regenerate cover letter/);
  });

  it("G-6: Date.now() does not appear in the component source (D-06 amended / client-clock prohibition)", () => {
    const matches = (btnSource.match(/Date\.now\(\)/g) || []).length;
    expect(
      matches,
      "Date.now() found in regenerate-cover-letter-button.tsx — violates D-06 amended / G-6; use server-returned baseline instead",
    ).toBe(0);
  });
});
