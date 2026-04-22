/**
 * Headline-figure detection for salary_intelligence.report_json (Phase 22).
 *
 * Runtime duck-typing predicate that tolerates any JSONB shape the n8n
 * LLM workflow might emit. Accepts two shapes and gracefully degrades to
 * null for everything else.
 *
 * D-01 pairs with this: Zod schema uses z.unknown() at the boundary;
 * THIS function does the shape detection at render time.
 *
 * Pure. No state. No throws. Safe from Server Components.
 */

export type HeadlineKind = "MIN_MEDIAN_MAX" | "PERCENTILES";

export interface HeadlineFigure {
  key: string;
  label: string;
  value: number;
}

export interface HeadlineShape {
  kind: HeadlineKind;
  figures: HeadlineFigure[];
  currency: string;
}

/**
 * Case-insensitive key lookup on a plain object. Returns the first matching
 * key's value, or undefined.
 */
function lookupKey(obj: Record<string, unknown>, keys: string[]): unknown {
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) lower[k.toLowerCase()] = obj[k];
  for (const k of keys) {
    const hit = lower[k.toLowerCase()];
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function toNumberOrNull(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function extractCurrency(obj: Record<string, unknown>): string | null {
  const raw = lookupKey(obj, ["currency", "salary_currency"]);
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

export function parseSalaryHeadline(reportJson: unknown): HeadlineShape | null {
  if (reportJson === null || reportJson === undefined) return null;
  if (typeof reportJson !== "object" || Array.isArray(reportJson)) return null;
  const obj = reportJson as Record<string, unknown>;

  const currency = extractCurrency(obj);
  if (!currency) return null;

  // Try MIN_MEDIAN_MAX first.
  const min = toNumberOrNull(lookupKey(obj, ["min"]));
  const median = toNumberOrNull(lookupKey(obj, ["median"]));
  const max = toNumberOrNull(lookupKey(obj, ["max"]));

  const mmFigures: HeadlineFigure[] = [];
  if (min !== null) mmFigures.push({ key: "min", label: "Min", value: min });
  if (median !== null) mmFigures.push({ key: "median", label: "Median", value: median });
  if (max !== null) mmFigures.push({ key: "max", label: "Max", value: max });

  if (mmFigures.length > 0) {
    return { kind: "MIN_MEDIAN_MAX", figures: mmFigures, currency };
  }

  // Try PERCENTILES.
  const p25 = toNumberOrNull(lookupKey(obj, ["p25", "25th"]));
  const p50 = toNumberOrNull(lookupKey(obj, ["p50", "50th"]));
  const p75 = toNumberOrNull(lookupKey(obj, ["p75", "75th"]));

  const pFigures: HeadlineFigure[] = [];
  if (p25 !== null) pFigures.push({ key: "p25", label: "25th", value: p25 });
  if (p50 !== null) pFigures.push({ key: "p50", label: "50th", value: p50 });
  if (p75 !== null) pFigures.push({ key: "p75", label: "75th", value: p75 });

  if (pFigures.length > 0) {
    return { kind: "PERCENTILES", figures: pFigures, currency };
  }

  return null;
}
