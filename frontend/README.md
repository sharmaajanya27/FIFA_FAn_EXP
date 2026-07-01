# FanWatch — Web App (Phase 1)

The fan-facing web app: location-based discovery, interactive map + list,
team filtering, venue rankings, and recommendations (PRD §6). Consumes the
Phase 1 discovery API.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript. Map via
**Leaflet + OpenStreetMap tiles** (free, no API key). Directions via Google
Maps URL (no SDK/key). Request auth via **Supabase Anonymous Auth** (JWKS).

## Features (PRD §6)

- **§6.1 Location discovery** — pick a city or use browser geolocation; radius slider
- **§6.2 Venue listings** — name, distance, hours, supporters, rating, match score
- **§6.3 Interactive map** — markers + search-radius circle, map/list toggle, directions links
- **§6.4 Team filtering** — filter venues by supporter base
- **§6.5 Ranking** — venues ordered by the API's final score (static + distance + team-fan-match)
- **§6.6 Recommendations** — personalized top venues + upcoming fixtures for your team

## Phase 2 — engagement (PRD §7)

- **Venue detail drawer** — reviews, check-ins, live crowd reporting, fan-photo upload
- **Predictions** — predict fixture scorelines + leaderboard
- **Team communities** — per-team feed with posts and likes

Engagement writes use a dev-stub bearer token (`fmtok_<userId>`). Request-level
auth (proving the request comes from this app) is handled by Supabase Anonymous
Auth — every visitor automatically gets a signed JWT without login, attached as
`X-Supabase-Auth` on every API call.

## SEO landing pages (programmatic, server-rendered)

Beyond the single client-rendered app at `/`, the following routes are
**server-rendered + ISR-cached** (`revalidate=3600`) so they're indexable and
fast. Built from the city/team registries and the discovery API.

| Route | Targets | Structured data |
|-------|---------|-----------------|
| `/watch` | "world cup watch parties" hub | WebSite, ItemList, FAQ |
| `/watch/[city]` | "where to watch the World Cup in {city}" | Breadcrumb, ItemList, FAQ |
| `/watch/[city]/[team]` | "watch {team} in {city}" | Breadcrumb, ItemList, FAQ |
| `/venue/[city]/[id]` | venue detail + long-tail | LocalBusiness (geo, rating) |

The venue route is `/venue/[city]/[id]` because the API partitions venue data
per-city. Each page emits canonical URLs, OpenGraph/Twitter tags, a **dynamic OG
share-image** (`next/og`), and JSON-LD. `sitemap.ts` and `robots.ts` are
generated; the homepage hydrates `?city=`/`?team=` deep-links from the SEO pages.

**Indexation gates** (thin pages get `noindex` + are dropped from the sitemap):
city ≥3 venues, city×team ≥3 team-tagged venues, venue needs address +
rating/website.

Set `NEXT_PUBLIC_SITE_URL` to the absolute origin (canonical/OG/sitemap) — see
`.env.local.example`.

## Traffic analytics + admin dashboard

A pageview beacon (`components/Analytics.tsx`, mounted in the root layout) posts
to the API on each route change. The **`/admin`** dashboard (client-rendered,
`noindex`) reads the admin-only summary and shows KPIs, a daily-trend chart, and
top pages/cities/teams/referrers. Access requires logging in with an account
whose email is in the API's `ADMIN_EMAILS` allowlist.

## Run

The app needs the discovery API running (default `http://localhost:3001`) with
Phase 0 data ingested. From the repo root, in three terminals:

```bash
# 1. ingest data (once)
cd ingestion && npm install && npm run ingest -- jersey-city

# 2. discovery API
cd api && npm install && npm run dev        # :3001

# 3. web app
cd frontend && npm install && npm run dev    # :3000
```

Open http://localhost:3000. The browser always calls the same-origin `/_api`
proxy; configure the server-side API target with `BACKEND_URL` (see
`.env.local.example`).

```bash
npm run typecheck
npm run build
```

## Design system — "The Fan Festival"

The UI uses an editorial broadsheet theme (warm paper canvas, sticky masthead,
bunting, a five-hue festival palette, Anton/Archivo/Newsreader type). The home
page is organized as a three-tab programme: **Crews** (hero + headliner +
map/lineup), **Fixtures** (live scores + fan events), **My Team** (community).

- **Tokens** live in `:root` in `src/app/globals.css`; the SEO and admin CSS
  modules consume them, so token changes propagate. Note the **two-tier
  palette**: vivid `--c1…--c5` are decorative-only (bunting), while readable
  colored text uses the **AA-safe** `--c*-text` / `--accent-text` tokens.
- **Fonts** are self-hosted via `next/font` in `src/app/layout.tsx`.
- **Helpers** for festival presentation (rank colors, category labels,
  capacity) are in `src/lib/festival.ts`; components in `src/components/festival/`.
- **Accessibility** is a release gate (landmarks, one `<h1>`/page, skip links,
  `aria-pressed` toggles, reduced-motion, AA contrast on every color pair).

> Full changelog — replaced files, a11y/SEO details — is in
> [`../knowledge-base/REDESIGN.md`](../knowledge-base/REDESIGN.md).
