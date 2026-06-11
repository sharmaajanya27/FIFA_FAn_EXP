/**
 * Fan-events connector — Collect stage for EVENT.
 *
 * Reads curated viewing parties / fan zones / community watch events from a
 * per-city seed file (src/seeds/events.<slug>.json). Real event platforms
 * (Eventbrite, Meetup, ticketing sites) require API keys and plug into this
 * same EventConnector interface — point a keyed source at the same shape and
 * the rest of the pipeline is unchanged.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { City } from "../../config/cities.js";
import type { Source } from "../../models/canonical.js";
import { log } from "../../util/logger.js";
import type { EventConnector, RawRecord } from "../types.js";

interface SeedEvent {
  externalId: string;
  title: string;
  kind?: string;
  lat: number;
  lon: number;
  startTime: string;
  venueId?: string;
  matchId?: string;
  teams?: string[];
  estAttendance?: number;
}
interface SeedFile {
  events: SeedEvent[];
}

export class SeedEventsConnector implements EventConnector {
  readonly id = "events-seed";

  async collectEvents(city: City): Promise<RawRecord[]> {
    const url = new URL(
      `../../seeds/events.${city.slug}.json`,
      import.meta.url,
    );
    let data: SeedFile;
    try {
      const text = await readFile(fileURLToPath(url), "utf8");
      data = JSON.parse(text) as SeedFile;
    } catch {
      log.info("events: no seed file for city, skipping", { city: city.slug });
      return [];
    }

    const scrapedAt = new Date().toISOString();
    const records: RawRecord[] = data.events.map((e) => {
      const source: Source = {
        name: this.id,
        type: "events",
        scrapedAt,
        externalId: e.externalId,
      };
      return { source, payload: { ...e } };
    });

    log.info("events: collected fan events", {
      city: city.slug,
      count: records.length,
    });
    return records;
  }
}
