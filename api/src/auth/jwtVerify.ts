/**
 * Supabase JWT verification via JWKS (asymmetric keys).
 *
 * Verifies the `X-Supabase-Auth` header contains a valid JWT signed by
 * Supabase Auth's signing key. Uses the public JWKS endpoint to fetch
 * verification keys — no shared secret needed.
 *
 * When SUPABASE_URL is set, ALL requests (except OPTIONS and /health)
 * must carry a valid token. When unset, verification is skipped (local dev).
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { log } from "../util/logger.js";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let supabaseUrl: string | undefined;

function normalizeSupabaseUrl(url: string | undefined): string | undefined {
  const trimmed = url?.trim().replace(/\/+$/, "");
  return trimmed || undefined;
}

export function initJwtVerification(url: string | undefined): void {
  supabaseUrl = normalizeSupabaseUrl(url);
  if (supabaseUrl) {
    const jwksUrl = new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
    log.info("api: supabase JWT verification enabled (JWKS)", {
      jwksUrl: jwksUrl.toString(),
    });
  } else {
    log.info("api: supabase JWT verification disabled (no SUPABASE_URL)");
  }
}

export function isJwtVerificationEnabled(): boolean {
  return Boolean(jwks);
}

/**
 * Verify the X-Supabase-Auth token using the JWKS endpoint.
 * Returns the decoded payload if valid, null otherwise.
 * Returns a truthy result immediately if verification is disabled (dev mode).
 */
export async function verifySupabaseJwt(
  token: string | undefined,
): Promise<JWTPayload | null> {
  if (!jwks) return {} as JWTPayload; // Verification disabled — allow all (dev mode).
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
      // Accept tokens issued by this project's Auth server.
      issuer: `${supabaseUrl}/auth/v1`,
    });
    return payload;
  } catch (err) {
    log.info("api: JWT verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
