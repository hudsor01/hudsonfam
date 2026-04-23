import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render as rtlRender,
  fireEvent,
  act,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { RegenerateButton } from "@/app/(admin)/admin/jobs/regenerate-button";
import {
  coverLetterIsDone,
  tailoredResumeIsDone,
  salaryIntelligenceIsDone,
} from "@/lib/regenerate-predicates";

// Hoisted mocks — Plan 23-02 vi.hoisted + vi.mock + dynamic-import pattern
// (PATTERNS.md §7). Three action mocks (one per artifact) so the fixture
// helpers can wire each instantiation to a distinct spy.
const {
  mockRegenerateCoverLetter,
  mockRegenerateTailoredResume,
  mockRegenerateSalaryIntelligence,
  mockFetchJobDetail,
} = vi.hoisted(() => ({
  mockRegenerateCoverLetter: vi.fn(),
  mockRegenerateTailoredResume: vi.fn(),
  mockRegenerateSalaryIntelligence: vi.fn(),
  mockFetchJobDetail: vi.fn(),
}));

vi.mock("@/lib/job-actions", () => ({
  regenerateCoverLetter: mockRegenerateCoverLetter,
  regenerateTailoredResume: mockRegenerateTailoredResume,
  regenerateSalaryIntelligence: mockRegenerateSalaryIntelligence,
  fetchJobDetail: mockFetchJobDetail,
}));

const DEFAULT_BASELINE = "2026-04-20T00:00:00.000Z";
const NEWER_DATE = "2026-04-22T14:00:00.000Z";
const SALARY_BASELINE = "2026-04-20";
const SALARY_NEWER = "2026-04-21";

/** Verbatim silent-success copy — em-dash is U+2014; period terminator; no exclamation. */
const SILENT_SUCCESS_COPY =
  "Regeneration reported success but no new content was written — check n8n logs.";

type RenderOverrides = {
  jobId?: number;
  baselineGeneratedAt?: string | null;
};

function renderCoverLetter(overrides: RenderOverrides = {}) {
  return rtlRender(
    <RegenerateButton
      jobId={overrides.jobId ?? 1}
      artifact="cover_letter"
      label="Regenerate cover letter"
      action={mockRegenerateCoverLetter}
      isDone={coverLetterIsDone}
      baselineGeneratedAt={
        overrides.baselineGeneratedAt === undefined
          ? DEFAULT_BASELINE
          : overrides.baselineGeneratedAt
      }
    />,
  );
}

function renderTailoredResume(overrides: RenderOverrides = {}) {
  return rtlRender(
    <RegenerateButton
      jobId={overrides.jobId ?? 1}
      artifact="tailored_resume"
      label="Regenerate tailored resume"
      action={mockRegenerateTailoredResume}
      isDone={tailoredResumeIsDone}
      baselineGeneratedAt={
        overrides.baselineGeneratedAt === undefined
          ? DEFAULT_BASELINE
          : overrides.baselineGeneratedAt
      }
    />,
  );
}

function renderSalaryIntelligence(overrides: RenderOverrides = {}) {
  return rtlRender(
    <RegenerateButton
      jobId={overrides.jobId ?? 1}
      artifact="salary_intelligence"
      label="Regenerate salary intelligence"
      action={mockRegenerateSalaryIntelligence}
      isDone={salaryIntelligenceIsDone}
      baselineGeneratedAt={
        overrides.baselineGeneratedAt === undefined
          ? SALARY_BASELINE
          : overrides.baselineGeneratedAt
      }
    />,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  mockRegenerateCoverLetter.mockClear();
  mockRegenerateTailoredResume.mockClear();
  mockRegenerateSalaryIntelligence.mockClear();
  mockFetchJobDetail.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RegenerateButton — cover_letter artifact (ported 17 Phase 23 cases)", () => {
  it("renders with label 'Regenerate cover letter' in idle state; button not disabled", () => {
    const { getByRole } = renderCoverLetter();
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
    const { getByRole } = renderCoverLetter({ jobId: 42 });
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
    const { getByRole } = renderCoverLetter();
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
    const { getByRole } = renderCoverLetter();
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
      })
      .mockResolvedValueOnce({
        cover_letter: { generated_at: DEFAULT_BASELINE },
      })
      .mockResolvedValue({ cover_letter: { generated_at: NEWER_DATE } });
    const { getByRole } = renderCoverLetter();
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
    expect(getByRole("button")).not.toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(3);
  });

  it("uses server-returned baseline from Server Action response (not prop baseline)", async () => {
    const serverBaseline = "2026-04-21T10:00:00.000Z";
    const newerThanServer = "2026-04-22T12:00:00.000Z";
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: serverBaseline,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: newerThanServer },
    });
    const { getByRole } = renderCoverLetter();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(1);
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("falls back to prop baselineGeneratedAt when Server Action returns baseline=null (INSERT-wait semantics)", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({ ok: true, baseline: null });
    mockFetchJobDetail
      .mockResolvedValueOnce({ cover_letter: null })
      .mockResolvedValue({ cover_letter: { generated_at: NEWER_DATE } });
    const { getByRole } = renderCoverLetter();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(2);
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("transitions to silent-success on webhook ok=true + 60-poll exhaustion (AI-ACTION-07, D-06 fork)", async () => {
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole, getByText, queryByText } = renderCoverLetter();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(60);
    // G-8: silent-success copy verbatim (em-dash U+2014, period terminator)
    expect(getByText(SILENT_SUCCESS_COPY)).toBeInTheDocument();
    // Mutual exclusion (D-06): silent-success NEVER co-renders with sentinel error
    expect(queryByText(/Error: unavailable/)).not.toBeInTheDocument();
    expect(queryByText(/^Error:/)).not.toBeInTheDocument();
    // Button re-enables for retry (same UX as sentinel-error)
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
    const { getByRole, unmount } = renderCoverLetter();
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
      const { getByRole, getByText } = renderCoverLetter();
      await act(async () => {
        fireEvent.click(getByRole("button"));
      });
      expect(getByText(`Error: ${sentinel}`)).toBeInTheDocument();
      expect(getByRole("button")).not.toBeDisabled();
    },
  );

  it("clicking from silent-success state transitions back to in-progress (D-06 retry path)", async () => {
    // Drive to silent-success first
    mockRegenerateCoverLetter.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole, getByText, queryByText } = renderCoverLetter();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(getByText(SILENT_SUCCESS_COPY)).toBeInTheDocument();

    // Re-click — helper unmounts immediately; in-progress engages
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(queryByText(SILENT_SUCCESS_COPY)).not.toBeInTheDocument();
    expect(getByRole("button")).toBeDisabled();
    expect(getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("clicking from error state transitions back to in-progress (inherited from Phase 23)", async () => {
    mockRegenerateCoverLetter.mockResolvedValueOnce({
      ok: false,
      sentinel: "timeout",
    });
    const { getByRole, getByText, queryByText } = renderCoverLetter();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(getByText("Error: timeout")).toBeInTheDocument();

    // Second click — error helper unmounts; in-progress engages
    mockRegenerateCoverLetter.mockResolvedValueOnce({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      cover_letter: { generated_at: DEFAULT_BASELINE },
    });
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(queryByText("Error: timeout")).not.toBeInTheDocument();
  });
});

describe("RegenerateButton — tailored_resume artifact (AI-ACTION-05)", () => {
  it("renders with label 'Regenerate tailored resume' in idle state", () => {
    const { getByRole } = renderTailoredResume();
    expect(getByRole("button")).toHaveTextContent("Regenerate tailored resume");
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("clicking fires regenerateTailoredResume once with the jobId", async () => {
    mockRegenerateTailoredResume.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      tailored_resume: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole } = renderTailoredResume({ jobId: 99 });
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(mockRegenerateTailoredResume).toHaveBeenCalledWith(99);
    expect(mockRegenerateTailoredResume).toHaveBeenCalledTimes(1);
    // Sibling action mocks stay untouched — props-level isolation
    expect(mockRegenerateCoverLetter).not.toHaveBeenCalled();
    expect(mockRegenerateSalaryIntelligence).not.toHaveBeenCalled();
  });

  it("polls until tailored_resume.generated_at > serverBaseline (happy path)", async () => {
    mockRegenerateTailoredResume.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail
      .mockResolvedValueOnce({
        tailored_resume: { generated_at: DEFAULT_BASELINE },
      })
      .mockResolvedValue({ tailored_resume: { generated_at: NEWER_DATE } });
    const { getByRole } = renderTailoredResume();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(2);
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("transitions to silent-success on 60-poll exhaustion without advance", async () => {
    mockRegenerateTailoredResume.mockResolvedValue({
      ok: true,
      baseline: DEFAULT_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      tailored_resume: { generated_at: DEFAULT_BASELINE },
    });
    const { getByRole, getByText } = renderTailoredResume();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(getByText(SILENT_SUCCESS_COPY)).toBeInTheDocument();
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("shows 'Error: auth' sentinel when Server Action returns ok=false", async () => {
    mockRegenerateTailoredResume.mockResolvedValue({
      ok: false,
      sentinel: "auth",
    });
    const { getByText } = renderTailoredResume();
    await act(async () => {
      fireEvent.click(document.querySelector("button")!);
    });
    expect(getByText("Error: auth")).toBeInTheDocument();
  });
});

describe("RegenerateButton — salary_intelligence artifact (AI-ACTION-06, date-granular D-04)", () => {
  it("renders with label 'Regenerate salary intelligence' in idle state", () => {
    const { getByRole } = renderSalaryIntelligence();
    expect(getByRole("button")).toHaveTextContent(
      "Regenerate salary intelligence",
    );
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("clicking fires regenerateSalaryIntelligence once with the jobId", async () => {
    mockRegenerateSalaryIntelligence.mockResolvedValue({
      ok: true,
      baseline: SALARY_BASELINE,
    });
    mockFetchJobDetail.mockResolvedValue({
      salary_intelligence: { search_date: SALARY_BASELINE },
    });
    const { getByRole } = renderSalaryIntelligence({ jobId: 7 });
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    expect(mockRegenerateSalaryIntelligence).toHaveBeenCalledWith(7);
    expect(mockRegenerateSalaryIntelligence).toHaveBeenCalledTimes(1);
  });

  it("polls until salary_intelligence.search_date advances to a later day", async () => {
    mockRegenerateSalaryIntelligence.mockResolvedValue({
      ok: true,
      baseline: SALARY_BASELINE,
    });
    mockFetchJobDetail
      .mockResolvedValueOnce({
        salary_intelligence: { search_date: SALARY_BASELINE },
      })
      .mockResolvedValue({
        salary_intelligence: { search_date: SALARY_NEWER },
      });
    const { getByRole } = renderSalaryIntelligence();
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mockFetchJobDetail).toHaveBeenCalledTimes(2);
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("same-day regenerate triggers silent-success (known rough edge, Pitfall 1 / D-04)", async () => {
    // Baseline and current search_date match → predicate returns false for all
    // 60 polls → silent-success. Documents the date-granular limitation.
    const today = "2026-04-23";
    mockRegenerateSalaryIntelligence.mockResolvedValue({
      ok: true,
      baseline: today,
    });
    mockFetchJobDetail.mockResolvedValue({
      salary_intelligence: { search_date: today },
    });
    const { getByRole, getByText, queryByText } = renderSalaryIntelligence({
      baselineGeneratedAt: today,
    });
    await act(async () => {
      fireEvent.click(getByRole("button"));
    });
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000);
      });
    }
    expect(getByText(SILENT_SUCCESS_COPY)).toBeInTheDocument();
    expect(queryByText(/^Error:/)).not.toBeInTheDocument();
    expect(getByRole("button")).not.toBeDisabled();
  });

  it("shows 'Error: rate limit' sentinel when Server Action returns ok=false", async () => {
    mockRegenerateSalaryIntelligence.mockResolvedValue({
      ok: false,
      sentinel: "rate limit",
    });
    const { getByText } = renderSalaryIntelligence();
    await act(async () => {
      fireEvent.click(document.querySelector("button")!);
    });
    expect(getByText("Error: rate limit")).toBeInTheDocument();
  });
});

describe("regenerate-button.tsx — UI-SPEC grep gates (G-1, G-2, G-6, G-8)", () => {
  const BTN_PATH = path.join(
    process.cwd(),
    "src/app/(admin)/admin/jobs/regenerate-button.tsx",
  );
  const btnSource = readFileSync(BTN_PATH, "utf-8");

  it("G-1: aria-busy attribute is present on the Button element", () => {
    expect(btnSource).toMatch(/aria-busy=\{/);
  });

  it("G-2: no raw Tailwind color class names (text-red-*, bg-amber-*, etc.)", () => {
    expect(btnSource).not.toMatch(
      /(text|bg|border)-(red|amber|yellow|green|emerald|orange|blue|gray|zinc|slate)-\d/,
    );
  });

  it("G-6 (extended, D-10): Date.now() does not appear in regenerate-button.tsx", () => {
    const matches = (btnSource.match(/Date\.now\(\)/g) || []).length;
    expect(
      matches,
      "Date.now() found in regenerate-button.tsx — violates D-06 amended / G-6 extended; use server-returned baseline instead",
    ).toBe(0);
  });

  it("G-8 (NEW, D-10): silent-success copy appears EXACTLY ONCE verbatim", () => {
    // Em-dash U+2014, period terminator, no exclamation, no trailing whitespace
    const copy =
      "Regeneration reported success but no new content was written — check n8n logs.";
    const matches = btnSource.split(copy).length - 1;
    expect(
      matches,
      "Silent-success copy must appear exactly once verbatim (G-8) — em-dash U+2014 and period terminator are byte-exact",
    ).toBe(1);
  });
});
