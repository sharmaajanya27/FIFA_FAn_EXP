# FanWatch — Resolved Security Fixes

> Companion to [`SECURITY.md`](./SECURITY.md). That file is the **backlog** of
> open hardening gaps; this file documents vulnerabilities that have been
> **fixed**, each with the same structure: detection, root cause, analysis,
> steps to mitigate, solution implemented.
>
> Secrets (the rotated `SERVER_AUTH_SECRET`, DB password) are intentionally
> **not** reproduced here.

---

## H1 — Backend origin reachable over plain HTTP (RESOLVED)

**Severity:** HIGH · **Resolved:** TLS termination + auto-renewal on the EC2 origin.

### Detection
During the hardening pass on the `tuparea.com` deployment, the EC2 API was found
answering directly over plain HTTP on port 80 (nginx) from the open internet:
`GET http://<elastic-ip>/health` → `200`. The frontend's server-side `/_api`
proxy and SSG fetchers reached the origin via an `http://` `BACKEND_URL`.

### Root cause
nginx on the origin was configured for plain HTTP only (`listen 80` →
`proxy_pass http://127.0.0.1:3001`). No TLS listener or certificate existed, and
`BACKEND_URL` pointed at an `http://` origin, so every Amplify-SSR-to-origin
request crossed the public internet unencrypted.

### Analysis
The Amplify SSR/proxy layer calls `BACKEND_URL` server-side over the public
internet. Over `http://`, all request headers traveled in cleartext — including
the `X-Server-Auth` shared secret (which bypasses the Supabase JWT gate, see H2)
and forwarded Supabase JWTs. A network observer on the path could capture the
secret and replay it against every non-`/health` route. Edge protections were
also trivially bypassed by hitting the raw IP.

### Steps to mitigate
1. Create a DNS A record `api.tuparea.com` → origin Elastic IP.
2. Issue a Let's Encrypt certificate for that hostname via certbot.
3. Configure an nginx `443` TLS server block and a `80` → `443` `301` redirect,
   proxying to the Node process on `127.0.0.1:3001`.
4. Point the frontend `BACKEND_URL` (Amplify env) at `https://api.tuparea.com`.
5. Enable automatic certificate renewal so the cert never lapses.

### Solution implemented
- **DNS:** `api.tuparea.com` A record (Route 53) → Elastic IP.
- **nginx:** `listen 443 ssl` with the Let's Encrypt cert at
  `/etc/letsencrypt/live/api.tuparea.com/fullchain.pem`; `listen 80` returns
  `301 https://$host$request_uri`; `proxy_pass http://127.0.0.1:3001`.
- **Frontend:** Amplify `BACKEND_URL=https://api.tuparea.com`; the browser now
  only ever talks to the same HTTPS origin via the `/_api` proxy.
- **Renewal:** `certbot-renew.timer` enabled and active (was previously
  `disabled` — a latent expiry risk); renewal validated with
  `certbot renew --dry-run`.
- **Verified:** `https://api.tuparea.com/health` → `{"ok":true}`; HTTP→HTTPS
  redirect in place; certificate valid through 2026-09-26.

> **Residual / follow-up:** restricting the origin security group to a CDN
> origin-facing prefix list (SECURITY.md H1 step 2) was **not** applied, because
> the Amplify SSR egress that calls the origin is not a fixed managed prefix.
> Network-level origin lockdown remains tracked in `SECURITY.md`.

---

## H2 — Static shared secret inlined into the frontend build (RESOLVED)

**Severity:** HIGH · **Resolved:** removed from build inlining, rotated, TLS-only.

### Detection
Review of `frontend/next.config.mjs` showed `SERVER_AUTH_SECRET` listed in the
`env:` map. Next.js **inlines** `env:` values into build output. The same secret
is the `X-Server-Auth` header that bypasses the Supabase JWT gate
(`api/src/http/server.ts`), and it was a single, long-lived value transmitted
over HTTP (see H1).

### Root cause
Listing `SERVER_AUTH_SECRET` under `next.config.mjs` `env:` forced it into the
build artifact at build time. Its only consumers were server-only modules
(`src/lib/server/fetchers.ts`, used by RSC / sitemap / OG routes), so it did not
reach the browser bundle — but that containment was one stray `'use client'`
import away from leaking, and the secret was never rotated.

### Analysis
A holder of the secret gets unauthenticated access to every non-`/health` route
from any network. Build-time inlining widened the exposure surface (anyone able
to read build output or a mis-scoped client import would obtain it), and the
plain-HTTP transport (H1) made it sniffable in flight. Static + portable +
cleartext is a full auth-bypass primitive.

### Steps to mitigate
1. Remove `SERVER_AUTH_SECRET` from `next.config.mjs` `env:` so it is read only
   at runtime via `process.env` on the Node server.
2. Rotate the secret on every environment that holds it (EC2 `.env`, Amplify).
3. Keep it out of any client-reachable import path.
4. Transmit it only over TLS (depends on H1).

### Solution implemented
- **next.config.mjs:** `SERVER_AUTH_SECRET` removed from `env:` (only
  `BACKEND_URL` remains); an inline comment documents why. The secret is now
  read at runtime via `process.env` in server-only modules and is never inlined.
- **Rotation:** generated a new value and set it on both the EC2 `.env` and the
  Amplify environment (old value retired). Values are not reproduced here.
- **Transport:** now only sent over `https://api.tuparea.com` (H1).
- **Verified:** frontend production build succeeds (31 pages); the secret does
  not appear in the client bundle; `/_api/health` via the proxy returns `200`.

> **Residual / follow-up:** the long-term fix is to scope the SSG bypass to an
> internal/origin-only network path rather than a portable bearer secret, and to
> move secret storage to SSM Parameter Store / Secrets Manager (SECURITY.md M3).
