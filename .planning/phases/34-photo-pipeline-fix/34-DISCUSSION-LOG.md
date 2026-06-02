# Phase 34: Photo Pipeline Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 34-photo-pipeline-fix
**Areas discussed:** Missing-object policy, Debug-vs-rebuild threshold, Prove end-to-end, Empty/placeholder UX

---

## Missing-object Policy (PHOTO-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Delete the DB record | Remove orphaned photos (no R2 object) so nothing broken shows; recoverable via FUTURE-01 | ✓ |
| Keep + show placeholder | Keep record, rely on SVG placeholder until FUTURE-01 | |
| Let Claude decide per-photo | Decide once missing objects confirmed | |

**User's choice:** Delete the DB record

---

## Debug vs Rebuild Threshold (PHOTO-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Debug-in-place; rebuild only broken piece | Root-cause + targeted fix; wholesale rebuild only if architectural | |
| Rebuild pipeline proactively | Rebuild upload→R2→serve regardless | |
| Let Claude decide on root cause | Pick after researcher identifies the failure | ✓ |

**User's choice:** Let Claude decide on root cause (captured as D-02, Claude's Discretion — default debug-in-place)

---

## Prove End-to-End (PHOTO-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Programmatic round-trip test | Executor processImage → R2 → GetObject via proxy → confirm → cleanup; no auth | ✓ |
| You upload via the dashboard | Manual UI upload (real content, kept) | |
| Fix + verify existing photo only | No new upload | |

**User's choice:** Programmatic round-trip test (agent cannot authenticate to the dashboard)

---

## Empty / Placeholder UX (PHOTO-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Text empty states; placeholder for true errors only | 'No photos yet' for albums; placeholder reserved | |
| Keep SVG placeholder everywhere | Current behavior | |
| Let Claude decide | Pick during fix | ✓ |

**User's choice:** Let Claude decide (captured as D-04, Claude's Discretion — leaning text empty states per Phases 32/33)

---

## Claude's Discretion

- D-02 (fix depth) and D-04 (placeholder UX) explicitly delegated to Claude based on the researcher's root-cause finding.

## Deferred Ideas

- FUTURE-01 (NAS→R2 migration of original seed photos) remains deferred; deleting an orphan record now is reversible when FUTURE-01 happens.
