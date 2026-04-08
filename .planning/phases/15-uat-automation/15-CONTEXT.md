---
phase: 15-uat-automation
type: context
created: 2026-04-08
mode: auto
---

## Domain

Automated browser tests that independently verify the production login, navigation, and kanban render without human intervention. These are run via Chrome browser automation MCP tools, not a traditional test framework.

## Decisions

### Test Runner
- **Decision:** Use Chrome MCP browser automation tools (mcp__claude-in-chrome__*) — same tools used in Phase 14 manual verification
- **Rationale:** No additional test framework needed; these tools are already available and proven in Phase 14

### Authentication Strategy
- **Decision:** Google OAuth login requires human intervention for the initial login; tests verify the session persists and pages are accessible after login
- **Rationale:** UAT-01 says "completes Google OAuth login" but Google's OAuth flow cannot be fully automated (CAPTCHA, 2FA). The test verifies the user can log in and reach /dashboard. Human logs in once, then automation verifies the session works.

### Test Scope
- **Decision:** Three discrete tests matching UAT-01, UAT-02, UAT-03 — login flow, /admin/jobs page load, kanban board rendering
- **Rationale:** Requirements are explicit and narrow. No additional test cases needed for this phase.

### Assertion Method
- **Decision:** Use read_page accessibility tree to assert element presence (kanban columns, job cards) and page URL to confirm navigation
- **Rationale:** Accessibility tree provides reliable element detection without brittle CSS selectors

### Error Detection
- **Decision:** Check browser console for JavaScript errors via read_console_messages after page load
- **Rationale:** UAT-02 requires "page loads without JavaScript error or HTTP error status"

### Test Execution Context
- **Decision:** Tests run against production https://thehudsonfam.com, not localhost
- **Rationale:** UAT verifies production deployment, not development environment

## Specifics

- Production URL: https://thehudsonfam.com
- Login page: https://thehudsonfam.com/login
- Dashboard: https://thehudsonfam.com/dashboard
- Admin jobs: https://thehudsonfam.com/admin/jobs
- Owner account: rhudsontspr@gmail.com (role: owner)
- Current image: ghcr.io/hudsor01/hudsonfam:20260408173607

## Canonical Refs

- `.planning/REQUIREMENTS.md` — UAT-01, UAT-02, UAT-03
- `.planning/phases/14-functional-and-performance-verification/14-01-SUMMARY.md` — Phase 14 browser verification results (proves the features work)
- `src/app/(admin)/admin/jobs/jobs-dashboard.tsx` — Jobs dashboard client component
- `src/app/(admin)/admin/jobs/kanban-board.tsx` — Kanban board component

## Deferred Ideas

None — this is a verification phase with explicit requirements.
