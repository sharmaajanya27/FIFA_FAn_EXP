/**
 * Supabase/Postgres publisher — upserts canonical entities into the DB the API
 * reads from. Added alongside the JSONL publisher (dual-write) so the local
 * files remain a source of truth and rollback path. Upsert (`on conflict do
 * update`) makes re-running ingestion idempotent — the incremental story the
 * JSONL merge gives us, but native to the DB.
 */
import type postgres from "postgres";
import type { Event, Match, Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";
import type { PublishContext, Publisher } from "./types.js";

type Sql = ReturnType<typeof postgres>;

export class SupabasePublisher implements Publisher {
  readonly id = "supabase";

  constructor(private readonly sql: Sql) {}

  async publishVenues(venues: Venue[], ctx: PublishContext): Promise<void> {
    if (venues.length === 0) return;
    const rows = venues.map((v) => ({
      id: v.id,
      city_slug: ctx.citySlug,
      name: v.name,
      kind: v.kind,
      lat: v.geo.lat,
      lon: v.geo.lon,
      geohash: v.geohash,
      data: this.sql.json(v as never),
    }));
    await this.sql`
      insert into venues ${this.sql(rows, "id", "city_slug", "name", "kind", "lat", "lon", "geohash", "data")}
      on conflict (city_slug, id) do update set
        name = excluded.name, kind = excluded.kind,
        lat = excluded.lat, lon = excluded.lon, geohash = excluded.geohash,
        data = excluded.data, updated_at = now()`;
    log.info("supabase: upserted venues", { city: ctx.citySlug, count: venues.length });
  }

  // Fixtures are competition-global — stored once, keyed by match id.
  async publishMatches(matches: Match[], _ctx: PublishContext): Promise<void> {
    if (matches.length === 0) return;
    const rows = matches.map((m) => ({
      id: m.id,
      competition: m.competition,
      home_team: m.homeTeam,
      away_team: m.awayTeam,
      kickoff: m.kickoff,
      stage: m.stage ?? null,
      data: this.sql.json(m as never),
    }));
    await this.sql`
      insert into matches ${this.sql(rows, "id", "competition", "home_team", "away_team", "kickoff", "stage", "data")}
      on conflict (id) do update set
        competition = excluded.competition, home_team = excluded.home_team,
        away_team = excluded.away_team, kickoff = excluded.kickoff,
        stage = excluded.stage, data = excluded.data, updated_at = now()`;
    log.info("supabase: upserted matches", { count: matches.length });
  }

  async publishEvents(events: Event[], ctx: PublishContext): Promise<void> {
    if (events.length === 0) return;
    const rows = events.map((e) => ({
      id: e.id,
      city_slug: ctx.citySlug,
      data: this.sql.json(e as never),
    }));
    await this.sql`
      insert into events ${this.sql(rows, "id", "city_slug", "data")}
      on conflict (city_slug, id) do update set
        data = excluded.data, updated_at = now()`;
    log.info("supabase: upserted events", { city: ctx.citySlug, count: events.length });
  }
}
