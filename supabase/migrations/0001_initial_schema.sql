-- =============================================================================
-- Ambient Space — Initial schema migration
-- Targets Supabase (Postgres 15+) with Auth + Storage enabled.
--
-- HOW TO APPLY:
-- 1. Open your Supabase project → SQL Editor → New query
-- 2. Paste this entire file
-- 3. Run. Should complete in < 5 seconds.
-- 4. Verify in Table Editor: 7 tables under public schema
-- 5. Verify in Storage: 2 buckets (rooms, renders)
--
-- This file is idempotent for fresh databases. To re-run on an existing
-- schema, drop the public.* tables first.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- =============================================================================
-- TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles
-- Extends auth.users with app-specific fields. One row per auth user.
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_email_idx on public.profiles(email);

comment on table public.profiles is 'App-level user profile, 1:1 with auth.users';


-- -----------------------------------------------------------------------------
-- user_credits
-- Per-user credit balance and current plan tier.
-- Free tier starts with 2 credits; basic = 20; pro = 100 per cycle.
-- -----------------------------------------------------------------------------
create table public.user_credits (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null unique references auth.users(id) on delete cascade,
  credits_remaining    integer not null default 2 check (credits_remaining >= 0),
  total_purchased      integer not null default 0,
  plan_type            text not null default 'free' check (plan_type in ('free', 'basic', 'pro')),
  stripe_customer_id   text,
  stripe_subscription_id text,
  last_purchase_date   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index user_credits_user_id_idx on public.user_credits(user_id);
create index user_credits_stripe_customer_idx on public.user_credits(stripe_customer_id);

comment on table public.user_credits is 'Credit ledger and Stripe linkage';


-- -----------------------------------------------------------------------------
-- room_designs
-- The core design record. Status: draft (in studio) → saved → archived.
-- -----------------------------------------------------------------------------
create table public.room_designs (
  id                    uuid primary key default uuid_generate_v4(),
  created_by            uuid not null references auth.users(id) on delete cascade,
  name                  text,
  style                 text,
  room_type             text,
  room_image_url        text,
  generated_render_url  text,
  status                text not null default 'draft' check (status in ('draft', 'saved', 'archived')),
  generation_prompt     text,
  intensity             numeric,
  sustainability_mode   boolean default false,
  budget_min            numeric,
  budget_max            numeric,
  room_dimensions       jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index room_designs_created_by_idx on public.room_designs(created_by);
create index room_designs_status_idx on public.room_designs(status);
create index room_designs_created_at_idx on public.room_designs(created_at desc);

comment on table public.room_designs is 'AI-generated room designs';


-- -----------------------------------------------------------------------------
-- saved_designs
-- Links a user to a saved design + sharing tokens.
-- One row per (user, design) — user can save the same design only once.
-- -----------------------------------------------------------------------------
create table public.saved_designs (
  id            uuid primary key default uuid_generate_v4(),
  design_id     uuid not null references public.room_designs(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  share_token   text unique,
  is_public     boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, design_id)
);

create index saved_designs_user_id_idx on public.saved_designs(user_id);
create index saved_designs_share_token_idx on public.saved_designs(share_token);
create index saved_designs_is_public_idx on public.saved_designs(is_public) where is_public = true;

comment on table public.saved_designs is 'Favorites + sharing layer over room_designs';


-- -----------------------------------------------------------------------------
-- furniture_items
-- Detected items in a generated render with bounding boxes and shop matches.
-- -----------------------------------------------------------------------------
create table public.furniture_items (
  id                    uuid primary key default uuid_generate_v4(),
  design_id             uuid not null references public.room_designs(id) on delete cascade,
  label                 text not null,
  style_tags            text[] default array[]::text[],
  bbox_x                numeric,
  bbox_y                numeric,
  bbox_w                numeric,
  bbox_h                numeric,
  search_query          text,
  matches               jsonb not null default '[]'::jsonb,
  selected_match_index  integer,
  created_at            timestamptz not null default now()
);

create index furniture_items_design_id_idx on public.furniture_items(design_id);

comment on table public.furniture_items is 'Detected items per design + Amazon/IKEA matches';


-- -----------------------------------------------------------------------------
-- product_catalog
-- Curated fallback catalog used when affiliate APIs fail or are slow.
-- Pre-loaded via a seed script or admin import page.
-- -----------------------------------------------------------------------------
create table public.product_catalog (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  asin         text,
  price_usd    numeric,
  image_url    text,
  product_url  text,
  source       text not null default 'amazon' check (source in ('amazon', 'ikea', 'wayfair', 'other')),
  categories   text[] default array[]::text[],
  created_at   timestamptz not null default now()
);

create unique index product_catalog_asin_unique on public.product_catalog(asin) where asin is not null;
create index product_catalog_categories_gin on public.product_catalog using gin(categories);
create index product_catalog_source_idx on public.product_catalog(source);

comment on table public.product_catalog is 'Curated product catalog for fallback search';


-- -----------------------------------------------------------------------------
-- consent_logs
-- GDPR consent tracking. Append-only audit log.
-- -----------------------------------------------------------------------------
create table public.consent_logs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete set null,
  preferences  jsonb not null,
  ip_hash      text,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index consent_logs_user_id_idx on public.consent_logs(user_id);
create index consent_logs_created_at_idx on public.consent_logs(created_at desc);

comment on table public.consent_logs is 'GDPR consent audit trail';


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.user_credits
  for each row execute procedure public.handle_updated_at();

create trigger set_updated_at before update on public.room_designs
  for each row execute procedure public.handle_updated_at();


-- -----------------------------------------------------------------------------
-- New user trigger
-- On signup, automatically create profile + free-tier credits row.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
    );

  insert into public.user_credits (user_id, credits_remaining, plan_type)
    values (new.id, 2, 'free');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================

alter table public.profiles         enable row level security;
alter table public.user_credits     enable row level security;
alter table public.room_designs     enable row level security;
alter table public.saved_designs    enable row level security;
alter table public.furniture_items  enable row level security;
alter table public.product_catalog  enable row level security;
alter table public.consent_logs     enable row level security;


-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);


-- -----------------------------------------------------------------------------
-- user_credits
-- Reads only. All writes happen via service_role on the server (after Stripe
-- webhooks, after generation, etc.) to prevent client-side credit fraud.
-- -----------------------------------------------------------------------------
create policy "user_credits: read own"
  on public.user_credits for select
  using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- room_designs
-- Owner: full CRUD. Public read when shared.
-- -----------------------------------------------------------------------------
create policy "room_designs: read own"
  on public.room_designs for select
  using (auth.uid() = created_by);

create policy "room_designs: read public"
  on public.room_designs for select
  using (
    exists (
      select 1 from public.saved_designs s
      where s.design_id = room_designs.id
        and s.is_public = true
    )
  );

create policy "room_designs: insert own"
  on public.room_designs for insert
  with check (auth.uid() = created_by);

create policy "room_designs: update own"
  on public.room_designs for update
  using (auth.uid() = created_by);

create policy "room_designs: delete own"
  on public.room_designs for delete
  using (auth.uid() = created_by);


-- -----------------------------------------------------------------------------
-- saved_designs
-- Owner: full CRUD. Public read for is_public = true.
-- -----------------------------------------------------------------------------
create policy "saved_designs: read own"
  on public.saved_designs for select
  using (auth.uid() = user_id);

create policy "saved_designs: read public"
  on public.saved_designs for select
  using (is_public = true);

create policy "saved_designs: insert own"
  on public.saved_designs for insert
  with check (auth.uid() = user_id);

create policy "saved_designs: update own"
  on public.saved_designs for update
  using (auth.uid() = user_id);

create policy "saved_designs: delete own"
  on public.saved_designs for delete
  using (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- furniture_items
-- Tied to room_designs ownership. Read also allowed via public sharing.
-- -----------------------------------------------------------------------------
create policy "furniture_items: read own"
  on public.furniture_items for select
  using (
    exists (
      select 1 from public.room_designs d
      where d.id = furniture_items.design_id
        and d.created_by = auth.uid()
    )
  );

create policy "furniture_items: read via shared"
  on public.furniture_items for select
  using (
    exists (
      select 1 from public.room_designs d
      join public.saved_designs s on s.design_id = d.id
      where d.id = furniture_items.design_id
        and s.is_public = true
    )
  );

create policy "furniture_items: insert own"
  on public.furniture_items for insert
  with check (
    exists (
      select 1 from public.room_designs d
      where d.id = furniture_items.design_id
        and d.created_by = auth.uid()
    )
  );

create policy "furniture_items: update own"
  on public.furniture_items for update
  using (
    exists (
      select 1 from public.room_designs d
      where d.id = furniture_items.design_id
        and d.created_by = auth.uid()
    )
  );

create policy "furniture_items: delete own"
  on public.furniture_items for delete
  using (
    exists (
      select 1 from public.room_designs d
      where d.id = furniture_items.design_id
        and d.created_by = auth.uid()
    )
  );


-- -----------------------------------------------------------------------------
-- product_catalog
-- Public read. Writes only via service_role (admin import).
-- -----------------------------------------------------------------------------
create policy "product_catalog: public read"
  on public.product_catalog for select
  using (true);


-- -----------------------------------------------------------------------------
-- consent_logs
-- Anyone (incl. anonymous) can create their consent record.
-- Logged-in users can see their own.
-- -----------------------------------------------------------------------------
create policy "consent_logs: anyone can insert"
  on public.consent_logs for insert
  with check (true);

create policy "consent_logs: read own"
  on public.consent_logs for select
  using (auth.uid() is not null and auth.uid() = user_id);


-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================
-- Two public-read buckets:
--   rooms   = user-uploaded room photos
--   renders = AI-generated renders
-- Object naming convention: <user_id>/<filename>
-- This lets us scope uploads to the authenticated user's own folder.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('rooms',   'rooms',   true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('renders', 'renders', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Storage policies: scope writes to the authenticated user's folder.
-- Example object key: "abc-123-uuid/room-2026-04-30.jpg"
-- foldername()[1] returns "abc-123-uuid" which we compare to auth.uid().

create policy "rooms: authenticated upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'rooms'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "rooms: public read"
  on storage.objects for select
  using (bucket_id = 'rooms');

create policy "rooms: owner can delete"
  on storage.objects for delete
  using (
    bucket_id = 'rooms'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "renders: authenticated upload to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'renders'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "renders: public read"
  on storage.objects for select
  using (bucket_id = 'renders');

create policy "renders: owner can delete"
  on storage.objects for delete
  using (
    bucket_id = 'renders'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- =============================================================================
-- DONE
-- =============================================================================
-- After running this:
-- 1. Go to Authentication → Settings → Email Templates and customize the
--    "Confirm signup" + "Reset password" templates with your branding.
-- 2. Authentication → URL Configuration → set Site URL to your production URL.
-- 3. (Optional) Add Google/Apple OAuth providers under Authentication → Providers.
-- =============================================================================
