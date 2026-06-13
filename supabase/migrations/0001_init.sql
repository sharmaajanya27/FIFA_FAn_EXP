-- FanWatch data layer — initial schema (discovery + engagement).
--
-- Portable plain-Postgres: no PostGIS, no DB-side uuid defaults (the app
-- supplies all ids), so this runs identically on Supabase, a local Postgres,
-- and the PGlite verification harness. `data jsonb` carries the full canonical
-- object — the same contract the Phase 0 JSONL files carry today; the extracted
-- columns exist only for filtering.

-- ── Discovery (written by ingestion, read by the API Repository) ────────────

create table if not exists venues (
  id         text primary key,
  city_slug  text not null,
  name       text,
  kind       text,
  lat        double precision,
  lon        double precision,
  geohash    text,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists venues_city_slug_idx on venues (city_slug);

create table if not exists matches (
  id          text primary key,
  competition text,
  home_team   text,
  away_team   text,
  kickoff     timestamptz,
  stage       text,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists matches_kickoff_idx on matches (kickoff);

create table if not exists events (
  id         text primary key,
  city_slug  text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists events_city_slug_idx on events (city_slug);

-- ── Engagement (generic store preserving the Store.collection<T>() surface) ──
-- One row per record; `collection` is the logical table name used by the code
-- (users, reviews, checkins, posts, crowd_reports, user_events, photos,
-- predictions, venue_claims, venue_features).

create table if not exists engagement (
  collection text not null,
  id         text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);
create index if not exists engagement_collection_idx on engagement (collection);
