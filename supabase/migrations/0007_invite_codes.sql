-- Day 13 — Invite codes for closed beta.
--
-- The user wants to send 30–50 friends a single shareable URL that grants
-- them Pro plan + a chunk of credits, capped at the first N redemptions
-- globally. We model this as a small 2-table system:
--
--   invite_codes: the codes themselves (code, max_uses, used_count, what
--                 plan + credits it grants, expiry, active flag).
--   invite_redemptions: which user redeemed which code (for dedup + audit).
--
-- The /api/redeemInvite endpoint runs the redemption inside a single CAS
-- update on used_count to avoid the classic race where 51 people slip past
-- a max_uses=50 cap.

-- ============================================================================
-- invite_codes
-- ============================================================================
CREATE TABLE IF NOT EXISTS invite_codes (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text        UNIQUE NOT NULL,
  description     text,
  -- What plan this invite grants. Mirrors user_credits.plan_type values.
  plan_type       text        NOT NULL DEFAULT 'pro' CHECK (plan_type IN ('free', 'basic', 'pro')),
  -- Credits granted on redemption. Caller's existing credit_balance is
  -- TOPPED UP TO this number (max(existing, granted)) so a partial-credit
  -- user upgrading via invite doesn't lose what they already had.
  credits_to_grant integer    NOT NULL DEFAULT 100 CHECK (credits_to_grant >= 0),
  -- Hard global cap. Once used_count == max_uses, redemption fails.
  max_uses        integer     NOT NULL DEFAULT 50 CHECK (max_uses > 0),
  used_count      integer     NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  -- Optional expiry. NULL = no expiry.
  expires_at      timestamptz,
  -- Soft-disable without deleting (preserves audit trail in invite_redemptions).
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Codes are case-insensitive in practice; normalize at the index layer.
CREATE UNIQUE INDEX IF NOT EXISTS invite_codes_code_lower_idx
  ON invite_codes (lower(code));

-- ============================================================================
-- invite_redemptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS invite_redemptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id  uuid        NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  redeemed_at     timestamptz NOT NULL DEFAULT now(),
  -- Snapshot the granted plan so an audit query doesn't have to JOIN through
  -- the (possibly-edited) invite_codes row.
  granted_plan    text        NOT NULL,
  granted_credits integer     NOT NULL,
  UNIQUE (invite_code_id, user_id) -- one user can only redeem the same code once
);

CREATE INDEX IF NOT EXISTS invite_redemptions_user_idx
  ON invite_redemptions (user_id);

-- ============================================================================
-- RLS
-- ============================================================================
-- invite_codes: writeable only by service role (admin script + /api/redeemInvite
-- using the service-role client). Readable by service role too — never exposed
-- directly to the browser; clients hit /api/redeemInvite which validates and
-- returns a sanitized result.
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- invite_redemptions: same pattern. We don't expose redemption history to the
-- end user yet; if we ever want to ("you joined via Beta50 on …"), add a
-- policy WHERE user_id = auth.uid().
ALTER TABLE invite_redemptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Seed: a sample BETA50 code so you can ship today.
-- Edit / disable / re-create on the Supabase dashboard as needed.
-- ============================================================================
INSERT INTO invite_codes (code, description, plan_type, credits_to_grant, max_uses)
VALUES (
  'BETA50',
  'Closed beta — first 50 friends get Pro + 100 credits',
  'pro',
  100,
  50
)
ON CONFLICT DO NOTHING;
