# FanWatch — Web App (Phase 1)

The fan-facing web app: location-based discovery, interactive map + list,
team filtering, venue rankings, and recommendations (PRD §6). Consumes the
Phase 1 discovery API.

**Stack:** Next.js 14 (App Router) + React 18 + TypeScript. Map via
**Leaflet + OpenStreetMap tiles** (free, no API key). Directions via Google
Maps URL (no SDK/key).

## Features (PRD §6)

- **§6.1 Location discovery** — pick a city or use browser geolocation; radius slider
- **§6.2 Venue listings** — name, distance, hours, supporters, rating, match score
- **§6.3 Interactive map** — markers + search-radius circle, map/list toggle, directions links
- **§6.4 Team filtering** — filter venues by supporter base
- **§6.5 Ranking** — venues ordered by the API's final score (static + distance + team-fan-match)
- **§6.6 Recommendations** — personalized top venues + upcoming fixtures for your team

## Phase 2 — engagement (PRD §7)

- **Accounts** — inline sign up / log in (dev-stub auth), favorite team on signup
- **Venue detail drawer** — reviews (feed the ranking), check-ins, live crowd reporting, fan-photo upload
- **Predictions** — predict fixture scorelines + leaderboard
- **Team communities** — per-team feed with posts and likes

All engagement writes require login; the bearer token is kept in `localStorage`.

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

Open http://localhost:3000. Configure the API base with
`NEXT_PUBLIC_API_BASE` (see `.env.local.example`).

```bash
npm run typecheck
npm run build
```
