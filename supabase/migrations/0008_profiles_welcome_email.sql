-- Day 13b — track which users we've already welcomed.
--
-- /api/welcomeEmail uses this to make sends idempotent: a refresh, a re-login,
-- or a TOKEN_REFRESHED event will all retry the welcome flow client-side, but
-- the server treats `welcome_email_sent_at IS NOT NULL` as "already done" and
-- returns a no-op success. Keeps Resend usage bounded and avoids the "two
-- welcomes in 30 seconds" UX flop.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;
