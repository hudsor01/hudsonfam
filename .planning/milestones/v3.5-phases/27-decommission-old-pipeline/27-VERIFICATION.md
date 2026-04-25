---
phase: 27
slug: decommission-old-pipeline
status: passed
verified_at: 2026-04-25  # backfilled per v3.5-MILESTONE-AUDIT; verification was inlined into 27-01-SUMMARY at execution time
backfilled: true
canonical_record: 27-01-SUMMARY.md §"Verification Outputs (Task 27-01-06)" + §"Self-Check: PASSED"
requirements_satisfied: [CICD-07, CICD-08, CICD-09]
critical_gaps: []
non_critical_gaps:
  - "Owner action item (NOT blocking): Rotate WOODPECKER_PAT + FORGEJO_PAT within 24h of close (T-27-02 defense-in-depth)"
  - "Owner action item (NOT blocking): `kubectl delete secret phase-27-pats -n secrets`"
anti_patterns_found: []
---

# Phase 27 — Verification (Backfilled)

> Backfilled 2026-04-25 per v3.5-MILESTONE-AUDIT. Verification was inlined into
> `27-01-SUMMARY.md` §"Verification Outputs" rather than landing in a separate
> VERIFICATION.md during execution. This file is a thin pointer.

## Status: PASSED

All 3 milestone requirements (CICD-07, CICD-08, CICD-09) satisfied. 7/7 verification
checks PASS. Two Rule 3 deviations auto-fixed (Woodpecker host correction at runtime;
sandbox blocked agent-side PAT extraction → owner-local-shell pivot per T-27-02).

## Verification Evidence (7-check suite)

| Check | Result |
|-------|--------|
| Only ONE hudsonfam ImageRepository (flux-system ns) | ✓ |
| Zero `forgejo-registry-creds` Secrets across cluster | ✓ |
| `.woodpecker.yaml` deleted (working tree + HEAD index + origin/main) | ✓ commit `0eaacc6` |
| Woodpecker repo dereg (HTTP 401 from corrected host = success per spec) | ✓ owner DELETE returned HTTP 200 |
| Forgejo container packages empty for hudsonfam | ✓ all 6 versions HTTP 204 |
| Zero hudsonfam-related Failed/Stalled Flux conditions | ✓ |
| Pod still healthy on Phase 26 GHCR pipeline (ready=true, 0 restarts) | ✓ |

## Threat-Model Verifications

- **T-27-02** (PAT leakage): MITIGATED OBSERVED — PATs lived only in owner's local shell, `unset` immediately after use, NEVER in tool calls/commits/files
- **T-27-03** (DoS: pod loses pull credentials): MITIGATED OBSERVED — BLOCKING pre-check before Secret deletion; pod stayed `ready=true restarts=0`
- **T-27-04** (partial-delete state): MITIGATED OBSERVED — all 6 Forgejo versions HTTP 204; zero failures
- **T-27-05** (wrong-repo-id DELETE): MITIGATED OBSERVED — lookup response cross-checked correct identity before DELETE

## Requirements Coverage

- **CICD-07**: ✓ broken `default/imagerepository/hudsonfam` deleted; only `flux-system/hudsonfam` remains
- **CICD-08**: ✓ `.woodpecker.yaml` deleted; Woodpecker REST DELETE on `/api/repos/2` HTTP 200
- **CICD-09**: ✓ both `forgejo-registry-creds` Secrets deleted; 6/6 Forgejo container versions HTTP 204

## Anti-Patterns / Stubs

None.

---

*Backfill rationale: workflow §2 expects per-phase VERIFICATION.md from the verifier subagent. Phase 27 used inline `Self-Check: PASSED` in SUMMARY (canonical for infra phases per v3.5 pattern). This thin pointer closes the artifact gap; canonical evidence remains in `27-01-SUMMARY.md`.*
