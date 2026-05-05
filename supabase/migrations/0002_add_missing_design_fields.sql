-- =============================================================================
-- Migration 0002 — add missing room_designs columns + default created_by.
--
-- Problem this fixes:
--   1. The Studio wizard captures color_palette, vibes, budget_tier, and
--      a secondary room_file_url that the original schema didn't include.
--      Inserts that included these fields were rejected with 400 (Bad Request)
--      "could not find the X column". This migration adds the columns.
--
--   2. `room_designs.created_by` was NOT NULL with no default. Every insert
--      had to manually set it, but the legacy shim was stripping it. The
--      shim now injects auth.uid() on insert; this migration also adds
--      `default auth.uid()` as a fallback so future code can omit it safely.
--
-- How to run:
--   Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--   Safe to run multiple times — every change is guarded with IF NOT EXISTS.
-- =============================================================================

-- 1. Add the four columns the Studio wizard wants to persist.
alter table public.room_designs
  add column if not exists color_palette text,
  add column if not exists vibes         text[],
  add column if not exists budget_tier   text,
  add column if not exists room_file_url text;

-- 2. Default created_by to the current authenticated user. Combined with the
-- existing RLS check `auth.uid() = created_by`, this makes the column
-- effectively self-populating for any insert from a logged-in user.
alter table public.room_designs
  alter column created_by set default auth.uid();

-- 3. (Optional) Index on color_palette and budget_tier for filter queries.
-- These are cheap and unlock "show me all my Japandi designs" style filters.
create index if not exists room_designs_color_palette_idx
  on public.room_designs(color_palette);
create index if not exists room_designs_budget_tier_idx
  on public.room_designs(budget_tier);

-- 4. Expand the status check constraint to match the values the app actually
-- uses. Previously only ('draft','saved','archived') were allowed, but the
-- code writes 'ready' on Save & Shop, 'generating' during async generation,
-- and 'error' when generation fails. Every Save & Shop click was being
-- rejected with a check-constraint violation.
alter table public.room_designs
  drop constraint if exists room_designs_status_check;
alter table public.room_designs
  add constraint room_designs_status_check
  check (status in (
    'draft',       -- auto-saved while user is in Studio
    'generating',  -- async render in progress
    'ready',       -- generation succeeded; user clicked Save & Shop
    'saved',       -- legacy, kept for backward compat
    'archived',    -- soft-deleted
    'error'        -- generation failed
  ));

-- =============================================================================
-- Verification queries — run these after the migration to confirm the
-- schema looks right. Should return one row each.
-- =============================================================================
-- select column_name, data_type, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'room_designs'
-- order by ordinal_position;
