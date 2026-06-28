# FanWatch — Ingestion (Phase 0)

The data aggregation layer. Scrapes and ingests the raw inventory that powers
discovery, rankings, and recommendations (see [`../knowledge-base/PRD.md`](../knowledge-base/PRD.md) §5 and
[`../knowledge-base/WORKFLOW.md`](../knowledge-base/WORKFLOW.md) §3).

**Stack:** Node.js + TypeScript (ESM), designed to run as an AWS Lambda later.

## Pipeline (full Phase 0)

```
Collect → Normalize → Geocode → Dedup → Enrich → Score → Publish
                                                      ↳ Quality monitor + Manifest
```

| Stage | File | What it does |
|-------|------|--------------|
| Collect | `src/sources/**` | Pull raw records per source (venues, fixtures, events) |
| Normalize | `src/pipeline/normalize.ts` | Map raw records → canonical `Venue` / `Match` / `Event` |
| Geocode | `src/pipeline/geocode.ts` | Ensure every venue has a valid geo point |
| Dedup | `src/pipeline/dedup.ts` | Merge the same venue across sources (geohash + name) |
| Enrich | `src/pipeline/enrich.ts` | Team affiliation on venues; link events → matches |
| Score | `src/pipeline/score.ts` | Precompute static venue score (configurable weights) |
| Publish | `src/publishers/*` | JSONL (source of truth) + Excel (review report) |
| Monitor | `src/monitoring/quality.ts` | Per-run coverage / geocode / dedup / freshness report |
| Refresh | `src/refresh/manifest.ts` | `lastScrapedAt` per source for incremental refresh |

### Entities & sources

| Entity | Connector | Source (default) | Production source |
|--------|-----------|------------------|-------------------|
| `Venue` | `sources/osm/overpass.ts` | OpenStreetMap / Overpass (live, no key) | + Google Places (key) for ratings/photos |
| `Match` | `sources/fixtures/fixtures.ts` | bundled seed; `FIXTURES_URL` for live | football-data.org / OpenFootball (key) |
| `Event` | `sources/events/seedEvents.ts` | per-city seed file | Eventbrite / Meetup (key) |

The seed sources keep the pipeline real, deterministic, and offline-runnable.
Keyed live sources implement the **same connector interface** and drop in
without touching the rest of the pipeline.

### Ranking weights are configurable (PRD §6.5)

`src/config/scoring.json` holds the weights — tune them **without a code
deploy**. `static` signals (rating, attendance, engagement) are precomputed
here; `queryTime` signals (distance, team-fan-match) are applied at discovery
time in Phase 1 because they depend on the requesting user.

## Design seams (pluggable per PRD §5.4)

- **Sources** implement `SourceConnector` / `MatchConnector` / `EventConnector`
  (`src/sources/types.ts`).
- **Publish targets** implement `Publisher` (`src/publishers/types.ts`). Today:
  JSONL + Excel to local disk. Later: Aurora Serverless v2 + PostGIS (or
  DynamoDB + geohash) — add a publisher, don't touch the scraper.
- **Cities** are config only (`src/config/cities.ts`) — add a slug + bbox.
- **Teams** are config only (`src/config/teams.ts`).

## Usage

```bash
npm install
cp .env.example .env          # optional — defaults work out of the box
npm run ingest -- jersey-city # one city
npm run ingest -- all         # every configured city
npm run typecheck             # tsc --noEmit
```

Output lands in `data/<city>/`:

- `venues.jsonl` / `matches.jsonl` / `events.jsonl` — canonical records (**source of truth**)
- `venues.xlsx` / `matches.xlsx` / `events.xlsx` — human-review reports
- `quality.json` — data-quality metrics for the run

…plus `data/manifest.json` tracking `lastScrapedAt` per source for incremental
refresh. `data/` is git-ignored (generated artifacts, not source).

## Source etiquette

Overpass is a free public endpoint. We send a contact `User-Agent` and throttle
between requests (`OVERPASS_THROTTLE_MS`). Respect OSM's fair-use policy; for
heavy runs point `OVERPASS_URL` at a self-hosted instance.
