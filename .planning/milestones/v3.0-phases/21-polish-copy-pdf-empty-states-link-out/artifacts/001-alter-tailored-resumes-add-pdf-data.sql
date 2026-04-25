-- Phase 21 Plan 01: add pdf_data column to tailored_resumes (AI-ACTION-02)
-- Applied 2026-04-22 against n8n database in homelab CNPG cluster.
-- Idempotent; safe to re-run.
ALTER TABLE tailored_resumes ADD COLUMN IF NOT EXISTS pdf_data TEXT;
