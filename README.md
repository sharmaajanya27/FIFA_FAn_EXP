# FanWatch

> **Live at:** [https://tuparea.com](https://tuparea.com)

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

- [`knowledge-base/`](./knowledge-base/) — all narrative docs (start with [`starthere.md`](./knowledge-base/starthere.md))
- [`PRD.md`](./knowledge-base/PRD.md) — Product Requirements Document
- [`FEATURES.md`](./knowledge-base/FEATURES.md) — Feature inventory by user type, with build status
- [`ARCHITECTURE.md`](./knowledge-base/ARCHITECTURE.md) — How it's built, the seams, and the production target
- [`WORKFLOW.md`](./knowledge-base/WORKFLOW.md) — Workflow & architecture diagrams for the dev team
- [`api/README.md`](./api/README.md) · [`frontend/README.md`](./frontend/README.md) — per-package docs & endpoints

## What's built

Three TypeScript packages (see [`ARCHITECTURE.md`](./knowledge-base/ARCHITECTURE.md)):

- **`ingestion/`** — Phase 0 batch pipeline (scrape → normalize → geocode → dedup → enrich → score → publish JSONL).
- **`api/`** — discovery API (location/team search, ranking, recommendations), Phase 2 engagement writes (accounts, reviews, check-ins, crowd, predictions, communities), Phase 3 (AI rec scaffold, crowd estimation, user events, sponsorship), and **first-party traffic analytics** (`/analytics/*`, admin-gated by `ADMIN_EMAILS`).
- **`frontend/`** — the interactive map/list discovery app, plus **programmatic SEO landing pages** (`/watch`, `/watch/[city]`, `/watch/[city]/[team]`, `/venue/[city]/[id]` — server-rendered with metadata, JSON-LD, sitemap/robots) and a **`/admin` traffic dashboard**.

> **Data coverage:** scoped to the **16 FIFA World Cup 2026 host cities** (17
> metro slugs — NY/NJ spans `new-york` + `jersey-city`). Each host metro carries
> rich venue data (hundreds to thousands each) in both local JSONL and Postgres;
> non-host cities and non-WC teams were removed (`npm run cleanup:host-cities`).
> **Fan events** are curated seeds (~89 across the host metros). The v1 live
> experience is account-free — fans RSVP, post a 0–10 **vibe** energy reading,
> and review, all via an anonymous device id.

## Status

Phases 0–3 implemented and **deployed in production** at [tuparea.com](https://tuparea.com) — frontend on AWS Amplify, API on EC2 behind `api.tuparea.com`, data in Supabase Postgres. Storage/auth/transport sit behind seams for the production swap (see [`ARCHITECTURE.md`](./knowledge-base/ARCHITECTURE.md) §2).
