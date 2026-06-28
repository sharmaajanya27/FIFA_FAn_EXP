/**
 * Postgres-backed discovery repository (read seam). Mirrors `FileRepository`
 * but reads from the `venues` / `matches` / `events` tables that ingestion
 * upserts. The full canonical object lives in the `data` jsonb column, so the
 * row maps straight back to the domain type (same contract as the JSONL).
 */
import type { Event, Match, Venue } from "../domain/models.js";
import type { Repository } from "./repository.js";
import type { Sql } from "./db.js";

export class PgRepository implements Repository {
  constructor(private readonly sql: Sql) {}

  async listCities(): Promise<string[]> {
    const rows = await this.sql<{ city_slug: string }[]>`
      select distinct city_slug from venues order by city_slug`;
    return rows.map((r) => r.city_slug);
  }

  async venues(citySlug: string): Promise<Venue[]> {
    const rows = await this.sql<{ data: Venue }[]>`
      select data from venues where city_slug = ${citySlug}`;
    return rows.map((r) => r.data);
  }

  // Fixtures are competition-global (stored once, not per city), matching the
  // FileRepository behavior of returning the full match list for a city.
  async matches(_citySlug: string): Promise<Match[]> {
    const rows = await this.sql<{ data: Match }[]>`
      select data from matches order by kickoff`;
    return rows.map((r) => r.data);
  }

  async events(citySlug: string): Promise<Event[]> {
    const rows = await this.sql<{ data: Event }[]>`
      select data from events where city_slug = ${citySlug}`;
    return rows.map((r) => r.data);
  }

  async eventById(id: string): Promise<Event | undefined> {
    const rows = await this.sql<{ data: Event }[]>`
      select data from events where id = ${id} limit 1`;
    return rows[0]?.data;
  }
}
