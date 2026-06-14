# FanWatch — Feature Inventory

Status of every feature, grouped by the type of user it serves. See
[`PRD.md`](./PRD.md) for the product spec and [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for how it's built.

**Legend:** ✅ Done (built & runnable) · 🟡 Partial / scaffolded · 🔴 Not built (in PRD, no code)

> **Data coverage:** all 30 metros are ingested with rich venue data (hundreds to
> thousands of venues each), in both the local JSONL and the Postgres backend.
> City pages clear the indexation threshold everywhere. **Fan events** are still
> sparse — only a few cities have seed events — so event discovery is thin outside
> those metros even though venue discovery is fully populated.

---

## 1. Fan / End user (consumer)

| Feature | Phase | Status | Where |
|---|---|---|---|
| Location-based discovery (detect location / search by city) | 1 | ✅ | `services/discovery.ts`, `app/page.tsx` |
| Search by zip code / neighborhood | 1 | ✅ | `GET /geocode`, `services/geocode.ts` |
| Nearby venues (bars, pubs, fan parks) — ranked | 1 | ✅ | `GET /venues/nearby` |
| Venue detail (address, distance, match, rating) | 1 | ✅ | `GET /venues/:id`, `VenueDetail.tsx` |
| Interactive map + list view + search radius + directions | 1 | ✅ | `MapView.tsx`, `VenueList.tsx` |
| Team-based filtering (ARG, BRA, ENG, USA, …) | 1 | ✅ | `nearbyVenues` `team` param, `lib/teams.ts` |
| Venue ranking engine (configurable weights) | 1 | ✅ | `ranking/rank.ts`, `config/ranking.ts` |
| Personalized recommendations (team + location) | 1 | ✅ | `GET /recommendations` |
| Match schedules / fixtures | 1 | ✅ | `GET /matches` |
| Nearby fan events / viewing parties | 1 | ✅ | `GET /events/nearby` |
| AI matchday pitch (natural-language) | 3 | 🟡 | Hidden behind `NEXT_PUBLIC_ENABLE_AI_PITCH` (off); kept for future |

## 2. Registered fan (account-gated, Phase 2)

| Feature | Status | Where |
|---|---|---|
| Register / login / bearer auth | ✅ (dev stub) | `POST /auth/register`, `/auth/login`, `GET /me` |
| Fan profiles (view / edit) | ✅ | `GET /users/:id`, `PUT /me/profile` |
| Venue reviews (overlay onto ranking) | ✅ | `/venues/:id/reviews` |
| Venue check-ins | ✅ | `/venues/:id/checkins` |
| Match predictions + leaderboard | ✅ | `/matches/:id/predictions`, `/predictions/leaderboard` |
| Team communities (posts + likes) | ✅ | `/communities/:team/posts`, `/posts/:id/like` |
| Live crowd levels (report + view) | ✅ | `/venues/:id/crowd` |
| Crowd estimation | ✅ | `/venues/:id/crowd/estimate` |
| Fan photos (upload / list) | ✅ | `/venues/:id/photos` |
| Create fan events (user-generated) | ✅ | `POST /events` |
| Referral / rewards program | 🔴 | PRD §9, no code |

## 3. Business / Venue owner (PRD §8)

| Feature | Status | Where |
|---|---|---|
| Create a business account | ✅ | `POST /auth/register` `accountType: "business"` |
| Create a venue listing (shows in watch spots) | ✅ | `POST /business/listings`, `app/business` |
| Multi-team supporter base on a listing | ✅ | `app/business` listing form |
| Post fan events (show in watch spots / map) | ✅ | `POST /events`, `app/business` |
| View my listings | ✅ | `GET /business/listings/mine` |
| Claim an existing (Phase 0) venue | ✅ | `POST /venues/:id/claim` |
| Feature / sponsor a venue (ranking boost) | ✅ | `POST /venues/:id/feature` |
| Premium subscription / billing | 🔴 | PRD §8.2, no payments |
| Banner ads / promotion packages | 🔴 | PRD §8.1, not built |

## 4. Platform admin / operator

| Feature | Status | Where |
|---|---|---|
| Traffic dashboard (KPIs, top pages/cities/teams) | ✅ | `app/admin`, `GET /analytics/summary` |
| Business review (all listings + posted events) | ✅ | `app/admin/business`, `GET /admin/business` |
| First-party pageview beacon | ✅ | `POST /analytics/pageview` |
| Admin gating via `ADMIN_EMAILS` allowlist | ✅ | `requireAdmin` (email-based, no role field) |
| Metro catalog | ✅ | `GET /metros` |

## 5. Data / Ingestion (Phase 0 — infrastructure)

| Feature | Status | Where |
|---|---|---|
| scrape → normalize → geocode → dedup → enrich → score → publish | ✅ | `ingestion/src/pipeline/*` |
| OSM / Overpass venue source | ✅ | `ingestion/src/sources/osm/overpass.ts` |
| Seed fan events (15 cities) + World Cup 2026 fixtures | ✅ | `ingestion/src/seeds/*` |
| JSONL / Excel / Supabase publishers | ✅ | `ingestion/src/publishers/*` |
| Scheduled incremental refresh (GitHub Action) | ✅ | `.github/workflows/ingestion.yml` |
| Data-quality monitoring | ✅ | `ingestion/src/monitoring/quality.ts` |
| Postgres / Supabase backend (storage swap) | ✅ | `api/src/data/pgRepository.ts`, `supabase/migrations/` |

## 6. SEO / Growth (public, unauthenticated)

| Feature | Status | Where |
|---|---|---|
| Programmatic landing pages (`/watch`, `/watch/[city]`, `/watch/[city]/[team]`) | ✅ | `frontend/src/app/watch/` |
| Venue SEO pages + OpenGraph images | ✅ | `app/venue/[city]/[id]/` |
| JSON-LD + sitemap + robots + indexation gates | ✅ | `JsonLd.tsx`, `sitemap.ts`, `robots.ts` |

---

## Caveats

- **Auth is a dev stub** (passwordless, token = user id), not production-grade — swap for Cognito/Auth0/Clerk behind `AuthService`.
- **AI recommendations** scaffold the Claude path (`claude-opus-4-8` via the Anthropic SDK) but it is intentionally not wired in; the UI pitch is hidden behind `NEXT_PUBLIC_ENABLE_AI_PITCH`.
- **Not deployed** — no production domain (`NEXT_PUBLIC_SITE_URL` is a placeholder).
- **Geocoding** uses public OpenStreetMap Nominatim; swap for a self-hosted/commercial geocoder before high volume.
- **Biggest remaining PRD gaps:** payments/subscriptions, banner ads, and the referral/rewards program.

## Admin URLs (local)

- Traffic dashboard — `http://localhost:3000/admin`
- Business review — `http://localhost:3000/admin/business`

Both require the signed-in account's email to be in the API's `ADMIN_EMAILS` allowlist.
