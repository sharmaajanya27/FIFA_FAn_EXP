/**
 * Geocoding service (PRD §6.1 — search by zip code / neighborhood).
 *
 * Resolves a free-text place query (zip code, neighborhood, address) to a
 * lat/lon the discovery search can center on. Backed by OpenStreetMap Nominatim
 * (same OSM provider the Phase 0 ingestion uses), biased toward the metro the
 * user is browsing. Results are cached in-process to respect Nominatim's usage
 * policy and keep repeat lookups instant.
 *
 * Production swap: point `endpoint` at a self-hosted Nominatim / Google
 * Geocoding without touching callers.
 */
import { METROS } from "../config/metros.js";
import { log } from "../util/logger.js";

export interface GeocodeResult {
  lat: number;
  lon: number;
  /** Human-readable label for what matched (e.g. the resolved address). */
  label: string;
  /** OSM place type/class, surfaced for debugging. */
  kind?: string;
}

interface NominatimItem {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
  boundingbox?: [string, string, string, string];
}

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // a day — places don't move

export class GeocodeService {
  private cache = new Map<string, { at: number; result: GeocodeResult | null }>();

  constructor(
    private readonly endpoint: string = process.env.GEOCODE_ENDPOINT ?? ENDPOINT,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /**
   * Resolve `q` to a point, optionally biased toward `citySlug`'s viewbox so a
   * bare zip/neighborhood resolves within the metro the user is browsing.
   */
  async lookup(q: string, citySlug?: string): Promise<GeocodeResult | null> {
    const query = q.trim();
    if (!query) return null;

    const key = `${citySlug ?? ""}|${query.toLowerCase()}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

    const url = new URL(this.endpoint);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "0");
    url.searchParams.set("q", this.composeQuery(query, citySlug));

    const metro = citySlug ? METROS.find((m) => m.slug === citySlug) : undefined;
    if (metro) {
      // Bias (not restrict) results toward the metro with a viewbox around its center.
      const { lat, lon } = metro.center;
      const d = 0.6; // ~60km box
      url.searchParams.set(
        "viewbox",
        `${lon - d},${lat - d},${lon + d},${lat + d}`,
      );
      if (metro.country) url.searchParams.set("countrycodes", metro.country.toLowerCase());
    }

    let result: GeocodeResult | null = null;
    try {
      const res = await this.fetchImpl(url.toString(), {
        headers: {
          // Nominatim requires an identifying User-Agent.
          "User-Agent": "FanWatch/0.1 (discovery geocoder)",
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const items = (await res.json()) as NominatimItem[];
        const top = items[0];
        if (top) {
          result = {
            lat: Number(top.lat),
            lon: Number(top.lon),
            label: top.display_name,
            kind: top.type ?? top.class,
          };
        }
      } else {
        log.warn("geocode: upstream error", { status: res.status });
      }
    } catch (err) {
      log.warn("geocode: lookup failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.cache.set(key, { at: Date.now(), result });
    return result;
  }

  /** Append the metro name so a bare zip/neighborhood disambiguates correctly. */
  private composeQuery(query: string, citySlug?: string): string {
    const metro = citySlug ? METROS.find((m) => m.slug === citySlug) : undefined;
    if (!metro) return query;
    // If the user already typed the city, don't duplicate it.
    if (query.toLowerCase().includes(metro.name.toLowerCase())) return query;
    return `${query}, ${metro.name}`;
  }
}
