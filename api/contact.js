/**
 * /api/contact — public, no-auth lead-capture endpoint for B2B sales.
 *
 * Day 9.1 — replaces the mailto: hrefs that wrapped the Home UseCases B2B
 * cards and the Pricing B2B cards. Those mailto: links failed silently in
 * browsers without a configured mail handler (the user's reported bug).
 *
 * Now: ContactSalesModal posts to this route → row in contact_leads table
 * → optional Resend email to support@ambientspace.ai when RESEND_API_KEY
 * is configured. The DB write is the source of truth; the email is a
 * convenience and a failed send does NOT break the submission.
 *
 * Rate limit: 5 submissions per IP per hour via Upstash Redis. Any
 * realistic B2B sales conversation needs at most 1 submission, so this
 * is a generous-but-tight cap that still kills bot spam.
 */
import { json, readJson, supabaseAdmin } from './_lib/auth.js';
import { Redis } from '@upstash/redis';

export const config = { maxDuration: 30 };

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@ambientspace.ai';

const VALID_SOURCES = new Set([
  'home_real_estate',
  'home_retailer',
  'pricing_real_estate',
  'pricing_retailer',
  'other',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function hashIp(ip) {
  if (!ip) return null;
  const enc = new TextEncoder().encode(ip + (process.env.IP_HASH_SALT || ''));
  const buf = await (globalThis.crypto?.subtle?.digest('SHA-256', enc) || null);
  if (!buf) return null;
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const SOURCE_LABELS = {
  home_real_estate:    'Real Estate (Home page)',
  home_retailer:       'Retailer / E-commerce (Home page)',
  pricing_real_estate: 'Real Estate (Pricing page)',
  pricing_retailer:    'Retailer / E-commerce (Pricing page)',
  other:               'Other',
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = await readJson(req);
  const name    = (body?.name    || '').toString().trim().slice(0, 100);
  const email   = (body?.email   || '').toString().trim().toLowerCase().slice(0, 200);
  const company = (body?.company || '').toString().trim().slice(0, 200);
  const message = (body?.message || '').toString().trim().slice(0, 2000);
  const source  = VALID_SOURCES.has(body?.source) ? body.source : 'other';

  if (!EMAIL_RE.test(email)) {
    return json(res, 400, { error: 'Please provide a valid email address.' });
  }
  if (message.length < 10) {
    return json(res, 400, { error: 'Please add a short message (10+ characters).' });
  }

  const ipHash = await hashIp(getClientIp(req));

  // Rate limit: 5 submissions per IP per hour.
  if (redis && ipHash) {
    const key = `contact:${ipHash}`;
    const used = await redis.incr(key);
    if (used === 1) await redis.expire(key, 60 * 60); // 1h
    if (used > 5) {
      return json(res, 429, {
        error: 'Too many submissions from this network. Email support@ambientspace.ai instead.',
      });
    }
  }

  // 1. Persist the lead — this is the source of truth. Email is best-effort.
  const { data: row, error: dbErr } = await supabaseAdmin
    .from('contact_leads')
    .insert({
      name: name || null,
      email,
      company: company || null,
      message,
      source,
      ip_hash: ipHash,
      user_agent: (req.headers['user-agent'] || '').slice(0, 200),
    })
    .select('id')
    .maybeSingle();

  if (dbErr) {
    // eslint-disable-next-line no-console
    console.error('[api/contact] DB insert failed:', dbErr);
    return json(res, 500, { error: 'Could not save your submission. Please try again.' });
  }

  // 2. Best-effort email to support. Failure does NOT block success.
  if (RESEND_API_KEY) {
    try {
      const subject = `New B2B lead: ${SOURCE_LABELS[source] || source}`;
      const html = `
        <h2>New B2B inquiry</h2>
        <p><strong>Source:</strong> ${SOURCE_LABELS[source] || source}</p>
        <p><strong>Name:</strong> ${name || '(not provided)'}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Company:</strong> ${company || '(not provided)'}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap;font-family:inherit">${message.replace(/[<>]/g, (c) => ({ '<': '&lt;', '>': '&gt;' }[c]))}</pre>
        <p style="color:#666;font-size:11px">Lead ID: ${row?.id}</p>
      `;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Ambient Space <noreply@ambientspace.ai>',
          to: SUPPORT_EMAIL,
          reply_to: email,
          subject,
          html,
        }),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[api/contact] Resend send failed (non-fatal):', err);
    }
  }

  return json(res, 200, {
    ok: true,
    message: "Got it — we'll be in touch within one business day.",
  });
}
