/**
 * Server-side helpers for Vercel API routes.
 *
 * Two Supabase clients:
 *   - supabaseAdmin: uses SUPABASE_SERVICE_ROLE_KEY, bypasses RLS. For credit
 *     debits, server-side mutations, anything that needs trust.
 *   - supabaseFromRequest(req): authed as the calling user via their JWT.
 *     For "did this user create this design" style ownership checks.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export function supabaseFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Identify the calling user from their Bearer token.
 * Returns the auth.users row or null. Caller is responsible for 401-ing on null.
 */
export async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) return null;
  const token = match[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

/**
 * Tiny JSON body parser — Vercel's Node runtime doesn't auto-parse like Next.
 * Returns {} on parse failure.
 */
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Standard JSON response helper.
 */
export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/**
 * Method guard. Usage:
 *   if (!allow(res, req, ['POST'])) return;
 */
export function allow(res, req, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    json(res, 405, { error: `Method ${req.method} not allowed` });
    return false;
  }
  return true;
}
