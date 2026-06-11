/**
 * Data access for the discovery API.
 *
 * `VenueRepository` is the seam between the API and storage. Phase 1 reads the
 * Phase 0 JSONL artifacts from disk; later this same interface is backed by
 * Aurora + PostGIS (geo radius in SQL) or DynamoDB — handlers don't change.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Event, Match, Venue } from "../domain/models.js";
import { log } from "../util/logger.js";

export interface Repository {
  listCities(): Promise<string[]>;
  venues(citySlug: string): Promise<Venue[]>;
  matches(citySlug: string): Promise<Match[]>;
  events(citySlug: string): Promise<Event[]>;
}

function parseJsonl<T>(text: string): T[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

/**
 * Filesystem repository over Phase 0 output (data/<city>/<entity>.jsonl).
 * Loaded files are cached in-memory for the process lifetime (the dataset is
 * static between ingestion runs). A Lambda would instead read from S3/DB.
 */
export class FileRepository implements Repository {
  private cache = new Map<string, unknown[]>();

  constructor(private readonly dataDir: string) {}

  async listCities(): Promise<string[]> {
    const entries = await readdir(this.dataDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }

  private async load<T>(citySlug: string, entity: string): Promise<T[]> {
    const key = `${citySlug}/${entity}`;
    const cached = this.cache.get(key);
    if (cached) return cached as T[];

    const file = join(this.dataDir, citySlug, `${entity}.jsonl`);
    let rows: T[];
    try {
      rows = parseJsonl<T>(await readFile(file, "utf8"));
    } catch {
      log.warn("repository: missing dataset file", { file });
      rows = [];
    }
    this.cache.set(key, rows);
    return rows;
  }

  venues(citySlug: string): Promise<Venue[]> {
    return this.load<Venue>(citySlug, "venues");
  }
  matches(citySlug: string): Promise<Match[]> {
    return this.load<Match>(citySlug, "matches");
  }
  events(citySlug: string): Promise<Event[]> {
    return this.load<Event>(citySlug, "events");
  }
}
