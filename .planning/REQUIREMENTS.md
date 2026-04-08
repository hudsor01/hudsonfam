# Requirements: thehudsonfam.com

**Defined:** 2026-04-08
**Core Value:** A single home for the Hudson family — content management for everyone, homelab and career tools for the owner.

## v1.4 Requirements

Requirements for Admin Dashboard Production Readiness. Each maps to roadmap phases.

### Deployment

- [ ] **DEPLOY-01**: Jobs dashboard and all v1.3/v1.4 fixes deployed to production K3s cluster
- [ ] **DEPLOY-02**: JOBS_DATABASE_URL secret available in production pod
- [ ] **DEPLOY-03**: Production pod starts without errors (no Redis NOAUTH, no Prisma timeouts, no Event handler crashes)

### Performance

- [ ] **PERF-01**: Jobs page server-side data fetch completes in under 2 seconds
- [ ] **PERF-02**: Kanban board renders without layout shift or janky drag-drop
- [ ] **PERF-03**: Job detail sheet loads full detail (cover letter, company research) without visible spinner lasting >1s

### Functional

- [ ] **FUNC-01**: Admin user can view jobs in table view with sort/filter/pagination
- [ ] **FUNC-02**: Admin user can view jobs in kanban view with 6-stage pipeline columns
- [ ] **FUNC-03**: Admin user can drag a job card between kanban columns and status persists after refresh
- [ ] **FUNC-04**: Admin user can open job detail sheet and see cover letter + company intel
- [ ] **FUNC-05**: Admin user can filter jobs by source, status, and score range
- [ ] **FUNC-06**: Admin user can dismiss and restore jobs

### UAT

- [ ] **UAT-01**: Autonomous browser test: login via Google OAuth → land on /dashboard
- [ ] **UAT-02**: Autonomous browser test: navigate to /admin/jobs → page loads without errors
- [ ] **UAT-03**: Autonomous browser test: verify kanban board renders with job cards visible

## v2.0 Requirements

Deferred to next milestone.

- **AI-01**: Qwen 3.5 photo captions + alt text
- **AI-02**: Qdrant + qwen-embed semantic search
- **AI-03**: N8N upload automation
- **AI-04**: Resend email notifications
- **AI-05**: Tdarr video transcoding
- **AI-06**: Jellyfin media embeds

## Out of Scope

| Feature | Reason |
|---------|--------|
| New job search features | v1.4 is polish/production readiness only |
| Job application tracking UI | External system handles this via N8N |
| Public-facing job listings | Owner-only admin feature |
| Mobile-specific kanban layout | Desktop-first admin tool |

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DEPLOY-01 | Phase 13 | Pending |
| DEPLOY-02 | Phase 13 | Pending |
| DEPLOY-03 | Phase 13 | Pending |
| FUNC-01 | Phase 14 | Pending |
| FUNC-02 | Phase 14 | Pending |
| FUNC-03 | Phase 14 | Pending |
| FUNC-04 | Phase 14 | Pending |
| FUNC-05 | Phase 14 | Pending |
| FUNC-06 | Phase 14 | Pending |
| PERF-01 | Phase 14 | Pending |
| PERF-02 | Phase 14 | Pending |
| PERF-03 | Phase 14 | Pending |
| UAT-01 | Phase 15 | Pending |
| UAT-02 | Phase 15 | Pending |
| UAT-03 | Phase 15 | Pending |
