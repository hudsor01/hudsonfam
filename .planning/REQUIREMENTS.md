# Requirements: v2.0 — Code Quality Enhancement

**Defined:** 2026-04-08
**Reference:** `docs/react-nextjs-code-smells.md` (20 official React/Next.js anti-patterns)
**Core Value:** Eliminate every code smell from the codebase so the app follows official React and Next.js best practices.

## useEffect Audit

- [ ] **EFFECT-01**: No useEffect is used to derive state from props or other state (smells 1, 6, 11)
- [ ] **EFFECT-02**: No useEffect is used to adjust or reset state when props change (smells 2, 3)
- [ ] **EFFECT-03**: No chained useEffects that trigger each other via state updates (smell 4)
- [ ] **EFFECT-04**: No useEffect is used to notify parent components of state changes (smell 5)
- [ ] **EFFECT-05**: No useEffect is used for POST requests or user-triggered actions (smell 7)
- [ ] **EFFECT-06**: Every data-fetching useEffect has proper cleanup (AbortController) or uses server components (smell 8)
- [ ] **EFFECT-07**: No useEffect sets state without a dependency array (smell 9)
- [ ] **EFFECT-08**: No useEffect is used to share logic between event handlers (smell 12)

## Component Structure

- [ ] **COMP-01**: No component is defined inside another component (smell 10)
- [ ] **COMP-02**: No state is mutated directly — all updates use new object/array references (smell 20)

## Server/Client Boundary

- [ ] **BOUNDARY-01**: No non-serializable props (functions, class instances) are passed from Server to Client Components (smell 13)
- [ ] **BOUNDARY-02**: "use client" directive is pushed to the lowest possible component in the tree (smell 14)
- [ ] **BOUNDARY-03**: No client-side data fetching (useEffect/SWR) where server components can fetch instead (smell 15)
- [ ] **BOUNDARY-04**: No event handlers or React hooks used in Server Components (smell 16)
- [ ] **BOUNDARY-05**: No server-only imports (database, fs, secrets) in Client Components (smell 17)

## SSR & Hydration

- [ ] **HYDRATION-01**: No browser-dependent rendering that causes hydration mismatches (smell 19)
- [ ] **HYDRATION-02**: All date/time formatting uses explicit timezone or suppressHydrationWarning

## Resilience

- [ ] **RESILIENCE-01**: Every route group has loading.tsx for Suspense boundaries (smell 18)
- [ ] **RESILIENCE-02**: Every route group has error.tsx for error boundaries (smell 18)

## Verification

- [ ] **VERIFY-01**: Build passes with zero errors after all fixes
- [ ] **VERIFY-02**: All 268+ tests pass after all fixes
- [ ] **VERIFY-03**: Production deployment verified — no new console errors

## Out of Scope

| Feature | Reason |
|---------|--------|
| New user-facing features | v2.0 is internal quality only |
| Performance optimization | Addressed in v1.4, not re-scoped |
| New tests for existing features | Focus is fixing smells, not expanding coverage |
| Refactoring non-React code (Prisma, API routes) | Code smells doc targets React/Next.js patterns only |

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| EFFECT-01 | TBD | Pending |
| EFFECT-02 | TBD | Pending |
| EFFECT-03 | TBD | Pending |
| EFFECT-04 | TBD | Pending |
| EFFECT-05 | TBD | Pending |
| EFFECT-06 | TBD | Pending |
| EFFECT-07 | TBD | Pending |
| EFFECT-08 | TBD | Pending |
| COMP-01 | TBD | Pending |
| COMP-02 | TBD | Pending |
| BOUNDARY-01 | TBD | Pending |
| BOUNDARY-02 | TBD | Pending |
| BOUNDARY-03 | TBD | Pending |
| BOUNDARY-04 | TBD | Pending |
| BOUNDARY-05 | TBD | Pending |
| HYDRATION-01 | TBD | Pending |
| HYDRATION-02 | TBD | Pending |
| RESILIENCE-01 | TBD | Pending |
| RESILIENCE-02 | TBD | Pending |
| VERIFY-01 | TBD | Pending |
| VERIFY-02 | TBD | Pending |
| VERIFY-03 | TBD | Pending |
