import { describe, it, expect } from "vitest";
import { scoreColor, scoreLabel } from "@/lib/score-color";

describe("scoreColor — 3-band semantic token mapping", () => {
  it("returns text-destructive at 0.0 (low band — lower boundary)", () => {
    expect(scoreColor(0.0)).toBe("text-destructive");
  });

  it("returns text-destructive at 0.59 (low band — just below mid)", () => {
    expect(scoreColor(0.59)).toBe("text-destructive");
  });

  it("returns text-warning at 0.6 (mid band — inclusive lower boundary)", () => {
    expect(scoreColor(0.6)).toBe("text-warning");
  });

  it("returns text-warning at 0.79 (mid band — just below high)", () => {
    expect(scoreColor(0.79)).toBe("text-warning");
  });

  it("returns text-success at 0.8 (high band — inclusive lower boundary)", () => {
    expect(scoreColor(0.8)).toBe("text-success");
  });

  it("returns text-success at 1.0 (high band — upper boundary)", () => {
    expect(scoreColor(1.0)).toBe("text-success");
  });
});

describe("scoreLabel — 3-band label mapping", () => {
  it("returns 'low' for scores < 0.6", () => {
    expect(scoreLabel(0.0)).toBe("low");
    expect(scoreLabel(0.59)).toBe("low");
  });

  it("returns 'medium' for scores in [0.6, 0.8)", () => {
    expect(scoreLabel(0.6)).toBe("medium");
    expect(scoreLabel(0.79)).toBe("medium");
  });

  it("returns 'high' for scores >= 0.8", () => {
    expect(scoreLabel(0.8)).toBe("high");
    expect(scoreLabel(1.0)).toBe("high");
  });
});

describe("scoreColor ↔ scoreLabel consistency", () => {
  it("aligns 'low' with 'text-destructive', 'medium' with 'text-warning', 'high' with 'text-success'", () => {
    for (const n of [0.0, 0.3, 0.59, 0.6, 0.7, 0.79, 0.8, 0.9, 1.0]) {
      const color = scoreColor(n);
      const label = scoreLabel(n);
      if (label === "low") expect(color).toBe("text-destructive");
      if (label === "medium") expect(color).toBe("text-warning");
      if (label === "high") expect(color).toBe("text-success");
    }
  });
});
