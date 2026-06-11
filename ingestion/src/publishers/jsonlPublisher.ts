/**
 * JSONL publisher — the Phase 0 source of truth.
 *
 * Writes one canonical Venue per line to data/<city>/venues.jsonl. JSONL is
 * append/stream friendly, git-diffable, and trivially re-read by a Lambda when
 * we wire up the real DB. Swapping to Aurora/PostGIS or DynamoDB later means
 * adding a new Publisher, not touching the scraper.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Venue } from "../models/canonical.js";
import { log } from "../util/logger.js";
import type { PublishContext, Publisher } from "./types.js";

export class JsonlPublisher implements Publisher {
  readonly id = "jsonl";

  constructor(private readonly dataDir: string) {}

  async publishVenues(venues: Venue[], ctx: PublishContext): Promise<void> {
    const dir = resolve(this.dataDir, ctx.citySlug);
    await mkdir(dir, { recursive: true });
    const file = join(dir, "venues.jsonl");
    const body = venues.map((v) => JSON.stringify(v)).join("\n") + "\n";
    await writeFile(file, body, "utf8");
    log.info("jsonl: wrote venues", { file, count: venues.length });
  }
}
