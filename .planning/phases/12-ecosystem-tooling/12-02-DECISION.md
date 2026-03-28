# Plan 12-02: Block Evaluation Decision

**Date:** 2026-03-28

## Dashboard Block (dashboard-01)
**Decision: Skip adoption**
Our custom dashboard with CollapsibleCard sections, DataTable for lists, MetricCard grid with container queries, and the new SidebarProvider is already more tailored to our homelab monitoring + family content use case than the generic shadcn dashboard-01 block. Adopting the block would require significant rework to fit our data model.

## Login Blocks (login-01 through login-05)
**Decision: Defer to v2.0**
Our auth pages use better-auth with Google OAuth. The shadcn login blocks are designed for email/password + social auth patterns. Worth revisiting when adding more auth providers in v2.0.

## Sidebar Blocks (sidebar-01 through sidebar-16)
**Decision: Already addressed**
Phase 9 implemented full SidebarProvider with collapsible, mobile Sheet, active state detection, and Cmd+B. The shadcn sidebar blocks are reference implementations — we've already adopted the core pattern.
