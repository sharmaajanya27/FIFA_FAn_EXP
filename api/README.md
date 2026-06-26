# FanWatch — API (Phase 1)

The discovery backend. Serves venue discovery, location/team search, ranking,
and recommendations over the dataset produced by Phase 0 ingestion (see
[`../PRD.md`](../PRD.md) §6).

**Stack:** Node.js + TypeScript (ESM). Handlers are transport-agnostic, designed
to run behind **API Gateway → AWS Lambda**; a local HTTP server drives them in
dev.

## Architecture

```
HTTP / API Gateway → Handler → Service → Repository → Phase 0 JSONL
                                  ↳ Ranking engine (query-time)
```

| Layer      | File(s)                  | Role                                                  |
| ---------- | ------------------------ | ----------------------------------------------------- |
| Handlers   | `src/handlers/index.ts`  | Lambda-style request → response, validation           |
| Services   | `src/services/*`         | Discovery + recommendations orchestration             |
| Ranking    | `src/ranking/rank.ts`    | Query-time score (distance + team-fan-match)          |
| Repository | `src/data/repository.ts` | Loads venues/matches/events; swap for Aurora/S3       |
| Transport  | `src/http/server.ts`     | Local dev server (replaced by Lambda adapter in prod) |

### Ranking (PRD §6.5)

The full venue score blends static (precomputed) and query-time signals:

```
Venue Score = 50% content      ← venue-type prior + showsMatches ("is this a watch spot?")
            + 20% static       ← precomputed venue.score (ratings/attendance/engagement)
            + 15% team-fan-match + 10% distance   ← query-time (user team + location)
            + 10% buzz          ← live: fans "here" now + recent vibe energy (0–10 slider)
```

Weights live in `src/config/ranking.ts` and are renormalized per query
(team-fan-match only counts when the user picked a team). Anonymous **reviews**
blend community consensus into the `static` score and **vibes/presence** drive
the `buzz` term — both via the `VenueEngagementService` discovery overlay, so
user engagement genuinely moves ranking.

## Endpoints

| Method | Path                  | Query                                   | Purpose                                                     |
| ------ | --------------------- | --------------------------------------- | ----------------------------------------------------------- |
| GET    | `/health`             | —                                       | Liveness                                                    |
| GET    | `/cities`             | —                                       | Ingested cities                                             |
| GET    | `/geocode`            | `q[,city]`                              | Resolve a zip/neighborhood/address to a point (city-biased) |
| GET    | `/venues/nearby`      | `city,lat,lon[,radius,team,kind,limit]` | Ranked nearby venues                                        |
| GET    | `/venues/:id`         | `city`                                  | Venue detail                                                |
| GET    | `/matches`            | `city[,team]`                           | Fixtures                                                    |
| GET    | `/events/nearby`      | `city,lat,lon[,radius,team]`            | Fan events near a point                                     |
| GET    | `/recommendations`    | `city,lat,lon,team[,radius,limit]`      | Personalized venue recs                                     |
| GET    | `/ai/recommendations` | `city,lat,lon,team[,radius,limit,mode]` | Matchday pitch (Phase 3)                                    |
| GET    | `/live/events`        | —                                       | Live + upcoming FIFA World Cup 2026 scores (ESPN-backed)    |

### Anonymous fan engagement (v1 — no login)

The live engagement path is account-free: each request carries a device-scoped
`anonId` (random id in the browser's localStorage), not a user account. Covers
three interactions on both **fan events** and **watch spots** (venues):

| Method   | Path                                     | Body / query                            | Purpose                              |
| -------- | ---------------------------------------- | --------------------------------------- | ------------------------------------ |
| GET      | `/events/:id`                            | `[anonId]`                              | Event detail + RSVP/review summaries |
| POST/GET | `/events/:id/rsvp` · `/events/:id/rsvps` | `anonId[,going,favoriteTeam]`           | "I'm going" + who's going            |
| POST/GET | `/events/:id/vibes`                      | `anonId,intensity(0–10)[,favoriteTeam]` | Live energy pulse + feed             |
| POST/GET | `/events/:id/reviews`                    | `anonId,rating(1–5)[,comment,team]`     | Anonymous review                     |
| POST/GET | `/venues/:id/presence`                   | `anonId[,here,favoriteTeam]`            | "I'm here" + who's here              |
| POST/GET | `/venues/:id/vibes`                      | `anonId,intensity(0–10)[,favoriteTeam]` | Live energy pulse + feed             |
| POST/GET | `/venues/:id/fan-reviews`                | `anonId,rating(1–5)[,comment,team]`     | Anonymous review                     |

All persist via the same `Store` seam (local JSON in dev, Supabase `engagement`
table in prod). Reviews feed the `static` ranking score; presence + vibe energy
feed the `buzz` term.

### Live sporting events (`/live/events`)

A public, read-only ticker. [`LiveEventsService`](./src/services/liveEvents.ts)
fetches ESPN's public scoreboard JSON for the **FIFA World Cup** only,
normalizes each game to a stable `LiveEvent` shape, and sorts live games first.
The fetch is server-side (no browser CORS, upstream shape hidden behind our
contract); a failing fetch is skipped, never fatal.

> **⚠️ Production:** ESPN's endpoint is **unofficial, undocumented, and
> rate-limited** — great for local/demo, not SLA-grade. Before launch, swap to a
> licensed provider (football-data.org / Sportradar / API-Football, keyed via
> the config seam) or add a short-TTL cache + graceful fallback. Only
> `liveEvents.ts` changes. See [`ARCHITECTURE.md`](../ARCHITECTURE.md) §2.6.

### Matchday recommendations (Phase 3)

`/ai/recommendations` returns the same data as `/recommendations` plus a
natural-language `aiSummary`. **Default `mode=smart`** returns a deterministic
pitch (`aiStatus: "available"`). `mode=ai` is reserved for the Claude-backed
workflow and currently returns `aiStatus: "coming_soon"` with the smart picks
as a placeholder — the Claude path (`claude-opus-4-8` via the Anthropic SDK,
`ANTHROPIC_API_KEY` / `AI_MODEL`) is scaffolded but intentionally not wired in
yet.

### Phase 2 — account-gated engagement (dormant in v1)

> The v1 live path is the **anonymous** engagement above. These account-gated
> write APIs are built but hidden behind the frontend `features.ts` flags. Writes
> go through a pluggable JSON store (`src/store`, swap for Postgres/DynamoDB).

**Request-level auth:** All requests (except `/health`) must carry a valid
`X-Supabase-Auth` JWT header — an anonymous session token issued by Supabase
Auth (ES256, verified via JWKS). Set `SUPABASE_URL` in `.env` to enable.

**User-level auth (dev stub):** Engagement writes use a `Bearer fmtok_<userId>`
token via `Authorization` header. This identifies which user is posting a review
or checking in. Will be replaced by Supabase Auth user sessions when user
accounts launch.

| Method   | Path                                                    | Auth    | Purpose                    |
| -------- | ------------------------------------------------------- | ------- | -------------------------- |
| POST     | `/auth/register` · `/auth/login`                        | —       | Get a bearer token         |
| GET      | `/me`                                                   | ✓       | Current user               |
| GET/PUT  | `/users/:id` · `/me/profile`                            | ✓(PUT)  | Fan profiles               |
| POST/GET | `/venues/:id/reviews`                                   | ✓(POST) | Reviews (+ rating overlay) |
| POST/GET | `/venues/:id/checkins`                                  | ✓(POST) | Check-ins                  |
| POST/GET | `/venues/:id/crowd`                                     | ✓(POST) | Live crowd level           |
| POST/GET | `/venues/:id/photos`                                    | ✓(POST) | Fan photos                 |
| POST/GET | `/matches/:id/predictions` · `/predictions/leaderboard` | ✓(POST) | Predictions                |
| POST/GET | `/communities/:team/posts` · `/posts/:id/like`          | ✓(POST) | Team communities           |

### Business accounts (§8)

Register with `accountType: "business"` (+ `businessName`) to get the owner
surfaces. Business-submitted venue listings are merged into discovery, so they
appear in the ranked watch-spots list and on the map alongside Phase 0 venues.
Owners post fan events through the existing `POST /events`. Platform admins
review all of it at the admin-gated summary (frontend `/admin/business`).

| Method | Path                      | Auth     | Purpose                                       |
| ------ | ------------------------- | -------- | --------------------------------------------- |
| POST   | `/business/listings`      | business | Create a venue listing (shows in watch spots) |
| GET    | `/business/listings/mine` | ✓        | The signed-in business's listings             |
| GET    | `/admin/business`         | admin    | All business listings + posted events         |

### Traffic analytics (first-party)

A lightweight, dependency-free pageview pipeline that powers the frontend
`/admin` dashboard. Events are appended one-per-line to
`<DATA_DIR>/analytics/<YYYY-MM-DD>.jsonl` (append-only, not the JSON store —
which rewrites whole files and wouldn't scale to pageview volume). Summaries are
aggregated in memory from the recent day-files with a ~60s cache.

| Method | Path                  | Auth  | Purpose                                                                         |
| ------ | --------------------- | ----- | ------------------------------------------------------------------------------- |
| POST   | `/analytics/pageview` | —     | Record a pageview (public beacon)                                               |
| GET    | `/analytics/summary`  | admin | KPIs + top pages/cities/teams/referrers + daily series; `?range=today\|7d\|30d` |

**Admin gating:** `/analytics/summary` requires a bearer token whose email is in
the `ADMIN_EMAILS` allowlist (comma-separated, case-insensitive). There is no
role field — `requireAdmin` checks the email. Unset `ADMIN_EMAILS` → no admin
access. See `.env.example`.

## Usage

```bash
npm install
npm run dev        # tsx watch, hot reload (default :3001)
npm run typecheck

# Example (Jersey City, near downtown, Argentina fan):
curl "http://localhost:3001/venues/nearby?city=jersey-city&lat=40.72&lon=-74.04&radius=3000&limit=5"
curl "http://localhost:3001/recommendations?city=jersey-city&lat=40.72&lon=-74.04&team=ARG"
```

By default the API reads `../ingestion/data` (Phase 0 output). Override with the
`DATA_DIR` env var. Run the Phase 0 ingestion first so there's data to serve.
