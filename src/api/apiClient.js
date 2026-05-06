/**
 * apiClient — backend bridge between component code and our services.
 *
 * Components import `{ apiClient }` from this module and call:
 *   - apiClient.auth.me() / .logout() / .redirectToLogin()
 *   - apiClient.entities.RoomDesign.filter(...) etc.
 *   - apiClient.integrations.Core.UploadFile / InvokeLLM / GenerateImage
 *   - apiClient.functions.invoke('<route>', body)
 *
 * Routing:
 *   - Supabase Auth      ← auth.*
 *   - Supabase Postgres  ← entities.*
 *   - Supabase Storage   ← integrations.Core.UploadFile
 *   - /api/llm           ← integrations.Core.InvokeLLM
 *   - /api/generate      ← integrations.Core.GenerateImage
 *   - /api/<name>        ← functions.invoke('<name>', body)
 *
 * Identity translation (legacy code paths used emails as foreign keys, the
 * new schema uses UUIDs from auth.users):
 *   - On read:  rows are hydrated with `user_email` / `created_by` (email)
 *               for backward compatibility with components that still read
 *               them.
 *   - On write: payloads with `created_by` / `user_email` strings are
 *               stripped — RLS + the schema use `created_by` (uuid) which
 *               we inject from the current session.
 */
import { supabase } from './supabase';

// =============================================================================
// AUTH
// =============================================================================

const auth = {
  /**
   * Returns the current user.
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
   *
   * supabase.auth.signOut() can hang indefinitely when the auth client is
   * mid-token-refresh or in an inconsistent state. We race it against a 2s
   * timeout, then forcibly clear the session from localStorage and navigate
   * regardless of whether signOut resolved. This is what makes the sign-out
   * button feel reliable instead of "click does nothing, must refresh".
   */
  logout: async () => {
    const SIGNOUT_TIMEOUT_MS = 2000;
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('signOut timeout')), SIGNOUT_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      // Don't block logout on network, lock, or timeout errors.
      // eslint-disable-next-line no-console
      console.warn('[auth] signOut error (continuing anyway):', err?.message ?? err);
    }

    // Belt-and-suspenders: nuke any leftover supabase auth keys from
    // localStorage so a hung signOut can't leave a phantom session behind.
    if (typeof window !== 'undefined') {
      try {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith('sb-') || k === 'supabase.auth.token')
          .forEach((k) => window.localStorage.removeItem(k));
      } catch {
        /* private mode / quota — fine to skip */
      }
    }

    // Always navigate, even if the upstream signOut hung. Use replace so the
    // back button doesn't bring the user back into a half-authed state.
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  },

  /**
   * Redirect to the login page. The `returnUrl` is preserved as a query
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
 * Strips email-based identity fields from write payloads. Components inherited
 * from earlier code paths frequently send `created_by: <email>` and
 * `user_email: <email>` — those are legacy and must not land in our UUID
 * columns. We strip both unconditionally; the entity helpers below inject a
 * fresh `created_by: <uuid>` from auth.uid() on insert when the schema
 * requires it.
 */
function stripEmailIdentityFields(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  // eslint-disable-next-line no-unused-vars
  const { created_by, user_email, ...rest } = payload;
  return rest;
}

/**
 * Returns the current Supabase user's UUID, or null if no session.
 * Used to populate `created_by` on insert for tables that require it
 * (room_designs, saved_designs.user_id, furniture_items via design ownership).
 */
async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Tables that require `created_by = auth.uid()` to be set explicitly on
 * insert (NOT NULL + RLS with check). The shim injects it when these tables
 * receive a create() call.
 */
const TABLES_NEEDING_CREATED_BY = new Set(['room_designs']);

/**
 * Tables that require `user_id = auth.uid()` to be set explicitly on insert.
 */
const TABLES_NEEDING_USER_ID = new Set(['saved_designs', 'user_credits']);

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
 * Translates a `filter({...})` payload into Supabase `.eq(col, val)` chained
 * calls. Drops email-identity filters because RLS already scopes.
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
 * Factory that produces an entity with list/filter/get/create/update/delete/bulkCreate.
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
      const userId = await getCurrentUserId();
      let insertPayload = stripEmailIdentityFields(payload);
      // Schema-driven identity injection — set the FK to current auth user
      // on tables that require it. Without this, RLS rejects with 400.
      if (userId) {
        if (TABLES_NEEDING_CREATED_BY.has(table)) {
          insertPayload = { ...insertPayload, created_by: userId };
        }
        if (TABLES_NEEDING_USER_ID.has(table)) {
          insertPayload = { ...insertPayload, user_id: userId };
        }
      }
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
      const userId = await getCurrentUserId();
      const cleaned = rows.map((row) => {
        let r = stripEmailIdentityFields(row);
        if (userId) {
          if (TABLES_NEEDING_CREATED_BY.has(table)) r = { ...r, created_by: userId };
          if (TABLES_NEEDING_USER_ID.has(table)) r = { ...r, user_id: userId };
        }
        return r;
      });
      const { data, error } = await supabase.from(table).insert(cleaned).select();
      if (error) throw error;
      return data ?? [];
    },
  };
}

/**
 * Parses orderBy strings ("-created_date", "name", "+price") to Supabase's
 * { column, ascending } shape. Maps the legacy "created_date" alias to
 * "created_at".
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
 * Upload a file to Supabase Storage. Returns { file_url }.
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
 * Server reads the configured LLM provider's API key (Gemini, Groq, or
 * Anthropic) and runs the model with the requested schema.
 *
 * Unwraps functions.invoke()'s {data, status} response so callers see the
 * LLM JSON directly (e.g. `result.items` not `result.data.items`).
 */
async function InvokeLLM({ prompt, response_json_schema, file_urls, model } = {}) {
  const response = await functions.invoke('llm', {
    prompt,
    response_json_schema,
    file_urls,
    model, // optional override; server picks a sensible default
  });
  return response?.data ?? response;
}

/**
 * Call the image generator via the server-side /api/generate route.
 * Translates legacy payload shapes (existing_image_urls + nested options)
 * into the flat shape our route expects.
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

  // Legacy shape used an array; we use a single image_url. First non-empty wins.
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

  const response = await functions.invoke('generate', {
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
  // Unwrap {data, status} so callers see {url, credits_remaining}
  return response?.data ?? response;
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
   *
   * Returns axios-style {data, status} shape so callers (Pricing.jsx,
   * Design.jsx, AdminEmail.jsx) that read `response.data.X` keep working
   * without modification. The InvokeLLM/GenerateImage helpers unwrap before
   * returning to their callers.
   */
  invoke: async (name, body = {}) => {
    // supabase.auth.getSession() is normally a fast localStorage read, but
    // can hang indefinitely if the auth client is mid-refresh or stuck in
    // an inconsistent state — that's what causes "click Generate, nothing
    // happens, must refresh." Race it against a short timeout and proceed
    // unauthenticated if it fails; the server returns 401 cleanly which we
    // already surface as a real error instead of a silent hang.
    let token;
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 1500)
        ),
      ]);
      token = sessionResult?.data?.session?.access_token;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[functions.invoke ${name}] getSession failed:`, err?.message);
    }

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
      const baseMsg =
        json?.error || json?.message || `API ${name} failed (${response.status})`;
      const detail = json?.detail;
      const fullMsg = detail ? `${baseMsg}: ${detail}` : baseMsg;
      const err = new Error(fullMsg);
      err.status = response.status;
      err.body = json ?? text;
      throw err;
    }

    return { data: json, status: response.status };
  },
};

// =============================================================================
// EXPORT
// =============================================================================

export const apiClient = {
  auth,
  entities,
  integrations,
  functions,
  // We don't expose service_role in the browser — server-side privileged ops
  // happen in /api/* routes. Calls to apiClient.asServiceRole.* throw a clear
  // error if anything still references the legacy SDK pattern.
  asServiceRole: new Proxy(
    {},
    {
      get() {
        throw new Error(
          'apiClient.asServiceRole is not available in the browser. ' +
            'Move this call into a /api/* route that uses the service_role key.'
        );
      },
    }
  ),
};

export default apiClient;
