-- Day 7.5 — partner_keys table for B2B embed widget API access.
--
-- Real-estate platforms (Immowelt, Immoscout, Zillow, Rightmove etc.) and
-- e-commerce retailers paste an embed widget into their listing pages.
-- The widget calls /api/embed/generate with a secret API key. This table
-- holds those keys + per-partner billing context.
--
-- Keys are issued manually by us during the early B2B phase (no
-- self-service partner signup yet) — admins will INSERT rows directly.
--
-- We deliberately do NOT enable RLS for end-user reads; the keys table is
-- only ever queried by the server with the service role.

create table if not exists public.partner_keys (
  id              uuid primary key default gen_random_uuid(),
  -- The actual API key value the partner uses. Format: ams_live_<random32>.
  -- Stored hashed in production; for now MVP we store raw and rotate on leak.
  key             text unique not null,
  partner_name    text not null,
  partner_domain  text,                    -- expected request origin, eg 'immowelt.de'
  -- Pricing / quotas. Per-render USD cost is set at the partner level so we
  -- can negotiate volume deals without code changes.
  per_render_usd  numeric(6,4) default 0.30,
  monthly_quota   integer default 1000,
  renders_used    integer default 0,
  -- Status flags.
  is_active       boolean default true,
  notes           text,
  created_at      timestamptz default now(),
  -- Reset the renders_used counter at the start of each calendar month.
  -- A scheduled cron call (or manual SQL) flips this; for MVP it's manual.
  quota_reset_at  timestamptz default date_trunc('month', now()) + interval '1 month'
);

create index if not exists idx_partner_keys_key on public.partner_keys (key) where is_active;

-- Per-render audit log — one row per /api/embed/generate call.
-- Lets us show partners their usage dashboard later and bill accurately.
create table if not exists public.partner_renders (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partner_keys (id) on delete cascade,
  source_url    text,
  result_url    text,
  prompt_brief  text,
  cost_usd      numeric(6,4),
  created_at    timestamptz default now()
);

create index if not exists idx_partner_renders_partner on public.partner_renders (partner_id, created_at desc);
