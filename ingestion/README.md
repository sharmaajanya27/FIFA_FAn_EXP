# FanMatch — Ingestion (Phase 0)

The data aggregation layer. Scrapes and ingests the raw inventory that powers
discovery, rankings, and recommendations (see [`../PRD.md`](../PRD.md) §5 and
[`../WORKFLOW.md`](../WORKFLOW.md) §3).

**Stack:** Node.js + TypeScript (ESM), designed to run as an AWS Lambda later.

## Pipeline

```
Collect → Normalize → Geocode → Dedup → Publish
```

| Stage | File | What it does |
|-------|------|--------------|
| Collect | `src/sources/osm/overpass.ts` | Pull raw venues from a source (OSM/Overpass first) |
| Normalize | `src/pipeline/normalize.ts` | Map raw records → canonical `Venue` |
| Geocode | `src/pipeline/geocode.ts` | Ensure every venue has a valid geo point |
| Dedup | `src/pipeline/dedup.ts` | Merge the same venue across sources (geohash + name) |
| Publish | `src/publishers/*` | JSONL (source of truth) + Excel (review report) |

_Enrich_ and _Score_ stages (PRD §5.3.5–6) have seams reserved and land as
enrichment sources come online.

## Design seams (pluggable per PRD §5.4)

- **Sources** implement `SourceConnector` (`src/sources/types.ts`).
- **Publish targets** implement `Publisher` (`src/publishers/types.ts`). Today:
  JSONL + Excel to local disk. Later: Aurora Serverless v2 + PostGIS (or
  DynamoDB + geohash) — add a publisher, don't touch the scraper.
- **Cities** are config only (`src/config/cities.ts`) — add a slug + bbox.

## Usage

```bash
npm install
cp .env.example .env          # optional — defaults work out of the box
npm run ingest -- jersey-city # one city
npm run ingest -- all         # every configured city
npm run typecheck             # tsc --noEmit
```

Output lands in `data/<city>/`:

- `venues.jsonl` — canonical records, one per line (**source of truth**)
- `venues.xlsx` — human-review report

`data/` is git-ignored (generated artifacts, not source).

## Source etiquette

Overpass is a free public endpoint. We send a contact `User-Agent` and throttle
between requests (`OVERPASS_THROTTLE_MS`). Respect OSM's fair-use policy; for
heavy runs point `OVERPASS_URL` at a self-hosted instance.
