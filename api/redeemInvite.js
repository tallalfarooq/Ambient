/**
 * /api/redeemInvite — claim a Pro/Basic plan via an invite code.
 *
 * Day 13. Powers the closed-beta invite link flow:
 *
 *   1. Friend lands on https://www.ambientspace.ai/invite/BETA50
 *   2. Code goes into localStorage as `pending_invite`
 *   3. Friend signs up (existing magic-link / OAuth flow)
 *   4. AuthContext sees `pending_invite` after signup and POSTs here
 *   5. We atomically check global cap, dedup user, and grant the plan
 *
 * Concurrency:
 *   The race we care about is two friends redeeming the 50th and 51st slot
 *   at the same time. We solve it with a CAS update on used_count:
 *     UPDATE invite_codes SET used_count = used_count + 1
 *     WHERE id = ? AND used_count = ?
 *   If `used_count` moved between SELECT and UPDATE the affected-row count
 *   is 0; we retry once. If the retry also fails, the cap is full —
 *   return 410 Gone with the actual remaining (which is 0 by then).
 *
 * Fairness on credits:
 *   We TOP UP the user's credit balance to `credits_to_grant`, taking
 *   max(existing, granted). A user who already had 5 credits and redeems a
 *   100-credit invite ends up at 100, not 105 — keeps the cap honest. A
 *   user who already had 200 (e.g. a Pro upgraded then redeems) keeps 200.
 */
import { allow, getUserFromRequest, json, readJson, supabaseAdmin } from './_lib/auth.js';

export const config = { maxDuration: 15 };

export default async function handler(req, res) {
  if (!allow(res, req, ['POST'])) return;

  const user = await getUserFromRequest(req);
  if (!user) return json(res, 401, { error: 'Not authenticated' });

  const body = await readJson(req);
  const rawCode = (body?.code || '').toString().trim();
  if (!rawCode) return json(res, 400, { error: 'Missing invite code' });
  // Normalize to uppercase. The unique index is on lower(code) so the
  // server lookup is case-insensitive either way; we uppercase for display
  // consistency in audit logs.
  const code = rawCode.toUpperCase();

  // 1. Look up the code (RLS-bypass via service role).
  const { data: invite, error: inviteErr } = await supabaseAdmin
    .from('invite_codes')
    .select('*')
    .ilike('code', code)
    .maybeSingle();

  if (inviteErr) {
    // eslint-disable-next-line no-console
    console.error('[redeemInvite] lookup failed', inviteErr);
    return json(res, 500, { error: 'Could not look up invite' });
  }
  if (!invite) {
    return json(res, 404, { error: 'That invite code does not exist.' });
  }
  if (!invite.active) {
    return json(res, 410, { error: 'That invite is no longer active.' });
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return json(res, 410, { error: 'That invite has expired.' });
  }
  if (invite.used_count >= invite.max_uses) {
    return json(res, 410, {
      error: 'That invite is fully redeemed.',
      max_uses: invite.max_uses,
    });
  }

  // 2. Has this user already redeemed THIS code? Idempotent — return success.
  const { data: existing } = await supabaseAdmin
    .from('invite_redemptions')
    .select('id, granted_plan, granted_credits, redeemed_at')
    .eq('invite_code_id', invite.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return json(res, 200, {
      already_redeemed: true,
      plan_type: existing.granted_plan,
      credits_granted: existing.granted_credits,
      redeemed_at: existing.redeemed_at,
    });
  }

  // 3. Atomic CAS bump on used_count to claim a slot. Up to 2 attempts in
  //    case a parallel redemption raced us between read and update.
  let claimed = false;
  let claimedRow = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: latest } = await supabaseAdmin
      .from('invite_codes')
      .select('used_count, max_uses')
      .eq('id', invite.id)
      .maybeSingle();
    if (!latest) break;
    if (latest.used_count >= latest.max_uses) break;

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('invite_codes')
      .update({ used_count: latest.used_count + 1 })
      .eq('id', invite.id)
      .eq('used_count', latest.used_count)
      .select()
      .maybeSingle();
    if (!updErr && updated) {
      claimed = true;
      claimedRow = updated;
      break;
    }
  }
  if (!claimed) {
    return json(res, 410, {
      error: 'That invite filled up before we could finish — sorry!',
      max_uses: invite.max_uses,
    });
  }

  // 4. Grant the plan + credits. Top-up semantics: cap-honest but never
  //    reduces a user's existing balance.
  const { data: creditsRow } = await supabaseAdmin
    .from('user_credits')
    .select('id, credits_remaining, plan_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const granted = invite.credits_to_grant;
  const newCredits = Math.max(creditsRow?.credits_remaining ?? 0, granted);
  const newPlan = invite.plan_type;

  if (creditsRow) {
    await supabaseAdmin
      .from('user_credits')
      .update({ credits_remaining: newCredits, plan_type: newPlan })
      .eq('id', creditsRow.id);
  } else {
    await supabaseAdmin.from('user_credits').insert({
      user_id: user.id,
      credits_remaining: newCredits,
      plan_type: newPlan,
    });
  }

  // 5. Record the redemption (audit + dedup).
  await supabaseAdmin.from('invite_redemptions').insert({
    invite_code_id: invite.id,
    user_id: user.id,
    granted_plan: newPlan,
    granted_credits: granted,
  });

  return json(res, 200, {
    already_redeemed: false,
    code: invite.code,
    plan_type: newPlan,
    credits_granted: granted,
    credits_remaining: newCredits,
    remaining_slots: claimedRow.max_uses - claimedRow.used_count,
  });
}
