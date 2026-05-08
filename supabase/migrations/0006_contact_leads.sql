-- Day 9.1 — contact_leads table for B2B "Talk to sales" form submissions.
--
-- Replaces the mailto: links on Home UseCases B2B cards and Pricing B2B
-- cards. Submissions hit /api/contact which writes a row here and (when
-- RESEND_API_KEY is configured) emails support@ambientspace.ai with the
-- partner's details.
--
-- Server-only access — RLS enabled, no policies. Reads/writes happen via
-- the service role from /api/contact.

create table if not exists public.contact_leads (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  email         text not null,
  company       text,
  message       text,
  -- Where on the site the lead came from. One of:
  --   'home_real_estate' | 'home_retailer' | 'pricing_real_estate' | 'pricing_retailer' | 'other'
  -- We track this so we can see which surface drives the most B2B leads.
  source        text not null default 'other',
  -- Hashed IP for abuse / rate-limit auditing without retaining PII.
  ip_hash       text,
  user_agent    text,
  -- Sales follow-up state.
  status        text not null default 'new',  -- 'new' | 'contacted' | 'qualified' | 'won' | 'lost'
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_contact_leads_status_created
  on public.contact_leads (status, created_at desc);
create index if not exists idx_contact_leads_email
  on public.contact_leads (lower(email));

alter table public.contact_leads enable row level security;
