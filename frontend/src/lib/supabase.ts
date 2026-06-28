/**
 * Supabase client (browser-side). Used exclusively for anonymous auth —
 * every visitor gets a signed JWT without login, which the backend verifies
 * to prove requests originate from this app.
 *
 * Required env vars (set at build time):
 *   NEXT_PUBLIC_SUPABASE_URL        — e.g. https://<ref>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   — the publishable key (sb_publishable_...)
 *                                     or legacy anon key (eyJ...) from dashboard
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
).trim();
const IS_PRODUCTION = process.env.NODE_ENV === "production";

let _configWarningShown = false;

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
  }

  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const message = `[supabase] missing required config: ${missing.join(", ")}`;

  if (IS_PRODUCTION) {
    throw new Error(message);
  }

  if (!_configWarningShown) {
    _configWarningShown = true;
    console.warn(
      `${message}; request-level auth is disabled for browser API calls`,
    );
  }
  return null;
}

/** Lazy singleton — only created in the browser when credentials are present. */
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const config = getSupabaseConfig();
  if (!config) return null;
  if (!_client) {
    _client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        flowType: "implicit",
      },
    });
  }
  return _client;
}

/**
 * Ensure an anonymous session exists. Called once on app load.
 * If a session already exists (persisted in localStorage by Supabase),
 * this is a no-op. Otherwise, creates a new anonymous session.
 */
let _sessionReady: Promise<string | null> | null = null;

export function ensureAnonSession(): Promise<string | null> {
  if (!_sessionReady) {
    _sessionReady = _initSession();
  }
  return _sessionReady;
}

async function _initSession(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const {
    data: { session },
  } = await client.auth.getSession();
  if (session?.access_token) return session.access_token;

  // No existing session — create an anonymous one.
  const { data, error } = await client.auth.signInAnonymously();
  if (error || !data.session) {
    console.warn("[supabase] anonymous auth failed:", error?.message);
    return null;
  }
  return data.session.access_token;
}

/** Get the current access token (refreshed automatically by Supabase). */
export async function getSupabaseToken(): Promise<string | null> {
  // Wait for the initial session to be established before reading token.
  await ensureAnonSession();
  const client = getClient();
  if (!client) return null;
  const {
    data: { session },
  } = await client.auth.getSession();
  return session?.access_token ?? null;
}
