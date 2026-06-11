/**
 * OpenStreetMap / Overpass venue connector (Collect stage).
 *
 * Free, no API key required. We query the Overpass API for amenities that map
 * to watch-the-match venues (bars, pubs, restaurants, cafes) within a city's
 * bounding box. We throttle requests and send a contact User-Agent per OSM
 * fair-use etiquette (PRD §5.4: respect TOS / rate limits).
 */
import type { City } from "../../config/cities.js";
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

function buildQuery(city: City): string {
  const [s, w, n, e] = city.bbox;
  const bbox = `${s},${w},${n},${e}`;
  const filter = AMENITIES.join("|");
  // `out center` resolves a representative lat/lon for ways/relations too.
  return `[out:json][timeout:60];
(
  node["amenity"~"^(${filter})$"](${bbox});
  way["amenity"~"^(${filter})$"](${bbox});
);
out center tags;`;
}

export class OverpassConnector implements SourceConnector {
  readonly id = "osm-overpass";

  constructor(private readonly env: Env) {}

  async collectVenues(city: City): Promise<RawRecord[]> {
    const query = buildQuery(city);
    log.info("Overpass: querying venues", { city: city.slug });

    const res = await fetch(this.env.overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": this.env.userAgent,
      },
      body: new URLSearchParams({ data: query }).toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Overpass request failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as OverpassResponse;
    const scrapedAt = new Date().toISOString();

    const records: RawRecord[] = [];
    for (const el of data.elements) {
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      // Skip elements without a usable point or a name — not useful as a venue.
      if (lat === undefined || lon === undefined) continue;
      if (!el.tags?.name) continue;

      const source: Source = {
        name: this.id,
        type: "maps",
        scrapedAt,
        externalId: `${el.type}/${el.id}`,
        url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      };

      records.push({
        source,
        payload: { lat, lon, tags: el.tags },
      });
    }

    log.info("Overpass: collected raw venues", {
      city: city.slug,
      count: records.length,
    });

    // Be polite to the public endpoint before any subsequent call.
    await sleep(this.env.overpassThrottleMs);
    return records;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
