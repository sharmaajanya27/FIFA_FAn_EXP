-- City-scope venues and events by (city_slug, id).
--
-- A venue/event can legitimately belong to several overlapping city scopes —
-- e.g. New York and Jersey City share the MetLife stadium area, so they scrape
-- the same OSM elements (same id). With `id` as the sole primary key the last
-- city to ingest a shared element overwrote its `city_slug`, "stealing" it from
-- the earlier city (jersey-city dropped from 1555 to 552 venues). The per-city
-- JSONL files keep a copy under each city, so the file and DB backends diverged.
--
-- Keying by (city_slug, id) — the same pattern the `engagement` table uses —
-- lets each city own its own copy, restoring file/DB parity. Matches stay global
-- (keyed by id alone). Idempotent: safe to re-run.

alter table venues drop constraint if exists venues_pkey;
alter table venues add primary key (city_slug, id);

alter table events drop constraint if exists events_pkey;
alter table events add primary key (city_slug, id);
