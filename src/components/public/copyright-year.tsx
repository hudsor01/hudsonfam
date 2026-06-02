/**
 * Footer copyright year. Computed once at module load (build/deploy time), not
 * during render — under Cache Components (`cacheComponents`), reading the
 * current time during prerender is disallowed in both Server Components and
 * Client Components (without a Suspense boundary). A build-time constant sidesteps
 * that entirely and is correct for a copyright line, which only needs to track
 * the deploy year.
 */
const COPYRIGHT_YEAR = new Date().getFullYear();

export function CopyrightYear() {
  return <>{COPYRIGHT_YEAR}</>;
}
