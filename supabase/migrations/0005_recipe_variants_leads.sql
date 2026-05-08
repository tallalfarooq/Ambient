-- Day 8.x — schema for recipe save, variant-set generation, and email-gated try.
--
-- This migration adds three features in one:
--
-- 1. design_recipe (JSONB) on room_designs — the full set of inputs that
--    produced this render (style, palette, vibes, fine-tune fields, override
--    pins). Lets a user replay the recipe on a NEW room photo via the
--    "Try this on another room" button without retyping every field.
--
-- 2. variant_group_id (UUID) on room_designs — links 4 sibling rows produced
--    by a single "Compare 4 styles" call. Each variant is a real row so it
--    can be saved/shared/iterated independently, but the group_id lets us
--    show them as a 2x2 grid in the UI.
--
-- 3. try_leads — captures email + IP of logged-out users who use the free
--    try flow on /Try. Drives marketing follow-up + activation analytics.
--    Email is the unique key for rate limiting (one free render per email).

-- 1 + 2: room_designs additions
alter table public.room_designs
  add column if not exists design_recipe   jsonb,
  add column if not exists variant_group_id uuid;

create index if not exists idx_room_designs_variant_group
  on public.room_designs (variant_group_id)
  where variant_group_id is not null;

-- 3: try_leads
create table if not exists public.try_leads (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  source_url      text,         -- the photo they uploaded
  result_url      text,         -- the render we returned
  style           text,
  ip_hash         text,         -- hashed IP for abuse / rate-limit auditing
  user_agent      text,
  -- For activation funnel — set to true once this email signs up.
  converted       boolean default false,
  converted_at    timestamptz,
  created_at      timestamptz default now()
);

-- Email is the trust boundary for "one free render per address". A unique
-- index gives us race-free rate limiting at the DB layer in addition to the
-- Upstash Redis quota the API also enforces.
create unique index if not exists idx_try_leads_email_unique
  on public.try_leads (lower(email));

create index if not exists idx_try_leads_created
  on public.try_leads (created_at desc);

-- Enable RLS but DO NOT add any policies — this table is only read/written
-- by the server with the service role. End users never query it directly.
alter table public.try_leads enable row level security;
