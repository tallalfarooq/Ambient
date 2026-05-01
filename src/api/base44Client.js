/**
 * Compatibility shim — replaces the Base44 SDK with our own backend.
 *
 * The 21+ existing component files import `{ base44 }` from this module and
 * call `base44.auth.me()`, `base44.entities.RoomDesign.filter(...)`,
 * `base44.integrations.Core.UploadFile(...)`, etc. This file preserves that
 * exact surface but routes calls to:
 *
 *   - Supabase Auth      ← auth.*
 *   - Supabase Postgres  ← entities.*
 *   - Supabase Storage   ← integrations.Core.UploadFile
 *   - /api/llm           ← integrations.Core.InvokeLLM
 *   - /api/generate      ← integrations.Core.GenerateImage
 *   - /api/<name>        ← functions.invoke('<name>', body)
 *
 * Field/identity translation (Base44 used emails as foreign keys, we use
 * UUIDs from auth.users):
 *
 *   - On read:  rows are hydrated with `user_email` / `created_by` (email) for
 *               UI compatibility, by joining profiles.
 *   - On write: payloads with `created_by` / `user_email` are stripped — RLS +
 *               the schema use `created_by` (uuid) which is auto-set to
 *               auth.uid(). Components keep passing the email; we ignore it.
 */
import { supabase } from './supabase';

// =============================================================================
// AUTH
// =============================================================================

const auth = {
  /**
   * Returns the current user in the Base44-style shape.
   * Throws an Error with .type = 'auth_required' when no session exists.
   *
   * Uses getSession() (fast localStorage read, no network call, no auth lock)
   * instead of getUser() (network call, contends for auth-token lock).
   * Token refresh is handled in the background by supabase-js itself.
   */
  me: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      const err = new Error('auth_required');
      err.type = 'auth_required';
      throw err;
    }
    const user = session.user;

    // Hydrate full_name + role from profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name ?? user.email?.split('@')[0] ?? null,
      role: profile?.role ?? 'user',
    };
  },

  /**
   * Logs the user out and clears the local session.
   * No forced navigation — AuthContext's onAuthStateChange listener flips
   * isAuthenticated immediately, and BroadcastChannel propagates SIGNED_OUT
   * to any other open tabs.
   */
  logout: async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Don't block logout on network or lock errors
      // eslint-disable-next-line no-console
      console.warn('[auth] signOut error (ignored):', err?.message ?? err);
    }
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      // Bring the user to the home page if they were on a protected route.
      window.location.assign('/');
    }
  },

  /**
   * Redirect to the login page. The Base44 SDK redirected to a hosted login
   * UI; we use our own /login route. The `returnUrl` is preserved as a query
   * param so we can come back after auth.
   */
  redirectToLogin: (returnUrl) => {
    if (typeof window === 'undefined') return;
    // Coerce returnUrl to a same-origin path; ignore foreign / malformed URLs.
    let safePath = null;
    if (returnUrl) {
      try {
        const u = new URL(returnUrl, window.location.origin);
        if (u.origin === window.location.origin) {
          safePath = u.pathname + u.search + u.hash;
        }
      } catch {
        // Treat as a path string already
        safePath = returnUrl.startsWith('/') ? returnUrl : '/' + returnUrl;
      }
    }
    const params = new URLSearchParams();
    if (safePath) params.set('returnUrl', safePath);
    window.location.href = `/login${params.toString() ? '?' + params : ''}`;
  },
};

// =============================================================================
// ENTITIES
// =============================================================================

/**
 * Strips Base44-era email-based identity fields from write payloads.
 * Our schema uses UUIDs (created_by, user_id) auto-set from auth.uid().
 */
function stripEmailIdentityFields(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  // eslint-disable-next-line no-unused-vars
  const { created_by, user_email, ...rest } = payload;
  return rest;
}

/**
 * Hydrates a row with backwards-compatible fields (created_by as email,
 * created_date alias, etc.) for components that still read them.
 */
function hydrateRow(row, userEmail) {
  if (!row) return row;
  return {
    ...row,
    // Legacy aliases
    created_date: row.created_at ?? row.created_date,
    // Email-based identity fields filled from current user (most queries are user-scoped)
    ...(userEmail
      ? { created_by: row.created_by_email ?? userEmail, user_email: userEmail }
      : {}),
  };
}

/**
 * Translates a Base44 `filter({...})` payload into Supabase `.eq(col, val)`
 * chained calls. Drops email-identity filters because RLS already scopes.
 */
function applyFilters(query, where) {
  if (!where) return query;
  for (const [key, value] of Object.entries(where)) {
    if (key === 'created_by' || key === 'user_email') {
      // RLS handles user scoping; ignore email-based filters
      continue;
    }
    if (value === null) {
      query = query.is(key, null);
    } else if (Array.isArray(value)) {
      query = query.in(key, value);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

/**
 * Get the current user's email — uses getSession() (synchronous-ish, no
 * auth-token lock, no network call). Promise-cached for one render cycle.
 */
let cachedEmailPromise = null;
async function getCurrentEmail() {
  if (cachedEmailPromise) return cachedEmailPromise;
  cachedEmailPromise = supabase.auth
    .getSession()
    .then(({ data }) => data?.session?.user?.email ?? null)
    .catch(() => null);
  setTimeout(() => {
    cachedEmailPromise = null;
  }, 30_000);
  return cachedEmailPromise;
}

/**
 * Factory that produces a Base44-style entity with list/filter/get/create/update/delete/bulkCreate.
 */
function makeEntity(table, options = {}) {
  const { defaultOrder = { column: 'created_at', ascending: false } } = options;

  return {
    /** List all rows the user can read (RLS-scoped). */
    list: async (orderBy = '-created_date') => {
      const { column, ascending } = parseOrderBy(orderBy, defaultOrder);
      const userEmail = await getCurrentEmail();
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order(column, { ascending });
      if (error) throw error;
      return (data ?? []).map((row) => hydrateRow(row, userEmail));
    },

    /** Filter rows by an object of column→value. Returns array. */
    filter: async (where = {}, orderBy = '-created_date') => {
      const { column, ascending } = parseOrderBy(orderBy, defaultOrder);
      const userEmail = await getCurrentEmail();
      let query = supabase.from(table).select('*');
      query = applyFilters(query, where);
      query = query.order(column, { ascending });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => hydrateRow(row, userEmail));
    },

    /** Get a single row by id (or null if not found / not visible). */
    get: async (id) => {
      const userEmail = await getCurrentEmail();
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return hydrateRow(data, userEmail);
    },

    /** Create a new row. Returns the inserted row. */
    create: async (payload) => {
      const userEmail = await getCurrentEmail();
      const insertPayload = stripEmailIdentityFields(payload);
      const { data, error } = await supabase
        .from(table)
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      return hydrateRow(data, userEmail);
    },

    /** Update a row by id. Returns the updated row. */
    update: async (id, payload) => {
      const userEmail = await getCurrentEmail();
      const updatePayload = stripEmailIdentityFields(payload);
      const { data, error } = await supabase
        .from(table)
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return hydrateRow(data, userEmail);
    },

    /** Delete a row by id. */
    delete: async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { ok: true };
    },

    /** Bulk-insert. Used by CatalogImport for product catalog seeding. */
    bulkCreate: async (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      const cleaned = rows.map(stripEmailIdentityFields);
      const { data, error } = await supabase.from(table).insert(cleaned).select();
      if (error) throw error;
      return data ?? [];
    },
  };
}

/**
 * Parses Base44-style orderBy strings ("-created_date", "name", "+price") to
 * Supabase's { column, ascending } shape. Maps the legacy "created_date" alias
 * to "created_at".
 */
function parseOrderBy(orderBy, fallback) {
  if (!orderBy) return fallback;
  let ascending = true;
  let column = orderBy;
  if (orderBy.startsWith('-')) {
    ascending = false;
    column = orderBy.slice(1);
  } else if (orderBy.startsWith('+')) {
    column = orderBy.slice(1);
  }
  if (column === 'created_date') column = 'created_at';
  return { column, ascending };
}

const entities = {
  // Naming aligns with the existing component imports (PascalCase).
  UserCredits: makeEntity('user_credits'),
  RoomDesign: makeEntity('room_designs'),
  SavedDesign: makeEntity('saved_designs'),
  FurnitureItem: makeEntity('furniture_items'),
  ProductCatalog: makeEntity('product_catalog'),
  ConsentLog: makeEntity('consent_logs'),
};

// =============================================================================
// INTEGRATIONS — Core
// =============================================================================

/**
 * Upload a file to Supabase Storage. Returns { file_url } in the Base44 shape.
 *
 * Object key convention: <user_id>/<timestamp>-<safeName>
 * Bucket selection:
 *   - Images of empty rooms uploaded by the user → 'rooms'
 *   - AI-generated renders saved by the server   → 'renders' (server uses
 *     service_role; UploadFile in the browser only writes to 'rooms')
 */
async function UploadFile({ file, bucket = 'rooms' }) {
  const tag = '[UploadFile]';
  // eslint-disable-next-line no-console
  console.log(tag, 'start', {
    bucket,
    name: file?.name,
    type: file?.type,
    size: file?.size,
  });

  // Read from session (no network, no lock).
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Not authenticated. Please sign in and try again.');
  }
  // eslint-disable-next-line no-console
  console.log(tag, 'session OK, user:', session.user.id);

  const userId = session.user.id;
  const safeName = (file.name || 'upload')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-80);
  const objectKey = `${userId}/${Date.now()}-${safeName}`;
  // eslint-disable-next-line no-console
  console.log(tag, 'uploading to', `${bucket}/${objectKey}`);

  // Cap the upload at 60s so the UI never hangs forever.
  const TIMEOUT_MS = 60_000;
  const uploadPromise = supabase.storage
    .from(bucket)
    .upload(objectKey, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Upload timed out after ${TIMEOUT_MS / 1000}s`)),
      TIMEOUT_MS
    )
  );

  const { error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);
  if (uploadError) {
    // eslint-disable-next-line no-console
    console.error(tag, 'upload error:', uploadError);
    throw uploadError;
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectKey);
  // eslint-disable-next-line no-console
  console.log(tag, 'success', pub.publicUrl);
  return {
    file_url: pub.publicUrl,
    bucket,
    object_key: objectKey,
  };
}

/**
 * Call the LLM via the server-side /api/llm route.
 * Server reads ANTHROPIC_API_KEY and runs Claude with the requested schema.
 */
async function InvokeLLM({ prompt, response_json_schema, file_urls, model } = {}) {
  return functions.invoke('llm', {
    prompt,
    response_json_schema,
    file_urls,
    model, // optional override; server picks a sensible default
  });
}

/**
 * Call the image generator via the server-side /api/generate route.
 * Translates the Base44 SDK payload shape (existing_image_urls + nested
 * options) into the flat shape our route expects.
 *
 * Returns a URL to the generated image stored in Supabase Storage.
 */
async function GenerateImage(payload = {}) {
  const {
    prompt,
    existing_image_urls,
    options = {},
    image_url: directImageUrl,
    ...rest
  } = payload;

  // Base44 uses an array; we use a single image_url. First non-empty wins.
  const image_url =
    directImageUrl ||
    (Array.isArray(existing_image_urls) ? existing_image_urls.find(Boolean) : undefined);

  const {
    strength,
    guidance_scale,
    num_inference_steps,
    negative_prompt,
    width,
    height,
    image_size,
    ...optionRest
  } = options;

  // fal.ai accepts either a preset string or {width, height} for image_size.
  const resolvedImageSize =
    image_size ?? (width && height ? { width, height } : undefined);

  return functions.invoke('generate', {
    prompt,
    image_url,
    strength,
    guidance_scale,
    num_inference_steps,
    negative_prompt,
    image_size: resolvedImageSize,
    ...optionRest,
    ...rest,
  });
}

const integrations = {
  Core: {
    UploadFile,
    InvokeLLM,
    GenerateImage,
  },
};

// =============================================================================
// FUNCTIONS — invoke /api/* routes
// =============================================================================

const functions = {
  /**
   * Calls a Vercel serverless function under /api/<name>.
   * Forwards the user's Supabase JWT so the route can identify them via
   * `supabase.auth.getUser(jwt)` server-side.
   */
  invoke: async (name, body = {}) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(`/api/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body ?? {}),
    });

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // non-JSON response — keep as-is
    }

    if (!response.ok) {
      const err = new Error(
        json?.error || json?.message || `API ${name} failed (${response.status})`
      );
      err.status = response.status;
      err.body = json ?? text;
      throw err;
    }

    return json;
  },
};

// =============================================================================
// CONNECTORS (legacy stub)
// =============================================================================
// The Base44 connectors API was used for Gmail Pub/Sub. We're dropping that
// integration in the migration, but components may still reference it. Keep
// a no-op stub so imports don't crash.
const connectors = {
  getConnection: async () => ({ connected: false }),
};

// =============================================================================
// EXPORT
// =============================================================================

export const base44 = {
  auth,
  entities,
  integrations,
  functions,
  connectors,
  // The legacy SDK exposed asServiceRole for backend calls. We don't expose
  // service_role in the browser — server-side privileged ops happen in /api/*.
  // Calls to base44.asServiceRole.* throw a clear error if anything still
  // references it.
  asServiceRole: new Proxy(
    {},
    {
      get() {
        throw new Error(
          'base44.asServiceRole is not available in the browser. ' +
            'Move this call into a /api/* route that uses the service_role key.'
        );
      },
    }
  ),
};

export default base44;
