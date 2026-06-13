# Data Sources — what we scrape, from where, and how

This document is the provenance reference for the FanWatch ingestion layer: for
every entity we ingest, **where** the data comes from, **how** it is fetched,
and **what** fields we extract. It complements [`README.md`](README.md) (pipeline
overview) and [`../PRD.md`](../PRD.md) §5.

Every record carries a `source` block (`name`, `type`, `scrapedAt`, `externalId`,
and a back-link `url` where available), so provenance and freshness are tracked
end-to-end. The per-run `data/manifest.json` records `lastScrapedAt` per
(source, city) for incremental refresh.

## Summary

| Entity   | Connector                       | Source (default)                          | How it's fetched                | Production source (drop-in) |
|----------|---------------------------------|-------------------------------------------|---------------------------------|-----------------------------|
| `Venue`  | `src/sources/osm/overpass.ts`   | OpenStreetMap via the Overpass API (live) | HTTP POST per city bbox, no key | + Google Places (key) for ratings/photos |
| `Match`  | `src/sources/fixtures/fixtures.ts` | Bundled World Cup 2026 seed JSON       | Local file (or `FIXTURES_URL`)  | football-data.org / OpenFootball (key) |
| `Event`  | `src/sources/events/seedEvents.ts` | Per-city curated seed JSON             | Local file                      | Eventbrite / Meetup (key)   |

The seed sources keep the pipeline real, deterministic, and offline-runnable.
Keyed live sources implement the **same connector interface**
(`src/sources/types.ts`) and drop in without touching the rest of the pipeline.

---

## 1. Venues — OpenStreetMap / Overpass API

**Connector:** `src/sources/osm/overpass.ts` (`OverpassConnector`, id `osm-overpass`)

### Where
- **Endpoint:** `https://overpass-api.de/api/interpreter` (configurable via
  `OVERPASS_URL`; e.g. `https://overpass.kumi.systems/api/interpreter` or a
  self-hosted instance for heavy runs).
- **Data origin:** OpenStreetMap, the crowd-sourced world map. Free, **no API
  key required**.
- **License:** OSM data is © OpenStreetMap contributors, ODbL. Each venue keeps
  a back-link to `https://www.openstreetmap.org/<type>/<id>`.

### How
- For each configured city we build the list of bounding boxes to scrape — the
  downtown `bbox` plus any stadium anchor `bbox` (suburban stadiums like Levi's
  or Gillette) — from `src/config/cities.ts` (`scrapeBboxes`).
- We **POST** an Overpass QL query per bbox (`Content-Type:
  application/x-www-form-urlencoded`, body `data=<query>`). The query:

  ```overpassql
  [out:json][timeout:60];
  (
    node["amenity"~"^(bar|pub|restaurant|cafe)$"](<s,w,n,e>);
    way ["amenity"~"^(bar|pub|restaurant|cafe)$"](<s,w,n,e>);
  );
  out center tags;
  ```

  `out center` resolves a representative lat/lon for ways/relations too.
- **Source etiquette:** we send a contact `User-Agent` (`INGEST_USER_AGENT`) and
  throttle between requests (`OVERPASS_THROTTLE_MS`, default 1500 ms) per OSM
  fair-use policy.
- **Resilience:** `fetchWithRetry` retries transient failures (406 / 429 / 5xx)
  up to 4 attempts with exponential backoff; client errors (e.g. 400) fail fast.
- Elements without a usable point **or** without a `name` tag are skipped.
  Duplicates across overlapping bboxes are de-duped by OSM id at collect time,
  and near-duplicates are merged later in the dedup pipeline stage.

### What we extract
Mapped to the canonical `Venue` in `src/pipeline/normalize.ts`:

| Canonical field   | From OSM                                                  |
|-------------------|-----------------------------------------------------------|
| `id`              | `sha1("osm-overpass:<type>/<id>")` (first 16 hex chars)   |
| `name`            | `tags.name` (required — no name → dropped)                |
| `kind`            | `tags.amenity` → bar / pub / restaurant / cafe / other    |
| `geo`             | `lat`/`lon` (node) or `center` (way/relation)             |
| `geohash`         | derived from `geo`                                         |
| `address`         | assembled from `addr:housenumber/street/city/postcode`    |
| `city` / `country`| `addr:city` (fallback city name) / city config            |
| `phone`           | `tags.phone` or `tags["contact:phone"]`                   |
| `website`         | `tags.website` or `tags["contact:website"]` (URL-validated)|
| `hours`           | `tags.opening_hours`                                      |
| `showsMatches`    | heuristic 0–1 from `sport`, `tv`, kind, name/brand keywords, known sports-bar brands |
| `supportsTeams`   | inferred from venue name in the enrich stage              |
| `sources`         | provenance block (incl. OSM back-link URL)                |

`ratingAvg`, `capacity`, and engagement fields are wired in the canonical model
but stay empty until a keyed places/social source lands.

---

## 2. Matches — bundled fixtures seed (World Cup 2026)

**Connector:** `src/sources/fixtures/fixtures.ts` (`FixturesConnector`, id `fixtures-seed`)

### Where
- **Default:** bundled open-data seed `src/seeds/matches.worldcup-2026.json`
  (competition `FIFA World Cup 2026`; group-stage through final fixtures).
- **Optional live:** set `FIXTURES_URL` to fetch a remote JSON in the same shape
  first (this is the seam for a keyed live source such as football-data.org or
  an OpenFootball mirror); it **falls back to the seed** on any failure or empty
  payload.

### How
- Local seed: read from disk and JSON-parsed (deterministic, offline).
- Remote: `fetch(FIXTURES_URL)` with the contact `User-Agent`; non-OK responses
  or empty `matches` arrays log a warning and fall back to the seed.
- Fixtures are **city-agnostic** — collected once per run, not per city.

### What we extract
Mapped to canonical `Match` (`normalizeMatches`). Each fixture provides
`externalId`, `homeTeam`, `awayTeam`, `kickoff`, and `stage`. Team codes are
validated against `src/config/teams.ts` — fixtures with an unknown team code are
dropped.

---

## 3. Events — per-city curated seed

**Connector:** `src/sources/events/seedEvents.ts` (`SeedEventsConnector`, id `events-seed`)

### Where
- **Default:** per-city seed file `src/seeds/events.<city-slug>.json` (e.g.
  `events.atlanta.json`, `events.miami.json`). These are curated viewing
  parties / fan zones / community watch events. A city with no seed file is
  simply skipped.
- **Production:** real event platforms (Eventbrite, Meetup, ticketing sites)
  require API keys and plug into the same `EventConnector` interface.

### How
- Read the city's seed file from disk and JSON-parse it; missing file → skip.

### What we extract
Mapped to canonical `Event` (`normalizeEvents`). Each event provides
`externalId`, `title`, `kind` (default `viewing_party`), `lat`/`lon`,
`startTime`, and optional `venueId`, `matchId`, `teams`, `estAttendance`.
Team affiliation is inferred from the title when not given; in the enrich stage
a seed `matchId` is resolved to the canonical Match id and teams are inherited
from the linked match.

---

## Provenance, freshness & refresh

- **Per-record `source`:** `{ name, type, scrapedAt, externalId, url? }` — set at
  collect time and preserved through dedup (merged venues accumulate every
  contributing `source`).
- **Manifest:** `src/refresh/manifest.ts` writes `data/manifest.json` tracking
  `lastScrapedAt` and record counts per (source, city) so a scheduled refresh
  can re-pull only stale sources.
- **Quality report:** `src/monitoring/quality.ts` emits per-run
  `data/<city>/quality.json` (coverage, geocode rate, dedup, freshness).

## Outputs

Each run writes to `data/<city>/` (git-ignored generated artifacts):
- `venues.jsonl` / `matches.jsonl` / `events.jsonl` — canonical records (**source of truth**)
- `venues.xlsx` / `matches.xlsx` / `events.xlsx` — human-review reports
- `quality.json` — data-quality metrics

If `DATABASE_URL` is set, the run also dual-writes canonical records into
Postgres/Supabase (`SupabasePublisher`); the local JSONL/Excel remain the source
of truth and rollback path.

## Configured cities

Venues are scraped for every metro in `src/config/cities.ts` — currently the
FIFA World Cup 2026 host metros (Atlanta, Boston, Dallas, Houston, Kansas City,
Los Angeles, Miami, New York, Philadelphia, San Francisco Bay Area, Seattle,
Toronto, Vancouver, Guadalajara, Monterrey, Mexico City, plus Jersey City),
additional major US metros (Chicago, Washington D.C., Phoenix, Detroit,
Minneapolis, San Diego, Denver, Tampa), and international metros (London,
Buenos Aires, São Paulo, Madrid, Tokyo). Adding a metro is config-only — a slug
plus a bounding box.
