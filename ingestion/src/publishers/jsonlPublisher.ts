/**
 * JSONL publisher — the Phase 0 source of truth.
 *
 * Writes one canonical record per line to data/<city>/<entity>.jsonl. JSONL is
 * append/stream friendly, git-diffable, and trivially re-read by a Lambda when
 * we wire up the real DB. Swapping to Aurora/PostGIS or DynamoDB later means
 * adding a new Publisher, not touching the scraper.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import type { Event, Match, Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";
import type { PublishContext, Publisher } from "./types.js";

/**
 * Read a previously published entity file (data/<city>/<entity>.jsonl) back
 * into an array. Returns [] when the file doesn't exist yet (first run). This
 * is the seam the incremental merge uses to avoid overwriting prior data.
 */
export async function readPublishedEntity<T>(
  dataDir: string,
  citySlug: string,
  entity: string,
): Promise<T[]> {
  const file = join(resolve(dataDir, citySlug), `${entity}.jsonl`);
  try {
    const text = await readFile(file, "utf8");
    return text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

export class JsonlPublisher implements Publisher {
  readonly id = "jsonl";

  constructor(private readonly dataDir: string) {}

  private async write(
    citySlug: string,
    entity: string,
    rows: unknown[],
  ): Promise<void> {
    const dir = resolve(this.dataDir, citySlug);
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${entity}.jsonl`);
    const body = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
    await writeFile(file, body, "utf8");
    log.info("jsonl: wrote records", { file, count: rows.length });
  }

  async publishVenues(venues: Venue[], ctx: PublishContext): Promise<void> {
    await this.write(ctx.citySlug, "venues", venues);
  }

  async publishMatches(matches: Match[], ctx: PublishContext): Promise<void> {
    await this.write(ctx.citySlug, "matches", matches);
  }

  async publishEvents(events: Event[], ctx: PublishContext): Promise<void> {
    await this.write(ctx.citySlug, "events", events);
  }
}
