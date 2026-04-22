/**
 * Single-salary formatter for headline-row figures (Phase 22).
 *
 * Emits compact thousands-rounded display strings:
 *   formatSingleSalary(120000, "USD") -> "$120K"
 *   formatSingleSalary(120000, "GBP") -> "£120K"
 *   formatSingleSalary(120000, "EUR") -> "€120K"
 *   formatSingleSalary(120000, "JPY") -> "JPY 120K"  (unknown-symbol ISO fallback)
 *   formatSingleSalary(120000, null)  -> ""          (D-12: no currency → hide)
 *   formatSingleSalary(NaN, "USD")    -> ""
 *
 * Pure function — no intl, no state, no Date. Safe from Server Components.
 */
const SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
};

export function formatSingleSalary(n: number, currency: string | null | undefined): string {
  if (!Number.isFinite(n)) return "";
  if (!currency) return "";
  const rounded = Math.round(n / 1000);
  const symbol = SYMBOLS[currency.toUpperCase()];
  if (symbol) return `${symbol}${rounded}K`;
  return `${currency.toUpperCase()} ${rounded}K`;
}
