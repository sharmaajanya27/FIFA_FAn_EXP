# FanWatch

A location-based web app that helps soccer fans discover the best places to
watch matches — bars, pubs, fan zones, viewing parties, and community events —
ranked by popularity, atmosphere, team support, and fan engagement.

Launches during the World Cup, built as a **year-round** platform that extends
to the Premier League, UEFA Champions League, MLS, La Liga, and more.

A **data aggregation layer (Phase 0)** scrapes and ingests cities, venues, bars,
fan events, and match schedules — normalizing, geocoding, deduplicating, and
enriching them into the dataset that powers discovery, rankings, and
recommendations.

## Documentation

- [`PRD.md`](./PRD.md) — Product Requirements Document
- [`FEATURES.md`](./FEATURES.md) — Feature inventory by user type, with build status
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — How it's built, the seams, and the production target
- [`WORKFLOW.md`](./WORKFLOW.md) — Workflow & architecture diagrams for the dev team
- [`api/README.md`](./api/README.md) · [`frontend/README.md`](./frontend/README.md) — per-package docs & endpoints

## What's built

Three TypeScript packages (see [`ARCHITECTURE.md`](./ARCHITECTURE.md)):

- **`ingestion/`** — Phase 0 batch pipeline (scrape → normalize → geocode → dedup → enrich → score → publish JSONL).
- **`api/`** — discovery API (location/team search, ranking, recommendations), Phase 2 engagement writes (accounts, reviews, check-ins, crowd, predictions, communities), Phase 3 (AI rec scaffold, crowd estimation, user events, sponsorship), and **first-party traffic analytics** (`/analytics/*`, admin-gated by `ADMIN_EMAILS`).
- **`frontend/`** — the interactive map/list discovery app, plus **programmatic SEO landing pages** (`/watch`, `/watch/[city]`, `/watch/[city]/[team]`, `/venue/[city]/[id]` — server-rendered with metadata, JSON-LD, sitemap/robots) and a **`/admin` traffic dashboard**.

> **Data coverage:** only `jersey-city` is currently ingested, so it's the only fully-populated city; other city pages render but stay `noindex` until ingestion is run for them. Run Phase 0 ingestion to light up more cities.

## Status

Phases 0–3 implemented and runnable locally; storage/auth/transport sit behind seams for the production swap (see [`ARCHITECTURE.md`](./ARCHITECTURE.md) §2). Not yet deployed — no production domain wired (`NEXT_PUBLIC_SITE_URL` is a placeholder).
