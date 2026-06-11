# FanMatch — API (Phase 1)

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

| Layer | File(s) | Role |
|-------|---------|------|
| Handlers | `src/handlers/index.ts` | Lambda-style request → response, validation |
| Services | `src/services/*` | Discovery + recommendations orchestration |
| Ranking | `src/ranking/rank.ts` | Query-time score (distance + team-fan-match) |
| Repository | `src/data/repository.ts` | Loads venues/matches/events; swap for Aurora/S3 |
| Transport | `src/http/server.ts` | Local dev server (replaced by Lambda adapter in prod) |

### Ranking (PRD §6.5)

The full venue score is split across phases:

```
Venue Score = 30% ratings + 25% attendance + 20% engagement   ← static, precomputed in Phase 0
            + 15% team-fan-match + 10% distance                ← query-time, computed here
```

The static 0.75 portion is read from `venue.score`; this service adds the
user-relative signals and renormalizes (team-fan-match only counts when the
user picked a team). Weights live in `src/config/ranking.ts`, mirroring the
ingestion `scoring.json`.

## Endpoints

| Method | Path | Query | Purpose |
|--------|------|-------|---------|
| GET | `/health` | — | Liveness |
| GET | `/cities` | — | Ingested cities |
| GET | `/venues/nearby` | `city,lat,lon[,radius,team,kind,limit]` | Ranked nearby venues |
| GET | `/venues/:id` | `city` | Venue detail |
| GET | `/matches` | `city[,team]` | Fixtures |
| GET | `/events/nearby` | `city,lat,lon[,radius,team]` | Fan events near a point |
| GET | `/recommendations` | `city,lat,lon,team[,radius,limit]` | Personalized venue recs |

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
