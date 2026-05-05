-- =============================================================================
-- Migration 0003 — align furniture_items bbox columns with code.
--
-- Problem this fixes:
--   The original schema declared bbox_x / bbox_y / bbox_w / bbox_h (XYWH),
--   but every code path — Design.jsx LLM schema, the bbox overlay component,
--   the position-center computation — uses bbox_left / bbox_right / bbox_top
--   / bbox_bottom (LTRB) plus position_x / position_y. Inserts fail with
--     "Could not find the 'bbox_bottom' column of 'furniture_items' in the
--      schema cache"
--   We add the LTRB columns and a center-point pair. The legacy XYWH columns
--   stay (nullable) for backward compatibility — no data loss.
--
-- How to run:
--   Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--   Idempotent: every change is guarded with `if not exists`.
-- =============================================================================

alter table public.furniture_items
  add column if not exists bbox_left   numeric,
  add column if not exists bbox_right  numeric,
  add column if not exists bbox_top    numeric,
  add column if not exists bbox_bottom numeric,
  add column if not exists position_x  numeric,
  add column if not exists position_y  numeric;

-- =============================================================================
-- Verification: should return six rows for the new columns.
-- =============================================================================
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'furniture_items'
--   and column_name in
--     ('bbox_left','bbox_right','bbox_top','bbox_bottom','position_x','position_y')
-- order by column_name;
