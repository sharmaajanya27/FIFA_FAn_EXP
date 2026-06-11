/**
 * OpenStreetMap / Overpass venue connector (Collect stage).
 *
 * Free, no API key required. We query the Overpass API for amenities that map
 * to watch-the-match venues (bars, pubs, restaurants, cafes) within a city's
 * bounding box. We throttle requests and send a contact User-Agent per OSM
 * fair-use etiquette (PRD §5.4: respect TOS / rate limits).
 */
import type { City } from "../../config/cities.js";
import { scrapeBboxes } from "../../config/cities.js";
import type { Env } from "../../config/env.js";
import type { Source } from "../../models/canonical.js";
import { log } from "../../util/logger.js";
import type { RawRecord, SourceConnector } from "../types.js";

/** OSM amenity values we treat as candidate venues. */
const AMENITIES = ["bar", "pub", "restaurant", "cafe"] as const;

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function buildQuery(bbox: [number, number, number, number]): string {
  const [s, w, n, e] = bbox;
  const bboxStr = `${s},${w},${n},${e}`;
  const filter = AMENITIES.join("|");
  // `out center` resolves a representative lat/lon for ways/relations too.
  return `[out:json][timeout:60];
(
  node["amenity"~"^(${filter})$"](${bboxStr});
  way["amenity"~"^(${filter})$"](${bboxStr});
);
out center tags;`;
}

export class OverpassConnector implements SourceConnector {
  readonly id = "osm-overpass";

  constructor(private readonly env: Env) {}

  async collectVenues(city: City): Promise<RawRecord[]> {
    // Scrape the downtown bbox plus any anchor bboxes (e.g. suburban stadiums).
    // Overlapping boxes return some of the same elements; we de-duplicate by
    // OSM id here, and the dedup pipeline stage merges near-duplicates too.
    const bboxes = scrapeBboxes(city);
    const scrapedAt = new Date().toISOString();
    const seen = new Set<string>();
    const records: RawRecord[] = [];

    for (let i = 0; i < bboxes.length; i++) {
      const query = buildQuery(bboxes[i]);
      log.info("Overpass: querying venues", {
        city: city.slug,
        bbox: i + 1,
        of: bboxes.length,
      });

      const data = await this.fetchWithRetry(query, city);

      for (const el of data.elements) {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        // Skip elements without a usable point or a name — not useful as a venue.
        if (lat === undefined || lon === undefined) continue;
        if (!el.tags?.name) continue;

        const externalId = `${el.type}/${el.id}`;
        if (seen.has(externalId)) continue;
        seen.add(externalId);

        const source: Source = {
          name: this.id,
          type: "maps",
          scrapedAt,
          externalId,
          url: `https://www.openstreetmap.org/${externalId}`,
        };

        records.push({
          source,
          payload: { lat, lon, tags: el.tags },
        });
      }

      // Be polite to the public endpoint between queries.
      await sleep(this.env.overpassThrottleMs);
    }

    log.info("Overpass: collected raw venues", {
      city: city.slug,
      count: records.length,
    });

    return records;
  }

  /**
   * POST the query, retrying on transient failures. The public Overpass
   * endpoint intermittently rejects rapid back-to-back requests (406/429/5xx),
   * which would otherwise abort a multi-city run; we back off and retry.
   */
  private async fetchWithRetry(
    query: string,
    city: City,
  ): Promise<OverpassResponse> {
    const maxAttempts = 4;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(this.env.overpassUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            // Match a plain client (curl) — some Overpass instances 406 a
            // request that omits a permissive Accept header.
            Accept: "application/json,*/*",
            "User-Agent": this.env.userAgent,
          },
          body: new URLSearchParams({ data: query }).toString(),
        });

        if (res.ok) return (await res.json()) as OverpassResponse;

        const text = await res.text().catch(() => "");
        lastError = new Error(
          `Overpass request failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`,
        );
        // Only retry on transient statuses; fail fast on client errors like 400.
        const transient =
          res.status === 406 || res.status === 429 || res.status >= 500;
        if (!transient) throw lastError;
      } catch (err) {
        lastError = err;
      }

      if (attempt < maxAttempts) {
        const backoff = this.env.overpassThrottleMs * 2 ** attempt;
        log.warn("Overpass: transient failure, retrying", {
          city: city.slug,
          attempt,
          backoffMs: backoff,
        });
        await sleep(backoff);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
