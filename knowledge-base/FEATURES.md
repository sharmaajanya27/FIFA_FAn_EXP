# FanWatch — Feature Inventory

Status of every feature, grouped by the type of user it serves. See
[`PRD.md`](./PRD.md) for the product spec and [`ARCHITECTURE.md`](./ARCHITECTURE.md)
for how it's built.

**Legend:** ✅ Done (built & runnable) · 🟡 Partial / scaffolded · 🔴 Not built (in PRD, no code)

> **Data coverage:** scoped to the **16 FIFA World Cup 2026 host cities** (17 metro
> slugs — NY/NJ spans `new-york` + `jersey-city`). Each host metro is ingested with
> rich venue data (hundreds–thousands of venues) in both local JSONL and Postgres.
> Non-host cities and non-WC teams were removed (`npm run cleanup:host-cities`).
> **Fan events** are curated seeds (~89 across the host metros).

> **v1 product focus:** the live experience is **account-free**. Fans discover
> watch spots and fan events, then RSVP, post a live **vibe** (0–10 energy
> slider), and leave a **review** — all keyed to an anonymous device id, no login.
> Account-gated Phase 2 features (below) are built but **dormant** behind the
> flags in `frontend/src/lib/features.ts`.

---

## 1. Fan / End user (consumer)

| Feature                                                         | Phase | Status | Where                                                              |
| --------------------------------------------------------------- | ----- | ------ | ------------------------------------------------------------------ |
| Location-based discovery (detect location / search by city)     | 1     | ✅     | `services/discovery.ts`, `app/page.tsx`                            |
| Minimal filter surface (city + favorite team + use-my-location) | 1     | ✅     | `app/page.tsx`                                                     |
| Nearby venues (bars, pubs, fan parks) — ranked                  | 1     | ✅     | `GET /venues/nearby`                                               |
| "Watch spots" tab (top-ranked bars & pubs near you)             | 1     | ✅     | `VenueList.tsx`                                                    |
| Venue page (detail + anonymous engagement)                      | 1     | ✅     | `app/venue/[city]/[id]/`, `VenueEngagement.tsx`                    |
| Interactive map + list view + directions                        | 1     | ✅     | `MapView.tsx`, `VenueList.tsx`                                     |
| Team-based filtering (35 WC nations, alphabetical)              | 1     | ✅     | `nearbyVenues` `team` param, `lib/teams.ts`                        |
| Venue ranking engine (configurable weights)                     | 1     | ✅     | `ranking/rank.ts`, `config/ranking.ts`                             |
| Crowd metrics on cards (rating, fans here, energy, makeup)      | 1     | ✅     | `services/venueEngagement.ts` overlay                              |
| Match schedules / fixtures                                      | 1     | ✅     | `GET /matches`                                                     |
| Nearby fan events / viewing parties (team-boosted)              | 1     | ✅     | `GET /events/nearby`                                               |
| Live World Cup 2026 scores ticker (ESPN-backed)                 | 1     | ✅     | `GET /live/events`, `LiveEventsPanel.tsx`                          |
| AI matchday pitch (natural-language)                            | 3     | 🟡     | Hidden behind `NEXT_PUBLIC_ENABLE_AI_PITCH` (off); kept for future |

## 1b. Anonymous engagement (v1 — no login, device-scoped id)

| Feature                                                  | Status | Where                                                      |
| -------------------------------------------------------- | ------ | ---------------------------------------------------------- | ----------------- |
| Fan-event RSVP ("I'm going" + favorite team)             | ✅     | `POST /events/:id/rsvp`, `EventEngagement.tsx`             |
| Watch-spot presence ("I'm here" + favorite team)         | ✅     | `POST /venues/:id/presence`, `VenueEngagement.tsx`         |
| Live **vibe** energy meter (0–10 slider)                 | ✅     | `POST /events                                              | venues/:id/vibes` |
| Anonymous reviews (1–5 + comment)                        | ✅     | `POST /events/:id/reviews`, `POST /venues/:id/fan-reviews` |
| "Who's here / going" + dominant-team crowd makeup        | ✅     | presence/RSVP team tallies                                 |
| Reviews feed ranking (static score) + live buzz boost    | ✅     | `config/ranking.ts` `buzz` weight, overlay                 |
| Device identity (localStorage anon id + remembered team) | ✅     | `frontend/src/lib/anon.ts`                                 |

## 2. Registered fan (account-gated, Phase 2 — **dormant** behind feature flags)

> Built and runnable, but hidden in v1 (`features.ts`: `auth`/`community`/
> `engagement`/`business` = false). The anonymous engagement above is the live
> path. Flip a flag to re-enable any of these without re-implementing them.

| Feature                              | Status        | Where                                                  |
| ------------------------------------ | ------------- | ------------------------------------------------------ |
| Register / login / bearer auth       | ✅ (dev stub) | `POST /auth/register`, `/auth/login`, `GET /me`        |
| Fan profiles (view / edit)           | ✅            | `GET /users/:id`, `PUT /me/profile`                    |
| Venue reviews (overlay onto ranking) | ✅            | `/venues/:id/reviews`                                  |
| Venue check-ins                      | ✅            | `/venues/:id/checkins`                                 |
| Match predictions + leaderboard      | ✅            | `/matches/:id/predictions`, `/predictions/leaderboard` |
| Team communities (posts + likes)     | ✅            | `/communities/:team/posts`, `/posts/:id/like`          |
| Live crowd levels (report + view)    | ✅            | `/venues/:id/crowd`                                    |
| Crowd estimation                     | ✅            | `/venues/:id/crowd/estimate`                           |
| Fan photos (upload / list)           | ✅            | `/venues/:id/photos`                                   |
| Create fan events (user-generated)   | ✅            | `POST /events`                                         |
| Referral / rewards program           | 🔴            | PRD §9, no code                                        |

## 3. Business / Venue owner (PRD §8)

| Feature                                       | Status | Where                                           |
| --------------------------------------------- | ------ | ----------------------------------------------- |
| Create a business account                     | ✅     | `POST /auth/register` `accountType: "business"` |
| Create a venue listing (shows in watch spots) | ✅     | `POST /business/listings`, `app/business`       |
| Multi-team supporter base on a listing        | ✅     | `app/business` listing form                     |
| Post fan events (show in watch spots / map)   | ✅     | `POST /events`, `app/business`                  |
| View my listings                              | ✅     | `GET /business/listings/mine`                   |
| Claim an existing (Phase 0) venue             | ✅     | `POST /venues/:id/claim`                        |
| Feature / sponsor a venue (ranking boost)     | ✅     | `POST /venues/:id/feature`                      |
| Premium subscription / billing                | 🔴     | PRD §8.2, no payments                           |
| Banner ads / promotion packages               | 🔴     | PRD §8.1, not built                             |

## 4. Platform admin / operator

| Feature                                          | Status | Where                                       |
| ------------------------------------------------ | ------ | ------------------------------------------- |
| Traffic dashboard (KPIs, top pages/cities/teams) | ✅     | `app/admin`, `GET /analytics/summary`       |
| Business review (all listings + posted events)   | ✅     | `app/admin/business`, `GET /admin/business` |
| First-party pageview beacon                      | ✅     | `POST /analytics/pageview`                  |
| Admin gating via `ADMIN_EMAILS` allowlist        | ✅     | `requireAdmin` (email-based, no role field) |
| Metro catalog                                    | ✅     | `GET /metros`                               |

## 5. Data / Ingestion (Phase 0 — infrastructure)

| Feature                                                         | Status | Where                                                  |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| scrape → normalize → geocode → dedup → enrich → score → publish | ✅     | `ingestion/src/pipeline/*`                             |
| OSM / Overpass venue source                                     | ✅     | `ingestion/src/sources/osm/overpass.ts`                |
| Seed fan events (host cities) + World Cup 2026 fixtures         | ✅     | `ingestion/src/seeds/*`                                |
| JSONL / Excel / Supabase publishers                             | ✅     | `ingestion/src/publishers/*`                           |
| Scheduled incremental refresh (GitHub Action)                   | ✅     | `.github/workflows/ingestion.yml`                      |
| Data-quality monitoring                                         | ✅     | `ingestion/src/monitoring/quality.ts`                  |
| Postgres / Supabase backend (storage swap)                      | ✅     | `api/src/data/pgRepository.ts`, `supabase/migrations/` |

## 6. SEO / Growth (public, unauthenticated)

| Feature                                                                        | Status | Where                                   |
| ------------------------------------------------------------------------------ | ------ | --------------------------------------- |
| Programmatic landing pages (`/watch`, `/watch/[city]`, `/watch/[city]/[team]`) | ✅     | `frontend/src/app/watch/`               |
| Venue SEO pages + OpenGraph images                                             | ✅     | `app/venue/[city]/[id]/`                |
| JSON-LD + sitemap + robots + indexation gates                                  | ✅     | `JsonLd.tsx`, `sitemap.ts`, `robots.ts` |

---

## Caveats

- **v1 is account-free** — the live engagement (RSVP/presence, vibe slider,
  reviews) uses a device-scoped anonymous id, not accounts. The account-gated
  Phase 2 features are dormant behind `features.ts` flags.
- **Scope** — data is restricted to the 16 World Cup 2026 host cities and the 35
  participating nations; live scores show **only** FIFA World Cup matches.
- **Auth is a dev stub** (passwordless, token = user id), not production-grade — swap for Cognito/Auth0/Clerk behind `AuthService`.
- **AI recommendations** scaffold the Claude path (`claude-opus-4-8` via the Anthropic SDK) but it is intentionally not wired in; the UI pitch is hidden behind `NEXT_PUBLIC_ENABLE_AI_PITCH`.
- **Not deployed** — no production domain (`NEXT_PUBLIC_SITE_URL` is a placeholder).
- **Geocoding** uses public OpenStreetMap Nominatim; swap for a self-hosted/commercial geocoder before high volume.
- **Biggest remaining PRD gaps:** payments/subscriptions, banner ads, and the referral/rewards program.

## Admin URLs (local)

- Traffic dashboard — `http://localhost:3000/admin`
- Business review — `http://localhost:3000/admin/business`

Both require the signed-in account's email to be in the API's `ADMIN_EMAILS` allowlist.
