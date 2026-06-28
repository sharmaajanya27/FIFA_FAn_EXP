# FanWatch — Security & Hardening Notes

> **Status:** Living document. Findings from the hardening pass on the
> `tuparea.com` production deployment (Amplify frontend + EC2 API + Supabase).
> Severity reflects exploitability **given the current architecture**, not a
> formal CVSS score.

This file tracks hardening gaps and the reasoning behind them. Open items are
the backlog of what still needs attention; items already fixed are marked
**RESOLVED** and written up in full in [`SECURITY-FIXES.md`](./SECURITY-FIXES.md)
(detection → root cause → analysis → mitigation → solution).

---

## Configuration model (what is env-driven now)

All environment-specific values are sourced from environment variables; no
production origins, IPs, secrets, or project refs are hardcoded in source. See
the annotated templates:

- `api/.env.example` · `api/.env.production.example`
- `frontend/.env.local.example`
- `ingestion/.env.example`

Key variables:

| Var | Package | Purpose |
| --- | ------- | ------- |
| `DATABASE_URL` | api, ingestion | Supabase/Postgres connection (unset → local files) |
| `SUPABASE_URL` | api | JWKS issuer for request-level JWT verification |
| `ALLOWED_ORIGINS` | api | CORS allowlist (comma-separated) |
| `SERVER_AUTH_SECRET` | api, frontend | Shared secret; lets SSG/SSR bypass the JWT gate |
| `BACKEND_URL` | frontend | Server-side API target for the `/_api` proxy + SSG fetchers |
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Anonymous-auth client **and** CSP `connect-src` source |
| `NEXT_PUBLIC_SITE_URL` | frontend | Canonical/OG/sitemap origin |
| `GEOCODE_ENDPOINT` | api | Optional override for the geocoder (default: Nominatim) |
| `ESPN_API_BASE` | api | Optional override for live scores (default: ESPN public API) |

`.env`, `.env.local`, and `.env.*.local` are gitignored in every package.

---

## Findings

### HIGH

#### H1 — Backend origin is publicly reachable over plain HTTP
> **RESOLVED** — TLS now terminates at `api.tuparea.com` (nginx + Let's Encrypt,
> HTTP→HTTPS redirect, auto-renew enabled). See
> [`SECURITY-FIXES.md` § H1](./SECURITY-FIXES.md#h1--backend-origin-reachable-over-plain-http-resolved).
> The network-level origin restriction below remains open.

The EC2 API answers directly at `http://<elastic-ip>/` (port 80, nginx) from the
open internet, bypassing Amplify/CloudFront. Verified: `GET /health` → `200`.

**Why it matters**
- Traffic between Amplify (SSR/proxy) and the origin is **unencrypted** — the
  `X-Server-Auth` secret and Supabase JWTs travel in cleartext.
- Edge protections (CDN, any future WAF, request shaping) are trivially bypassed
  by hitting the IP directly.
- The origin IP is visible in DNS/headers and easy to enumerate.

**Remediation**
1. Terminate TLS at the origin: either an ALB + ACM cert, or
   `api.tuparea.com` with nginx + Let's Encrypt (certbot), then point
   `BACKEND_URL` at `https://api.tuparea.com`.
2. Restrict the EC2 security group inbound (80/443) to the CloudFront
   origin-facing managed prefix list
   (`com.amazonaws.global.cloudfront.origin-facing`) so only the CDN can reach
   the origin. Keep SSH (22) limited to your IP.

#### H2 — Static shared secret acts as a full auth bypass
> **RESOLVED** — `SERVER_AUTH_SECRET` removed from the `next.config.mjs` `env:`
> inline, rotated on EC2 + Amplify, and now sent only over TLS. See
> [`SECURITY-FIXES.md` § H2](./SECURITY-FIXES.md#h2--static-shared-secret-inlined-into-the-frontend-build-resolved).
> Scoping the bypass to an origin-only path (vs a portable secret) remains open.

`SERVER_AUTH_SECRET` in the `X-Server-Auth` header bypasses the Supabase JWT
gate entirely (see `api/src/http/server.ts`). It is a single, long-lived value.

**Why it matters**
- Anyone holding the secret gets unauthenticated access to every non-`/health`
  route, from any network — and over HTTP today (see H1) it can be sniffed.
- It is injected into the frontend build via `next.config.mjs` `env:`, which
  **inlines** it into build output. It is currently referenced only by
  server-only modules (`src/lib/server/fetchers.ts`, imported by RSC/sitemap/OG
  routes — verified no `'use client'` consumer), so it does not reach the
  browser bundle. That containment is fragile: one client import would leak it.

**Remediation**
- Rotate the secret; never transmit it over plain HTTP (fix H1 first).
- Remove `SERVER_AUTH_SECRET` from `next.config.mjs` `env:` and rely on runtime
  `process.env` on the Node server (it is already read at runtime). Keep it out
  of any client-reachable import path.
- Longer term, scope the SSG bypass to an internal/origin-only network path
  instead of a portable bearer secret.

### MEDIUM

#### M1 — CSP permits `'unsafe-inline'` and `'unsafe-eval'` in `script-src`
`frontend/next.config.mjs` allows inline/eval scripts, which defeats most of
CSP's XSS protection.

**Remediation**: move to a nonce-based CSP (Next.js middleware injecting a
per-request nonce) and drop `unsafe-inline`/`unsafe-eval`. Non-trivial under the
App Router; track as a dedicated task.

#### M2 — CORS fallback echoes an allowlisted origin for disallowed requests
`corsOrigin()` returns `allowedOrigins[0]` when the request origin is not in the
allowlist, and `*` when `ALLOWED_ORIGINS` is empty.

**Why it matters**: not directly exploitable (browsers still block a mismatched
ACAO), but it masks misconfiguration, and an empty allowlist in production would
silently open CORS to `*`.

**Remediation**: omit the ACAO header entirely for disallowed origins, and fail
fast at boot if `NODE_ENV=production` and `ALLOWED_ORIGINS` is empty.

#### M3 — Secrets stored in plaintext `.env` on the instance
DB password and `SERVER_AUTH_SECRET` live in `api/.env` on EC2 — no rotation, no
audit trail.

**Remediation**: AWS SSM Parameter Store (SecureString) or Secrets Manager;
load at process start. Rotate the Supabase DB password and the SSH key (the key
was exposed during initial setup — see `DEPLOYMENT.md`).

### LOW / hygiene

- **L1 — `X-XSS-Protection: 1; mode=block`** is deprecated and can introduce
  issues in legacy browsers; modern guidance is `0` plus a strong CSP.
- **L2 — HSTS `includeSubDomains; preload`** on the apex commits every
  subdomain (incl. `api.`) to HTTPS-forever; only keep `preload` once that holds.
- **L3 — No edge WAF / bot protection**; only nginx `30r/s`. Consider AWS WAF on
  the Amplify/CloudFront distribution and per-identity throttling for engagement
  writes.

---

## Unneeded / review (keep-or-cut analysis)

| Item | Status | Recommendation |
| ---- | ------ | -------------- |
| `NEXT_PUBLIC_API_BASE` | Superseded by `BACKEND_URL`; only a fallback in `next.config.mjs` | Keep one cycle, then remove to avoid two names for one thing |
| Legacy Amplify origin in `ALLOWED_ORIGINS` | Needed only during domain cutover | Remove once `tuparea.com` is the sole entry point |
| `X-XSS-Protection` header | Deprecated | Safe to drop (see L1) |
| `DEFAULT_RADIUS_M`, `AI_MODEL`, `NEXT_PUBLIC_ENABLE_AI_PITCH` | Verified still referenced | Keep |
| `amplify.yml` | No secrets, drives the frontend build | Keep |
| `ecosystem.config.cjs` | No secrets; PM2 in prod currently runs `npm start` (cwd `api`) directly, not this file | Keep as documented start config, or wire PM2 to use it |

---

## Verified good

- No secrets, production IPs, Supabase refs, or domains are committed to source
  (grep-clean; values live in env / instance `.env` only).
- `.env*` files are gitignored across all packages.
- Request-level auth (Supabase anonymous JWT via JWKS) is enforced for all
  non-`/health` routes when `SUPABASE_URL` is set.
- The browser never talks to the API cross-origin: it uses the same-origin
  `/_api` rewrite proxy, so no CORS surface is exposed to the client and
  mixed-content is avoided.
- Port 3001 (raw Node) is **not** publicly reachable; nginx (:80) is the only
  public ingress and applies rate limiting.
